const AWS = require("aws-sdk");
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

module.exports = { getEC2region, getInstanceId, rebootInstance };
