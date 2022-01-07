exports.config = {
  template: {
    src: "file:///G:/My Drive/Adflow/- Clients -/Axel Arigato/Templates/AXELARIGATO_MULTI.aep",
    composition: "AXEL_ARIGATO_9:16_1080x1920px",
    outputExt: "jpg",
    outputModule: "JPEG",
  },
  assets: [
    {
      src: "https://live.arigatocdn.com/media/catalog/product/1/1/11050_category.jpg",
      layerName: "img1",
      type: "image",
    },
    {
      src: "https://live.arigatocdn.com/media/catalog/product/1/5/15190_1es.jpg",
      layerName: "img2",
      type: "image",
    },
    {
      src: "https://live.arigatocdn.com/media/catalog/product/1/1/11033_category.jpg",
      layerName: "img3",
      type: "image",
    },
    {
      src: "https://live.arigatocdn.com/media/catalog/product/4/1/41019_category.jpg",
      layerName: "img4",
      type: "image",
    },
    {
      src: "https://live.arigatocdn.com/media/catalog/product/4/1/41019_category.jpg",
      layerName: "img5",
      type: "image",
    },
    {
      type: "data",
      property: "Source Text",
      value: "test 11",
      layerName: "product_name1",
    },
    {
      type: "data",
      property: "Source Text",
      value: "test 2",
      layerName: "product_name2",
    },
    {
      type: "data",
      property: "Source Text",
      value: "test 3",
      layerName: "product_name3",
    },
    {
      type: "data",
      property: "Source Text",
      value: "test 4",
      layerName: "product_name4",
    },
    {
      type: "data",
      property: "Source Text",
      value: "test 5",
      layerName: "product_name5",
    },
  ],
  actions: {
    postrender: [
      {
        module:
          "C:/Users/samue/Desktop/code/adflow-scripts/local/postrender.js",
      },
      {
        module: "C:/Users/samue/Desktop/code/adflow-scripts/local/upload.js",
      },
    ],
  },
};
