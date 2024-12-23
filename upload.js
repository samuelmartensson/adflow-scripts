require("dotenv").config({ path: __dirname + "/.env" });
const firebase = require("firebase-admin");
const fs = require("fs");
const AWS = require("aws-sdk");
const logger = require("./logger").default;

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ID,
  secretAccessKey: process.env.AWS_SECRET,
});

module.exports = (job, settings, action) => {
  const { data, filePath } = action;
  const db = firebase.firestore();

  return new Promise((resolve) => {
    try {
      const uploadFile = (fileName) => {
        const isImageSequence = data.isImage;
        const fileContent = fs.readFileSync(fileName);
        const params = {
          Bucket: "adflow-consumer-endpoint",
          Key: fileName.split("/").pop(),
          Body: fileContent,
          ContentType: isImageSequence ? "image/jpeg" : "video/mp4",
        };

        s3.upload(params, (err, awsData) => {
          if (err) {
            db.collection(`users/${data.userId}/errors`)
              .doc()
              .set({
                batch_process: "AWS upload",
                message: String(err),
                timestamp: new Date(),
              });
            throw err;
          }

          console.log(`File uploaded successfully. ${awsData.Location}`);

          firebase
            .database()
            .ref(`${data.instanceId}/${data.referenceKey}`)
            .update({ "render-status": "done" });

          const media = {
            created_date: new Date().toISOString(),
            viewed: false,
            name: data.displayName,
            format: data.format,
            target: data.target,
            templateName: data.templateName,
            scheduleId: data.scheduleId || "",
            url: awsData.Location,
            id: data.id,
            batchName: data.batchName || "",
            isImage: isImageSequence,
            metaDataFields: data.metaDataFields || null,
            compiledRenderConfig: data.compiledRenderConfig || null,
          };

          const scope =
            data.scope === "user"
              ? `users/${data.userId}/videos`
              : `organizations/${data.orgId}/media`;

          db.collection(scope)
            .doc()
            .set(media)
            .then(() => resolve(job));
        });
      };

      uploadFile(filePath);
    } catch (err) {
      logger.error(
        {
          processName: "upload",
          error: JSON.stringify(err),
          userId: data.userId,
        },
        () => resolve(job)
      );
    }
  });
};
