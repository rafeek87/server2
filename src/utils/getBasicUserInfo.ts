var AWS = require("aws-sdk");
const { tables } = require("../constants/tables");

export const getBasicUserInfo = async (userId) => {
  const docClient = new AWS.DynamoDB.DocumentClient();
  var params = {
    TableName: tables.USER,
    // IndexName: "billNo-index",
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: {
      ":id": userId,
      ":false": false,
    },
    ExpressionAttributeNames: {
      "#name": "name",
      "#type": "type",
    },
    FilterExpression: "isArchived = :false",
    ProjectionExpression:
      "createdAt, id, #name, #type, isSalesBlocked, isEntryBlocked, creditLimit, percentageCut, sort",
  };
  return docClient.query(params).promise();
};

export const getUserInfo = async (userId: string) => {
  const docClient = new AWS.DynamoDB.DocumentClient();
  var params = {
    TableName: tables.USER,
    // IndexName: "billNo-index",
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: {
      ":id": userId,
      ":false": false,
    },
    ExpressionAttributeNames: {
      "#name": "name",
      "#type": "type",
    },
    FilterExpression: "isArchived = :false",
    ProjectionExpression:
      "id, #name, #type, isSalesBlocked, isEntryBlocked, partner, stockist, subStockist, price, schemeName, creditLimit",
  };
  return docClient.query(params).promise();
};

export const getAppIdInfo = async (appId: string) => {
  const docClient = new AWS.DynamoDB.DocumentClient();
  var params = {
    TableName: tables.APPID,
    KeyConditionExpression: "appId = :appId",
    ExpressionAttributeValues: {
      ":appId": appId,
    },
    ExpressionAttributeNames: {
      "#agentId": "agentId",
    },
    ProjectionExpression: "#agentId",
  };
  return docClient.query(params).promise();
};

module.exports = {
  getBasicUserInfo,
  getUserInfo,
  getAppIdInfo,
};
