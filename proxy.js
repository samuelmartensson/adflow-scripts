require("dotenv").config({ path: __dirname + "/.env" });
const firebase = require("firebase-admin");

const fetchQueueData = async (instanceId = "i-0d343d22f305f353e") => {
  if (!instanceId) return Promise.reject();

  return new Promise((resolve, reject) => {
    firebase
      .database()
      .ref(instanceId)
      .once("value", (snapshot) => {
        const instanceItems = snapshot.val();
        if (!instanceItems) return [];

        resolve(
          Object.values(instanceItems).filter(
            (item) => item?.["render-status"] === "ready"
          ) || 0
        );
      })
      .catch(() => {
        reject();
      });
  });
};

module.exports = { fetchQueueData };
