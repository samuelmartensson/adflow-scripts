require("dotenv").config({ path: __dirname + "/.env" });
const firebase = require("firebase-admin");

const fetchQueueData = async (instanceId) => {
  if (!instanceId) return Promise.reject();

  firebase
    .database()
    .ref(instanceId)
    .once("value", (snapshot) => {
      const instanceItems = snapshot.val();

      if (!instanceItems) return [];

      return (
        Object.values(instanceItems).filter(
          (item) => item?.["render-status"] === "ready"
        ) || 0
      );
    })
    .catch(() => {
      return Promise.reject();
    });
};

module.exports = { fetchQueueData };
