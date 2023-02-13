import { myDataSource } from "../app-data-source";
import memoize from "memoizee";
import { Bill } from "../entity/Bill";
import { roundTo, sortUsers } from "../utils";
import { getBasicUserInfo } from "../utils/getBasicUserInfo";
import {
  numberwiseReport,
  salesReport,
  salesSummeryForDate,
  netSalesSummery,
  winningUsers,
  salesSummery,
} from "../utils/sqlHelpers";
import dayjs from "dayjs";

const memoizedFn = memoize(getBasicUserInfo, { maxAge: 60000 });

type SalesSummery = {
  userId: string;
  userType: string;
  ticketName: string;
  startDate: string;
  endDate: string;
  selectedUserType?: string;
  selectedUserId?: string;
  selectedGroup?: string;
  selectedMode?: string;
  ticketNumber?: number;
};

export const getSalesSummery = async ({
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
}: SalesSummery): Promise<ServiceFnReturn> => {
  try {
    // TODO validate selected user is a valid sub user
    const targetUserId = selectedUserId ?? userId;
    let targetPriceColumn: string;
    let targetUserColumn: string;

    // set price
    if (userType == "Admin") {
      targetPriceColumn = "partnerPrice";
      targetUserColumn = null;
    } else if (userType == "Partner") {
      targetPriceColumn = "stockistPrice";
      targetUserColumn = "partnerId";
    } else if (userType == "Stockist") {
      targetPriceColumn = "subStockistPrice";
      targetUserColumn = "stockistId";
    } else if (userType == "Sub Stockist") {
      targetPriceColumn = "agentPrice";
      targetUserColumn = "subStockistId";
    } else if (userType == "Agent") {
      targetPriceColumn = "agentPrice";
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

    const data = await netSalesSummery({
      ticketName,
      startDate,
      endDate,
      userColumnName: targetUserColumn ?? null,
      userId: targetUserId,
      ticketNumber: ticketNumber ?? null,
      selectedMode: selectedMode ?? null,
      selectedGroup: selectedGroup ?? null,
      priceColumnName: targetPriceColumn,
    });

    let totalAmount = 0;
    let totalCount = 0;
    if (data.length != 0) {
      totalAmount = data
        .map((item) => item.price)
        .reduce((prev, next) => Number(prev) + Number(next));
      totalAmount = roundTo(totalAmount, 2);
      totalCount = data
        .map((item) => item.count)
        .reduce((prev, next) => Number(prev) + Number(next));
    }

    return {
      status: 200,
      message: "Sales summery generated",
      data: {
        totalAmount,
        totalCount,
        data,
      },
    };
  } catch (error) {
    console.log(error);
    return {
      status: 500,
      message: "Error generating summery",
      data: null,
    };
  }
};

/*
  Function to get the entire sales summery for a given date
  The return value will be aggregate sales amount and count along with array of
  individual user sales amount and count
*/
export const getSalesSummeryForDate = async ({
  userId,
  userType,
  ticketName,
  resultDate,
  selectedUserType,
  selectedUserId,
  selectedGroup,
  selectedMode,
  ticketNumber,
}): Promise<ServiceFnReturn> => {
  try {
    // TODO validate selected user is a valid sub user
    const targetUserId = selectedUserId ?? userId;
    let targetPriceColumn: string;
    let targetUserColumn: string;
    let subUserColumn: string;

    // set price
    if (userType == "Admin") {
      subUserColumn = "partnerId";
      targetPriceColumn = "partnerPrice";
    } else if (userType == "Partner") {
      targetUserColumn = "partnerId";
      subUserColumn = "stockistId";
      targetPriceColumn = "stockistPrice";
    } else if (userType == "Stockist") {
      targetUserColumn = "stockistId";
      subUserColumn = "subStockistId";
      targetPriceColumn = "subStockistPrice";
    } else if (userType == "Sub Stockist") {
      targetUserColumn = "subStockistId";
      subUserColumn = "agentId";
      targetPriceColumn = "agentPrice";
    } else if (userType == "Agent") {
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

    const data = await salesSummeryForDate({
      ticketName,
      resultDate,
      userColumnName: targetUserColumn ?? null,
      targetUserId,
      userType,
      ticketNumber: ticketNumber ?? null,
      selectedMode: selectedMode ?? null,
      selectedGroup: selectedGroup ?? null,
      priceColumnName: targetPriceColumn,
      subUserColumn,
    });

    let totalAmount = 0;
    let totalCount = 0;
    if (data.length != 0) {
      totalAmount = data
        .map((item) => item.price)
        .reduce((prev, next) => Number(prev) + Number(next));
      totalAmount = roundTo(totalAmount, 2);
      totalCount = data
        .map((item) => item.count)
        .reduce((prev, next) => Number(prev) + Number(next));
    }

    const types = ["Admin", "Partner", "Stockist", "Sub Stockist", "Agent"];

    // get user names
    for (const item of data) {
      const userData = await getBasicUserInfo(item.userid);
      item["username"] = userData?.Items[0]?.name;
      item["usertype"] = types[Number(userData?.Items[0]?.type) - 1];
      item["sort"] = userData?.Items[0]?.sort ?? 9999;
      item["createdAt"] = userData?.Items[0]?.createdAt;
    }

    const sortedUsers = data.sort(sortUsers);

    return {
      status: 200,
      message: "Sales summery generated",
      data: {
        resultDate,
        totalAmount,
        totalCount,
        data: sortedUsers,
      },
    };
  } catch (error) {
    console.log(error);
    return {
      status: 500,
      message: "Error generating date summery",
      data: null,
    };
  }
};

/*
  Function to get sales report for a given date and agentId
*/
export const getSalesReport = async ({
  userId,
  userType,
  agentId,
  ticketName,
  resultDate,
  selectedGroup,
  selectedMode,
  ticketNumber,
}): Promise<ServiceFnReturn> => {
  try {
    // TODO validate selected user is a valid sub user
    let targetPriceColumn: string;
    let targetUserColumn: string;

    // set price column and user id column name
    if (userType == "Admin") {
      targetPriceColumn = "partnerPrice";
    } else if (userType == "Partner") {
      targetPriceColumn = "stockistPrice";
      targetUserColumn = "partnerId";
    } else if (userType == "Stockist") {
      targetPriceColumn = "subStockistPrice";
      targetUserColumn = "stockistId";
    } else if (userType == "Sub Stockist") {
      targetPriceColumn = "agentPrice";
      targetUserColumn = "subStockistId";
    } else if (userType == "Agent") {
      targetPriceColumn = "agentPrice";
      targetUserColumn = "agentId";
    }

    const data = await salesReport({
      agentId: userType === "Agent" ? userId : agentId,
      ticketName,
      resultDate,
      selectedGroup: selectedGroup ?? null,
      selectedMode: selectedMode ?? null,
      ticketNumber: ticketNumber ?? null,
      priceColumnName: targetPriceColumn,
      userColumnName: targetUserColumn ?? null,
      userId,
      userType,
    });

    // calculate total amount and count
    let totalAmount = 0;
    let totalCount = 0;
    if (data.length != 0) {
      totalAmount = data
        .map((item) => item.price * item.ticket_count)
        .reduce((prev, next) => Number(prev) + Number(next));
      totalAmount = roundTo(totalAmount, 2);
      totalCount = data
        .map((item) => item.ticket_count)
        .reduce((prev, next) => Number(prev) + Number(next));
    }

    // format data
    const bills = [];
    for (const item of data) {
      const dataIndex = bills.findIndex(
        (element) => element.billno == item.billno
      );
      if (dataIndex === -1) {
        // add new bill to data
        let agentInfo = await memoizedFn(item.bill_agentId);
        let subStockistInfo = item.bill_subStockistId
          ? await memoizedFn(item.bill_subStockistId)
          : null;
        let stockistInfo = item.bill_stockistId
          ? await memoizedFn(item.bill_stockistId)
          : null;
        let partnerInfo = item.bill_partnerId
          ? await memoizedFn(item.bill_partnerId)
          : null;

        let newBill = {
          ...item,
          partnerName: partnerInfo ? partnerInfo.Items[0]?.name : null,
          stockistName: stockistInfo ? stockistInfo.Items[0]?.name : null,
          subStockistName: subStockistInfo
            ? subStockistInfo.Items[0]?.name
            : null,
          agentName: agentInfo ? agentInfo.Items[0]?.name : null,
        };

        delete newBill.price;
        delete newBill.ticket_count;
        delete newBill.ticket_mode;
        delete newBill.ticket_number;

        const newTicket = [];
        newTicket.push({
          price: item.price,
          count: item.ticket_count,
          mode: item.ticket_mode,
          number: item.ticket_number,
        });
        newBill.tickets = newTicket;
        bills.push(newBill);
      } else {
        // add ticket to existing bill
        bills[dataIndex].tickets.push({
          price: item.price,
          count: item.ticket_count,
          mode: item.ticket_mode,
          number: item.ticket_number,
        });
      }
    }

    return {
      status: 200,
      message: "Sales report generated",
      data: {
        totalAmount,
        totalCount,
        bills,
      },
    };
  } catch (error) {
    console.log(error);
    return {
      status: 500,
      message: "Error generating sales report",
      data: null,
    };
  }
};
