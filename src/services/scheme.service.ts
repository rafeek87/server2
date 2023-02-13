import { tables } from "../constants/tables";
import { winningSummery, winningUsers } from "../utils/sqlHelpers";

var AWS = require("aws-sdk");

export const getScheme = async ({ schemeName }): Promise<ServiceFnReturn> => {
  try {
    const docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: tables.SCHEME,
      KeyConditionExpression: "#name = :name",
      ExpressionAttributeValues: {
        ":name": schemeName,
      },
      ExpressionAttributeNames: {
        "#name": "name",
      },
    };
    let queryRes = await docClient.query(params).promise();
    return {
      status: 200,
      message: "Scheme data fetched",
      data: queryRes.Items,
    };
  } catch (error) {
    console.log(error);
    return {
      status: 409,
      message: "Error fetching scheme data",
      data: null,
    };
  }
};

export const editScheme = async ({
  schemeName,
  ticketIndex,
  newModes,
}): Promise<ServiceFnReturn> => {
  try {
    const docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: tables.SCHEME,
      Key: {
        name: schemeName,
      },
      UpdateExpression: `set tickets[${ticketIndex}].modes = :newModes`,
      ExpressionAttributeValues: {
        //  ":name": "name",
        // ":ticketIndex": ticketIndex,
        ":newModes": newModes,
      },
      ReturnValues: "UPDATED_NEW",
    };
    let queryRes = await docClient.update(params).promise();
    return {
      status: 200,
      message: "Scheme data updated",
      data: queryRes.Items,
    };
  } catch (error) {
    console.log(error);
    return {
      status: 409,
      message: "Error updating scheme data",
      data: null,
    };
  }
};
