import { winners, winningSummery, winningUsers } from "../utils/sqlHelpers";

var AWS = require("aws-sdk");
var dayjs = require("dayjs");
var utc = require("dayjs/plugin/utc");
import memoize from "memoizee";
var timezone = require("dayjs/plugin/timezone");
import { getBasicUserInfo } from "../utils/getBasicUserInfo";
import { roundTo } from "../utils";

dayjs.extend(utc);
dayjs.extend(timezone);

type WinningSummery = {
  userId: string;
  userType: string;
  ticketName: string;
  startDate: string;
  endDate: string;
  selectedUserType: string;
  selectedUserId: string;
  selectedGroup: string;
  selectedMode: string;
  ticketNumber: string;
};

const memoizedFn = memoize(getBasicUserInfo, { maxAge: 60000 });

export async function getWinningSummery({
  userId,
  userType,
  ticketName,
  startDate,
  endDate,
  selectedUserType,
  selectedUserId,
  selectedGroup,
  selectedMode,
  ticketNumber,
}: WinningSummery): Promise<ServiceFnReturn> {
  try {
    // TODO validate selected user is a valid sub user
    const targetUserId = selectedUserId ?? userId;
    let targetWinColumn: string;
    let targetUserColumn: string;

    // set price
    if (userType == "Admin") {
      targetWinColumn = "partnerWin";
    } else if (userType == "Partner") {
      targetWinColumn = "partnerWin";
    } else if (userType == "Stockist") {
      targetWinColumn = "stockistWin";
    } else if (userType == "Sub Stockist") {
      targetWinColumn = "subStockistWin";
    } else if (userType == "Agent") {
      targetWinColumn = "agentWin";
    }

    if (selectedUserType == "Partner" || selectedUserType == "2") {
      targetUserColumn = "partnerId";
    } else if (selectedUserType == "Stockist" || selectedUserType == "3") {
      targetUserColumn = "stockistId";
    } else if (selectedUserType == "Sub Stockist" || selectedUserType == "4") {
      targetUserColumn = "subStockistId";
    } else if (selectedUserType == "Agent" || selectedUserType == "5") {
      targetUserColumn = "agentId";
    }

    const data = await winningSummery({
      ticketName,
      startDate,
      endDate,
      userColumnName: targetUserColumn ?? null,
      userId: targetUserId,
      superWinColumn: targetWinColumn,
      ticketNumber: ticketNumber ?? null,
      selectedMode: selectedMode ?? null,
      selectedGroup: selectedGroup ?? null,
    });

    return {
      status: 200,
      message: "Winning summery",
      data: data.length !== 0 ? data[0] : null,
    };
  } catch (err) {
    console.log(err);
    return {
      status: 500,
      message: "Error getting winning summery",
      data: null,
    };
  }
}

/*
 return user count, prize, super and collective prize and count for a given
 start and end date and given user group
*/
export const getWinningUsers = async ({
  userId,
  userType,
  ticketName,
  startDate,
  endDate,
  selectedUserType,
  selectedUserId,
  selectedGroup,
  selectedMode,
  ticketNumber,
}: WinningSummery) => {
  try {
    // TODO validate selected user is a valid sub user
    const targetUserId = selectedUserId ?? userId;
    let targetWinColumn: string;
    let targetUserColumn: string;
    let subUserColumn: string;
    let targetUserTypeCode: string;

    // set price
    if (userType == "Admin") {
      targetWinColumn = "partnerWin";
      targetUserTypeCode = "2";
      subUserColumn = "partnerId";
    } else if (userType == "Partner") {
      targetWinColumn = "partnerWin";
      targetUserColumn = "partnerId";
      subUserColumn = "stockistId";
      targetUserTypeCode = "3";
    } else if (userType == "Stockist") {
      targetWinColumn = "stockistWin";
      targetUserColumn = "stockistId";
      subUserColumn = "subStockistId";
      targetUserTypeCode = "4";
    } else if (userType == "Sub Stockist") {
      targetWinColumn = "subStockistWin";
      targetUserColumn = "subStockistId";
      subUserColumn = "agentId";
      targetUserTypeCode = "5";
    } else if (userType == "Agent") {
      targetWinColumn = "agentWin";
      targetUserColumn = "agentId";
      subUserColumn = "agentId";
      targetUserTypeCode = "5";
    }

    if (selectedUserType == "Partner" || selectedUserType == "2") {
      targetUserColumn = "partnerId";
      subUserColumn = "stockistId";
      targetUserTypeCode = "3";
    } else if (selectedUserType == "Stockist" || selectedUserType == "3") {
      targetUserColumn = "stockistId";
      subUserColumn = "subStockistId";
      targetUserTypeCode = "4";
    } else if (selectedUserType == "Sub Stockist" || selectedUserType == "4") {
      targetUserColumn = "subStockistId";
      subUserColumn = "agentId";
      targetUserTypeCode = "5";
    } else if (selectedUserType == "Agent" || selectedUserType == "5") {
      targetUserColumn = "agentId";
      subUserColumn = "agentId";
      targetUserTypeCode = "5";
    }

    // fetch data
    const data = await winningUsers({
      ticketName,
      startDate,
      endDate,
      userColumnName: targetUserColumn ?? null,
      userId: targetUserId,
      superWinColumn: targetWinColumn,
      ticketNumber: ticketNumber ?? null,
      selectedMode: selectedMode ?? null,
      selectedGroup: selectedGroup ?? null,
      subUserColumn,
      groupByDate: false,
    });

    // parse data and add user data
    const parsedData = [];
    let totalAmount = 0;
    let totalCount = 0;
    for (const item of data) {
      totalAmount += Number(item.prize);
      totalCount += Number(item.count);
      const userData = await memoizedFn(item.userid);
      parsedData.push({
        ...item,
        userName: userData ? userData.Items[0]?.name : null,
        createdAt: userData ? userData.Items[0]?.createdAt : null,
        userType: targetUserTypeCode,
      });
    }

    // format totalAmount
    totalAmount = roundTo(totalAmount, 2);

    // sort parsedData
    parsedData.sort((user1, user2) =>
      user1.createdAt < user2.createdAt ? -1 : 1
    );

    return {
      status: 200,
      message: "Winning users",
      data: {
        totalAmount,
        totalCount,
        users: parsedData,
      },
    };
  } catch (error) {
    console.log(error);
    return {
      status: 500,
      message: "Error getting winning users",
      data: null,
    };
  }
};

//
// return all winnings data for given date, agentId and ticketname
//
export const getWinners = async ({
  userId,
  userType,
  ticketName,
  startDate,
  endDate,
  selectedUserType,
  selectedUserId,
  selectedGroup,
  selectedMode,
  ticketNumber,
}) => {
  try {
    // TODO validate selected user is a valid sub user
    const targetUserId = selectedUserId ?? userId;
    let targetUserColumn: string;
    let targetUserTypeCode: string;
    let targetSuperColumn: string;

    // set price
    if (userType == "Admin" && !selectedUserType) {
      return {
        status: 400,
        message: "Invalid arguments",
        data: null,
      };
    } else if (userType == "Admin") {
      targetSuperColumn = "partnerWin";
    } else if (userType == "Partner") {
      targetUserColumn = "partnerId";
      targetUserTypeCode = "3";
      targetSuperColumn = "partnerWin";
    } else if (userType == "Stockist") {
      targetUserColumn = "stockistId";
      targetUserTypeCode = "4";
      targetSuperColumn = "stockistWin";
    } else if (userType == "Sub Stockist") {
      targetUserColumn = "subStockistId";
      targetUserTypeCode = "5";
      targetSuperColumn = "subStockistWin";
    } else if (userType == "Agent") {
      targetUserColumn = "agentId";
      targetUserTypeCode = "5";
      targetSuperColumn = "agentWin";
    }

    if (selectedUserType == "Partner" || selectedUserType == "2") {
      targetUserColumn = "partnerId";
      targetUserTypeCode = "3";
    } else if (selectedUserType == "Stockist" || selectedUserType == "3") {
      targetUserColumn = "stockistId";
      targetUserTypeCode = "4";
    } else if (selectedUserType == "Sub Stockist" || selectedUserType == "4") {
      targetUserColumn = "subStockistId";
      targetUserTypeCode = "5";
    } else if (selectedUserType == "Agent" || selectedUserType == "5") {
      targetUserColumn = "agentId";
      targetUserTypeCode = "5";
    }

    const data = await winners({
      ticketName,
      startDate,
      endDate,
      userColumnName: targetUserColumn,
      userId: targetUserId,
      ticketNumber: ticketNumber ?? null,
      selectedMode: selectedMode ?? null,
      selectedGroup: selectedGroup ?? null,
      targetSuperColumn,
      userType,
    });

    const parsedData = [];
    let totalPrize = 0;
    let totalSuper = 0;
    for (const item of data) {
      totalPrize += Number(item.prize);
      totalSuper += Number(item.super);
      const partnerData = item.partnerid
        ? await memoizedFn(item.partnerid)
        : null;
      const stockistData = item.stockistid
        ? await memoizedFn(item.stockistid)
        : null;
      const subStockistData = item.substockistid
        ? await memoizedFn(item.substockistid)
        : null;
      const agentData = item.agentid ? await memoizedFn(item.agentid) : null;
      parsedData.push({
        ...item,
        partnerName: partnerData ? partnerData.Items[0]?.name : "-",
        stockistName: stockistData ? stockistData.Items[0]?.name : "-",
        subStockistName: subStockistData ? subStockistData.Items[0]?.name : "-",
        agentName: agentData ? agentData.Items[0]?.name : "-",
      });
    }

    // sort winnings results
    const resultA = [];
    const resultAB = [];
    const resultBox = [];
    const resultSuper = [];
    const resultFirst = [];

    parsedData.forEach((row) => {
      if (row.ticket_mode == "SUPER" && row.winning_position == "1") {
        resultFirst.push(row);
      } else if (row.ticket_mode == "SUPER") {
        resultSuper.push(row);
      } else if (row.ticket_mode == "BOX") {
        resultBox.push(row);
      } else if (
        row.ticket_mode == "A" ||
        row.ticket_mode == "B" ||
        row.ticket_mode == "C"
      ) {
        resultA.push(row);
      } else if (
        row.ticket_mode == "AB" ||
        row.ticket_mode == "BC" ||
        row.ticket_mode == "AC"
      ) {
        resultAB.push(row);
      }
    });

    resultA.sort((a, b) => {
      if (a.ticket_mode < b.ticket_mode) {
        return -1;
      }
      if (a.ticket_mode > b.ticket_mode) {
        return 1;
      }
      return 0;
    });

    resultAB.sort((a, b) => {
      if (a.ticket_mode < b.ticket_mode) {
        return -1;
      }
      if (a.ticket_mode > b.ticket_mode) {
        return 1;
      }
      return 0;
    });

    resultBox.sort((a, b) => {
      return Number(a.winning_position) - Number(b.winning_position);
    });

    resultSuper.sort((a, b) => {
      return Number(a.winning_position) - Number(b.winning_position);
    });

    let sortedWinnings = [];
    sortedWinnings = sortedWinnings.concat(resultA);
    sortedWinnings = sortedWinnings.concat(resultAB);
    sortedWinnings = sortedWinnings.concat(resultFirst);
    sortedWinnings = sortedWinnings.concat(resultBox);
    sortedWinnings = sortedWinnings.concat(resultSuper);

    return {
      status: 200,
      message: "Winners data generated",
      data: {
        totalPrize,
        totalSuper,
        grandTotal: totalPrize + totalSuper,
        winnings: sortedWinnings,
      },
    };
  } catch (error) {
    console.log(error);
    return {
      status: 500,
      message: "Error getting winning users",
      data: null,
    };
  }
};
