require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const app = express();
const port = 3001;
const firebase = require("firebase-admin");
const serviceAccount = require("./serviceaccountcred");

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL,
});

app.get("/", async (req, res) => {
  const { instanceId } = req.query;

  firebase
    .database()
    .ref(instanceId)
    .once("value", (snapshot) => {
      const instanceItems = snapshot.val();

      if (!instanceItems) return res.json([]);

      res.json(
        Object.values(instanceItems).filter(
          (item) => item?.["render-status"] === "ready"
        ) || 0
      );
    })
    .catch(() => {
      res.send({ error: { message: "Something went wrong in proxy" } });
    });
});

app.listen(port, () => {
  console.log(
    `Instance listening for render items at http://localhost:${port}`
  );
});
