const firebase = require('firebase-admin');

const error = ({ processName, error, userId }, callback) => {
  const objectToSet = {
    batch_process: processName,
    error: JSON.stringify(error),
    timestamp: new Date(),
  };
  firebase
    .firestore()
    .collection(`users/${userId}/errors`)
    .doc()
    .set(objectToSet)
    .then(() => {
      callback();
    });
};

exports.default = {
  error,
};
