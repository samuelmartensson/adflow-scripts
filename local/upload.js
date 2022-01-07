require("dotenv").config({ path: __dirname + "/../.env" });
const fs = require("fs");
const AWS = require("aws-sdk");

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
        const path = `${rootUserPath}/Desktop/renders/${data.items[index].id}.jpg`;
        const fileContent = fs.readFileSync(path);
        const params = {
          Bucket: "adflow-test-content",
          Key: path.split("/").pop(),
          Body: fileContent,
          ContentType: "image/jpeg",
        };

        promises.push(s3.upload(params).promise());
      }

      Promise.all(promises).then((awsData) => {
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

        console.log(metaData);
        resolve(job);
      });
    } catch (err) {
      console.log(err);
    }
  });
};
