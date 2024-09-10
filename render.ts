import AWS from "aws-sdk";

const QUEUE_URL = "https://sqs.eu-north-1.amazonaws.com/569934194411/render";

export const getQueueMessage = (
  sqs: AWS.SQS
): Promise<null | AWS.SQS.Message> =>
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

// Next steps
// Create 1 queue per customer
// When queuing render items, we also need to save the customers SQS queue URL for each started instance
// Use only the instances assigned queue URL since there will be no general queue.
//
