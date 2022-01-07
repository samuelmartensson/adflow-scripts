const fs = require("fs");

function generateResultName(n) {
  const chars = n.toString().length;
  const diff = 5 - chars;
  let prefix = "";

  for (let index = 0; index < diff; index++) {
    prefix += "0";
  }

  return `result_${prefix}${n}.jpg`;
}

module.exports = (job, settings, action) => {
  const { data } = action;
  const rootUserPath = process.env.USERPROFILE.replace(/\\/g, "/");
  const uid = job.uid;
  const assetsLength = job.assets.filter(
    (item) => item.type === "image"
  ).length;

  return new Promise((resolve, reject) => {
    for (let index = 0; index < assetsLength; index++) {
      const { id } = data.items[index];
      const rd = fs.createReadStream(
        `${rootUserPath}/Desktop/nexrender_cli/Temp/${uid}/` +
          generateResultName(index)
      );
      const wr = fs.createWriteStream(
        `${rootUserPath}/Desktop/nexrender_cli/renders/${id}.jpg`
      );
      try {
        rd.on("error", reject);
        wr.on("error", reject);
        wr.on("finish", () => {
          if (index === assetsLength - 1) {
            resolve(job);
          }
        });
        rd.pipe(wr);
      } catch (error) {
        rd.destroy();
        wr.end();
        throw error;
      }
    }
  });
};
