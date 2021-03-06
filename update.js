require("dotenv").config({ path: __dirname + "/.env" });
const firebase = require("firebase-admin");
const serviceAccount = require("./serviceaccountcred");
const logger = require("./logger").default;

module.exports = (job, settings, action) => {
  const { data } = action;
  if (firebase.apps.length === 0) {
    firebase.initializeApp({
      credential: firebase.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DB_URL,
    });
  }

  return new Promise((resolve) => {
    try {
      firebase
        .database()
        .ref(`${data.instanceId}/${data.referenceKey}`)
        .update({ "render-status": "queued" })
        .then(() => {
          resolve(job);
        });
    } catch (err) {
      logger.error(
        {
          processName: "update",
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
