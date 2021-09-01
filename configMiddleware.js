const desktopPath = `${process.env.USERPROFILE}\\Desktop\\nexrender_cli`;

exports.default = function () {
  return {
    template: {
      src: '',
      composition: '',
    },
    assets: [],
    actions: {
      prerender: [
        {
          module: `${desktopPath}/update.js`,
        },
      ],
      postrender: [
        {
          module: '@nexrender/action-encode',
          output: 'temp.mp4',
          preset: 'mp4',
        },
        {
          module: '@nexrender/action-copy',
          input: 'temp.mp4',
          output: `${desktopPath}\\renders\\my_render.mp4`,
        },
        {
          module: `${desktopPath}\\upload.js`,
        },
      ],
    },
  };
};
