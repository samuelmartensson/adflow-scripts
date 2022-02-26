require("dotenv").config({ path: __dirname + "/.env" });
const firebase = require("firebase-admin");

const fetchQueueData = async (instanceId) => {
  if (!instanceId) return Promise.reject();

  return new Promise((resolve, reject) => {
    firebase
      .database()
      .ref(instanceId)
      .once("value", (snapshot) => {
        const instanceItems = snapshot.val();
        if (!instanceItems) return [];

        resolve(Object.values(instanceItems));
      })
      .catch(() => {
        reject();
      });
  });
};

module.exports = { fetchQueueData };
