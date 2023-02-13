import { v4 as uuidv4 } from "uuid";
import { Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import * as AWS from "aws-sdk";
import dayjs from "dayjs";
import { getUserInfo } from "../utils/getBasicUserInfo";
import { tables } from "../constants/tables";
// import { tables } from "../constants/tables";
const { getRefreshToken } = require("../utils/refreshToken");

export async function loginUser({ userName, password, appId, ip }) {
  const docClient = new AWS.DynamoDB.DocumentClient();
  let params = {
    TableName: tables.USER,
    FilterExpression:
      "#userName = :userName and #password = :password and isArchived = :false",
    ExpressionAttributeValues: {
      ":false": false,
      ":userName": userName.toLowerCase(),
      ":password": password.toLowerCase(),
    },
    ExpressionAttributeNames: {
      "#userName": "userName",
      "#password": "password",
      "#name": "name",
      "#type": "type",
      "#allowedApps": "allowedApps",
      "#isLoginBlocked": "isLoginBlocked",
      "#schemeName": "schemeName",
      "#price": "price",
      "#partner": "partner",
      "#stockist": "stockist",
      "#subStockist": "subStockist",
    },
    ExclusiveStartKey: null,
    ProjectionExpression:
      "id, #type, #name, #allowedApps, #isLoginBlocked, #schemeName, #price, #partner, #stockist, #subStockist",
  };

  let userData: any;
  let userDataItems = [];

  do {
    userData = await docClient.scan(params).promise();
    userDataItems = userDataItems.concat(userData.Items);
    params.ExclusiveStartKey = userData.LastEvaluatedKey;
  } while (typeof userData.LastEvaluatedKey != "undefined");

  if (userDataItems.length == 0) {
    // no user / password combo
    // TODO if user exists, increment incorrect passowrd count, if field is not present, create one
    // TODO if increment password count is 7, login block users
    return {
      status: 401,
      message: "Username / password doesn't match",
      data: null,
    };
  } else if (userDataItems[0].isLoginBlocked) {
    return {
      status: 403,
      message: "User blocked",
      data: null,
    };
  } else if (
    userDataItems[0].allowedApps == null ||
    !userDataItems[0].allowedApps.includes(appId)
  ) {
    return {
      status: 403,
      message: "User do not have access to app",
      data: null,
    };
  } else {
    let type: string;
    switch (userDataItems[0].type) {
      case "1":
        type = "Admin";
        break;
      case "2":
        type = "Partner";
        break;
      case "3":
        type = "Stockist";
        break;
      case "4":
        type = "Sub Stockist";
        break;
      case "5":
        type = "Agent";
        break;
      default:
        type = "Agent";
        break;
    }
    // TODO add expiry
    const accessToken = jwt.sign(
      { id: userDataItems[0].id, type },
      process.env.JWT_SECRET,
      {
        expiresIn: "2d",
      }
    );

    const refreshToken = getRefreshToken();

    // TODO save refresh token in DB

    // TODO reset incorrect password entries

    return {
      status: 200,
      message: "User logged in",
      data: {
        id: userDataItems[0].id,
        name: userDataItems[0].name,
        type: userDataItems[0].type,
        schemeName: userDataItems[0].schemeName,
        price: userDataItems[0].price,
        accessToken,
        refreshToken,
        partner: userDataItems[0].partner,
        stockist: userDataItems[0].stockist,
        subStockist: userDataItems[0].subStockist,
      },
    };
  }
}

export async function profile(req: Request, res: Response) {
  // console.log("userID", req.user.id);
  return res.send({ message: "user profile" });
}

export const getSubUsers = async ({
  userId,
  userType,
  partnerId,
  stockistId,
  subStockistId,
}): Promise<{
  status: number;
  message: string;
  data: object;
}> => {
  try {
    let params: any;
    var params2: any = false;

    let partnerParams: any = false;
    const docClient = new AWS.DynamoDB.DocumentClient();

    if (userType === "Admin") {
      // admin
      // send all stockists, substockists, agents
      params = {
        TableName: tables.USER,
        ExpressionAttributeValues: {
          "#name": "name",
          "#ST": "type",
        },
        ExpressionAtributeValues: {
          ":a": false,
          ":adminType": "1",
        },
        FilterExpression: "isArchived = :a AND #ST <> :adminType",
        ProjectionExpression: "createdAt, id, #name, #ST, price, schemeName",
      };
    } else if (userType === "Partner") {
      // partner
      // send all stockists, substockists, agents
      params = {
        TableName: tables.USER,
        ExpressionAttributeNames: {
          "#ST": "type",
          "#SID": "partner",
        },
        ExpressionAttributeValues: {
          ":a": false,
          ":stockistType": "3",
          ":subStockistType": "4",
          ":agentType": "5",
          ":userId": userId,
        },
        FilterExpression:
          "isArchived = :a AND #ST IN (:stockistType, :subStockistType, :agentType) AND #SID = :userId",
      };
    } else if (userType === "Stockist") {
      // stockist
      // send all substockists, agents
      params = {
        TableName: tables.USER,
        ExpressionAttributeNames: {
          "#ST": "type",
          "#SID": "stockist",
        },
        ExpressionAttributeValues: {
          ":a": false,
          ":subStockistType": "4",
          ":agentType": "5",
          ":userId": userId,
        },
        FilterExpression:
          "isArchived = :a AND #ST IN (:subStockistType, :agentType) AND #SID = :userId",
      };

      partnerParams = {
        TableName: tables.USER,
        KeyConditionExpression: "id = :sid",
        ExpressionAttributeValues: {
          ":sid": partnerId,
          ":false": false,
        },
        FilterExpression: "isArchived = :false",
      };
    } else if (userType === "Sub Stockist") {
      // substockist
      // send all agents
      params = {
        TableName: tables.USER,
        ExpressionAttributeNames: {
          "#ST": "type",
          "#SSID": "subStockist",
        },
        ExpressionAttributeValues: {
          ":a": false,
          ":agentType": "5",
          ":userId": userId,
        },
        FilterExpression:
          "isArchived = :a AND #ST = :agentType AND #SSID = :userId",
      };

      params2 = {
        TableName: tables.USER,
        KeyConditionExpression: "id = :sid",
        ExpressionAttributeValues: {
          ":sid": stockistId,
          ":false": false,
        },
        FilterExpression: "isArchived = :false",
      };
      partnerParams = {
        TableName: tables.USER,
        KeyConditionExpression: "id = :sid",
        ExpressionAttributeValues: {
          ":sid": partnerId,
          ":false": false,
        },
        FilterExpression: "isArchived = :false",
      };
    } else if (userType === "Agent") {
      params2 = {
        TableName: tables.USER,
        KeyConditionExpression: "id = :sid",
        ExpressionAttributeValues: {
          ":sid": stockistId,
          ":false": false,
        },
        FilterExpression: "isArchived = :false",
      };
      let params3 = {
        TableName: tables.USER,
        KeyConditionExpression: "id = :ssid",
        ExpressionAttributeValues: {
          ":ssid": subStockistId,
          ":false": false,
        },
        FilterExpression: "isArchived = :false",
      };
      partnerParams = {
        TableName: tables.USER,
        KeyConditionExpression: "id = :sid",
        ExpressionAttributeValues: {
          ":sid": partnerId,
          ":false": false,
        },
        FilterExpression: "isArchived = :false",
      };
      let partnerData = await docClient.query(partnerParams).promise();
      let stockistData = await docClient.query(params2).promise();
      let subStockistData = await docClient.query(params3).promise();
      stockistData.Items.push(subStockistData.Items[0]);
      stockistData.Items.push(partnerData.Items[0]);
      return {
        status: 200,
        message: "Sub users fetched",
        data: {
          stockistData,
        },
      };
    }

    let usersList;
    let usersListItems = [];
    do {
      usersList = await docClient.scan(params).promise();
      usersListItems = usersListItems.concat(usersList.Items);
      params.ExclusiveStartKey = usersList.LastEvaluatedKey;
    } while (typeof usersList.LastEvaluatedKey != "undefined");

    usersListItems = usersListItems.sort((a, b) =>
      a.type < b.type
        ? -1
        : b.type < a.type
        ? 1
        : a.createdAt < b.createdAt
        ? -1
        : 1
    );

    // get stockist data if usertype is substockist or agent
    if (params2 != false) {
      let stockistData = await docClient.query(params2).promise();
      usersListItems.push(stockistData.Items[0]);
    }

    if (partnerParams != false) {
      let partnerData = await docClient.query(partnerParams).promise();
      usersListItems.push(partnerData.Items[0]);
    }

    return {
      status: 200,
      message: "Sub users fetched",
      data: {
        Items: usersListItems,
      },
    };
  } catch (err) {
    console.log(err);
    return {
      status: 500,
      message: "There was a problem getting sub users",
      data: null,
    };
  }
};

export const generateAppToken = async (
  appId: string
): Promise<ServiceFnReturn> => {
  try {
    const token = jwt.sign(
      {
        appId,
      },
      process.env.APP_JWT_SECRET,
      { expiresIn: 60 }
    );
    return {
      status: 200,
      message: "App token generated",
      data: {
        token,
      },
    };
  } catch (error) {
    console.log(error);
    return {
      status: 500,
      message: "Error generating app token",
      data: null,
    };
  }
};

export const createUser = async ({
  userId,
  userType,
  newUserType,
  newUserName,
  password,
  privileges,
  partner,
  stockist,
  subStockist,
  schemeName,
  ip,
  appToken,
}): Promise<ServiceFnReturn> => {
  try {
    const docClient = new AWS.DynamoDB.DocumentClient();

    // check if userName is taken
    let params2 = {
      TableName: tables.USER,
      ExpressionAttributeNames: {
        "#AT": "id",
        "#2": "userName",
      },
      ExpressionAttributeValues: {
        ":a": false,
        ":userName": newUserName.toLowerCase(),
      },
      FilterExpression: "isArchived = :a AND #2 = :userName",
      ProjectionExpression: "#AT",
      ExclusiveStartKey: undefined,
    };

    let duplicateUsers;
    let duplicateUsersItems = [];
    do {
      duplicateUsers = await docClient.scan(params2).promise();
      duplicateUsersItems = duplicateUsersItems.concat(duplicateUsers.Items);
      params2.ExclusiveStartKey = duplicateUsers.LastEvaluatedKey;
    } while (typeof duplicateUsers.LastEvaluatedKey != "undefined");

    if (duplicateUsersItems.length != 0) {
      return {
        status: 409,
        message: "Username exists",
        data: null,
      };
    }

    // get current user data to determine super users of new user
    const userDataItem = await getUserInfo(userId);
    if (userDataItem.Count !== 1) {
      console.log("User ID not found in new user creation!!!");
      return {
        status: 401,
        message: "Error creating user",
        data: null,
      };
    }
    const userData = userDataItem?.Items[0];

    // TODO validate if user has privilege to create new user

    // find super user IDs
    let validatedPartnerId: string;
    let validatedStockistId: string;
    let validatedSubStockistId: string;

    if (userType === "Sub Stockist") {
      validatedPartnerId = userData.partner;
      validatedStockistId = userData.stockist;
      validatedSubStockistId = userData.id;
    } else if (userType === "Stockist") {
      validatedPartnerId = userData.partner;
      validatedStockistId = userData.id;
      validatedSubStockistId = subStockist;
    } else if (userType === "Partner") {
      validatedPartnerId = userData.id;
      validatedStockistId = stockist;
      validatedSubStockistId = subStockist;
    } else if (userType === "Admin") {
      validatedPartnerId = partner;
      validatedStockistId = stockist;
      validatedSubStockistId = subStockist;
    }

    // get allowed app id from app token
    const appTokenVerification = jwt.verify(
      appToken,
      process.env.APP_JWT_SECRET,
      { complete: true }
    );

    // create new user
    const params = {
      TableName: tables.USER,
      Item: {
        id: uuidv4(),
        type: newUserType,
        name: newUserName,
        userName: newUserName.toLowerCase(),
        password: password.toLowerCase(),
        privileges,
        createdAt: dayjs().tz(process.env.TZ).format(),
        isArchived: false,
        isLoginBlocked: false,
        isEntryBlocked: [],
        isSalesBlocked: false,
        price: initialPriceZero,
        createdBy: userId,
        partner: validatedPartnerId ?? null,
        stockist: validatedStockistId ?? null,
        subStockist: validatedSubStockistId ?? null,
        schemeName,
        allowedApps: [appTokenVerification.payload["appId"]],
        createdIp: ip,
        incorrectPasswordEntries: 0,
      },
    };

    await docClient.put(params).promise();

    return {
      status: 201,
      message: "User created",
      data: null,
    };
  } catch (error) {
    if (
      error.name == "JsonWebTokenError" ||
      error.name == "TokenExpiredError" ||
      error.name == "NotBeforeError"
    ) {
      return {
        status: 401,
        message: "E0966: Insufficeint permission to create user",
        data: null,
      };
    }
    console.log(error);
    return {
      status: 500,
      message: "Error creating user",
      data: null,
    };
  }
};

export const updateUserCreditLimit = async ({
  userId,
  userType,
  targetUserId,
  limitsArray,
}): Promise<ServiceFnReturn> => {
  try {
    // find the targetUser data
    const docClient = new AWS.DynamoDB.DocumentClient();
    let params = {
      TableName: tables.USER,
      FilterExpression: "id = :id and isArchived = :false",
      ExpressionAttributeValues: {
        ":false": false,
        ":id": targetUserId,
      },
      ExpressionAttributeNames: {
        "#id": "id",
        "#name": "name",
        "#type": "type",
      },
      ExclusiveStartKey: null,
      ProjectionExpression: "#id, #type, #name",
    };

    // validate that the targetUser is a valid sub user
    if (userType === "Partner") {
      params["FilterExpression"] += " and partner = :userId";
      params.ExpressionAttributeValues[":userId"] = userId;
    } else if (userType === "Stockist") {
      params["FilterExpression"] += " and stockist = :userId";
      params.ExpressionAttributeValues[":userId"] = userId;
    } else if (userType === "Sub Stockist") {
      params["FilterExpression"] += " and subStockist = :userId";
      params.ExpressionAttributeValues[":userId"] = userId;
    }

    let userData: any;
    let userDataItems = [];

    do {
      userData = await docClient.scan(params).promise();
      userDataItems = userDataItems.concat(userData.Items);
      params.ExclusiveStartKey = userData.LastEvaluatedKey;
    } while (typeof userData.LastEvaluatedKey != "undefined");

    if (userDataItems.length == 0) {
      // no user found
      return {
        status: 404,
        message: "User not found",
        data: null,
      };
    }

    // edit user credit limits
    const params_2 = {
      TableName: tables.USER,
      Key: {
        id: userDataItems[0].id,
        type: userDataItems[0].type,
      },
      UpdateExpression: "set #creditLimit = :newCreditLimit",
      ExpressionAttributeNames: {
        "#creditLimit": "creditLimit",
      },
      ExpressionAttributeValues: {
        ":newCreditLimit": limitsArray,
      },
      ReturnValues: "UPDATED_NEW",
    };

    const queryRes = await docClient.update(params_2).promise();

    return {
      status: 200,
      message: "User credit limits updated",
      data: queryRes?.Attributes,
    };
  } catch (err) {
    console.log("Error in updating user credit limit");
    console.log(err);
    return {
      status: 500,
      message: "Error in updating user credit limit",
      data: null,
    };
  }
};

export const listUserCreditLimit = async ({
  userId,
  userType,
  targetUserId,
}): Promise<ServiceFnReturn> => {
  try {
    // find the targetUser data
    const docClient = new AWS.DynamoDB.DocumentClient();
    let params = {
      TableName: tables.USER,
      FilterExpression: "id = :id and isArchived = :false",
      ExpressionAttributeValues: {
        ":false": false,
        ":id": targetUserId,
      },
      ExpressionAttributeNames: {
        "#id": "id",
        "#name": "name",
        "#type": "type",
        "#creditLimit": "creditLimit",
      },
      ExclusiveStartKey: null,
      ProjectionExpression: "#id, #type, #name, #creditLimit",
    };

    // validate that the targetUser is a valid sub user
    if (userType === "Partner") {
      params["FilterExpression"] += " and partner = :userId";
      params.ExpressionAttributeValues[":userId"] = userId;
    } else if (userType === "Stockist") {
      params["FilterExpression"] += " and stockist = :userId";
      params.ExpressionAttributeValues[":userId"] = userId;
    } else if (userType === "Sub Stockist") {
      params["FilterExpression"] += " and subStockist = :userId";
      params.ExpressionAttributeValues[":userId"] = userId;
    }

    let userData: any;
    let userDataItems = [];

    do {
      userData = await docClient.scan(params).promise();
      userDataItems = userDataItems.concat(userData.Items);
      params.ExclusiveStartKey = userData.LastEvaluatedKey;
    } while (typeof userData.LastEvaluatedKey != "undefined");

    if (userDataItems.length == 0) {
      // no user found
      return {
        status: 404,
        message: "User not found",
        data: null,
      };
    }

    return {
      status: 200,
      message: "User credit limits fetched successfully",
      data: userDataItems[0],
    };
  } catch (err) {
    console.log("Error in fetching user credit limit");
    console.log(err);
    return {
      status: 500,
      message: "Error in fetching user credit limit",
      data: null,
    };
  }
};

const initialPriceZero = [
  {
    modes: [
      {
        amount: "",
        name: "SUPER",
      },
      {
        amount: "",
        name: "BOX",
      },
      {
        amount: "",
        name: "AB",
      },
      {
        amount: "",
        name: "BC",
      },
      {
        amount: "",
        name: "AC",
      },
      {
        amount: "",
        name: "A",
      },
      {
        amount: "",
        name: "B",
      },
      {
        amount: "",
        name: "C",
      },
    ],
    ticket: "DEAR1",
  },
  {
    modes: [
      {
        amount: "",
        name: "SUPER",
      },
      {
        amount: "",
        name: "BOX",
      },
      {
        amount: "",
        name: "AB",
      },
      {
        amount: "",
        name: "BC",
      },
      {
        amount: "",
        name: "AC",
      },
      {
        amount: "",
        name: "A",
      },
      {
        amount: "",
        name: "B",
      },
      {
        amount: "",
        name: "C",
      },
    ],
    ticket: "LSK3",
  },
  {
    modes: [
      {
        amount: "",
        name: "SUPER",
      },
      {
        amount: "",
        name: "BOX",
      },
      {
        amount: "",
        name: "AB",
      },
      {
        amount: "",
        name: "BC",
      },
      {
        amount: "",
        name: "AC",
      },
      {
        amount: "",
        name: "A",
      },
      {
        amount: "",
        name: "B",
      },
      {
        amount: "",
        name: "C",
      },
    ],
    ticket: "DEAR6",
  },
  {
    modes: [
      {
        amount: "",
        name: "SUPER",
      },
      {
        amount: "",
        name: "BOX",
      },
      {
        amount: "",
        name: "AB",
      },
      {
        amount: "",
        name: "BC",
      },
      {
        amount: "",
        name: "AC",
      },
      {
        amount: "",
        name: "A",
      },
      {
        amount: "",
        name: "B",
      },
      {
        amount: "",
        name: "C",
      },
    ],
    ticket: "DEAR8",
  },
];
