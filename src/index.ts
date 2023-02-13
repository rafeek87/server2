import "reflect-metadata";
import express from "express";
import { Request, Response } from "express";
import bodyParser = require("body-parser");
import morgan = require("morgan");
import { myDataSource } from "./app-data-source";
import { myDataSource as masterDataSource } from "./app-data-source";
import { checkIfTicketIsBlocked } from "./utils/ticketBlocks";
const userRoutesV1 = require("./controllers/user.controller");
const billRoutesV1 = require("./controllers/bill.controller");
const salesReportRoutesV1 = require("./controllers/sales-report.controller");
const resultRoutesV1 = require("./controllers/result.controller");
const winningRoutesV1 = require("./controllers/winning.controller");
import { router as summeryRoutesV1 } from "./controllers/summery.controller";
import { router as schemeRoutesV1 } from "./controllers/scheme.controller";
// import { tables } from "./constants/tables";
// import * as AWS from "aws-sdk";
import dayjs = require("dayjs");
import { hardDeleteWithDate } from "./utils/sqlHelpers";
const cluster = require("cluster");
var cron = require("node-cron");

require("dotenv").config();

const cCPUs = require("os").cpus().length;

// AWS.config.logger = console;

if (cluster.isMaster) {
  // Create a worker for each CPU
  for (let i = 0; i < cCPUs; i++) {
    cluster.fork();
  }
  cluster.on("online", function (worker) {
    console.log("Worker " + worker.process.pid + " is online.");
  });
  cluster.on("exit", function (worker, code, signal) {
    console.log("worker " + worker.process.pid + " died.");
  });

  const retentionPeriod = 15;
  const isCleanUpEnabled = true;

  cron.schedule(
    "30 0 * * *",
    () => {
      const targetDate = dayjs()
        .tz("Asia/Kolkata", true)
        .subtract(retentionPeriod + 1, "day")
        .format("YYYY-MM-DD");
      console.log("Running bill cleanup job for the date ", targetDate);
      console.log(
        "Cleanup timestamp - ",
        dayjs().tz("Asia/Kolkata", true).format("MMM D, YYYY h:mm A")
      );
      masterDataSource
        .initialize()
        .then(() => {
          console.log(
            "Master data Source has been initialized for ticket cleanup..."
          );
          hardDeleteWithDate({
            ticketName: "ALL",
            startDate: targetDate,
            endDate: targetDate,
          })
            .then(() => {
              console.log("Bills cleanup completed");
              masterDataSource
                .destroy()
                .then(() => {
                  console.log("Master data Source has been destroyed");
                })
                .catch((err) => {
                  console.log("Error destroying master data source" + err);
                });
            })
            .catch((err) => {
              console.log("Error executing cleanup");
              console.log(err);
            });
        })
        .catch((err) => {
          console.log("Error creating datasource for ticket cleanup" + err);
        });
    },
    {
      scheduled: isCleanUpEnabled,
      timezone: "Asia/Kolkata",
    }
  );
} else {
  myDataSource
    .initialize()
    .then(() => {
      console.log("Data Source has been initialized!");

      const app = express();
      app.use(morgan("dev"));
      app.use(express.json());
      app.use(
        bodyParser.urlencoded({
          // to support URL-encoded bodies
          extended: true,
        })
      );

      app.get("/ping", (req: Request, res: Response) => {
        return res.send({ message: "Pinged" });
      });

      app.use("/user/v1", userRoutesV1);
      app.use("/bill/v1", billRoutesV1);
      app.use("/sales-report/v1", salesReportRoutesV1);
      app.use("/result/v1", resultRoutesV1);
      app.use("/winning/v1", winningRoutesV1);
      app.use("/summery/v1", summeryRoutesV1);
      app.use("/scheme/v1", schemeRoutesV1);

      // app.get("/addapptousers", addapptousers);

      app.listen(process.env.PORT, () => {
        return console.log(
          `Express is listening at http://localhost:${process.env.PORT}`
        );
      });
    })
    .catch((err) => {
      console.error("Error during Data Source initialization:", err);
    });
}

// TODO check if all ticket name are available in blocktime table,
// if not, create entries with default values.

// const addapptousers = async (req, res) => {
//   try {
//     const data = [
//       {
//         name: "baik1",
//         id: "0ffc5d31-a886-4f6a-a8c8-e8bdd895cb41",
//         app: "app1",
//       },
//       {
//         name: "baik2",
//         id: "a427d7ca-eda6-4bf0-baf6-c89f31a0658d",
//         app: "app2",
//       },
//       {
//         name: "baik3",
//         id: "cd1dc962-e354-48f9-86a4-0ffa2a2c8df0",
//         app: "app2",
//       },
//       {
//         name: "ss@aa",
//         id: "06dba527-3a82-41a0-8ff1-288834176ce0",
//         app: "app3",
//       },
//       {
//         name: "am@n13",
//         id: "067c240a-59c1-4d09-ae7f-3249f5561516",
//         app: "app4",
//       },
//       {
//         name: "ww@ww",
//         id: "6a5c19ae-0b9c-42c5-9be0-21a3aa337532",
//         app: "app5",
//       },
//       {
//         name: "ww@ss",
//         id: "43d0b356-7f4a-47e1-b244-d7c8384aa878",
//         app: "app5",
//       },
//       {
//         name: "ww@jk",
//         id: "fad47e56-0354-4c8e-9d0c-f47a5d2bb0c4",
//         app: "app5",
//       },
//       {
//         name: "ww@pp",
//         id: "4bccab25-b3a5-486d-8488-19ebf0cb86ac",
//         app: "app5",
//       },
//       {
//         name: "mk@mk",
//         id: "4240316a-6a40-4925-80e2-976f7946ba9f",
//         app: "app6",
//       },
//       {
//         name: "mk@kk",
//         id: "af624795-a643-4ffd-b66d-1437fcb3328d",
//         app: "app6",
//       },
//       {
//         name: "mk@66",
//         id: "28fe1e1b-2e0c-4c81-bddb-de01c8779dac",
//         app: "app6",
//       },
//       {
//         name: "mk@15",
//         id: "07d572f3-cacf-4ed4-9f1f-ebc43898e439",
//         app: "app6",
//       },
//       {
//         name: "mk@23",
//         id: "9041aef2-59c2-470d-a557-e7da32f63ef8",
//         app: "app6",
//       },
//     ];

//     const docClient = new AWS.DynamoDB.DocumentClient();
//     const masterError = [];
//     for (const partner of data) {
//       console.log(`Processing user : ${partner.name}`);
//       console.log("Adding appId to user account");
//       const params3 = {
//         TableName: "Users-Tirur",
//         Key: {
//           id: partner.id,
//           type: "2",
//         },
//         UpdateExpression: "set allowedApps = :allowedApps",
//         ExpressionAttributeValues: {
//           ":allowedApps": [partner.app],
//         },
//       };
//       await docClient.update(params3).promise();
//       console.log("Adding appId to subuser accounts");
//       var params1 = {
//         TableName: "Users-Tirur",
//         FilterExpression: "#partner = :partner and isArchived = :false",
//         ExpressionAttributeValues: {
//           ":false": false,
//           ":partner": partner.id, // ss@aa
//         },
//         ExpressionAttributeNames: {
//           "#partner": "partner",
//         },
//         ExclusiveStartKey: null,
//       };

//       let userData: any;
//       let userDataItems = [];

//       do {
//         userData = await docClient.scan(params1).promise();
//         userDataItems = userDataItems.concat(userData.Items);
//         params1.ExclusiveStartKey = userData.LastEvaluatedKey;
//       } while (typeof userData.LastEvaluatedKey != "undefined");

//       console.log(userDataItems.length);

//       const errored = [];
//       let num = 1;
//       for (const item of userDataItems) {
//         try {
//           const params2 = {
//             TableName: "Users-Tirur",
//             Key: {
//               id: item.id,
//               type: item.type,
//             },
//             UpdateExpression: "set allowedApps = :allowedApps",
//             ExpressionAttributeValues: {
//               ":allowedApps": [partner.app],
//             },
//           };
//           // console.log(params2);
//           await docClient.update(params2).promise();
//           console.log(`updated user id: ${item.id}`);
//           console.log(`${num}/${userDataItems.length} completed`);
//           num++;
//         } catch (err) {
//           console.log("********");
//           console.log("Error updating user id: " + item.id);
//           errored.push(item.id);
//         }
//         masterError.push(errored);
//       }
//     }

//     return res.status(200).json({ message: "Ok", masterError });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).send({ error: "Error" });
//   }
// };
