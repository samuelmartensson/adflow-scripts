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
        .ref(`${data.orgId}/${data.instanceId}/${data.referenceKey}`)
        .update({ 'render-status': 'queued' })
        .then(() => {
          resolve(job);
        });
    } catch (err) {
      logger.error(
        {
          processName: 'update',
          error: JSON.stringify(err),
          userId: data.userId,
        },
        () => {
          resolve(job);
        }
      );
    }
  });
};
