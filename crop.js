const gm = require("gm");

async function getCoordinates(src) {
  const vision = require("@google-cloud/vision");
  const client = new vision.ImageAnnotatorClient();

  const [result] = await client.objectLocalization(src);
  const localizedObjectAnnotations = result.localizedObjectAnnotations;
  return localizedObjectAnnotations[0];
}

const center = (vertices) => {
  const [topLeft, topRight, bottomRight, bottomLeft] = vertices;
  const xPos = topLeft.x + (topRight.x - topLeft.x) / 2; // Top middle
  const yPos = topLeft.y + (bottomLeft.y - topLeft.y) / 2; // Left middle
  return { xPos, yPos, topLeft, topRight, bottomRight, bottomLeft };
};

// const file =
//   "G:/My Drive/Adflow/- Clients -/Coop/- Material -/Vision AI/4417019_Köttbullar med brynt smör.jpg";

let width = 1080;
let height = 1920;

const centerOfObject = (originalSize, axis, xCenter = 0.5) => {
  const isX = axis === "x";

  return originalSize[isX ? "width" : "height"] * xCenter;
};

const crop = (file) => {
  return new Promise((resolve) => {
    gm(file).size(async function (err, size) {
      console.log(size);
      const coords = await getCoordinates(file);
      const vertices = coords.boundingPoly.normalizedVertices;
      const [topLeft, topRight, bottomRight] = vertices;
      const { xPos, yPos } = center(vertices);

      const marginTop = topRight.y * size.height;
      const marginBottom = size.height - bottomRight.y * size.height;
      const marginLeft = topLeft.x * size.width;
      const marginRight = size.width - topRight.x * size.width;
      const aspectRatio = width / height;

      const marginX = Math.min(marginLeft, marginRight);
      const smallestMarginX = marginX === marginLeft ? "left" : "right";

      const marginY = Math.min(marginTop, marginBottom);
      const smallestMarginY = marginY === marginTop ? "top" : "bottom";

      const margin = Math.min(marginX, marginY);
      const smallestMargin = marginX === margin ? "x" : "y";

      console.log({
        marginBottom,
        marginTop,
        marginLeft,
        marginRight,
      });

      const objWidth = (topRight.x - topLeft.x) * size.width;
      const objHeight = (bottomRight.y - topRight.y) * size.height;
      const actualWidth = Math.max(objWidth, objHeight);
      const positionX = Math.min(
        (actualWidth + margin * 2) * aspectRatio,
        width
      );
      const positionY = actualWidth + margin * 2;

      const topLeftX = centerOfObject(size, "x", xPos) - positionX / 2;
      const topLeftY = centerOfObject(size, "y", yPos) - positionY / 2;

      const cropX = smallestMarginX === "left" ? 0 : marginLeft - margin;
      const cropY = smallestMarginY === "top" ? 0 : marginTop - margin;

      console.log({
        actualWidth,
        positionX,
        positionY,
        topLeftX,
        topLeftY,
        margin,
        smallestMarginX,
        smallestMarginY,
        smallestMargin,
        cropX,
        cropY,
      });

      gm(file)
        .crop(
          positionX,
          positionY,
          aspectRatio > 1 && smallestMargin === "x" ? cropX : topLeftX,
          aspectRatio > 1 && smallestMargin === "y" ? cropY : topLeftY
        )
        .resize(width, height, "^")
        .write(`output.jpg`, function (err) {
          resolve({ xPos, yPos });
          console.log(err);
          if (!err) console.log("done");
        });
    });
  });
};

module.exports.crop = crop;
