const desktopPath = `${process.env.USERPROFILE}\\Desktop\\nexrender_cli`;
const scriptPath = `${process.env.USERPROFILE}\\Desktop\\scripts`;

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
          module: `${scriptPath}\\update.js`,
        },
        {
          module: '@nexrender/action-cache',
          cacheDirectory: '~/cache',
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
          module: `${scriptPath}\\upload.js`,
        },
        {
          module: '@nexrender/action-cache',
          cacheDirectory: '~/cache',
        },
      ],
    },
  };
};
