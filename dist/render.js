"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQueueMessage = void 0;
var QUEUE_URL = "https://sqs.eu-north-1.amazonaws.com/569934194411/render";
var getQueueMessage = function (sqs) {
    return new Promise(function (resolve) {
        console.log("FETCHING QUEUE MESSAGES");
        sqs.receiveMessage({
            QueueUrl: QUEUE_URL,
            VisibilityTimeout: 10,
            WaitTimeSeconds: 5,
        }, function (err, data) {
            var _a;
            if (!(data === null || data === void 0 ? void 0 : data.Messages))
                resolve(null);
            (_a = data.Messages) === null || _a === void 0 ? void 0 : _a.forEach(function (msg) {
                resolve(msg);
            });
        });
    });
};
exports.getQueueMessage = getQueueMessage;
// Next steps
// Create 1 queue per customer
// When queuing render items, we also need to save the customers SQS queue URL for each started instance
// Use only the instances assigned queue URL since there will be no general queue.
//
