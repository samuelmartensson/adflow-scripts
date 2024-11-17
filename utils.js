require("dotenv").config({ path: __dirname + "/.env" });
const AWS = require("aws-sdk");
const meta = new AWS.MetadataService();
const { nexrender_path } = require("./consts");
const getConfig = require("./configMiddleware").default;

const generateAepFilePath = (id) => {
  return `${id}/project.aep`;
};

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

const rebootInstance = async () => {
  const instanceId = await getInstanceId();
  const ec2region = await getEC2region();
  const ec2 = new AWS.EC2({
    apiVersion: "2016-11-15",
    region: ec2region,
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
  });
  ec2.rebootInstances({ InstanceIds: [instanceId] }, () => {});
};

const setupRenderActions = ({ item, instanceId, url, staticFields }) => {
  const { isImage, powerRender } = item;
  const outputFile = `${nexrender_path}/renders/${item.id}.${
    isImage ? "jpg" : "mp4"
  }`;
  const json = powerRender
    ? getConfig("powerRender")
    : getConfig(isImage ? "image" : "video");

  json.template = {
    src: decodeURIComponent(url),
    composition: item.target,
    continueOnMissing: true,
  };

  json.actions.postdownload[0].data = { ...item, instanceId };

  if (isImage || powerRender) {
    json.template.outputModule = "JPEG";
    json.template.outputExt = "jpg";
  }

  const jobMetadata = {
    ...item,
    instanceId,
    itemCount: item?.items?.length || 0,
  };

  if (powerRender) {
    json.assets = item.items.flatMap((item, index) =>
      item.fields.map((field) => ({
        ...field,
        layerName: `${field.layerName}${index + 1}`,
      }))
    );
    json.actions.postrender[0].data = jobMetadata;
    json.actions.postrender[1].data = jobMetadata;
    return json;
  }

  if (isImage) {
    json.assets = [...item.fields, ...staticFields];
    json.actions.postrender[0].output = outputFile;
    json.actions.postrender[1].filePath = outputFile;
    json.actions.postrender[1].data = { ...item, instanceId };
    return json;
  }

  // video
  json.assets = [...item.fields, ...staticFields];

  json.actions.postrender[1].output = outputFile;
  json.actions.postrender[2].data = jobMetadata;
  json.actions.postrender[2].filePath = outputFile;
  return json;
};

module.exports = {
  getEC2region,
  getInstanceId,
  rebootInstance,
  generateAepFilePath,
  setupRenderActions,
};
