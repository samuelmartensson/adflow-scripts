require('dotenv').config({ path: __dirname + '/.env' });
const firebase = require('firebase-admin');
const fs = require('fs');
const AWS = require('aws-sdk');
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
        const isImageSequence = fileName.split('.')[1].includes('jpg');
        const fileContent = fs.readFileSync(
          isImageSequence ? `${fileName}00000` : fileName
        );
        const params = {
          Bucket: process.env.CLIENT_BUCKET,
          Key: `images/${fileName.split('/').pop()}`,
          Body: fileContent,
          ContentType: isImageSequence ? 'image/jpeg' : 'video/mp4',
        };

        s3.upload(params, (err, awsData) => {
          if (err) {
            db.collection(`users/${data.userId}/errors`)
              .doc()
              .set({
                batch_process: 'AWS upload',
                message: String(err),
                timestamp: new Date(),
              });
            throw err;
          }

          console.log(`File uploaded successfully. ${awsData.Location}`);

          firebase
            .database()
            .ref(`${data.instanceId}/${data.referenceKey}`)
            .set({ ...data, 'render-status': 'done' });

          const objectToSet = {
            created_date: new Date().toISOString(),
            viewed: false,
            name: data.displayName,
            format: data.format,
            target: data.target,
            templateName: data.templateName,
            url: awsData.Location,
            id: data.id,
            batchName: data.batchName || null,
            isImage: isImageSequence,
          };

          db.collection(`users/${data.userId}/videos`)
            .doc()
            .set(objectToSet)
            .then(() => resolve(job));
        });
      };

      uploadFile(filePath);
    } catch (err) {
      db.collection(`users/${data.userId}/errors`)
        .doc()
        .set({
          batch_process: 'upload',
          message: String(err),
          timestamp: new Date(),
        })
        .then(() => resolve(job));
    }
  });
};
