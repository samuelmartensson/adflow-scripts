const { render } = require("@nexrender/core");
const { config } = require("./config");

async function renderVideo(formatBatch) {
  const rootUserPath = process.env.USERPROFILE.replace(/\\/g, "/");

  // config.template.outputModule = "JPEG";
  // config.template.outputExt = "jpg";

  config.assets = formatBatch.items.flatMap((item) => item.fields);
  config.actions.postrender[0].data = {
    ...formatBatch,
    itemCount: formatBatch.items.length,
  };
  config.actions.predownload[0].data = {
    ...formatBatch,
    itemCount: formatBatch.items.length,
    images: formatBatch.items.flatMap((item) =>
      item.fields.filter((field) => field.type === "image")
    ),
  };

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
      id: "2b76980a-790b-4774-b96c-1b4b41668847",
      compiledRenderConfig: {
        displayName: "Clean 90 Bee Bird",
        img01:
          "https://live.arigatocdn.com/media/catalog/product/cache/1/image/1080x/4b94e107d0a428ae8d470812ab9f4552/3413f40c3613cb6837cfcb48d666a211/2/8/28741_category.jpg",
        product_name: "Clean 90 Bee Bird",
        scheduleId: "28741",
      },
      fields: [
        {
          layerName: "recept_namn",
          property: "Source Text",
          type: "data",
          value: "Paj med pumpa!",
        },
        {
          layerName: "recept_img",
          input:
            "G:/My Drive/Adflow/- Clients -/Coop/Templates/Veckans godaste recept/- Material -/Recept/3748952_Hamburgare med spetskål, senapsmajonnäs och picklad rödlök.jpg",
          src: "file:///C:/Users/samue/Desktop/code/adflow-scripts/local/output.jpg",
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
