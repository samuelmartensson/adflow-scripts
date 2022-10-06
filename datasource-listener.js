require("dotenv").config({ path: __dirname + "/.env" });
const { render } = require("@nexrender/core");
const async = require("async");
const AWS = require("aws-sdk");
const firebase = require("firebase-admin");
const serviceAccount = require("./serviceaccountcred");
const { installFonts } = require("./font-downloader");
const logger = require("./logger").default;
const {
  getEC2region,
  getInstanceId,
  generateAepFilePath,
  setupRenderActions,
} = require("./utils");
const { fetchQueueData } = require("./proxy");
const { nexrender_path } = require("./consts");

if (firebase.apps.length === 0) {
  firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DB_URL,
  });
}

let ORG_ID = "";
let USER_ID = "";
let BATCH_ID = "";
let SCHEDULED = false;
let DATA = [];
let currentIndex = -1;
const s3 = new AWS.S3({
  signatureVersion: "v4",
  region: "eu-north-1",
  accessKeyId: process.env.AWS_ID,
  secretAccessKey: process.env.AWS_SECRET,
});

async function terminateCurrentInstance({ instanceId }) {
  try {
    const rtbdRef = firebase.database().ref(instanceId);
    const ref = firebase
      .firestore()
      .collection(`organizations/${ORG_ID}/instances`);
    await rtbdRef.remove();
    await ref.doc(instanceId).delete();
    if (BATCH_ID && !SCHEDULED) {
      await firebase
        .firestore()
        .collection(`users/${USER_ID}/batchNames`)
        .doc(BATCH_ID)
        .update({ instances: firebase.firestore.FieldValue.increment(-1) });
    }
  } catch (error) {
    logger.error({
      processName: "Failed instance cleanup",
      error,
      userId: USER_ID || "",
    });
  } finally {
    const ec2region = await getEC2region();
    const ec2 = new AWS.EC2({
      apiVersion: "2016-11-15",
      region: ec2region,
      accessKeyId: process.env.AWS_ID,
      secretAccessKey: process.env.AWS_SECRET,
    });
    ec2.terminateInstances({ InstanceIds: [instanceId] }, () => {});
  }
}

const logAndTerminate = (processName, instanceId, error = "", userId = "") => {
  return new Promise(() => {
    logger.error(
      {
        processName,
        error,
        userId,
      },
      () => {
        terminateCurrentInstance({ instanceId });
      }
    );
  });
};

const rehydrateDataQueue = async ({ instanceId }) => {
  const data = await fetchQueueData(instanceId).catch((error) => {
    logAndTerminate("Fetch queue", instanceId, error);
  });

  DATA = data;

  return null;
};

const runErrorAction = async ({
  error,
  item,
  instanceId,
  batchName,
  isPowerRender,
}) => {
  const ref = firebase
    .firestore()
    .collection(`users/${item.userId}/renderErrors`);
  const rtdbRef = firebase.database().ref(`${instanceId}/${item.referenceKey}`);
  let options = { src: "", type: "" };

  const requeueRehydrate = async (src) => {
    console.log(
      "------------------- REQUEING AND REHYDRATING -------------------"
    );

    const requeue = {
      ...item,
      items: item?.items?.filter(
        (item) => !item?.fields?.find((field) => field?.src === src)
      ),
    };

    currentIndex -= 1;
    await rtdbRef.set(requeue);
    await rehydrateDataQueue({ instanceId });
    Promise.resolve();
  };

  if (
    error?.code === "ECONNRESET" ||
    error?.code === "ENOTFOUND" ||
    error?.code?.includes("ERR_INVALID_URL")
  ) {
    options = {
      src: error.message.split(" ").find((item) => item.includes("http")),
      type: "connection_failed",
    };
  }

  if (error?.reason?.includes("error downloading file")) {
    options = {
      src: error?.meta?.src || "",
      type: "download_failed",
    };
  }

  if (options.src) {
    const failedItem = !isPowerRender
      ? item
      : item?.items?.find((item) =>
          item?.fields?.find((field) => field?.src === options.src)
        );

    await ref.doc().set({
      type: options.type,
      retryable: false,
      item: failedItem,
      format: item.format,
      src: options.src,
      timestamp: Date.now(),
      batchName,
    });

    if (isPowerRender) {
      await requeueRehydrate(options.src);
    } else {
      rtdbRef.update({ "render-status": "error" });
    }

    return Promise.resolve();
  }

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
        ...(isPowerRender && { items: item.items }),
        batchName,
        format: item.format,
        timestamp: Date.now(),
      });
      terminateCurrentInstance({ instanceId });
    }
  );
};

async function renderVideo({
  item,
  url,
  instanceId,
  templateId,
  staticFields,
  next,
}) {
  console.log("DATA FOUND --- STARTING RENDER");

  try {
    const renderConfig = setupRenderActions({
      item,
      url,
      instanceId,
      templateId,
      staticFields,
    });
    const isVideo = !item.isImage && !item.powerRender;

    render(renderConfig, {
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
    })
      .then(() => {
        next();
      })
      .catch((error) => {
        console.log(error);
        runErrorAction({
          error,
          item,
          instanceId,
          batchName: item.batchName,
          isPowerRender: !!item?.powerRender,
        }).then(() => {
          next();
        });
      });
  } catch (error) {
    console.log(error);
    logAndTerminate("renderVideo", instanceId, error, item.userId);
  }
}

const main = async () => {
  // If this fails then IDK, send alert maybe?
  const instanceId = await getInstanceId();

  try {
    console.log("Recieved instanceId: " + instanceId);
    console.log("Fetching data from RTDB...");
    const data = await fetchQueueData(instanceId).catch((error) => {
      logAndTerminate("Fetch queue", instanceId, error);
    });
    DATA = data.filter((item) => item["render-status"] !== "done");

    if (!data) {
      await logAndTerminate("No data", instanceId);
    }

    const { orgId, userId, templateId, batchId } = data[0];
    const url = await s3.getSignedUrlPromise("getObject", {
      Bucket: "adflow-templates",
      Key: generateAepFilePath(templateId),
      Expires: 60 * 60,
    });
    const { staticFields = [] } =
      (
        await firebase
          .firestore()
          .collection("templates")
          .where("id", "==", templateId)
          .get()
      )?.docs?.[0]?.data() || [];

    const { scheduled = false } = (
      await firebase
        .firestore()
        .collection("users")
        .doc(userId)
        .collection("batchNames")
        .doc(batchId)
        .get()
    ).data();

    ORG_ID = orgId;
    USER_ID = userId;
    BATCH_ID = batchId;
    SCHEDULED = scheduled;

    await installFonts({
      templateId,
      userId,
      onError: (reason, error) =>
        logAndTerminate(reason, instanceId, error, userId),
    });

    async.forever(
      (next) => {
        (async () => {
          currentIndex += 1;
          const item = DATA?.[currentIndex];

          if (!item) {
            await terminateCurrentInstance({ instanceId });
          } else {
            await renderVideo({
              item,
              url,
              instanceId,
              templateId,
              next,
              staticFields,
            });
          }
        })().catch((error) => {
          logAndTerminate("Main queue", instanceId, error, userId);
        });
      },
      (error) => {
        logAndTerminate("Async forever", instanceId, error, userId);
      }
    );
  } catch (error) {
    logAndTerminate("Setup", instanceId, error);
  }
};

try {
  main();
} catch (error) {
  logger.error({
    processName: "General Error",
    error,
  });
}
