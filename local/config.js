const desktopPath = `${process.env.USERPROFILE}\\Desktop\\nexrender_cli`;

exports.config = {
  template: {
    src: "file:///G:/My Drive/Adflow/- Clients -/Coop/Templates/Veckans godaste recept/Coop_SoMe_Veckans Godaste Recept_1080x1920px.aep",
    composition: "Coop_SoMe_Veckans Godaste Recept_1080x1920px",
    outputExt: "avi",
    outputModule: "Lossless",
  },
  assets: [],
  actions: {
    predownload: [
      {
        module: "C:/Users/samue/Desktop/code/adflow-scripts/discord.js",
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
    ],
  },
};
