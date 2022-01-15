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

  return new Promise((resolve, reject) => {
    const promises = [...Array(data.itemCount).keys()].map((index) => {
      return new Promise((innerResolve) => {
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
            innerResolve();
          });
          rd.pipe(wr);
        } catch (error) {
          rd.destroy();
          wr.end();
          throw error;
        }
      });
    });

    Promise.all(promises).then(() => {
      resolve(job);
    });
  });
};
