require("dotenv").config({ path: __dirname + "/.env" });
const { render } = require("@nexrender/core");
const spawn = require("child_process").spawn;
const fetch = require("node-fetch");
const async = require("async");
const AWS = require("aws-sdk");
const firebase = require("firebase-admin");
const serviceAccount = require("./serviceaccountcred");
const getConfig = require("./configMiddleware").default;
const downloadFonts = require("./font-downloader").default;
const logger = require("./logger").default;

const rootUserPath = process.env.USERPROFILE.replace(/\\/g, "/");

if (firebase.apps.length === 0) {
  firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DB_URL,
  });
}

let orgId = "";
let global_retries = 0;
let setupComplete = false;

const DATA_SOURCE_POLLING_INTERVAL = 1000 * 30;
const SHUTDOWN_LIMIT = 3;

const meta = new AWS.MetadataService();
const ec2 = new AWS.EC2({
  apiVersion: "2016-11-15",
  region: "eu-north-1",
  accessKeyId: process.env.AWS_ID,
  secretAccessKey: process.env.AWS_SECRET,
});
const s3 = new AWS.S3({
  signatureVersion: "v4",
  region: "eu-north-1",
  accessKeyId: process.env.AWS_ID,
  secretAccessKey: process.env.AWS_SECRET,
});

const generateAepFilePath = (id) => {
  return `${id}/project.aep`;
};

const generateFontPath = (id) => {
  return `${id}/fonts`;
};

function terminateCurrentInstance({ instanceId, reason }) {
  const ref = firebase
    .firestore()
    .collection(`organizations/${orgId}/instances`);
  if (!reason) {
    ref.doc(instanceId).delete();
  }

  if (reason === "error") {
    ref.doc(instanceId).set({ state: "error" });
    firebase
      .database()
      .ref(instanceId)
      .once("value", (snap) => {
        snap.forEach((item) => {
          if (item.val()["render-status"] !== "done") {
            item.ref.update({ "render-status": "error" });
          }
        });
      });
  }

  ec2.terminateInstances({ InstanceIds: [instanceId] }, (err, data) => {});
}

function renderVideo(item, instanceId) {
  console.log("DATA FOUND --- STARTING RENDER");

  return new Promise((resolve) => {
    s3.getSignedUrlPromise("getObject", {
      Bucket: "adflow-templates",
      Key: generateAepFilePath(item.templateId),
      Expires: 60 * 5,
    }).then((url) => {
      const outputFile = `${rootUserPath}/Desktop/nexrender_cli/renders/${
        item.id
      }.${item.isImage ? "jpg" : "mp4"}`;
      const json = getConfig(item.isImage ? "image" : "video");
      json.assets = item.fields;

      if (item.static) json.assets.push(...item.static);

      // Config composition, pre- and postrender data
      json.template = {
        src: decodeURIComponent(url),
        composition: item.target,
      };

      if (item.isImage) {
        json.template.outputModule = "JPEG";
        json.template.outputExt = "jpg";
      }

      json.actions.prerender[0].data = { ...item, instanceId };
      json.actions.postrender[1].output = outputFile;
      json.actions.postrender[2].data = { ...item, instanceId };
      json.actions.postrender[2].filePath = outputFile;

      render(json, {
        addLicense: true,
        workpath: `${rootUserPath}/Desktop/nexrender_cli/Temp`,
        reuse: true,
        debug: true,
      })
        .then(() => resolve())
        .catch((err) => {
          logger.error(
            {
              processName: "Nexrender Error",
              error: JSON.stringify(err),
              userId: item.userId,
            },
            () => {
              terminateCurrentInstance({ instanceId, reason: "error" });
            }
          );
        });
    });
  });
}

function installFonts(templateId) {
  return new Promise((resolve, reject) => {
    downloadFonts(`${generateFontPath(templateId)}`).then(() => {
      const child = spawn("powershell.exe", [
        `${rootUserPath}\\Desktop\\shell\\install-fonts.ps1`,
      ]);
      child.on("exit", () => {
        console.log("--- Font install complete ---");
        resolve();
      });
    });
  });
}

async function fetchDatasource(url) {
  return fetch(url).then((res) => res.json());
}

meta.request("/latest/meta-data/instance-id", (err, instanceId) => {
  console.log("Recieved instanceId: " + instanceId);
  const dataSource = `http://localhost:3001/?instanceId=${instanceId}`;

  if (err) {
    fetchDatasource(dataSource).then((data) => {
      logger.error({
        processName: "Get current instance error",
        error: JSON.stringify(err),
        userId: data[0].userId,
      });
      terminateCurrentInstance({ instanceId, reason: "error" });
    });
  }

  async.forever(
    (next) => {
      if (global_retries >= SHUTDOWN_LIMIT) {
        terminateCurrentInstance({ instanceId });
      } else {
        console.log("Checking data source for new data...");

        fetchDatasource(dataSource)
          .then((data) => {
            const item = data[0];

            if (data.length > 0) {
              if (!setupComplete) {
                orgId = item.orgId;
                installFonts(item.templateId).then(() => {
                  setupComplete = true;
                  next();
                });
              } else {
                renderVideo(item, instanceId).then(() => {
                  global_retries = 0;
                  next();
                });
              }
            } else {
              setTimeout(() => {
                console.log("Retrying...");
                global_retries += 1;
                next();
              }, DATA_SOURCE_POLLING_INTERVAL);
            }
          })
          .catch((err) => {
            console.log(err);
            setTimeout(() => {
              next();
            }, 5000);
          });
      }
    },
    (err) => {
      fetchDatasource(dataSource).then((data) => {
        if (data[0]?.userId) {
          logger.error({
            processName: "Rendering Error",
            error: JSON.stringify(err),
            userId: data[0].userId,
          });
        }
        terminateCurrentInstance({ instanceId, reason: "error" });
        throw err;
      });
    }
  );
});
