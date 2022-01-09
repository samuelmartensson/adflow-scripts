require("dotenv").config({ path: __dirname + "/.env" });
const fs = require("fs");
const AWS = require("aws-sdk");
const firebase = require("firebase-admin");
const { default: logger } = require("../logger");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ID,
  secretAccessKey: process.env.AWS_SECRET,
});

module.exports = (job, settings, action) => {
  const rootUserPath = process.env.USERPROFILE.replace(/\\/g, "/");
  const { data } = action;

  return new Promise((resolve) => {
    try {
      const assetsLength = job.assets.filter(
        (item) => item.type === "image"
      ).length;

      const promises = [];

      for (let index = 0; index < assetsLength; index++) {
        const path = `${rootUserPath}/Desktop/nexrender_cli/renders/${data.items[index].id}.jpg`;
        const fileContent = fs.createReadStream(path);
        const params = {
          Bucket: "adflow-test-content",
          Key: path.split("/").pop(),
          Body: fileContent,
          ContentType: "image/jpeg",
        };

        promises.push(s3.upload(params).promise());
      }

      Promise.all(promises)
        .then((awsData) => {
          const metaData = [];

          awsData.forEach(({ Location }, index) => {
            const item = data.items[index];
            const { scheduleId, displayName } = item.compiledRenderConfig;

            metaData.push({
              url: Location,
              created_date: new Date().toISOString(),
              viewed: false,
              format: data.format,
              target: data.target,
              templateName: data.templateName,
              batchName: data.batchName || "",
              scheduleId: scheduleId || "",
              name: displayName,
              id: item.id,
              isImage: true,
              fbAdsManagerFields: item.fbAdsManagerFields || null,
              compiledRenderConfig: item.compiledRenderConfig || null,
            });
          });

          firebase
            .database()
            .ref(`${data.instanceId}/${data.referenceKey}`)
            .update({ "render-status": "done" });

          const db = firebase.firestore();
          const mediaRef = db.collection(`users/${data.userId}/videos`);
          const batch = db.batch();
          metaData.forEach((item) => {
            const ref = mediaRef.doc();
            batch.set(ref, item);
          });
          batch.commit().then(() => {
            resolve(job);
          });
        })
        .catch((error) => {
          logger.error({
            processName: "uploadMulti AWS Error",
            error: JSON.stringify(error),
            userId: data.userId,
          });
        });
    } catch (error) {
      logger.error({
        processName: "uploadMulti General Error",
        error: JSON.stringify(error),
        userId: data.userId,
      });
    }
  });
};
