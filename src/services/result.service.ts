var AWS = require("aws-sdk");
var dayjs = require("dayjs");
var utc = require("dayjs/plugin/utc");
var timezone = require("dayjs/plugin/timezone");
import { tables } from "../constants/tables";
import { findPermutations } from "../utils";
import {
  deleteAllWinnings,
  getBillsWithDate,
  insertWinnings,
} from "../utils/sqlHelpers";

dayjs.extend(utc);
dayjs.extend(timezone);

type upsertTicket = {
  resultDate: string;
  results: string[];
  ticketName: string;
};

// TODO move to global types
type serviceFnReturn = {
  status: number;
  message: string;
  data: null | {
    [key: string]: any;
  };
};

export async function upsertResult({
  resultDate,
  results,
  ticketName,
}: upsertTicket): Promise<serviceFnReturn> {
  try {
    const docClient = new AWS.DynamoDB.DocumentClient();
    let sortedResults = results.slice(5).sort();
    let newResults = results.slice(0, 5).concat(sortedResults);

    let ExpressionAttributeValues = {
      ":firstResult": results[0],
      ":secondResult": results[1],
      ":thirdResult": results[2],
      ":fourthResult": results[3],
      ":fifthResult": results[4],
      ":updatedAt": dayjs().tz("Asia/Calcutta").format(),
    };

    let ExpressionAttributeNames = {
      "#firstResult": "first",
      "#secondResult": "second",
      "#thirdResult": "third",
      "#fourthResult": "fourth",
      "#fifthResult": "fifth",
      "#updatedAt": "updatedAt",
    };

    let UpdateExpression =
      "SET  #firstResult = :firstResult, #secondResult = :secondResult";
    UpdateExpression +=
      ", #thirdResult = :thirdResult, #fourthResult = :fourthResult, #fifthResult = :fifthResult, #updatedAt = :updatedAt";

    for (let index = 1; index < 31; index++) {
      // ExpressionAttributeValues
      ExpressionAttributeValues[`:G${index}`] = newResults[index + 4];
      // ExpressionAttributeNames
      ExpressionAttributeNames[`#G${index}`] = `G${index}`;
      // UpdateExpression
      UpdateExpression += `, #G${index} = :G${index}`;
    }

    var params = {
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      Key: {
        resultDate: resultDate,
        ticketName: ticketName,
      },
      ReturnValues: "ALL_NEW",
      TableName: tables.RESULT,
      UpdateExpression,
    };

    let queryRes = await docClient.update(params).promise();

    // check if results is empty
    // if yes, delete all winnings for given date and ticket and exit
    if (results.every((element) => element == "")) {
      await deleteAllWinnings({ resultDate, ticketName });
      return {
        status: 200,
        message: "Result updated",
        data: null,
      };
    }

    // fetch all tickets from resultDate
    // TODO
    const billData = await getBillsWithDate({ resultDate, ticketName });

    // fetch scheme data
    let schemeParams = {
      TableName: tables.SCHEME,
    };
    let schemeRes;
    let schemeResItems = [];
    do {
      schemeRes = await docClient.scan(schemeParams).promise();
      schemeResItems = schemeResItems.concat(schemeRes.Items);
      schemeParams["ExclusiveStartKey"] = schemeRes.LastEvaluatedKey;
    } while (typeof schemeRes.LastEvaluatedKey != "undefined");

    // calculate winners for each entry and store
    var winnings = [];
    await Promise.all(
      billData.map(async (entry) => {
        const didWin = checkIfWinning(entry, queryRes.Attributes);
        if (didWin) {
          if (entry.ticket_mode == "SUPER") {
            didWin.forEach((SuperWinning) => {
              // partner
              let partnerSchemePrizes = schemeResItems.find(
                (item) => item.name == entry.bill_partnerScheme
              ).tickets;
              let tt = partnerSchemePrizes.find(
                (item) => item.name == entry.bill_ticketName
              ).modes;
              let ttt = tt.find((item) => item.name == entry.ticket_mode).rows;
              let tttt = ttt.find(
                (item) => item.position == SuperWinning.positionId
              );

              // stockist
              let stockistSchemePrizes = schemeResItems.find(
                (item) => item.name == entry.bill_stockistScheme
              ).tickets;
              let tt2 = stockistSchemePrizes.find(
                (item) => item.name == entry.bill_ticketName
              ).modes;
              let ttt2 = tt2.find(
                (item) => item.name == entry.ticket_mode
              ).rows;
              let tttt2 = ttt2.find(
                (item) => item.position == SuperWinning.positionId
              );

              // sub stockist
              let subStockistSchemePrizes = schemeResItems.find(
                (item) => item.name == entry.bill_subStockistScheme
              ).tickets;
              let tt3 = subStockistSchemePrizes.find(
                (item) => item.name == entry.bill_ticketName
              ).modes;
              let ttt3 = tt3.find(
                (item) => item.name == entry.ticket_mode
              ).rows;
              let tttt3 = ttt3.find(
                (item) => item.position == SuperWinning.positionId
              );

              // agent
              let agentSchemePrizes = schemeResItems.find(
                (item) => item.name == entry.bill_agentScheme
              ).tickets;
              let tt4 = agentSchemePrizes.find(
                (item) => item.name == entry.bill_ticketName
              ).modes;
              let ttt4 = tt4.find(
                (item) => item.name == entry.ticket_mode
              ).rows;
              let tttt4 = ttt4.find(
                (item) => item.position == SuperWinning.positionId
              );

              winnings.push({
                billNo: entry.bill_no,
                ticketId: entry.ticket_id,
                position: SuperWinning.positionId,
                prize: tttt.amount,
                partnerWin: tttt.super,
                stockistWin: tttt2.super,
                subStockistWin: tttt3.super,
                agentWin: tttt4.super,
                resultDate,
                ticketName: entry.bill_ticketName,
              });
            });
          } else if (entry.ticket_mode == "BOX") {
            // partner
            let partnerSchemePrizes = schemeResItems.find(
              (item) => item.name == entry.bill_partnerScheme
            ).tickets;
            let tt = partnerSchemePrizes.find(
              (item) => item.name == entry.bill_ticketName
            ).modes;
            let ttt = tt.find((item) => item.name == entry.ticket_mode).rows;
            let firstPrizePartner = ttt.find((item) => item.position == "1");
            let secondPrizePartner = ttt.find((item) => item.position == "2");

            // stockist
            let stockistSchemePrizes = schemeResItems.find(
              (item) => item.name == entry.bill_stockistScheme
            ).tickets;
            let tt2 = stockistSchemePrizes.find(
              (item) => item.name == entry.bill_ticketName
            ).modes;
            let ttt2 = tt2.find((item) => item.name == entry.ticket_mode).rows;
            let firstPrizeStockist = ttt2.find((item) => item.position == "1");
            let secondPrizeStockist = ttt2.find((item) => item.position == "2");

            // sub stockist
            let subStockistSchemePrizes = schemeResItems.find(
              (item) => item.name == entry.bill_subStockistScheme
            ).tickets;
            let tt3 = subStockistSchemePrizes.find(
              (item) => item.name == entry.bill_ticketName
            ).modes;
            let ttt3 = tt3.find((item) => item.name == entry.ticket_mode).rows;
            let firstPrizeSubStockist = ttt3.find(
              (item) => item.position == "1"
            );
            let secondPrizeSubStockist = ttt3.find(
              (item) => item.position == "2"
            );

            // agent
            let agentSchemePrizes = schemeResItems.find(
              (item) => item.name == entry.bill_agentScheme
            ).tickets;
            let tt4 = agentSchemePrizes.find(
              (item) => item.name == entry.bill_ticketName
            ).modes;
            let ttt4 = tt4.find((item) => item.name == entry.ticket_mode).rows;
            let firstPrizeAgent = ttt4.find((item) => item.position == "1");
            let secondPrizeAgent = ttt4.find((item) => item.position == "2");

            if (didWin.position == "DIRECT") {
              winnings.push({
                billNo: entry.bill_no,
                ticketId: entry.ticket_id,
                position: didWin.positionId,
                prize:
                  firstPrizePartner.amount +
                  didWin.n * secondPrizePartner.amount,
                partnerWin:
                  firstPrizePartner.super + didWin.n * secondPrizePartner.super,
                stockistWin:
                  firstPrizeStockist.super +
                  didWin.n * secondPrizeStockist.super,
                subStockistWin:
                  firstPrizeSubStockist.super +
                  didWin.n * secondPrizeSubStockist.super,
                agentWin:
                  firstPrizeAgent.super + didWin.n * secondPrizeAgent.super,
                resultDate,
                ticketName: entry.bill_ticketName,
              });
            } else if (didWin.position == "INDIRECT") {
              winnings.push({
                billNo: entry.bill_no,
                ticketId: entry.ticket_id,
                position: didWin.positionId,
                prize: didWin.n * secondPrizePartner.amount,
                partnerWin: didWin.n * secondPrizePartner.super,
                stockistWin: didWin.n * secondPrizeStockist.super,
                subStockistWin: didWin.n * secondPrizeSubStockist.super,
                agentWin: didWin.n * secondPrizeAgent.super,
                resultDate,
                ticketName: entry.bill_ticketName,
              });
            }
          } else {
            // partner
            let partnerSchemePrizes = schemeResItems.find(
              (item) => item.name == entry.bill_partnerScheme
            ).tickets;
            let tt = partnerSchemePrizes.find(
              (item) => item.name == entry.bill_ticketName
            ).modes;
            let ttt = tt.find((item) => item.name == entry.ticket_mode).rows;
            let tttt = ttt.find((item) => item.position == didWin.positionId);

            // stockist
            let stockistSchemePrizes = schemeResItems.find(
              (item) => item.name == entry.bill_stockistScheme
            ).tickets;
            let tt2 = stockistSchemePrizes.find(
              (item) => item.name == entry.bill_ticketName
            ).modes;
            let ttt2 = tt2.find((item) => item.name == entry.ticket_mode).rows;
            let tttt2 = ttt2.find((item) => item.position == didWin.positionId);

            // sub stockist
            let subStockistSchemePrizes = schemeResItems.find(
              (item) => item.name == entry.bill_subStockistScheme
            ).tickets;
            let tt3 = subStockistSchemePrizes.find(
              (item) => item.name == entry.bill_ticketName
            ).modes;
            let ttt3 = tt3.find((item) => item.name == entry.ticket_mode).rows;
            let tttt3 = ttt3.find((item) => item.position == didWin.positionId);

            // agent
            let agentSchemePrizes = schemeResItems.find(
              (item) => item.name == entry.bill_agentScheme
            ).tickets;
            let tt4 = agentSchemePrizes.find(
              (item) => item.name == entry.bill_ticketName
            ).modes;
            let ttt4 = tt4.find((item) => item.name == entry.ticket_mode).rows;
            let tttt4 = ttt4.find((item) => item.position == didWin.positionId);

            winnings.push({
              billNo: entry.bill_no,
              ticketId: entry.ticket_id,
              position: didWin.positionId,
              prize: tttt.amount,
              partnerWin: tttt.super,
              stockistWin: tttt2.super,
              subStockistWin: tttt3.super,
              agentWin: tttt4.super,
              resultDate,
              ticketName: entry.bill_ticketName,
            });
          }
        }
      })
    );

    // delete all winning data from table for resultDate
    await deleteAllWinnings({ resultDate, ticketName });

    // enter new data to winning
    await insertWinnings(winnings);

    return {
      status: 200,
      message: "Result updated",
      data: null,
    };
  } catch (err) {
    console.log(err);
    return {
      status: 500,
      message: "Error updating result",
      data: null,
    };
  }
}

export async function getResult({
  resultDate,
  ticketName,
}): Promise<serviceFnReturn> {
  try {
    var dynamodb = new AWS.DynamoDB();
    var params = {
      Key: {
        resultDate: {
          S: resultDate,
        },
        ticketName: {
          S: ticketName,
        },
      },
      TableName: tables.RESULT,
    };
    const data = await dynamodb.getItem(params).promise();
    return {
      status: 200,
      message: "Result fetched",
      data: data.Item,
    };
  } catch (err) {
    console.log(err);
    return {
      status: 500,
      message: "Error getting result",
      data: null,
    };
  }
}

const checkIfWinning = (entry, resultData) => {
  // console.log(resultData.first);
  // console.log(entry.ticket_number);
  // console.log(entry.ticket_mode);

  if (entry.ticket_mode == "SUPER") {
    let resArr = [];
    if (resultData.first == entry.ticket_number) {
      resArr.push({
        position: "FIRST",
        positionId: "1",
      });
    }
    if (resultData.second == entry.ticket_number) {
      resArr.push({
        position: "SECOND",
        positionId: "2",
      });
    }
    if (resultData.third == entry.ticket_number) {
      resArr.push({
        position: "THIRD",
        positionId: "3",
      });
    }
    if (resultData.fourth == entry.ticket_number) {
      resArr.push({
        position: "FOURTH",
        positionId: "4",
      });
    }
    if (resultData.fifth == entry.ticket_number) {
      resArr.push({
        position: "FIFTH",
        positionId: "5",
      });
    }
    for (let index = 1; index < 31; index++) {
      let t = `G${index}`;
      if (resultData[t] == entry.ticket_number) {
        resArr.push({
          position: t.toUpperCase(),
          positionId: "6",
        });
      }
    }
    return resArr;
  } else if (entry.ticket_mode == "BOX") {
    let permutations = findPermutations(resultData.first);
    if (!Array.isArray(permutations)) {
      return false;
    }
    let rr;
    let flag = false;
    const result = permutations
      .slice(1, 6)
      .filter((item) => item == entry.ticket_number);
    if (permutations.slice(1, 6).includes(entry.ticket_number)) {
      rr = {
        position: "INDIRECT",
        positionId: "2",
      };
      flag = true;
    }
    if (entry.ticket_number == resultData.first) {
      flag = true;
      rr = {
        position: "DIRECT",
        positionId: "1",
      };
    }
    if (flag) {
      rr = {
        ...rr,
        n: result.length,
      };
      return rr;
    }
  } else if (entry.ticket_mode == "AB") {
    let prizedItem = resultData.first.slice(0, 2);
    resultData.first.slice(1, 2);
    if (entry.ticket_number == prizedItem) {
      return {
        position: "FIRST",
        positionId: "1",
      };
    }
  } else if (entry.ticket_mode == "BC") {
    let prizedItem = resultData.first.slice(1, 3);
    if (entry.ticket_number == prizedItem) {
      return {
        position: "FIRST",
        positionId: "1",
      };
    }
  } else if (entry.ticket_mode == "AC") {
    let prizedItem =
      resultData.first.slice(0, 1) + resultData.first.slice(2, 3);
    if (entry.ticket_number == prizedItem) {
      return {
        position: "FIRST",
        positionId: "1",
      };
    }
  } else if (entry.ticket_mode == "A") {
    let prizedItem = resultData.first.slice(0, 1);
    if (entry.ticket_number == prizedItem) {
      return {
        position: "FIRST",
        positionId: "1",
      };
    }
  } else if (entry.ticket_mode == "B") {
    let prizedItem = resultData.first.slice(1, 2);
    if (entry.ticket_number == prizedItem) {
      return {
        position: "FIRST",
        positionId: "1",
      };
    }
  } else if (entry.ticket_mode == "C") {
    let prizedItem = resultData.first.slice(2, 3);
    if (entry.ticket_number == prizedItem) {
      return {
        position: "FIRST",
        positionId: "1",
      };
    }
  }
  return false;
};
