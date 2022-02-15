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
const { nexrender_path } = require("./consts");

const rootUserPath = process.env.USERPROFILE.replace(/\\/g, "/");

if (firebase.apps.length === 0) {
  firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DB_URL,
  });
}

let ORG_ID = "";
let USER_ID = "";
let global_retries = 0;
let setupComplete = false;
let INSTANCE_ID = "";
let ec2region = "";

const DATA_SOURCE_POLLING_INTERVAL = 1000 * 10;
const SHUTDOWN_LIMIT = 3;

const meta = new AWS.MetadataService();
meta.request("/latest/meta-data/placement/availability-zone", (err, data) => {
  // remove letter from region
  ec2region = data.slice(0, -1);
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
  const ec2 = new AWS.EC2({
    apiVersion: "2016-11-15",
    region: ec2region,
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
  });

  const rtbdRef = firebase.database().ref(instanceId);
  const ref = firebase
    .firestore()
    .collection(`organizations/${ORG_ID}/instances`);
  if (!reason) {
    rtbdRef.remove();
    ref.doc(instanceId).delete();
  }

  if (reason === "error") {
    ref.doc(instanceId).set({ state: "error" });
    rtbdRef.once("value", (snap) => {
      snap.forEach((item) => {
        if (item.val()["render-status"] !== "done") {
          item.ref.update({ "render-status": "error" });
        }
      });
    });
  }

  ec2.terminateInstances({ InstanceIds: [instanceId] }, () => {});
}

async function renderVideo(item, instanceId) {
  console.log("DATA FOUND --- STARTING RENDER");

  try {
    const url = await s3.getSignedUrlPromise("getObject", {
      Bucket: "adflow-templates",
      Key: generateAepFilePath(item.templateId),
      Expires: 60 * 5,
    });

    const outputFile = `${nexrender_path}/renders/${item.id}.${
      item.isImage ? "jpg" : "mp4"
    }`;
    const json = item.powerRender
      ? getConfig("powerRender")
      : getConfig(item.isImage ? "image" : "video");

    json.assets = item.fields;

    // Config composition, pre- and postrender data
    json.template = {
      src: decodeURIComponent(url),
      composition: item.target,
      continueOnMissing: true,
    };

    json.onRenderError = (job, err) => {
      logger.error(
        {
          processName: "onRenderError",
          error: JSON.stringify(err),
          userId: item.userId,
        },
        () => {
          terminateCurrentInstance({ instanceId, reason: "error" });
        }
      );
    };

    json.actions.prerender[0].data = { ...item, instanceId };

    if (item.isImage || item.powerRender) {
      json.template.outputModule = "JPEG";
      json.template.outputExt = "jpg";
    }

    if (item.isImage) {
      json.actions.postrender[0].output = outputFile;
      json.actions.postrender[1].filePath = outputFile;
      json.actions.postrender[1].data = { ...item, instanceId };
    } else if (item.powerRender) {
      json.actions.postrender[0].data = {
        ...item,
        itemCount: item.items.length,
      };
      json.assets = item.items.flatMap((item) => item.fields);
      json.actions.postrender[1].data = {
        ...item,
        instanceId,
        itemCount: item.items.length,
      };
    } else {
      json.actions.postrender[1].output = outputFile;
      json.actions.postrender[2].data = { ...item, instanceId };
      json.actions.postrender[2].filePath = outputFile;
    }

    return render(json, {
      addLicense: true,
      workpath: `${nexrender_path}/Temp`,
      reuse: true,
      debug: true,
      // We run 2022 on video AMI
      ...(!item.isImage &&
        !item.powerRender && {
          multiFrames: true,
          binary:
            "C:/Program Files/Adobe/Adobe After Effects 2022/Support Files/aerender.exe",
        }),
    }).catch((err) => {
      logger.error(
        {
          processName: "Nexrender",
          error: err,
          userId: item.userId,
        },
        () => {
          terminateCurrentInstance({ instanceId, reason: "error" });
        }
      );
    });
  } catch (err) {
    logger.error(
      {
        processName: "renderVideo",
        error: err,
        userId: item.userId,
      },
      () => {
        terminateCurrentInstance({ instanceId, reason: "error" });
      }
    );
  }
}

function installFonts(templateId) {
  return new Promise((resolve) => {
    downloadFonts(`${generateFontPath(templateId)}`).then(() => {
      const child = spawn("powershell.exe", [
        `${rootUserPath}\\Desktop\\scripts\\install-fonts.ps1`,
      ]);

      child.on("exit", () => {
        console.log("--- Font install complete ---");
        resolve();
      });

      child.on("error", (err) => {
        logger.error(
          {
            processName: "Nexrender Font Error",
            error: err.toString(),
            userId: USER_ID,
          },
          () => {
            terminateCurrentInstance({
              instanceId: INSTANCE_ID,
              reason: "error",
            });
          }
        );
      });
    });
  });
}

async function fetchDatasource(url) {
  return fetch(url).then((res) => res.json());
}

try {
  meta.request("/latest/meta-data/instance-id", (err, instanceId) => {
    console.log("Recieved instanceId: " + instanceId);
    INSTANCE_ID = instanceId;
    const dataSource = `http://localhost:3001/?instanceId=${instanceId}`;

    if (err) {
      fetchDatasource(dataSource).then((data) => {
        logger.error({
          processName: "Get current instance error",
          error: err,
          userId: data[0].userId,
        });
        terminateCurrentInstance({ instanceId, reason: "error" });
      });
    }

    async.forever(
      (next) => {
        if (global_retries >= SHUTDOWN_LIMIT) {
          console.log("global_retries -----> " + global_retries);
          terminateCurrentInstance({ instanceId });
        } else {
          console.log("Checking data source for new data...");

          fetchDatasource(dataSource)
            .then((data) => {
              const item = data[0];

              if (data.length > 0) {
                if (!setupComplete) {
                  ORG_ID = item.orgId;
                  USER_ID = item.userId;
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
              logger.error({
                processName: "Proxy Error",
                error: err,
                userId: "",
              });
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
              error: err,
              userId: data[0].userId,
            });
          }
          terminateCurrentInstance({ instanceId, reason: "error" });
          throw err;
        });
      }
    );
  });
} catch (err) {
  logger.error({
    processName: "General Error",
    error: err,
    userId: "",
  });
}
