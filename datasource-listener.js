require('dotenv').config({ path: __dirname + '/.env' });
const { render } = require('@nexrender/core');
const fetch = require('node-fetch');
const async = require('async');
const AWS = require('aws-sdk');
const json = require('./configMiddleware').default();

const meta = new AWS.MetadataService();
const ec2 = new AWS.EC2({
  apiVersion: '2016-11-15',
  region: 'eu-north-1',
  accessKeyId: process.env.AWS_ID,
  secretAccessKey: process.env.AWS_SECRET,
});

const s3 = new AWS.S3({
  signatureVersion: 'v4',
  region: 'eu-north-1',
  accessKeyId: process.env.AWS_ID,
  secretAccessKey: process.env.AWS_SECRET,
});

const generateAepFileName = (name, id) =>
  `${name.replaceAll(' ', '_')}_${id}.aep`;

const rootUserPath = process.env.USERPROFILE.replace(/\\/g, '/');

let global_retries = 0;
// 30 seconds
const DATA_SOURCE_POLLING_INTERVAL = 1000 * 30;
// Multiply by polling interval to get time
const SHUTDOWN_LIMIT = 3;

function launchRenderInstance(data, instanceId) {
  console.log('DATA FOUND --- STARTING RENDER');

  const item = data[0];

  return s3
    .getSignedUrlPromise('getObject', {
      Bucket: 'adflow-templates',
      Key: generateAepFileName(item.meta.templateName, currentTemplate.id),
      Expires: 60 * 5,
    })
    .then((url) => {
      const outputFile = `${rootUserPath}/Desktop/nexrender_cli/renders/${item.id}.mp4`;

      json.assets = item.fields;

      if (item.static) json.assets.push(...item.static);

      // Config composition, pre- and postrender data
      json.template = {
        src: url,
        composition: item.target,
      };
      json.actions.prerender[0].data = { ...item, instanceId };
      json.actions.postrender[1].output = outputFile;
      json.actions.postrender[2].data = { ...item, instanceId };
      json.actions.postrender[2].filePath = outputFile;

      return render(json, {
        addLicense: true,
        workpath: `${rootUserPath}/Desktop/nexrender_cli/Temp`,
      });
    });
}

meta.request('/latest/meta-data/instance-id', function (err, instanceId) {
  console.log('Recieved instanceId: ' + instanceId);
  const dataSource = `http://localhost:3001/?orgId=${instanceId}`;

  async.forever(
    (next) => {
      if (global_retries >= SHUTDOWN_LIMIT) {
        console.log('Terminating instance');
        ec2.terminateInstances(
          { InstanceIds: [instanceId] },
          (err, data) => {}
        );
      } else {
        console.log('Checking data source for new data...');

        fetch(dataSource)
          .then((res) => res.json())
          .then((data) => {
            if (data.length > 0) {
              launchRenderInstance(data, instanceId).then(() => {
                global_retries = 0;
                next();
              });
            } else {
              setTimeout(() => {
                console.log('Retrying...');
                global_retries += 1;
                next();
              }, DATA_SOURCE_POLLING_INTERVAL);
            }
          });
      }
    },
    (err) => {
      throw err;
    }
  );
});
