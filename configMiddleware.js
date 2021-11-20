const desktopPath = `${process.env.USERPROFILE}\\Desktop\\nexrender_cli`;
const scriptPath = `${process.env.USERPROFILE}\\Desktop\\scripts`;

const video = () => {
  return {
    template: {
      src: "",
      composition: "",
    },
    assets: [],
    actions: {
      prerender: [
        {
          module: `${scriptPath}\\update.js`,
        },
      ],
      postrender: [
        {
          module: "@nexrender/action-encode",
          output: "temp.mp4",
          preset: "mp4",
        },
        {
          module: "@nexrender/action-copy",
          input: "temp.mp4",
          output: `${desktopPath}\\renders\\my_render.mp4`,
        },
        {
          module: `${scriptPath}\\upload.js`,
        },
      ],
    },
  };
};

const image = () => {
  return {
    template: {
      src: "",
      composition: "",
    },
    assets: [],
    actions: {
      prerender: [
        {
          module: `${scriptPath}\\update.js`,
        },
      ],
      postrender: [
        {
          module: "@nexrender/action-copy",
          input: "result_00000.jpg",
          output: `${desktopPath}\\renders\\my_render.jpg`,
        },
        {
          module: `${scriptPath}\\upload.js`,
        },
      ],
    },
  };
};
/**
 *
 * @param {type} type String
 * @returns object
 */
const getFunction = (type) => {
  switch (type) {
    case "image":
      return image();
    default:
      return video();
  }
};

exports.default = getFunction;
