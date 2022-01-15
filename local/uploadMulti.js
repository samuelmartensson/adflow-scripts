require("dotenv").config({ path: __dirname + "/.env" });
const fs = require("fs");
const AWS = require("aws-sdk");
const firebase = require("firebase-admin");
const { default: logger } = require("./logger");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ID,
  secretAccessKey: process.env.AWS_SECRET,
});

let retry = 0;
let retryReadFile = 0;

module.exports = (job, settings, action) => {
  const rootUserPath = process.env.USERPROFILE.replace(/\\/g, "/");
  const { data } = action;

  return new Promise((resolve, reject) => {
    try {
      const promises = [];

      const addPromise = ({ path, fileData, callback }) => {
        const params = {
          Bucket: "adflow-consumer-endpoint",
          Key: path.split("/").pop(),
          Body: fileData,
          ContentType: "image/jpeg",
        };

        promises.push(s3.upload(params).promise());

        console.log(path);
        console.log("CURRENT LENGTH " + promises.length + "/" + data.itemCount);

        if (promises.length === data.itemCount) {
          callback();
        }
      };

      const main = (callback) => {
        for (let index = 0; index < data.itemCount; index++) {
          const path = `${rootUserPath}/Desktop/nexrender_cli/renders/${data.items[index].id}.jpg`;
          fs.readFile(path, (err, fileData) => {
            if (err) {
              if (retryReadFile === 0) {
                retryReadFile += 1;
                addPromise({ path, fileData, callback });
              } else {
                reject();
              }
            }

            addPromise({ path, fileData, callback });
          });
        }
      };

      const upload = () => {
        return Promise.all(promises).then((awsData) => {
          const metaData = [];

          awsData.forEach(({ Location, Key }) => {
            const item = data.items.find(
              (obj) => obj.id === Key.split(".").shift()
            );
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
        });
      };

      main(() => {
        upload().catch((error) => {
          if (retry === 0) {
            retry += 1;
            logger.error({
              processName: "Retrying uploadMulti",
              error: JSON.stringify(error),
              userId: data.userId,
            });
            main(() =>
              upload().catch(() => {
                logger.error({
                  processName: "uploadMulti AWS Error",
                  error: JSON.stringify(error),
                  userId: data.userId,
                });
                reject(job);
              })
            );
          }
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
