require("dotenv").config({ path: __dirname + "/.env" });
const logger = require("./logger").default;
const fileType = require("file-type");
const { nexrender_path } = require("./consts");
const fs = require("fs");

module.exports = (job, settings, action) => {
  const { data } = action;

  return new Promise((resolve) => {
    try {
      job.assets = job.assets.map((item) => {
        if (item.type === "image" && item?.name) {
          const srcExtension = item.src
            .split(".")
            .find((ext) => ["jpeg", "jpg", "png", "webp"].includes(ext));

          if (srcExtension) return item;

          const img = fs.readFileSync(
            `${nexrender_path}/Temp/${job.uid}/${item.name}`
          );
          const extension = fileType(img).extension;

          return {
            ...item,
            name: `${item.name}.${extension}`,
            extension,
          };
        }

        return item;
      });
      resolve(job);
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
