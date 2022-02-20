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

const meta = new AWS.MetadataService();

const getEC2region = () => {
  return new Promise((resolve) => {
    meta.request(
      "/latest/meta-data/placement/availability-zone",
      (err, data) => {
        // remove letter from region
        const ec2region = data.slice(0, -1);

        resolve(ec2region);
      }
    );
  });
};

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

async function terminateCurrentInstance({ instanceId }) {
  try {
    const rtbdRef = firebase.database().ref(instanceId);
    const ref = firebase
      .firestore()
      .collection(`organizations/${ORG_ID}/instances`);
    rtbdRef.remove();
    ref.doc(instanceId).delete();
  } catch (error) {
    logger.error({
      processName: "Failed instance cleanup",
      error,
      userId: USER_ID || "",
    });
  }
  const ec2region = await getEC2region();
  const ec2 = new AWS.EC2({
    apiVersion: "2016-11-15",
    region: ec2region,
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
  });

  ec2.terminateInstances({ InstanceIds: [instanceId] }, () => {});
}

const runErrorAction = async ({ error, item, instanceId, batchName }) => {
  const ref = firebase.firestore().collection(`users/${USER_ID}/renderErrors`);
  const rtdbRef = firebase.database().ref(`${instanceId}/${item.referenceKey}`);
  rtdbRef.update({ "render-status": "error" });

  if (error?.code === "ECONNRESET") {
    // send as retryable from frontend
    await ref.doc().set({
      type: "connection_failed",
      retryable: true,
      item,
      timestamp: Date.now(),
    });
    return;
  }

  if (error?.reason?.includes("error downloading file")) {
    // send faulty link and render config to user error list
    await ref.doc().set({
      type: "download_failed",
      retryable: false,
      item,
      src: error?.meta?.src || "",
      timestamp: Date.now(),
    });
    return;
  }

  // Send unexpected error, available for retry, if persistent, contact adflow staff
  logger.error(
    {
      processName: "Nexrender",
      error,
      userId: item.userId,
    },
    async () => {
      await ref.doc().set({
        type: "unexpected",
        systemFailure: true,
        retryable: false,
        item,
        batchName,
        timestamp: Date.now(),
      });
      terminateCurrentInstance({ instanceId, reason: "error" });
    }
  );
};

async function renderVideo(item, url, instanceId) {
  console.log("DATA FOUND --- STARTING RENDER");

  try {
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

    json.actions.prerender[0].data = { ...item, instanceId };

    if (item.isImage || item.powerRender) {
      json.template.outputModule = "JPEG";
      json.template.outputExt = "jpg";
    }

    const jobMetadata = {
      ...item,
      instanceId,
      itemCount: item?.items?.length || 0,
    };

    if (item.isImage) {
      json.actions.postrender[0].output = outputFile;
      json.actions.postrender[1].filePath = outputFile;
      json.actions.postrender[1].data = { ...item, instanceId };
    } else if (item.powerRender) {
      json.assets = item.items.flatMap((item) => item.fields);
      json.actions.postrender[0].data = jobMetadata;
      json.actions.postrender[1].data = jobMetadata;
    } else {
      json.actions.postrender[1].output = outputFile;
      json.actions.postrender[2].data = jobMetadata;
      json.actions.postrender[2].filePath = outputFile;
    }

    const isVideo = !item.isImage && !item.powerRender;

    return render(json, {
      addLicense: true,
      workpath: `${nexrender_path}/Temp`,
      reuse: true,
      debug: true,
      // We run 2022 on video AMI
      ...(isVideo && {
        multiFrames: true,
        binary:
          "C:/Program Files/Adobe/Adobe After Effects 2022/Support Files/aerender.exe",
      }),
    }).catch((error) => {
      runErrorAction({ error, item, instanceId, batchName: item.batchName });
    });
  } catch (err) {
    console.log(err);
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

async function installFonts(templateId, instanceId) {
  return new Promise((resolve, reject) => {
    (async () => {
      await downloadFonts(generateFontPath(templateId)).catch((err) => {
        logger.error({
          processName: "Font download",
          error: err,
          userId: USER_ID,
        });
      });

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
              instanceId,
              reason: "error",
            });
          }
        );
      });
    })().catch(() => {
      reject();
    });
  });
}

async function fetchDatasource(url) {
  return fetch(url).then((res) => res.json());
}

const getInstanceId = () => {
  return new Promise((resolve, reject) => {
    meta.request("/latest/meta-data/instance-id", (err, instanceId) => {
      if (err) {
        reject(err);
      }

      resolve(instanceId);
    });
  });
};

let currentIndex = 0;
const main = async () => {
  const instanceId = await getInstanceId();
  console.log("Recieved instanceId: " + instanceId);

  const dataSource = `http://localhost:3001/?instanceId=${instanceId}`;
  console.log("Fetching data source from proxy...");

  const data = await fetchDatasource(dataSource).catch((err) => {
    logger.error(
      {
        processName: "Proxy Error",
        error: err,
        userId: "",
      },
      () => terminateCurrentInstance({ instanceId })
    );
  });

  const { orgId, userId, templateId } = data[0];
  const url = await s3.getSignedUrlPromise("getObject", {
    Bucket: "adflow-templates",
    Key: generateAepFilePath(templateId),
    Expires: 60 * 60,
  });

  ORG_ID = orgId;
  USER_ID = userId;
  await installFonts(templateId, instanceId);

  async.forever(
    (next) => {
      (async () => {
        if (!data?.[currentIndex]) {
          await terminateCurrentInstance({ instanceId });
        } else {
          const item = data[currentIndex];
          await renderVideo(item, url, instanceId);
          currentIndex += 1;
          next();
        }
      })().catch((error) => {
        logger.error(
          {
            processName: "Main",
            error,
            userId: userId || "",
          },
          () => {
            terminateCurrentInstance({ instanceId });
          }
        );
      });
    },
    (err) => {
      console.log(err);
      logger.error(
        {
          processName: "Async forever",
          error: err,
          userId: userId || "",
        },
        () => {
          terminateCurrentInstance({ instanceId, reason: "error" });
        }
      );
    }
  );
};

try {
  main();
} catch (err) {
  logger.error({
    processName: "General Error",
    error: err,
    userId: "",
  });
}
