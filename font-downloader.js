require("dotenv").config({ path: __dirname + "/.env" });
const AWS = require("aws-sdk");
const https = require("https");
const fs = require("fs");
const spawn = require("child_process").spawn;
const rootUserPath = process.env.USERPROFILE.replace(/\\/g, "/");

const s3 = new AWS.S3({
  signatureVersion: "v4",
  region: "eu-north-1",
  accessKeyId: process.env.AWS_ID,
  secretAccessKey: process.env.AWS_SECRET,
});

const generateFontPath = (id) => {
  return `${id}/fonts`;
};

async function installFonts({ templateId, onError }) {
  return new Promise((resolve, reject) => {
    (async () => {
      await downloadFonts(generateFontPath(templateId)).catch((error) => {
        onError("Font download", error);
      });

      const child = spawn("powershell.exe", [
        `${rootUserPath}\\Desktop\\scripts\\shell\\install-fonts.ps1`,
      ]);

      child.on("exit", () => {
        console.log("--- Font install complete ---");
        resolve();
      });

      child.on("error", (error) => {
        onError("Nexrender Font Error", error);
      });
    })().catch(() => {
      reject();
    });
  });
}

const downloadFonts = (Prefix) => {
  const params = {
    Bucket: "adflow-templates",
    Prefix,
  };

  return new Promise((resolve) => {
    s3.listObjectsV2(params, function (err, data) {
      if (err) console.log(err, err.stack);
      // an error occurred
      else {
        const contents = data.Contents.filter((item) => item.Size > 0); // Removes folders
        const fileNames = contents.map((item) => item.Key.split("/").pop());
        const urls = contents.map((item) => {
          return s3.getSignedUrlPromise("getObject", {
            Bucket: "adflow-templates",
            Key: item.Key,
            Expires: 60 * 5,
          });
        });

        if (contents.length === 0)
          resolve("No fonts to download --- Continuing");

        Promise.all(urls).then((downloadUrls) => {
          downloadUrls.forEach((url, index) => {
            const destination = `${process.env.USERPROFILE}/Desktop/nexrender_cli/fonts/${fileNames[index]}`;
            const file = fs.createWriteStream(destination);

            https
              .get(url, function (response) {
                response.pipe(file);
                file.on("finish", () => {
                  file.close();

                  if (index === downloadUrls.length - 1) {
                    resolve("Finished downloading fonts!");
                  }
                });
              })
              .on("error", () => {
                fs.unlink(destination);
              });
          });
        });
      }
    });
  });
};

module.exports = { installFonts };
