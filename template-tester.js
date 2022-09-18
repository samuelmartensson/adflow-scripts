const config = {
  templateDocumentId: "dquMlkDEaeT8V619Lf03",
  targetFormat: "9:16",
};
const placeholderImage =
  "https://live.arigatocdn.com/media/catalog/product/cache/1/image/2430x/a04baea7245968b7d53105b553a1dd89/ef180ca9638950a6c106523e66c94bf2/f/0/f0004028_productpage.webp";
const customLayers = {
  // Custom layer values here
  // key: configured layerName
  // value: any
  // example: produkt2: "https://www.image.com/image.png"
};

const AWS = require("aws-sdk");
const firebase = require("firebase-admin");
const { render } = require("@nexrender/core");
const { generateAepFilePath, setupRenderActions } = require("./utils");
const serviceAccount = require("./serviceaccountcred");
const { nexrender_path } = require("./consts");

const flattenFormSections = (values) => {
  let currentPageCount = 0;

  const fields = values.fields
    .map((section) => {
      if (section.copyCount === 1) {
        const array =
          section.nestedArray?.flatMap((nestedArray) => {
            return nestedArray.innerFields.map((item) => ({
              ...item,
              pageIndex: currentPageCount,
            }));
          }) || [];

        currentPageCount += 1;
        return array;
      }

      const layers = [];
      const copyCount = Number(section.copyCount);

      for (let index = 0; index < copyCount; index++) {
        // eslint-disable-next-line
        const sectionItems = section.nestedArray?.flatMap((nestedArray) => {
          return nestedArray.innerFields.map((item) => ({
            ...item,
            layerName: `${nestedArray.compName}${index + 1}.${item.layerName}`,
            pageIndex: index + currentPageCount,
          }));
        });

        layers.push(sectionItems);
      }

      currentPageCount += copyCount;
      return layers;
    })
    .flat(2);

  const pages = Math.max(...fields.map((item) => item.pageIndex || 0)) + 1;
  return { ...values, fields, pages };
};

const s3 = new AWS.S3({
  signatureVersion: "v4",
  region: "eu-north-1",
  accessKeyId: process.env.AWS_ID,
  secretAccessKey: process.env.AWS_SECRET,
});

if (firebase.apps.length === 0) {
  firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DB_URL,
  });
}

async function renderVideo({ item, url, templateId, staticFields }) {
  console.log("DATA FOUND --- STARTING RENDER");

  try {
    const renderConfig = await setupRenderActions({
      item,
      url,
      instanceId: "fakeId-123",
      templateId,
      staticFields,
      isTest: false,
    });
    const isVideo = !item.isImage && !item.powerRender;
    let postrender = [];
    if (item.isImage) {
      postrender = renderConfig.actions.postrender.slice(0, 1);
    } else {
      postrender = renderConfig.actions.postrender.slice(0, 2);
    }
    renderConfig.actions = {
      postrender,
    };
    renderConfig.template.outputModule = "Lossless";

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
    });
  } catch (error) {
    console.log(error);
  }
}

(async () => {
  const db = firebase.firestore();
  const { targetFormat, templateDocumentId } = config;

  const template = (
    await db.collection("templates").doc(templateDocumentId).get()
  ).data();

  const { id: templateId, format, staticFields = [] } = template;

  console.log(staticFields);

  const fields = flattenFormSections(template).fields.map((item) => {
    const { layerName, property, label, type } = item;

    if (type === "image") {
      return {
        type,
        name: layerName,
        layerName,
        src: customLayers[layerName] || placeholderImage,
      };
    }

    if (type === "data") {
      return {
        type,
        layerName,
        value: customLayers[layerName] || label,
        property,
      };
    }
  });

  const url = await s3.getSignedUrlPromise("getObject", {
    Bucket: "adflow-templates",
    Key: generateAepFilePath(templateId),
    Expires: 60 * 60,
  });

  if (!format[targetFormat]) {
    console.error("----------------------");
    console.error(targetFormat + " FORMAT DOES NOT EXIST");
    console.error("----------------------");
    console.error("Available formats are: ");

    Object.keys(format).forEach((item, index) => {
      console.error(`${index + 1}. ${item}`);
    });
    return;
  }

  renderVideo({
    item: {
      ...template,
      powerRender: false,
      fields,
      target: format[targetFormat],
    },
    templateId,
    url,
    staticFields: staticFields.map((item) => ({
      ...item,
      name: item.layerName,
    })),
  });
})();
