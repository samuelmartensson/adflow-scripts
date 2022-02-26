const { render } = require("@nexrender/core");
const { config } = require("./config");

async function renderVideo(formatBatch) {
  const rootUserPath = process.env.USERPROFILE.replace(/\\/g, "/");

  config.template.outputModule = "JPEG";
  config.template.outputExt = "jpg";

  config.assets = formatBatch.items.flatMap((item) => item.fields);
  config.actions.postrender[0].data = {
    ...formatBatch,
    itemCount: formatBatch.items.length,
  };
  // config.actions.predownload[0].data = {
  //   ...formatBatch,
  //   itemCount: formatBatch.items.length,
  //   images: formatBatch.items.flatMap((item) =>
  //     item.fields.filter((field) => field.type === "image")
  //   ),
  // };

  render(config, {
    addLicense: true,
    workpath: `${rootUserPath}/Desktop/nexrender_cli/Temp`,
    reuse: true,
    debug: true,
    binary:
      "C:/Program Files/Adobe/Adobe After Effects 2022/Support Files/aerender.exe",
  }).catch((err) => {
    console.log(err);
  });
}

const example = {
  items: [
    {
      fields: [
        {
          layerName: "product_name",
          property: "Source Text",
          type: "data",
          value: "Clean 90 Bee Bird",
        },
        {
          layerName: "img01",
          src: "https://adflow-consumer-endpoint.s3.eu-north-1.amazonaws.com/WvszG3bsWDQ63qYhmPQ1B6XIxoy2/IOPS%20ALL/d995995a-f7c5-4ec4-833b-8c2bfbc1436a.jpg",
          type: "image",
        },
      ],
    },
    {
      fields: [
        {
          layerName: "product_name",
          property: "Source Text",
          type: "data",
          value: "Clean 123 Bee Bird",
        },
        {
          layerName: "img01",
          src: "https://adflow-consumer-endpoint.s3.eu-north-1.amazonaws.com/WvszG3bsWDQ63qYhmPQ1B6XIxoy2/IOPS%20ALL/d995995a-f7c5-4ec4-833b-8c2bfbc1436a.jpg",
          type: "image",
        },
      ],
    },
    {
      fields: [
        {
          layerName: "product_name",
          property: "Source Text",
          type: "data",
          value: "Clean xxx Bee Bird",
        },
        {
          layerName: "img01",
          src: "https://live.arigatocdn.com/media/catalog/product/1/1/11164_category.jpg",
          type: "image",
        },
      ],
    },
  ],
  batchName: "Men shoes",
  format: "9:16",
  referenceKey: "-MsfliNG6lZ3fJWsQalB",
  "render-status": "done",
  queuedAt: 1641411960639,
  target: "AXEL_ARIGATO_9:16_1080x1920px",
  templateId: "5ab0b582-a6f5-462b-86bd-92fc431d36cf",
  templateName: "AXEL ARIGATO (Copy)",
  orgId: "sCz1KX8hUyPhNfobmtw8",
  userId: "WvszG3bsWDQ63qYhmPQ1B6XIxoy2",
};

renderVideo(example);
