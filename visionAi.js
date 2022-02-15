const { crop } = require("./crop");
const fetch = require("node-fetch");

// const rightCenter = (vertices) => {
//   const [topLeft, topRight, bottomRight, bottomLeft] = vertices;
//   const xPos = topRight.x;
//   const yPos = topLeft.y + (bottomLeft.y - topLeft.y) / 2;
//   return { xPos, yPos };
// };

// const leftCenter = (vertices) => {
//   const [topLeft, , , bottomLeft] = vertices;
//   const xPos = topLeft.x;
//   const yPos = topLeft.y + (bottomLeft.y - topLeft.y) / 2;
//   return { xPos, yPos };
// };

// const getCornerCoordinate = (vertices, placement) => {
//   const [topLeft, topRight, bottomRight, bottomLeft] = vertices;
//   const index = ["topLeft", "topRight", "bottomRight", "bottomLeft"].findIndex(
//     (item) => item === placement
//   );
//   const { x, y } = vertices[index];

//   return { xPos: x, yPos: y, topLeft, topRight, bottomRight, bottomLeft };
// };

// const center = (vertices) => {
//   const [topLeft, topRight, bottomRight, bottomLeft] = vertices;
//   const xPos = topLeft.x + (topRight.x - topLeft.x) / 2; // Top middle
//   const yPos = topLeft.y + (bottomLeft.y - topLeft.y) / 2; // Left middle
//   return { xPos, yPos, topLeft, topRight, bottomRight, bottomLeft };
// };

// // Get center coordinates of the object which is closest to the middle of the image
// // Uses top middle and top left
// const getClosestToCenter = (localizedObjectAnnotations) => {
//   const vertices = localizedObjectAnnotations.map((item) => {
//     const { xPos, yPos, topLeft } = center(
//       item.boundingPoly.normalizedVertices
//     );

//     const coefficient = (xPos + topLeft.y) / 2;
//     return { coefficient, coords: [xPos, yPos] };
//   });

//   // 0.5 on xy is center of image,
//   // smallest absolute value of coefficient - 0.5 will be closest to the center
//   const smallest = vertices.map((item) => ({
//     ...item,
//     n: Math.abs(item.coefficient - 0.5),
//   }));

//   const [xPos, yPos] = smallest.find(
//     (item) => item.n === Math.min(...smallest.map((item) => item.n))
//   ).coords;

//   return { xPos, yPos };
// };

// const getPosition = (position, localizedObjectAnnotations) => {
//   switch (position) {
//     case "center": {
//       return center(
//         localizedObjectAnnotations[0].boundingPoly.normalizedVertices
//       );
//     }
//     case "closestCenter": {
//       return getClosestToCenter(localizedObjectAnnotations);
//     }
//     default:
//       return false;
//   }
// };

// async function getCoordinates(src, position) {
//   const vision = require("@google-cloud/vision");
//   const client = new vision.ImageAnnotatorClient();

//   const [result] = await client.objectLocalization(src);
//   const localizedObjectAnnotations = result.localizedObjectAnnotations;

//   return getPosition(position, localizedObjectAnnotations);
// }

// module.exports = (job, settings, action) => {
//   const { data } = action;

//   return new Promise((resolve, reject) => {
//     const promises = [...Array(data.itemCount).keys()].map((index) => {
//       return new Promise((innerResolve) => {
//         const field = data.images[index];

//         crop(field.input).then(({ xPos, yPos }) => {
//           if (xPos && yPos) {
//             job.assets.push({
//               layerName: "splash_position",
//               type: "data",
//               property: "Position",
//               value: [xPos, yPos],
//             });
//           }
//           console.log(job.assets);
//           innerResolve();
//         });
//       });
//     });

//     Promise.all(promises).then(() => {
//       resolve(job);
//     });
//   });
// };

fetch(
  "https://m1.arigatocdn.com/media//catalog/product/cache/1/image/2250x/d3ed0d7a1d19c36dd7043c85d80335f2/85951176ec9454ab8e61b80130ad13a5/3/8/3840x2160_landing_page_desktop_wk4_ss22_varsity.jpg"
)
  .then((res) => res.arrayBuffer())
  .then((buffer) => {
    const image = Buffer.from(buffer);
    console.log(image);
    crop(
      "G:/My Drive/Adflow/- Clients -/Coop/- Material -/Vision AI/4559067_Pho- vietnamesisk köttsoppa.jpg"
    ).then(({ xPos, yPos }) => console.log(xPos, yPos));
  });
