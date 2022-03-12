const desktopPath = `${process.env.USERPROFILE}\\Desktop\\nexrender_cli`;

exports.config = {
  template: {
    src: "file:///C:/Users/samue/Downloads/test.aep",
    composition: "02_AXEL_ARIGATO_1:1_1080x1080px",
    outputExt: "avi",
    outputModule: "Lossless",
  },
  assets: [],
  actions: {
    // predownload: [
    //   {
    //     module: "C:/Users/samue/Desktop/code/adflow-scripts/discord.js",
    //   },
    // ],
    postrender: [
      {
        module: "@nexrender/action-copy",
        input: "result.avi",
        output: `${desktopPath}\\renders\\my_render.mp4`,
      },
    ],
  },
};
