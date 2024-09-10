require("dotenv").config({ path: __dirname + "/.env" });
import AWS from "aws-sdk";
import async from "async";
// @ts-ignore
import renderVideo from "./local/localRender";

const QUEUE_URL = "https://sqs.eu-north-1.amazonaws.com/569934194411/render";

const sqs = new AWS.SQS({
  region: "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ID!,
    secretAccessKey: process.env.AWS_SECRET!,
  },
});

export const getQueueMessage = (): Promise<null | AWS.SQS.Message> =>
  new Promise((resolve) => {
    console.log("FETCHING QUEUE MESSAGES");

    sqs.receiveMessage(
      {
        QueueUrl: QUEUE_URL,
        VisibilityTimeout: 10,
        WaitTimeSeconds: 5,
      },
      (err, data) => {
        if (!data?.Messages) resolve(null);

        data.Messages?.forEach((msg) => {
          resolve(msg);
        });
      }
    );
  });

async.forever(
  (next) => {
    (async () => {
      const msg = await getQueueMessage();

      if (!msg || !msg.ReceiptHandle || !msg.Body) {
        console.log("No more messages --- EXIT PROCESS");
        return;
      }

      sqs.deleteMessage(
        { QueueUrl: QUEUE_URL, ReceiptHandle: msg.ReceiptHandle },
        () => console.log("DELETED", msg.ReceiptHandle)
      );

      await renderVideo(JSON.parse(msg.Body));
      next();
    })();
  },
  (e) => console.log(e)
);

// Next steps
// Create 1 queue per customer
// When queuing render items, we also need to save the customers SQS queue URL for each started instance
// Use only the instances assigned queue URL since there will be no general queue.
//
