import memoize from "memoizee";
import { Bill } from "../entity/Bill";
import { Ticket } from "../entity/Ticket";
import { getBasicUserInfo, getUserInfo } from "../utils/getBasicUserInfo";
import { getDateBlocks, getCountBlocks } from "../utils/getBlocks";
import { getMasterCounter, getUserCounterV2 } from "../utils/getCounters";
import { myDataSource } from "../app-data-source";
import { checkIfTicketIsBlocked, findTicketTime } from "../utils/ticketBlocks";
import {
  blockTimeForTicket,
  changeBlockTime,
  deleteBill,
  deleteTicket,
  editTicketInDB,
  getBillWithBillNo,
  getBlockTime,
  getDeletedBills,
  getUserCreditValue,
  hardDeleteWithDate,
} from "../utils/sqlHelpers";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

import objectSupport from "dayjs/plugin/objectSupport";
import {
  checkIfTicketIsAdminBlocked,
  checkIfTicketIsUserBlocked,
} from "../utils";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(objectSupport);

const memoizedFn = memoize(getBasicUserInfo, { maxAge: 60000 });

export async function TicketsCreate({
  userId,
  userType,
  reqPartnerId,
  reqStockistId,
  reqSubStockistId,
  reqAgentId,
  ticketName,
  tickets,
  ip,
  deviceId,
}) {
  try {
    const blockedTickets = [];
    const blockedTicketsObj = [];
    let validTicketsPass1 = [];
    let validTicketsPass2 = [];
    let validTicketsPass3 = [];

    // time validations
    const timeBlockData = await checkIfTicketIsBlocked({
      userType,
      ticketName,
    });

    if (timeBlockData.isBlocked === true) {
      return {
        status: 201,
        statusMessage: "TIME_BLOCK",
        message: timeBlockData.message,
        data: {
          billNo: null,
          blockedTickets: [],
          blockedTicketsObj: [],
        },
      };
    }

    const { resultDate } = timeBlockData;

    const adminId = "1";

    const { adminData, partnerData, stockistData, subStockistData, agentData } =
      await allUsersData({
        userType,
        userId,
        adminId,
        reqPartnerId,
        reqStockistId,
        reqSubStockistId,
        reqAgentId,
      });

    // BLOCKING STARTS
    // 1) user sales block
    const salesBlock = isUserSalesBlocked({
      partnerData,
      stockistData,
      subStockistData,
      agentData,
    });
    if (salesBlock.isBlocked) {
      return {
        status: 409,
        statusMessage: "BLOCKED",
        message: salesBlock.message,
        data: null,
      };
    }

    // 2) date block
    let blockDate = await getDateBlocks(ticketName, resultDate);
    if (blockDate.length != 0) {
      // entry blocked for the date
      return {
        status: 409,
        statusMessage: "BLOCKED",
        message: `Entry blocked for ${ticketName} on ${resultDate}`,
        data: null,
      };
    }

    // reverse the tickets order
    tickets.reverse();

    // 3) admin ticket counter blocking
    if (userType !== "Admin" && userType !== "Partner") {
      const blockedData: any = await getCountBlocks(ticketName);
      if (blockedData.Count !== 0) {
        // get total count of tickets
        var masterCounter = await getMasterCounter(
          tickets,
          ticketName,
          resultDate
        );

        // iterating tickets
        tickets.forEach((ticket) => {
          // set flag to check if ticket is blocked or not
          let isBlocked = false;
          blockedData.forEach((blockObj) => {
            // check if ticket is already blocked
            if (!isBlocked) {
              if (isBlockValid(blockObj, ticket, ticketName)) {
                // valid block
                if (blockObj.count == 0) {
                  // add ticket to blocked tickets
                  isBlocked = true;
                } else {
                  // find existing count
                  let ticketCount;
                  if (blockObj.mode == "ALL") {
                    ticketCount = findAllCount({
                      ticketName,
                      number: ticket.number,
                      mode: ticket.mode,
                      counter: masterCounter,
                    });
                  } else {
                    ticketCount = findModeCount({
                      ticketName,
                      number: ticket.number,
                      mode: ticket.mode,
                      counter: masterCounter,
                    });
                  }

                  if (
                    Number(ticketCount) + Number(ticket.count) >
                    blockObj.count
                  ) {
                    // add ticket to blocked tickets
                    isBlocked = true;
                  }
                }
              }
            }
          });
          if (isBlocked) {
            blockedTickets.push([
              ticket.mode,
              ticket.number,
              ticket.count,
              ticket.count,
            ]);
            blockedTicketsObj.push(ticket);
          } else {
            // update count in master counter
            const counterIndex = masterCounter.findIndex(
              (item) => item.number == ticket.number
            );
            masterCounter[counterIndex][ticket.mode] += Number(ticket.count);
            validTicketsPass1.push(ticket);
          }
        });
      }
    } else {
      validTicketsPass1 = [...tickets];
    }

    // 4) partner / stockist / substockist / agent ticket counter block
    if (userType != "Admin" && userType !== "Partner") {
      let partnerBlockList = partnerData.isEntryBlocked.filter(
        (i) => i.ticketName == ticketName || i.ticketName == "ALL"
      );
      let stockistBlockList = stockistData.isEntryBlocked.filter(
        (i) => i.ticketName == ticketName || i.ticketName == "ALL"
      );
      // console.log("stockistBlockList", stockistBlockList);
      let subStockistBlockList = subStockistData.isEntryBlocked.filter(
        (i) => i.ticketName == ticketName || i.ticketName == "ALL"
      );
      let agentBlockList = agentData.isEntryBlocked.filter(
        (i) => i.ticketName == ticketName || i.ticketName == "ALL"
      );

      let partnerCounterPromise = getUserCounterV2(
        tickets,
        ticketName,
        resultDate,
        partnerData.id,
        "Partner"
      );
      let stockistCounterPromise = getUserCounterV2(
        tickets,
        ticketName,
        resultDate,
        stockistData.id,
        "Stockist"
      );
      let subStockistCounterPromise = getUserCounterV2(
        tickets,
        ticketName,
        resultDate,
        subStockistData.id,
        "Sub Stockist"
      );
      let agentCounterPromise = getUserCounterV2(
        tickets,
        ticketName,
        resultDate,
        agentData.id,
        "Agent"
      );

      const [
        partnerCounter,
        stockistCounter,
        subStockistCounter,
        agentCounter,
      ] = await Promise.all([
        partnerCounterPromise,
        stockistCounterPromise,
        subStockistCounterPromise,
        agentCounterPromise,
      ]);

      // START
      // iterating tickets
      validTicketsPass1.forEach((ticket, ticketIndex) => {
        // set flag to check if ticket is blocked or not
        let isBlocked = false;
        // iterating blocks
        [
          agentBlockList,
          subStockistBlockList,
          stockistBlockList,
          partnerBlockList,
        ].forEach((block, blockIndex) => {
          // get counter respective to block types
          let targetCounter;
          switch (blockIndex) {
            case 0:
              targetCounter = agentCounter;
              break;
            case 1:
              targetCounter = subStockistCounter;
              break;
            case 2:
              targetCounter = stockistCounter;
              break;
            default:
              targetCounter = agentCounter;
              break;
          }
          block.forEach((blockObj) => {
            if (!isBlocked) {
              if (isBlockValid(blockObj, ticket, ticketName)) {
                // valid block
                if (blockObj.count == 0) {
                  // add ticket to blocked tickets
                  isBlocked = true;
                } else {
                  // find existing count
                  let ticketCount: number;
                  if (blockObj.mode == "ALL") {
                    ticketCount = findAllCount({
                      ticketName,
                      number: ticket.number,
                      mode: ticket.mode,
                      counter: targetCounter,
                    });
                  } else {
                    ticketCount = findModeCount({
                      ticketName,
                      number: ticket.number,
                      mode: ticket.mode,
                      counter: targetCounter,
                    });
                  }

                  if (
                    Number(ticketCount) + Number(ticket.count) >
                    blockObj.count
                  ) {
                    // add ticket to blocked tickets
                    isBlocked = true;
                  }
                }
              }
            }
          });
        });
        if (!isBlocked) {
          // update count in target counter
          [
            agentCounter,
            subStockistCounter,
            stockistCounter,
            partnerCounter,
          ].forEach((counter) => {
            const counterIndex = counter.findIndex(
              (item) => item.number == ticket.number
            );
            counter[counterIndex][ticket.mode] += Number(ticket.count);
          });
          validTicketsPass2.push(ticket);
        } else {
          // console.log("blocked ticket found...");
          blockedTickets.push([
            ticket.mode,
            ticket.number,
            ticket.count,
            ticket.count,
          ]);
          blockedTicketsObj.push(ticket);
        }
      });
      // END
    } else {
      validTicketsPass2 = [...validTicketsPass1];
    }

    const agentAllPrice = agentData.price.find(
      (item: { ticket: String; modes: any[] }) => item.ticket === ticketName
    ).modes;
    const subStockistAllPrice = subStockistData.price.find(
      (item: { ticket: String; modes: any[] }) => item.ticket === ticketName
    ).modes;
    const stockistAllPrice = stockistData.price.find(
      (item: { ticket: String; modes: any[] }) => item.ticket === ticketName
    ).modes;
    const partnerAllPrice = partnerData.price.find(
      (item: { ticket: String; modes: any[] }) => item.ticket === ticketName
    ).modes;
    const adminAllPrice = adminData.price.find(
      (item: { ticket: String; modes: any[] }) => item.ticket === ticketName
    ).modes;

    // 5) Credit limit
    if (userType != "Admin") {
      const [
        partnerCreditLimit,
        stockistCreditLimit,
        subStockistCreditLimit,
        agentCreditLimit,
      ] = [partnerData, stockistData, subStockistData, agentData].map((i) =>
        Array.isArray(i.creditLimit)
          ? i.creditLimit.filter((i) => i.ticketName == ticketName)
          : null
      );

      const partnerCreditValue: null | number =
        partnerCreditLimit == null || partnerCreditLimit.length == 0
          ? null
          : await getUserCreditValue({
              resultDate,
              ticketName,
              userType: "Partner",
              userId: partnerData.id,
            });

      const stockistCreditValue: null | number =
        stockistCreditLimit == null || stockistCreditLimit.length == 0
          ? null
          : await getUserCreditValue({
              resultDate,
              ticketName,
              userType: "Stockist",
              userId: stockistData.id,
            });

      const subStockistCreditValue: null | number =
        subStockistCreditLimit == null || subStockistCreditLimit.length == 0
          ? null
          : await getUserCreditValue({
              resultDate,
              ticketName,
              userType: "Sub Stockist",
              userId: subStockistData.id,
            });

      const agentCreditValue: null | number =
        agentCreditLimit == null || agentCreditLimit.length == 0
          ? null
          : await getUserCreditValue({
              resultDate,
              ticketName,
              userType: "Agent",
              userId: agentData.id,
            });

      if (
        partnerCreditValue === null &&
        stockistCreditValue === null &&
        subStockistCreditValue === null &&
        agentCreditValue === null
      ) {
        validTicketsPass3 = [...validTicketsPass2];
      } else {
        validTicketsPass2.forEach((ticket) => {
          const [partnerPrice, stockistPrice, subStockistPrice, agentPrice] = [
            partnerAllPrice,
            stockistAllPrice,
            subStockistAllPrice,
            agentAllPrice,
          ].map(
            (i) =>
              i.find(
                (price: { isActive: Boolean; name: String; amount: Number }) =>
                  price.name === ticket.mode
              ).amount * ticket.count
          );

          const creditLimitCondition_1 =
            partnerCreditLimit !== null &&
            partnerCreditValue + partnerPrice >= partnerCreditLimit[0]?.value;

          const creditLimitCondition_2 =
            stockistCreditLimit !== null &&
            stockistCreditValue + stockistPrice >=
              stockistCreditLimit[0]?.value;

          const creditLimitCondition_3 =
            subStockistCreditLimit !== null &&
            subStockistCreditValue + subStockistPrice >=
              subStockistCreditLimit[0]?.value;

          const creditLimitCondition_4 =
            agentCreditLimit !== null &&
            agentCreditValue + agentPrice >= agentCreditLimit[0]?.value;

          if (
            creditLimitCondition_1 ||
            creditLimitCondition_2 ||
            creditLimitCondition_3 ||
            creditLimitCondition_4
          ) {
            // block ticket
            blockedTickets.push([
              ticket.mode,
              ticket.number,
              ticket.count,
              ticket.count,
            ]);
            blockedTicketsObj.push(ticket);
          } else {
            validTicketsPass3.push(ticket);
          }
        });
      }
    } else {
      validTicketsPass3 = [...validTicketsPass2];
    }

    if (validTicketsPass3.length === 0) {
      return {
        status: 201,
        statusMessage: "NO_TICKETS",
        message: "No valid tickets to save",
        data: {
          billNo: null,
          blockedTickets,
          blockedTicketsObj,
        },
      };
    }

    const bill = new Bill();
    bill.agentId = agentData.id;
    bill.agentScheme = agentData.schemeName;
    bill.createdBy = userId;
    bill.resultDate = new Date(resultDate);
    bill.partnerId = partnerData.id;
    bill.partnerScheme = partnerData.schemeName;
    bill.stockistId = stockistData.id;
    bill.stockistScheme = stockistData.schemeName;
    bill.subStockistId = subStockistData.id;
    bill.subStockistScheme = subStockistData.schemeName;
    bill.ticketName = ticketName;
    bill.enteredIp = ip ?? null;
    bill.deviceId = deviceId ?? null;

    await myDataSource.manager.save(bill);

    console.log({ validTicketsPass3 });

    for (const item of validTicketsPass3) {
      const ticket = new Ticket();
      ticket.adminPrice = adminAllPrice.find(
        (price: { isActive: Boolean; name: String; amount: Number }) =>
          price.name === item.mode
      ).amount;
      ticket.agentPrice = agentAllPrice.find(
        (price: { isActive: Boolean; name: String; amount: Number }) =>
          price.name === item.mode
      ).amount;
      ticket.count = Number(item.count);
      ticket.number = item.number;
      ticket.mode = item.mode;
      ticket.partnerPrice = partnerAllPrice.find(
        (price: { isActive: Boolean; name: String; amount: Number }) =>
          price.name === item.mode
      ).amount;
      ticket.stockistPrice = stockistAllPrice.find(
        (price: { isActive: Boolean; name: String; amount: Number }) =>
          price.name === item.mode
      ).amount;
      ticket.subStockistPrice = subStockistAllPrice.find(
        (price: { isActive: Boolean; name: String; amount: Number }) =>
          price.name === item.mode
      ).amount;
      ticket.bill = bill;

      await myDataSource.manager.save(ticket);
    }

    return {
      status: 201,
      statusMessage: "SAVED",
      message: "Bill saved",
      data: {
        billNo: bill.no,
        blockedTickets,
        blockedTicketsObj,
      },
    };
  } catch (err) {
    console.log("Error saving ticket");
    console.log(err);
    return {
      status: 500,
      statusMessage: "ERROR",
      message: "Error saving bill",
      data: null,
    };
  }
}

export const getBillData = async ({ billNo, userId, userType }) => {
  try {
    let targetUserType: string;
    switch (userType) {
      case "Partner":
        targetUserType = "partnerId";
        break;
      case "Stockist":
        targetUserType = "stockistId";
        break;
      case "Sub Stockist":
        targetUserType = "subStockistId";
        break;
      case "Agent":
        targetUserType = "agentId";
        break;
      default:
        targetUserType = "agentId";
        break;
    }

    let billQuery = myDataSource.getRepository(Bill).createQueryBuilder("bill");

    if (userType === "Admin") {
      billQuery.withDeleted();
    }

    billQuery
      .leftJoinAndSelect("bill.tickets", "ticket")
      .where("bill.no = :billNo", { billNo })
      .orderBy("ticket.id", "ASC");

    if (userType !== "Admin") {
      billQuery.andWhere(`bill.${targetUserType} = :userId`, { userId });
    }

    const bill = await billQuery.getOne();

    if (bill == null) {
      return {
        status: 404,
        message: "Bill not found",
        data: null,
      };
    }

    let agentData = null;
    let subStockistData = null;
    let stockistData = null;
    let partnerData = null;

    if (userType === "Partner" || userType === "Admin") {
      agentData = await getBasicUserInfo(bill.agentId);
      subStockistData = await getBasicUserInfo(bill.subStockistId);
      stockistData = await getBasicUserInfo(bill.stockistId);
      partnerData = await getBasicUserInfo(bill.partnerId);
    } else if (userType === "Stockist") {
      agentData = await getBasicUserInfo(bill.agentId);
      subStockistData = await getBasicUserInfo(bill.subStockistId);
      stockistData = await getBasicUserInfo(bill.stockistId);
    } else if (userType === "Sub Stockist") {
      agentData = await getBasicUserInfo(bill.agentId);
      subStockistData = await getBasicUserInfo(bill.subStockistId);
    } else if (userType === "Agent") {
      agentData = await getBasicUserInfo(bill.agentId);
    }

    let deletedUserName = null;

    if (userType === "Admin" && bill.deletedBy != null) {
      const deletedUser = await getBasicUserInfo(bill.deletedBy);
      deletedUserName = deletedUser?.Items[0]?.name;
    }

    let parsedTickets = bill.tickets; // TODO keep agentPrice and remove all other prices

    let totalCount = 0,
      totalAmount = 0;

    bill.tickets.forEach((i) => {
      totalCount += Number(i.count);
      totalAmount += Number(i.agentPrice) * Number(i.count);
    });

    const timeBlockData = await checkIfTicketIsBlocked({
      userType,
      ticketName: bill.ticketName,
    });

    const { isBlocked, resultDate } = timeBlockData;

    const isLocked = isBlocked
      ? true
      : dayjs(resultDate).isSame(dayjs(bill.resultDate))
      ? false
      : true;

    const data = {
      billNo: bill.no,
      resultDate: bill.resultDate,
      createdAt: bill.createdAt,
      ticketName: bill.ticketName,
      totalCount,
      totalAmount,
      deletedDate: bill.deletedDate,
      isLocked,
      agent: {
        id: agentData?.Items[0]?.id,
        name: agentData?.Items[0]?.name,
        billCreator: bill.createdBy === agentData?.Items[0]?.id,
      },
      subStockist:
        userType !== "Agent"
          ? {
              id: subStockistData?.Items[0]?.id,
              name: subStockistData?.Items[0]?.name,
              billCreator: bill.createdBy === subStockistData?.Items[0]?.id,
            }
          : null,
      stockist:
        userType !== "Agent" && userType !== "Sub Stockist"
          ? {
              id: stockistData?.Items[0]?.id,
              name: stockistData?.Items[0]?.name,
              billCreator: bill.createdBy === stockistData?.Items[0]?.id,
            }
          : null,
      partner:
        userType === "Admin" || userType === "Partner"
          ? {
              id: partnerData?.Items[0]?.id,
              name: partnerData?.Items[0]?.name,
              billCreator: bill.createdBy === partnerData?.Items[0]?.id,
            }
          : null,
      deletedUserName,
      tickets: parsedTickets,
    };

    return {
      status: 200,
      message: "Data retrieved",
      data,
    };
  } catch (err) {
    console.log("Error returning bill data");
    console.log(err);
    return {
      status: 500,
      message: "There was a problem returning ticket",
      data: null,
    };
  }
};

export const softDeleteBill = async ({
  billNo,
  userId,
  userType,
}: {
  billNo: number;
  userId: string;
  userType: string;
}): Promise<ServiceFnReturn> => {
  try {
    // retrieve bill data
    const data = await getBillWithBillNo({
      billNo,
      userId,
      userType,
      getTicketDetails: false,
    });

    // check if bill can be edited
    // get current date
    // TODO test this
    const { start } = await findTicketTime({
      ticketName: data.ticketName,
      userType,
    });
    let today = dayjs().tz("Asia/Calcutta");
    const now = today.hour() * 60 + today.minute();
    let currentResultDate;
    if (now < start) {
      currentResultDate = today.format("YYYY-MM-DD");
    } else {
      currentResultDate = today.add(1, "day").format("YYYY-MM-DD");
    }
    if (currentResultDate != data.resultDate) {
      return {
        status: 403,
        message: "Cannot delete locked bills",
        data: null,
      };
    }

    // delete bill
    await deleteBill(billNo, userId, true);

    return {
      status: 200,
      message: "Bill deleted",
      data: null,
    };
  } catch (err) {
    if (err.name === "EntityNotFoundError") {
      // bill number not found
      return {
        status: 404,
        message: "Bill not found",
        data: null,
      };
    }
    console.log("Error deleting bill");
    console.log(err);
    return {
      status: 500,
      message: "There was a problem deleting bill",
      data: null,
    };
  }
};

export const editTicket = async ({
  ticketId,
  billNo,
  userId,
  userType,
  newCount,
}: {
  ticketId: number;
  billNo: number;
  userId: string;
  userType: string;
  newCount: number;
}): Promise<ServiceFnReturn> => {
  try {
    // Get bill & ticket data
    const billData = await getBillWithBillNo({
      billNo,
      userId,
      userType,
      getTicketDetails: true,
    });

    // Check if bill is locked
    // TODO test this
    const { start } = await findTicketTime({
      ticketName: billData.ticketName,
      userType,
    });
    let today = dayjs().tz("Asia/Calcutta");
    const now = today.hour() * 60 + today.minute();
    let currentResultDate;
    if (now < start) {
      currentResultDate = today.format("YYYY-MM-DD");
    } else {
      currentResultDate = today.add(1, "day").format("YYYY-MM-DD");
    }
    if (currentResultDate != billData.resultDate) {
      return {
        status: 403,
        message: "Cannot edit locked bills",
        data: null,
      };
    }

    // Check if new count is greater than current count
    const targetTicket = billData.tickets.find(
      (item) => item.id === Number(ticketId)
    );
    if (targetTicket === undefined) {
      // Ticket not found
      return {
        status: 401,
        message: "Ticket not found",
        data: null,
      };
    }
    const isNewCountGreater = newCount > targetTicket.count;

    // If count is greater than current count, check following
    if (isNewCountGreater && userType !== "Admin") {
      // Edit ticket
      // Check if admin limit is crossed
      const blockedData: any = await getCountBlocks(billData.ticketName);
      var masterCounter = await getMasterCounter(
        [targetTicket],
        billData.ticketName,
        billData.resultDate
      );
      const isAdminBlocked = checkIfTicketIsAdminBlocked({
        blockedData,
        masterCounter,
        ticketName: billData.ticketName,
        ticketMode: targetTicket.mode,
        number: targetTicket.number,
        count: newCount - targetTicket.count,
      });
      // if blocked, return error
      if (isAdminBlocked) {
        return {
          status: 409,
          message: "Limit exceeded. Entry blocked.",
          data: null,
        };
      }

      // Check if subuser limit is crossed
      const adminId = "1";
      const {
        adminData,
        partnerData,
        stockistData,
        subStockistData,
        agentData,
      } = await allUsersData({
        userType,
        userId,
        adminId,
        reqPartnerId: billData.partnerId,
        reqStockistId: billData.stockistId,
        reqSubStockistId: billData.subStockistId,
        reqAgentId: billData.agentId,
      });
      const partnerBlockList = partnerData.isEntryBlocked.filter(
        (i) => i.ticketName == billData.ticketName || i.ticketName == "ALL"
      );
      const stockistBlockList = stockistData.isEntryBlocked.filter(
        (i) => i.ticketName == billData.ticketName || i.ticketName == "ALL"
      );
      const subStockistBlockList = subStockistData.isEntryBlocked.filter(
        (i) => i.ticketName == billData.ticketName || i.ticketName == "ALL"
      );
      const agentBlockList = agentData.isEntryBlocked.filter(
        (i) => i.ticketName == billData.ticketName || i.ticketName == "ALL"
      );

      const agentCounter = await getUserCounterV2(
        [targetTicket],
        billData.ticketName,
        billData.resultDate,
        agentData.id,
        "Agent"
      );
      const isAgentCountBlocked = checkIfTicketIsUserBlocked({
        userBlockList: agentBlockList,
        ticketName: billData.ticketName,
        ticket: { ...targetTicket, count: newCount - targetTicket.count },
        targetCounter: agentCounter,
      });
      if (isAgentCountBlocked) {
        return {
          status: 409,
          message: "Agent Limit exceeded. Entry blocked.",
          data: null,
        };
      }

      const subStockistCounter = await getUserCounterV2(
        [targetTicket],
        billData.ticketName,
        billData.resultDate,
        subStockistData.id,
        "Sub Stockist"
      );
      const isSubStockistCountBlocked = checkIfTicketIsUserBlocked({
        userBlockList: subStockistBlockList,
        ticketName: billData.ticketName,
        ticket: { ...targetTicket, count: newCount - targetTicket.count },
        targetCounter: subStockistCounter,
      });
      if (isSubStockistCountBlocked) {
        return {
          status: 409,
          message: "Sub Stockist Limit exceeded. Entry blocked.",
          data: null,
        };
      }

      const stockistCounter = await getUserCounterV2(
        [targetTicket],
        billData.ticketName,
        billData.resultDate,
        stockistData.id,
        "Stockist"
      );
      const isStockistCountBlocked = checkIfTicketIsUserBlocked({
        userBlockList: stockistBlockList,
        ticketName: billData.ticketName,
        ticket: { ...targetTicket, count: newCount - targetTicket.count },
        targetCounter: stockistCounter,
      });
      if (isStockistCountBlocked) {
        return {
          status: 409,
          message: "Stockist Limit exceeded. Entry blocked.",
          data: null,
        };
      }

      const partnerCounter = await getUserCounterV2(
        [targetTicket],
        billData.ticketName,
        billData.resultDate,
        partnerData.id,
        "Partner"
      );
      const isPartnerCountBlocked = checkIfTicketIsUserBlocked({
        userBlockList: partnerBlockList,
        ticketName: billData.ticketName,
        ticket: { ...targetTicket, count: newCount - targetTicket.count },
        targetCounter: partnerCounter,
      });
      if (isPartnerCountBlocked) {
        return {
          status: 409,
          message: "Partner Limit exceeded. Entry blocked.",
          data: null,
        };
      }

      // Check if subuser credit limit is crossed
      // Get credit limit
      const [
        partnerCreditLimit,
        stockistCreditLimit,
        subStockistCreditLimit,
        agentCreditLimit,
      ] = [partnerData, stockistData, subStockistData, agentData].map((i) =>
        Array.isArray(i.creditLimit)
          ? i.creditLimit.filter((i) => i.ticketName == billData.ticketName)
          : null
      );

      // guet user credit values
      const partnerCreditValue: null | number =
        partnerCreditLimit == null || partnerCreditLimit.length == 0
          ? null
          : await getUserCreditValue({
              resultDate: billData.resultDate,
              ticketName: billData.ticketName,
              userType: "Partner",
              userId: partnerData.id,
            });
      const stockistCreditValue: null | number =
        stockistCreditLimit == null || stockistCreditLimit.length == 0
          ? null
          : await getUserCreditValue({
              resultDate: billData.resultDate,
              ticketName: billData.ticketName,
              userType: "Stockist",
              userId: stockistData.id,
            });
      const subStockistCreditValue: null | number =
        subStockistCreditLimit == null || subStockistCreditLimit.length == 0
          ? null
          : await getUserCreditValue({
              resultDate: billData.resultDate,
              ticketName: billData.ticketName,
              userType: "Sub Stockist",
              userId: subStockistData.id,
            });
      const agentCreditValue: null | number =
        agentCreditLimit == null || agentCreditLimit.length == 0
          ? null
          : await getUserCreditValue({
              resultDate: billData.resultDate,
              ticketName: billData.ticketName,
              userType: "Agent",
              userId: agentData.id,
            });

      if (
        partnerCreditValue !== null ||
        stockistCreditValue !== null ||
        subStockistCreditValue !== null ||
        agentCreditValue !== null
      ) {
        // some of sub users have credit limit set
        // validate credit limit is not exceeded
        const agentAllPrice = agentData.price.find(
          (item: { ticket: String; modes: any[] }) =>
            item.ticket === billData.ticketName
        ).modes;
        const subStockistAllPrice = subStockistData.price.find(
          (item: { ticket: String; modes: any[] }) =>
            item.ticket === billData.ticketName
        ).modes;
        const stockistAllPrice = stockistData.price.find(
          (item: { ticket: String; modes: any[] }) =>
            item.ticket === billData.ticketName
        ).modes;
        const partnerAllPrice = partnerData.price.find(
          (item: { ticket: String; modes: any[] }) =>
            item.ticket === billData.ticketName
        ).modes;

        const [partnerPrice, stockistPrice, subStockistPrice, agentPrice] = [
          partnerAllPrice,
          stockistAllPrice,
          subStockistAllPrice,
          agentAllPrice,
        ].map(
          (i) =>
            i.find(
              (price: { isActive: Boolean; name: String; amount: Number }) =>
                price.name === targetTicket.mode
            ).amount * newCount
        );

        if (
          partnerCreditLimit !== null &&
          partnerCreditValue + partnerPrice >= partnerCreditLimit[0]?.value
        ) {
          // partner credit limit exceeded
          return {
            status: 409,
            message: "Partner Credit Limit exceeded. Entry blocked.",
            data: null,
          };
        } else if (
          stockistCreditLimit !== null &&
          stockistCreditValue + stockistPrice >= stockistCreditLimit[0]?.value
        ) {
          // stockist credit limit exceeded
          return {
            status: 409,
            message: "Stockist Credit Limit exceeded. Entry blocked.",
            data: null,
          };
        } else if (
          subStockistCreditLimit !== null &&
          subStockistCreditValue + subStockistPrice >=
            subStockistCreditLimit[0]?.value
        ) {
          // sub stockist credit limit exceeded
          return {
            status: 409,
            message: "Sub Stockist Credit Limit exceeded. Entry blocked.",
            data: null,
          };
        } else if (
          agentCreditLimit !== null &&
          agentCreditValue + agentPrice >= agentCreditLimit[0]?.value
        ) {
          // agent credit limit exceeded
          return {
            status: 409,
            message: "Agent Credit Limit exceeded. Entry blocked.",
            data: null,
          };
        }
      }
    }

    // If all checks passed, edit ticket
    await editTicketInDB({ ticketId, billNo, newCount });

    return {
      status: 200,
      message: "Ticket updated.",
      data: null,
    };
  } catch (error) {
    if (error.name === "EntityNotFoundError") {
      // bill not found
      return {
        status: 401,
        message: "Bill not found",
        data: null,
      };
    }
    console.log(error);
    return {
      status: 500,
      message: "Error editing ticket",
      data: null,
    };
  }
};

export const softDeleteTicket = async ({
  billNo,
  ticketId,
  userId,
  userType,
}: {
  billNo: number;
  ticketId: number;
  userId: string;
  userType: string;
}): Promise<ServiceFnReturn> => {
  try {
    // retrieve bill data
    const data = await getBillWithBillNo({
      billNo,
      userId,
      userType,
      getTicketDetails: false,
    });

    // check if bill can be edited
    // get current date
    // TODO test this
    const { start } = await findTicketTime({
      ticketName: data.ticketName,
      userType,
    });
    let today = dayjs().tz("Asia/Calcutta");
    const now = today.hour() * 60 + today.minute();
    let currentResultDate;
    if (now < start) {
      currentResultDate = today.format("YYYY-MM-DD");
    } else {
      currentResultDate = today.add(1, "day").format("YYYY-MM-DD");
    }
    if (currentResultDate != data.resultDate) {
      return {
        status: 403,
        message: "Cannot delete locked bills",
        data: null,
      };
    }

    // delete ticket
    await deleteTicket(billNo, ticketId, userId);

    return {
      status: 200,
      message: "Ticket deleted",
      data: null,
    };
  } catch (error) {
    if (error.name === "EntityNotFoundError") {
      // bill number not found
      return {
        status: 404,
        message: "Ticket not found",
        data: null,
      };
    }
  }
};

export const listDeletedBills = async ({
  ticketName,
  startDate,
  endDate,
  selectedGroup,
  selectedMode,
  ticketNumber,
  selectedUserId,
  selectedUserType,
}) => {
  try {
    let targetUserColumn: string;
    if (selectedUserType == "2") {
      targetUserColumn = "partnerId";
    } else if (selectedUserType == "3") {
      targetUserColumn = "stockistId";
    } else if (selectedUserType == "4") {
      targetUserColumn = "subStockistId";
    } else if (selectedUserType == "5") {
      targetUserColumn = "agentId";
    }

    const data = await getDeletedBills({
      ticketName,
      startDate,
      endDate,
      selectedGroup: selectedGroup ?? null,
      selectedMode: selectedMode ?? null,
      ticketNumber: ticketNumber ?? null,
      userId: selectedUserId ?? null,
      userColumnName: targetUserColumn ?? null,
    });

    // parse the data to add user name
    const parsedData = [];
    for (const item of data) {
      const partnerData = await memoizedFn(item.partnerId);
      const partnerName = partnerData ? partnerData.Items[0]?.name : null;
      const stockistData = await memoizedFn(item.stockistId);
      const stockistName = stockistData ? stockistData.Items[0]?.name : null;
      const subStockistData = await memoizedFn(item.subStockistId);
      const subStockistName = subStockistData
        ? subStockistData.Items[0]?.name
        : null;
      const agentData = await memoizedFn(item.agentId);
      const agentName = agentData ? agentData.Items[0]?.name : null;
      parsedData.push({
        ...item,
        partnerName,
        stockistName,
        subStockistName,
        agentName,
      });
    }

    return {
      status: 200,
      message: "Deleted bills fetched",
      data: parsedData,
    };
  } catch (error) {
    console.log("Error listing deleted bills");
    console.log(error);
    return {
      status: 500,
      message: "There was a problem listing deleted bills",
      data: null,
    };
  }
};

const allUsersData = async ({
  userType,
  userId,
  adminId,
  reqPartnerId,
  reqStockistId,
  reqSubStockistId,
  reqAgentId,
}) => {
  let partnerId;
  let stockistId;
  let subStockistId;
  let agentId;

  const adminDataRes = await getUserInfo(adminId);
  const adminData = adminDataRes.Items[0];

  let partnerData;
  let stockistData;
  let subStockistData;
  let agentData;

  if (userType === "Agent") {
    let agentDataRes = await getUserInfo(userId);
    agentData = agentDataRes.Items[0];
    agentId = userId;
    subStockistId = agentData.subStockist;
    stockistId = agentData.stockist;
    partnerId = agentData.partner;

    let subStockistDataRes = await getUserInfo(subStockistId);
    let stockistDataRes = await getUserInfo(stockistId);
    let partnerDataRes = await getUserInfo(partnerId);

    subStockistData = subStockistDataRes.Items[0];
    stockistData = stockistDataRes.Items[0];
    partnerData = partnerDataRes.Items[0];
  } else if (userType === "Sub Stockist") {
    let subStockistDataRes = await getUserInfo(userId);
    subStockistData = subStockistDataRes.Items[0];
    subStockistId = userId;
    stockistId = subStockistData.stockist;
    partnerId = subStockistData.partner;

    let agentDataRes = await getUserInfo(reqAgentId);
    let stockistDataRes = await getUserInfo(stockistId);
    let partnerDataRes = await getUserInfo(partnerId);

    agentData = agentDataRes.Items[0];
    stockistData = stockistDataRes.Items[0];
    partnerData = partnerDataRes.Items[0];
  } else if (userType === "Stockist") {
    let stockistDataRes = await getUserInfo(userId);
    stockistData = stockistDataRes.Items[0];
    stockistId = userId;
    partnerId = stockistData.partner;

    let agentDataRes = await getUserInfo(reqAgentId);
    let subStockistDataRes = await getUserInfo(reqSubStockistId);
    let partnerDataRes = await getUserInfo(partnerId);

    agentData = agentDataRes.Items[0];
    subStockistData = subStockistDataRes.Items[0];
    partnerData = partnerDataRes.Items[0];
  } else if (userType === "Partner") {
    let partnerDataRes = await getUserInfo(userId);
    partnerData = partnerDataRes.Items[0];
    partnerId = userId;

    let agentDataRes = await getUserInfo(reqAgentId);
    let subStockistDataRes = await getUserInfo(reqSubStockistId);
    let stockistDataRes = await getUserInfo(reqStockistId);

    agentData = agentDataRes.Items[0];
    subStockistData = subStockistDataRes.Items[0];
    stockistData = stockistDataRes.Items[0];
  } else if (userType === "Admin") {
    let partnerDataRes = await getUserInfo(reqPartnerId);
    let agentDataRes = await getUserInfo(reqAgentId);
    let subStockistDataRes = await getUserInfo(reqSubStockistId);
    let stockistDataRes = await getUserInfo(reqStockistId);

    partnerData = partnerDataRes.Items[0];
    agentData = agentDataRes.Items[0];
    subStockistData = subStockistDataRes.Items[0];
    stockistData = stockistDataRes.Items[0];
  }

  return { adminData, partnerData, stockistData, subStockistData, agentData };
};

const isUserSalesBlocked = ({
  partnerData,
  stockistData,
  subStockistData,
  agentData,
}): { isBlocked: boolean; message: string } => {
  if (partnerData.isSalesBlocked) {
    return {
      isBlocked: true,
      message: `Entry blocked for ${partnerData.name}`,
    };
  } else if (stockistData.isSalesBlocked) {
    return {
      isBlocked: true,
      message: `Entry blocked for ${stockistData.name}`,
    };
  } else if (subStockistData.isSalesBlocked) {
    return {
      isBlocked: true,
      message: `Entry blocked for ${subStockistData.name}`,
    };
  } else if (agentData.isSalesBlocked) {
    return {
      isBlocked: true,
      message: `Entry blocked for ${agentData.name}`,
    };
  }
  return {
    isBlocked: false,
    message: "",
  };
};

const isBlockValid = (blockObj, ticket, ticketName) => {
  let cond1 = false;
  if (blockObj.mode == ticket.mode) {
    cond1 = true;
  } else {
    if (ticket.mode == "SUPER" || ticket.mode == "BOX") {
      cond1 = blockObj.mode == "ALL" && blockObj.group == "3";
    } else if (
      ticket.mode == "AB" ||
      ticket.mode == "BC" ||
      ticket.mode == "AC"
    ) {
      cond1 = blockObj.mode == "ALL" && blockObj.group == "2";
    } else if (ticket.mode == "A" || ticket.mode == "B" || ticket.mode == "C") {
      cond1 = blockObj.mode == "ALL" && blockObj.group == "1";
    }
  }
  let cond2 = blockObj.number == ticket.number || blockObj.number == "ALL";
  let cond3 = blockObj.ticketName == ticketName || blockObj.ticketName == "ALL";

  return cond1 && cond2 && cond3;
};

const findAllCount = ({ ticketName, number, mode, counter }) => {
  let numberCount = counter.find((item) => item.number == number);
  if (mode == "SUPER" || mode == "BOX") {
    return Number(numberCount.SUPER) + Number(numberCount.BOX);
  } else if (mode == "AB" || mode == "BC" || mode == "AC") {
    return (
      Number(numberCount.AB) + Number(numberCount.BC) + Number(numberCount.AC)
    );
  } else if (mode == "A" || mode == "B" || mode == "C") {
    return (
      Number(numberCount.A) + Number(numberCount.B) + Number(numberCount.C)
    );
  }
};

const findModeCount = ({ ticketName, number, mode, counter }) => {
  let numberCount = counter.find((item) => item.number == number);
  return numberCount[mode];
};

const findStartTime = (ticketName, userType) => {
  let timeLockMessage;
  var start = null;
  var end = null;
  switch (ticketName) {
    case "DEAR1":
      start = 12 * 60 + 58;
      end = 20 * 60 + 30;
      timeLockMessage = "Entry Locked from 12:58 PM - 8:30 PM";
      break;
    case "LSK3":
      start = 15 * 60 + 4;
      end = 16 * 60 + 0;
      timeLockMessage = "Entry Locked from 3:04 PM - 4:00 PM";
      break;
    case "DEAR6":
      start = 17 * 60 + 58;
      end = 20 * 60 + 30;
      timeLockMessage = "Entry Locked from 5:58 PM - 8:30 PM";
      break;
    case "DEAR8":
      start = 19 * 60 + 58;
      end = 22 * 60 + 1;
      timeLockMessage = "Entry Locked from 7:58 PM - 8:30 PM";
      break;
    default:
      break;
  }
  if (ticketName == "LSK3") {
    // if (userType == "1") {
    if (true) {
      start += 1;
      // start += 56;
    }
  }
  // else if (ticketName == "DEAR8" && userType == "1") {
  //    start = 22 * 60 + 0;
  // }
  else {
    if (userType == "1") {
      start += 1;
    } else if (userType == "2") {
      start += 1;
    }
  }

  return { start, timeLockMessage, end };
};

/**
 * It takes in a ticket name, user type, start time, and end time, and updates the block time for that
 * ticket
 * @param  - ticketName - The name of the ticket you want to update
 * @returns A function that takes in an object with the following properties:
 *   ticketName: string
 *   userType: string
 *   startTime: string
 *   endTime: string
 */
export const updateBillTime = async ({
  ticketName,
  updatedTime,
}): Promise<ServiceFnReturn> => {
  try {
    for (const item of JSON.parse(updatedTime)) {
      const parsedStartTime =
        dayjs(item.startTime).hour() * 60 + dayjs(item.startTime).minute();
      const parsedEndTime =
        dayjs(item.endTime).hour() * 60 + dayjs(item.endTime).minute();

      await changeBlockTime({
        ticketName,
        userType: item.userType,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
      });
    }
    return {
      status: 200,
      message: "Time updated",
      data: null,
    };
  } catch (error) {
    console.log(error);
    return {
      status: 500,
      message: "There was an error updating time",
      data: null,
    };
  }
};

const convertNumberToTime = (number: number) => {
  const hour = Math.floor(number / 60);
  const minute = Math.floor(number % 60);
  return dayjs({ hour, minute });
};

export const getTicketTime = async ({}) => {
  try {
    const data = await getBlockTime();

    const lsk3Data = [];
    const dear1Data = [];
    const dear6Data = [];
    const dear8Data = [];

    data.forEach((item) => {
      if (item.ticketName === "LSK3") {
        lsk3Data.push({
          userType: item.userType,
          startTime: convertNumberToTime(item.startTime),
          endTime: convertNumberToTime(item.endTime),
        });
      } else if (item.ticketName === "DEAR1") {
        dear1Data.push({
          userType: item.userType,
          startTime: convertNumberToTime(item.startTime),
          endTime: convertNumberToTime(item.endTime),
        });
      } else if (item.ticketName === "DEAR6") {
        dear6Data.push({
          userType: item.userType,
          startTime: convertNumberToTime(item.startTime),
          endTime: convertNumberToTime(item.endTime),
        });
      } else if (item.ticketName === "DEAR8") {
        dear8Data.push({
          userType: item.userType,
          startTime: convertNumberToTime(item.startTime),
          endTime: convertNumberToTime(item.endTime),
        });
      }
    });

    return {
      status: 200,
      message: "Time fetched",
      data: {
        lsk3Data,
        dear1Data,
        dear6Data,
        dear8Data,
      },
    };
  } catch (error) {
    console.log(error);
    return {
      status: 500,
      message: "There was an error getting ticket time",
      data: null,
    };
  }
};

export const getBlockTimeForTicket = async ({
  ticketName,
}): Promise<ServiceFnReturn> => {
  try {
    const data = await blockTimeForTicket({ ticketName });

    const parsedData = data.map((item) => ({
      id: item.id,
      ticketName: item.ticketName,
      userType: item.userType,
      startTime: convertNumberToTime(item.startTime),
      endTime: convertNumberToTime(item.endTime),
    }));

    return {
      status: 200,
      message: "Time fetched",
      data: parsedData,
    };
  } catch (error) {
    console.log(error);
    return {
      status: 500,
      message: "There was an error getting ticket time",
      data: null,
    };
  }
};

/**
 * It deletes a bill from the database
 * @param  - billNo - the bill number of the bill to be deleted
 * @returns A function that takes in an object with a billNo property and returns a promise that
 * resolves to an object with a status, message, and data property.
 */
export const hardDeleteBill = async ({
  billNo,
  userId,
}): Promise<ServiceFnReturn> => {
  try {
    // delete bill
    await deleteBill(billNo, userId, false);

    return {
      status: 200,
      message: "Bill deleted",
      data: null,
    };
  } catch (error) {
    console.log(error);
    return {
      status: 500,
      message: "There was an error getting ticket time",
      data: null,
    };
  }
};

/**
 * It deletes all the bills between the start date and end date
 * @param  - startDate - the start date of the range
 */
export const deleteBetweenDate = async ({
  startDate,
  endDate,
  ticketName,
}): Promise<ServiceFnReturn> => {
  try {
    // TODO hanlde user selection

    // delete ticket
    await hardDeleteWithDate({ ticketName, startDate, endDate });

    return {
      status: 200,
      message: "Bill deleted with date",
      data: null,
    };
  } catch (error) {
    console.log(error);
    return {
      status: 500,
      message: "There was an error getting ticket time",
      data: null,
    };
  }
};
