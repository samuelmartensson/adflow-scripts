require("dotenv").config({ path: __dirname + "/.env" });
const firebase = require("firebase-admin");
const fs = require("fs");
const AWS = require("aws-sdk");
const logger = require("./logger").default;

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ID,
  secretAccessKey: process.env.AWS_SECRET,
});

module.exports = (job, settings, action, type) => {
  const { data, filePath } = action;
  const db = firebase.firestore();

  return new Promise((resolve, reject) => {
    try {
      const uploadFile = (fileName) => {
        const isImageSequence = data.isImage;
        const fileContent = fs.readFileSync(fileName);
        const params = {
          Bucket: process.env.CLIENT_BUCKET,
          Key: `images/${fileName.split("/").pop()}`,
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
            .ref(`${data.orgId}/${data.instanceId}/${data.referenceKey}`)
            .update({ "render-status": "done" });

          const media = {
            created_date: new Date().toISOString(),
            viewed: false,
            name: data.displayName,
            format: data.format,
            target: data.target,
            templateName: data.templateName,
            url: awsData.Location,
            id: data.id,
            batchName: data.batchName || "",
            isImage: isImageSequence,
            fbAdsManagerFields: data.fbAdsManagerFields || null,
          };

          db.collection(`users/${data.userId}/videos`)
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
