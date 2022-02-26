const desktopPath = `${process.env.USERPROFILE}\\Desktop\\nexrender_cli`;

exports.config = {
  template: {
    src: "file:///G:/My Drive/Adflow/- Clients -/Axel Arigato/Templates/AXELARIGATO_01_FIT_HEIGHT_MASK_FIX.aep",
    composition: "AXEL_ARIGATO_1:1_1080x1080px",
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
        input: "result_00000.jpg",
        output: `${desktopPath}\\renders\\my_render.jpg`,
      },
    ],
  },
};
