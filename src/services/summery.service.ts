import memoize from "memoizee";
import { roundTo, sortUsers } from "../utils";
import { getBasicUserInfo } from "../utils/getBasicUserInfo";
import {
  winningUsers,
  salesSummery,
  numberwiseReport,
} from "../utils/sqlHelpers";
import dayjs from "dayjs";

const memoizedFn = memoize(getBasicUserInfo, { maxAge: 5000 });

//
// Account summary is the amount to be collected from sub users
// ie: credit amount
//
export async function accountSummery({
  userId,
  userType,
  ticketName,
  startDate,
  endDate,
  selectedMode,
  selectedGroup,
  selectedUserType,
  selectedUserId,
  ticketNumber,
}) {
  try {
    // TODO validate selected user is a valid sub user
    const targetUserId = selectedUserId ?? userId;
    let targetWinColumn: string;
    let targetUserColumn: string;
    let targetPriceColumn: string;
    let subUserColumn: string;

    // set price
    if (userType == "Admin") {
      targetWinColumn = "partnerWin";
      subUserColumn = "partnerId";
      targetPriceColumn = "partnerPrice";
    } else if (userType == "Partner") {
      targetWinColumn = "partnerWin";
      targetUserColumn = "partnerId";
      subUserColumn = "stockistId";
      targetPriceColumn = "stockistPrice";
    } else if (userType == "Stockist") {
      targetWinColumn = "stockistWin";
      targetUserColumn = "stockistId";
      subUserColumn = "subStockistId";
      targetPriceColumn = "subStockistPrice";
    } else if (userType == "Sub Stockist") {
      targetWinColumn = "subStockistWin";
      targetUserColumn = "subStockistId";
      subUserColumn = "agentId";
      targetPriceColumn = "agentPrice";
    } else if (userType == "Agent") {
      targetWinColumn = "agentWin";
      targetUserColumn = "agentId";
      subUserColumn = "agentId";
      targetPriceColumn = "agentPrice";
    }

    if (selectedUserType == "Partner") {
      targetUserColumn = "partnerId";
      subUserColumn = "stockistId";
    } else if (selectedUserType == "Stockist") {
      targetUserColumn = "stockistId";
      subUserColumn = "subStockistId";
    } else if (selectedUserType == "Sub Stockist") {
      targetUserColumn = "subStockistId";
      subUserColumn = "agentId";
    } else if (selectedUserType == "Agent") {
      targetUserColumn = "agentId";
      subUserColumn = "agentId";
    }

    const data = await getSummery({
      ticketName,
      startDate,
      endDate,
      targetUserColumn,
      targetUserId,
      ticketNumber,
      selectedMode,
      selectedGroup,
      targetPriceColumn,
      subUserColumn,
      targetWinColumn,
      userId,
    });

    const parsedData = data.map((item) => {
      const users = [...item.users];
      let totalNetBalance = 0;
      const parsedUsers = users.map((user) => {
        // const targetPercentage =
        //   userType === "Admin" && subUserColumn === "partnerId"
        //     ? user.debitPercentage
        //     : user.creditPercentage;
        const targetPercentage = user.creditPercentage;
        const netBalance = roundTo(
          Number(user.grossBalance) * (targetPercentage / 100),
          2
        );
        totalNetBalance += netBalance;
        return {
          ...user,
          creditPercentage: targetPercentage,
          netBalance,
        };
      });
      return {
        totalNetBalance: roundTo(Number(totalNetBalance), 2),
        ...item,
        users: parsedUsers,
      };
    });

    return {
      status: 200,
      message: "Account summery generated",
      data: parsedData,
    };
  } catch (err) {
    console.log(err);
    return {
      status: 500,
      message: "Error getting account summery",
      data: null,
    };
  }
}

//
// net pay is the amount to pay the super user
// ie: debit amount
// when admin is viewing net pay, he should see the net pay of the partner
//
export async function netPaySummery({
  userId,
  userType,
  ticketName,
  startDate,
  endDate,
  selectedMode,
  selectedGroup,
  selectedUserType,
  selectedUserId,
  ticketNumber,
}) {
  try {
    // TODO validate selected user is a valid sub user
    const targetUserId = selectedUserId ?? userId;
    let targetWinColumn: string;
    let targetUserColumn: string;
    let targetPriceColumn: string;
    let subUserColumn: string;

    // set price
    if (userType == "Admin") {
      targetWinColumn = "partnerWin";
      subUserColumn = "partnerId";
      targetPriceColumn = "adminPrice";
    } else if (userType == "Partner") {
      targetWinColumn = "partnerWin";
      targetUserColumn = "partnerId";
      subUserColumn = "stockistId";
      targetPriceColumn = "partnerPrice";
    } else if (userType == "Stockist") {
      targetWinColumn = "stockistWin";
      targetUserColumn = "stockistId";
      subUserColumn = "subStockistId";
      targetPriceColumn = "stockistPrice";
    } else if (userType == "Sub Stockist") {
      targetWinColumn = "subStockistWin";
      targetUserColumn = "subStockistId";
      subUserColumn = "agentId";
      targetPriceColumn = "subStockistPrice";
    } else if (userType == "Agent") {
      targetWinColumn = "agentWin";
      targetUserColumn = "agentId";
      subUserColumn = "agentId";
      targetPriceColumn = "agentPrice";
    }

    if (selectedUserType == "Partner") {
      targetUserColumn = "partnerId";
      subUserColumn = "stockistId";
    } else if (selectedUserType == "Stockist") {
      targetUserColumn = "stockistId";
      subUserColumn = "subStockistId";
    } else if (selectedUserType == "Sub Stockist") {
      targetUserColumn = "subStockistId";
      subUserColumn = "agentId";
    } else if (selectedUserType == "Agent") {
      targetUserColumn = "agentId";
      subUserColumn = "agentId";
    }

    const data = await getSummery({
      ticketName,
      startDate,
      endDate,
      targetUserColumn,
      targetUserId,
      ticketNumber,
      selectedMode,
      selectedGroup,
      targetPriceColumn,
      subUserColumn,
      targetWinColumn,
      userId,
    });

    const parsedData = data.map((item) => {
      const users = [...item.users];
      let totalNetBalance = 0;
      const parsedUsers = users.map((user) => {
        const targetPercentage =
          userType === "Admin" && subUserColumn === "partnerId"
            ? user.creditPercentage
            : user.debitPercentage;
        // const targetPercentage = user.debitPercentage;
        const netBalance = roundTo(
          Number(user.grossBalance) * (targetPercentage / 100),
          2
        );
        totalNetBalance += netBalance;
        return {
          ...user,
          debitPercentage: targetPercentage,
          netBalance,
        };
      });
      return {
        ...item,
        totalNetBalance: roundTo(Number(totalNetBalance), 2),
        users: parsedUsers,
      };
    });

    return {
      status: 200,
      message: "Net pay summery generated",
      data: parsedData,
    };
  } catch (err) {
    console.log(err);
    return {
      status: 500,
      message: "Error getting account summery",
      data: null,
    };
  }
}

export const getNumberwiseReport = async ({
  userId,
  userType,
  ticketName,
  resultDate,
  selectedUserType,
  selectedUserId,
  selectedGroup,
  selectedMode,
  ticketNumber,
  isGroupActive,
}) => {
  try {
    // TODO validate selected user is a valid sub user
    let targetUserColumn: string;
    const targetUserId = selectedUserId ?? userId;

    // set price column and user id column name
    if (userType == "Partner") {
      targetUserColumn = "partnerId";
    } else if (userType == "Stockist") {
      targetUserColumn = "stockistId";
    } else if (userType == "Sub Stockist") {
      targetUserColumn = "subStockistId";
    } else if (userType == "Agent") {
      targetUserColumn = "agentId";
    }

    if (selectedUserType == "Partner") {
      targetUserColumn = "partnerId";
    } else if (selectedUserType == "Stockist") {
      targetUserColumn = "stockistId";
    } else if (selectedUserType == "Sub Stockist") {
      targetUserColumn = "subStockistId";
    } else if (selectedUserType == "Agent") {
      targetUserColumn = "agentId";
    }

    const data = await numberwiseReport({
      ticketName,
      resultDate,
      userColumnName: targetUserColumn ?? null,
      userId: targetUserId,
      ticketNumber:
        ticketNumber && ticketNumber.length !== 0 ? ticketNumber : null,
      selectedMode: selectedMode ?? null,
      selectedGroup: selectedGroup ?? null,
      isGroupActive: isGroupActive ?? null,
    });

    return {
      status: 200,
      message: "Numberwise report",
      data,
    };
  } catch (error) {
    console.log(error);
    return {
      status: 500,
      message: "Error getting numberwise report",
      data: null,
    };
  }
};

const getSummery = async ({
  ticketName,
  startDate,
  endDate,
  targetUserColumn,
  targetUserId,
  ticketNumber,
  selectedMode,
  selectedGroup,
  targetPriceColumn,
  subUserColumn,
  targetWinColumn,
  userId,
}) => {
  try {
    // get user data for debit percentage
    const userData = await memoizedFn(userId);
    // const userName = userData ? userData.Items[0]?.name : null; // TODO
    const debitPercentage = userData
      ? Number(userData.Items[0]?.percentageCut || 100)
      : 100; // for net pay
    // fetch sales data
    const salesData = await salesSummery({
      ticketName,
      startDate,
      endDate,
      targetUserColumn: targetUserColumn ?? null,
      targetUserId,
      ticketNumber: ticketNumber ?? null,
      selectedMode: selectedMode ?? null,
      selectedGroup: selectedGroup ?? null,
      priceColumnName: targetPriceColumn,
      subUserColumn,
    });

    // fetch winning data
    const winningData = await winningUsers({
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
      groupByDate: true,
    });

    type ParsedData = {
      resultDate: string;
      totalSales: number;
      totalWinnings: number;
      totalGrossBalance: number;
      users: {
        userId: string;
        userName: string;
        sales: number;
        winnings: number;
        grossBalance: number;
        debitPercentage: number;
        creditPercentage: number;
        createdAt: string;
        sort: number | null;
      }[];
    }[];

    const parsedData: ParsedData = [];

    // parse sales data
    for (const sale of salesData) {
      // format date to YYYY-MM-DD and check if item exists in parsedData
      const formattedDate = dayjs(sale.resultdate).format("YYYY-MM-DD");
      const datesIndex = parsedData.findIndex((obj) =>
        dayjs(obj.resultDate).isSame(formattedDate)
      );

      const userData = await memoizedFn(sale.userid);
      const userName = userData ? userData.Items[0]?.name : null;
      const percentage = userData
        ? Number(userData.Items[0]?.percentageCut || 100)
        : 100;
      if (datesIndex === -1) {
        // push new date to parsedData
        parsedData.push({
          resultDate: formattedDate,
          totalSales: roundTo(Number(sale.price), 2),
          totalWinnings: 0,
          totalGrossBalance: roundTo(Number(sale.price), 2),
          users: [
            {
              userId: sale.userid,
              userName,
              sales: roundTo(Number(sale.price), 2),
              winnings: 0,
              grossBalance: roundTo(Number(sale.price), 2),
              debitPercentage,
              creditPercentage: percentage,
              createdAt: userData ? userData.Items[0]?.createdAt : null,
              sort: userData ? userData.Items[0]?.sort : null,
            },
          ],
        });
      } else {
        // date is present in parsed data, so add new user
        // user has to be new since date is same
        parsedData[datesIndex].users.push({
          userId: sale.userid,
          userName,
          sales: roundTo(Number(sale.price), 2),
          winnings: 0,
          grossBalance: roundTo(Number(sale.price), 2),
          debitPercentage,
          creditPercentage: percentage,
          createdAt: userData ? userData.Items[0]?.createdAt : null,
          sort: userData ? userData.Items[0]?.sort : null,
        });

        // update total sales and balance
        parsedData[datesIndex].totalSales = roundTo(
          parsedData[datesIndex].totalSales + Number(sale.price),
          2
        );
        parsedData[datesIndex].totalGrossBalance = roundTo(
          parsedData[datesIndex].totalGrossBalance + Number(sale.price),
          2
        );
      }
    }

    // parse winnings data
    for (const win of winningData) {
      const userData = await memoizedFn(win.userid);
      const percentage = userData
        ? Number(userData.Items[0]?.percentageCut || 100)
        : 100;
      const formattedDate = dayjs(win.resultdate).format("YYYY-MM-DD");
      const datesIndex = parsedData.findIndex((obj) =>
        dayjs(obj.resultDate).isSame(formattedDate)
      );
      if (datesIndex !== -1) {
        // index cant be -1 because there shoudn't be winning without bills
        const targetUserIndex = parsedData[datesIndex].users.findIndex(
          (obj) => obj.userId == win.userid
        );

        // calculate latest winning and balance
        const roundedWinning = roundTo(
          Number(win.prize) + Number(win.super),
          2
        );
        const roundedBalance = roundTo(
          parsedData[datesIndex].users[targetUserIndex].sales - roundedWinning,
          2
        );

        // update user's winnings and balance
        parsedData[datesIndex].users[targetUserIndex].winnings = roundedWinning;
        parsedData[datesIndex].users[targetUserIndex].grossBalance =
          roundedBalance;

        // update total winning and balance
        parsedData[datesIndex].totalWinnings = roundTo(
          parsedData[datesIndex].totalWinnings + roundedWinning,
          2
        );
        parsedData[datesIndex].totalGrossBalance = roundTo(
          parsedData[datesIndex].totalGrossBalance - roundedWinning,
          2
        );
      }
    }

    // sort users
    parsedData.forEach((item) => {
      item.users.sort(sortUsers);
    });

    // sort parsedData according to resultDate
    parsedData.sort((a, b) => {
      if (dayjs(a.resultDate).isAfter(dayjs(b.resultDate))) {
        return 1;
      } else {
        return -1;
      }
    });

    // append total data, if start date is not equal to end date
    if (startDate !== endDate) {
      let totalSales = 0;
      let totalWinnings = 0;
      let totalGrossBalance = 0;
      const users = [];
      parsedData.forEach((element) => {
        totalSales += element.totalSales;
        totalWinnings += element.totalWinnings;
        totalGrossBalance += element.totalGrossBalance;
        element.users.forEach((user) => {
          const userIndex = users.findIndex(
            (item) => item.userId === user.userId
          );
          if (userIndex === -1) {
            users.push({ ...user });
          } else {
            users[userIndex]["sales"] = roundTo(
              Number(users[userIndex]["sales"]) + Number(user.sales),
              2
            );
            users[userIndex]["winnings"] = roundTo(
              Number(users[userIndex]["winnings"]) + Number(user.winnings),
              2
            );
            users[userIndex]["grossBalance"] = roundTo(
              Number(users[userIndex]["grossBalance"]) +
                Number(user.grossBalance),
              2
            );
          }
        });
      });
      const consolidatedDate = {
        resultDate: `${startDate} - ${endDate}`,
        totalSales: roundTo(totalSales, 2),
        totalWinnings: roundTo(totalWinnings, 2),
        totalGrossBalance: roundTo(totalGrossBalance, 2),
        users,
      };
      parsedData.unshift(consolidatedDate);
    }

    return parsedData;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
