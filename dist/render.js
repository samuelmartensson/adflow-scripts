"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQueueMessage = void 0;
require("dotenv").config({ path: __dirname + "/.env" });
var aws_sdk_1 = require("aws-sdk");
var async_1 = require("async");
// @ts-ignore
var localRender_1 = require("./local/localRender");
var QUEUE_URL = "https://sqs.eu-north-1.amazonaws.com/569934194411/render";
var sqs = new aws_sdk_1.default.SQS({
    region: "eu-north-1",
    credentials: {
        accessKeyId: process.env.AWS_ID,
        secretAccessKey: process.env.AWS_SECRET,
    },
});
var getQueueMessage = function () {
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
async_1.default.forever(function (next) {
    (function () { return __awaiter(void 0, void 0, void 0, function () {
        var msg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, exports.getQueueMessage)()];
                case 1:
                    msg = _a.sent();
                    if (!msg || !msg.ReceiptHandle || !msg.Body) {
                        console.log("No more messages --- EXIT PROCESS");
                        return [2 /*return*/];
                    }
                    sqs.deleteMessage({ QueueUrl: QUEUE_URL, ReceiptHandle: msg.ReceiptHandle }, function () { return console.log("DELETED", msg.ReceiptHandle); });
                    return [4 /*yield*/, (0, localRender_1.default)(JSON.parse(msg.Body))];
                case 2:
                    _a.sent();
                    next();
                    return [2 /*return*/];
            }
        });
    }); })();
}, function (e) { return console.log(e); });
// Next steps
// Create 1 queue per customer
// When queuing render items, we also need to save the customers SQS queue URL for each started instance
// Use only the instances assigned queue URL since there will be no general queue.
//
