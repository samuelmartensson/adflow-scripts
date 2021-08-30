require('dotenv').config({ path: __dirname + '/.env' });
const firebase = require('firebase-admin');
const serviceAccount = require('./serviceaccountcred');

module.exports = (job, settings, action, type) => {
  const { data } = action;
  if (firebase.apps.length === 0) {
    firebase.initializeApp({
      credential: firebase.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DB_URL,
    });
  }

  return new Promise((resolve, reject) => {
    try {
      firebase
        .database()
        .ref(`${data.instanceId}/${data.referenceKey}`)
        .set({ ...data, 'render-status': 'queued' })
        .then(() => {
          resolve(job);
        });
    } catch (err) {
      const objectToSet = {
        batch_process: 'update',
        message: String(err),
        timestamp: new Date(),
      };
      firebase
        .firestore()
        .collection(`users/${data.userId}/errors`)
        .doc()
        .set(objectToSet)
        .then(() => {
          resolve(job);
        });
    }
  });
};
