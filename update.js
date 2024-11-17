require("dotenv").config({ path: __dirname + "/.env" });
const logger = require("./logger").default;
const { nexrender_path } = require("./consts");
const fs = require("fs");

module.exports = (job, settings, action) => {
  const { data } = action;

  return new Promise((resolve) => {
    try {
      Promise.all(
        job.assets.map(async (item) => {
          if (item.type === "image" && item?.name) {
            const srcExtension = item.src
              .split(".")
              .find((ext) => ["jpeg", "jpg", "png", "webp"].includes(ext));

            if (srcExtension) return item;

            const img = fs.readFileSync(
              `${nexrender_path}/Temp/${job.uid}/${item.name}`
            );
            const { fileTypeFromBuffer } = await import("file-type");
            const extension = (await fileTypeFromBuffer(img)).ext;
            fs.renameSync(
              `${nexrender_path}/Temp/${job.uid}/${item.name}`,
              `${nexrender_path}/Temp/${job.uid}/${item.name}.${extension}`
            );

            return {
              ...item,
              dest: `${item.dest}.${extension}`,
              name: `${item.name}.${extension}`,
            };
          }

          return item;
        })
      ).then((result) => {
        job.assets = result;
        resolve(job);
      });
    } catch (err) {
      logger.error(
        {
          processName: "update",
          error: JSON.stringify(err),
          userId: data.userId,
        },
        () => {
          resolve(job);
        }
      );
    }
  });
};
