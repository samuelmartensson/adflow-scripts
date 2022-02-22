require("dotenv").config({ path: __dirname + "/.env" });
const firebase = require("firebase-admin");
const serviceAccount = require("./serviceaccountcred");

if (firebase.apps.length === 0) {
  firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DB_URL,
  });
}

const error = ({ processName, error, userId = "" }, callback) => {
  const objectToSet = {
    batch_process: processName,
    error: JSON.stringify({ error, errorString: error.toString() }),
    timestamp: new Date(),
    userId,
  };

  firebase
    .firestore()
    .collection(`errors`)
    .doc()
    .set(objectToSet)
    .then(() => {
      callback?.();
    });
};

exports.default = {
  error,
};
