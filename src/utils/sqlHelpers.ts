// const mysql = require("mysql2/promise");
// const config = require("../config");

import { Ticket } from "../entity/Ticket";
import { Bill } from "../entity/Bill";
import { Blocktime } from "../entity/Blocktime";
import { Winning } from "../entity/Winning";

import { myDataSource } from "../app-data-source";

export const getTotalCount = async ({
  ticketName,
  resultDate,
  number,
  mode,
}): Promise<number> => {
  try {
    const data = await myDataSource
      .getRepository(Bill)
      .createQueryBuilder("bill")
      .leftJoin("bill.tickets", "ticket")
      .where("bill.ticketName = :ticketName", {
        ticketName,
      })
      .andWhere("bill.resultDate = :resultDate", {
        resultDate,
      })
      .andWhere("ticket.number = :number", {
        number,
      })
      .andWhere("ticket.mode = :mode", {
        mode,
      })
      .select("SUM(ticket.count)", "totalCount")
      .getRawOne();
    return data.totalCount ?? 0;
  } catch (err) {
    console.log(err);
    throw new Error("Error counting total tickets");
  }
};

export const getUserCount = async ({
  ticketName,
  resultDate,
  number,
  mode,
  userId,
  userType,
}): Promise<number> => {
  try {
    let targetUserId = "agentId";
    if (userType === "Partner") {
      targetUserId = "partnerId";
    } else if (userType === "Stockist") {
      targetUserId = "stockistId";
    } else if (userType === "Sub Stockist") {
      targetUserId = "subStockistId";
    } else if (userType === "Agent") {
      targetUserId = "agentId";
    }

    const data = await myDataSource
      .getRepository(Bill)
      .createQueryBuilder("bill")
      .leftJoin("bill.tickets", "ticket")
      .where("bill.ticketName = :ticketName", {
        ticketName,
      })
      .andWhere("bill.resultDate = :resultDate", {
        resultDate,
      })
      .andWhere(`bill.${targetUserId} = :userId`, {
        userId,
      })
      .andWhere("ticket.number = :number", {
        number,
      })
      .andWhere("ticket.mode = :mode", {
        mode,
      })
      .select("SUM(ticket.count)", "totalCount")
      .getRawOne();

    return data.totalCount ?? 0;
  } catch (err) {
    console.log(err);
    throw new Error("Error counting user tickets");
  }
};

export const getUserCreditValue = async ({
  resultDate,
  ticketName,
  userType,
  userId,
}): Promise<number> => {
  try {
    let targetUserId = "agentId";
    let targetUserPrice = "agentPrice";
    if (userType === "Partner") {
      targetUserId = "partnerId";
      targetUserPrice = "partnerPrice";
    } else if (userType === "Stockist") {
      targetUserId = "stockistId";
      targetUserPrice = "stockistPrice";
    } else if (userType === "Sub Stockist") {
      targetUserId = "subStockistId";
      targetUserPrice = "subStockistPrice";
    } else if (userType === "Agent") {
      targetUserId = "agentId";
      targetUserPrice = "agentPrice";
    }

    const data = await myDataSource
      .getRepository(Bill)
      .createQueryBuilder("bill")
      .leftJoin("bill.tickets", "ticket")
      .where("bill.ticketName = :ticketName", {
        ticketName,
      })
      .andWhere("bill.resultDate = :resultDate", {
        resultDate,
      })
      .andWhere(`bill.${targetUserId} = :userId`, {
        userId,
      })
      .select(`SUM(ticket.${targetUserPrice} * ticket.count)`, "totalValue")
      .getRawOne();

    return Number(data.totalValue) ?? 0;
  } catch (err) {
    console.log(err);
    throw new Error("Error getting user credit value");
  }
};

export const deleteAllWinnings = async ({ resultDate, ticketName }) => {
  try {
    const data = await myDataSource
      .getRepository(Winning)
      .createQueryBuilder("Winning")
      .where("resultDate = :resultDate", { resultDate })
      .andWhere("ticketName = :ticketName", { ticketName })
      .delete()
      .execute();
  } catch (err) {
    console.log(err);
    throw new Error("Error deleting winnings");
  }
};

export const getBillsWithDate = async ({ resultDate, ticketName }) => {
  try {
    const data = await myDataSource
      .getRepository(Bill)
      .createQueryBuilder("bill")
      .leftJoinAndSelect("bill.tickets", "ticket")
      .where("bill.ticketName = :ticketName", {
        ticketName,
      })
      .andWhere("bill.resultDate = :resultDate", {
        resultDate,
      })
      // .select("SUM(ticket.count)", "totalCount")
      .getRawMany();
    return data;
  } catch (err) {
    console.log(err);
    throw new Error("Error getting tickets");
  }
};

export const insertWinnings = async (winnings) => {
  try {
    await myDataSource
      .createQueryBuilder()
      .insert()
      .into(Winning)
      .values(winnings)
      .execute();
  } catch (err) {
    console.log(err);
    throw new Error("Error inserting winnings");
  }
};

export const getBillWithBillNo = async ({
  billNo,
  userId,
  userType,
  getTicketDetails,
}): Promise<Bill> => {
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

    const query = myDataSource.getRepository(Bill).createQueryBuilder("Bill");

    if (getTicketDetails === true) {
      query.leftJoinAndSelect("Bill.tickets", "ticket");
    }

    query.where("Bill.no = :billNo", {
      billNo,
    });

    if (userType !== "Admin") {
      query.andWhere(`Bill.${targetUserType} = :userId`, { userId });
    }

    return query.getOneOrFail();
  } catch (error) {
    console.log("error in getBillWithBillNo");
    console.log({ error });
    throw error;
  }
};

export const deleteBill = async (
  billNo: number,
  userId: string,
  softDelete = true
) => {
  try {
    if (softDelete) {
      await myDataSource
        .createQueryBuilder()
        .update(Bill)
        .set({
          deletedBy: userId,
        })
        .where("no = :billNo", { billNo })
        .execute();

      await myDataSource
        .getRepository(Bill)
        .createQueryBuilder("Bill")
        .softDelete()
        .where("no = :billNo", { billNo })
        .execute();
    } else {
      await myDataSource
        .getRepository(Bill)
        .createQueryBuilder("Bill")
        .delete()
        .where("no = :billNo", { billNo })
        .execute();
    }
  } catch (err) {
    console.log(err);
    throw new Error("Error deleting bill");
  }
};

export const deleteTicket = async (
  billNo: number,
  ticketId: number,
  userId: string
) => {
  try {
    await myDataSource
      .createQueryBuilder()
      .update(Ticket)
      .set({
        deletedBy: userId,
      })
      .where("id = :ticketId", { ticketId })
      .andWhere("billNo = :billNo", { billNo })
      .execute();

    await myDataSource
      .getRepository(Ticket)
      .createQueryBuilder("Ticket")
      .softDelete()
      .where("id = :ticketId", { ticketId })
      .andWhere("billNo = :billNo", { billNo })
      .execute();
  } catch (err) {
    console.log("error in deleteTicket");
    console.log(err);
    throw new Error("Error deleting ticket");
  }
};

export const netSalesSummery = async ({
  ticketName,
  startDate,
  endDate,
  userColumnName,
  userId,
  ticketNumber,
  selectedMode,
  selectedGroup,
  priceColumnName,
}) => {
  try {
    const dataQuery = myDataSource
      .getRepository(Bill)
      .createQueryBuilder("bill")
      .leftJoin("bill.tickets", "ticket")
      .where("bill.resultDate >= :startDate", {
        startDate,
      })
      .andWhere("bill.resultDate <= :endDate", {
        endDate,
      });

    if (ticketName !== "ALL") {
      dataQuery.andWhere("bill.ticketName = :ticketName", {
        ticketName,
      });
    }

    if (userColumnName !== null) {
      dataQuery.andWhere(`bill.${userColumnName} = :userId`, {
        userId,
      });
    }

    if (ticketNumber !== null) {
      dataQuery.andWhere(`ticket.number = :ticketNumber`, {
        ticketNumber,
      });
    }

    if (selectedMode !== null && selectedMode !== "ALL") {
      dataQuery.andWhere("ticket.mode IN(:...modes)", {
        modes: [selectedMode],
      });
    }

    if (selectedMode === "ALL") {
      let allowedModes: string[];
      switch (selectedGroup) {
        case "3":
          allowedModes = ["SUPER", "BOX"];
          break;
        case "2":
          allowedModes = ["AB", "BC", "AC"];
          break;
        case "1":
          allowedModes = ["A", "B", "C"];
          break;
      }
      dataQuery.andWhere("ticket.mode IN(:...modes)", {
        modes: allowedModes,
      });
    }

    dataQuery
      .groupBy("bill.resultDate")
      .select([
        "bill.resultDate AS resultDate",
        `SUM(ticket.${priceColumnName} * ticket.count) AS price`,
        "SUM(ticket.count) AS count",
      ]);

    const data = await dataQuery.getRawMany();

    return data;
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};

export const salesSummeryForDate = async ({
  ticketName,
  resultDate,
  userColumnName,
  targetUserId,
  userType,
  ticketNumber,
  selectedMode,
  selectedGroup,
  priceColumnName,
  subUserColumn,
}) => {
  try {
    const dataQuery = myDataSource
      .getRepository(Bill)
      .createQueryBuilder("bill")
      .leftJoin("bill.tickets", "ticket")
      .where("bill.resultDate = :resultDate", {
        resultDate,
      });

    if (ticketName !== "ALL") {
      dataQuery.andWhere("bill.ticketName = :ticketName", {
        ticketName,
      });
    }

    if (userColumnName !== null) {
      dataQuery.andWhere(`bill.${userColumnName} = :targetUserId`, {
        targetUserId,
      });
    }

    if (ticketNumber !== null) {
      dataQuery.andWhere(`ticket.number = :ticketNumber`, {
        ticketNumber,
      });
    }

    if (selectedMode !== null && selectedMode !== "ALL") {
      dataQuery.andWhere("ticket.mode IN(:...modes)", {
        modes: [selectedMode],
      });
    }

    if (selectedMode === "ALL") {
      let allowedModes: string[];
      switch (selectedGroup) {
        case "3":
          allowedModes = ["SUPER", "BOX"];
          break;
        case "2":
          allowedModes = ["AB", "BC", "AC"];
          break;
        case "1":
          allowedModes = ["A", "B", "C"];
          break;
      }
      dataQuery.andWhere("ticket.mode IN(:...modes)", {
        modes: allowedModes,
      });
    }

    dataQuery
      .groupBy(`bill.${subUserColumn}`)
      .select([
        `bill.${subUserColumn} AS userId`,
        `SUM(ticket.${priceColumnName} * ticket.count) AS price`,
        "SUM(ticket.count) AS count",
      ]);

    const data = await dataQuery.getRawMany();

    return data;
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};

export const salesReport = async ({
  agentId,
  ticketName,
  resultDate,
  selectedGroup,
  selectedMode,
  ticketNumber,
  priceColumnName,
  userColumnName,
  userId,
  userType,
}) => {
  try {
    const dataQuery = myDataSource
      .getRepository(Bill)
      .createQueryBuilder("bill")
      .leftJoin("bill.tickets", "ticket")
      .where("bill.resultDate = :resultDate", {
        resultDate,
      })
      .andWhere("bill.agentId = :agentId", {
        agentId,
      });

    if (ticketName !== "ALL") {
      dataQuery.andWhere("bill.ticketName = :ticketName", {
        ticketName,
      });
    }

    if (userColumnName !== null) {
      dataQuery.andWhere(`bill.${userColumnName} = :userId`, {
        userId,
      });
    }

    if (ticketNumber !== null) {
      dataQuery.andWhere(`ticket.number = :ticketNumber`, {
        ticketNumber,
      });
    }

    if (selectedMode !== null && selectedMode !== "ALL") {
      dataQuery.andWhere("ticket.mode IN(:...modes)", {
        modes: [selectedMode],
      });
    }

    if (selectedMode === "ALL") {
      let allowedModes: string[];
      switch (selectedGroup) {
        case "3":
          allowedModes = ["SUPER", "BOX"];
          break;
        case "2":
          allowedModes = ["AB", "BC", "AC"];
          break;
        case "1":
          allowedModes = ["A", "B", "C"];
          break;
      }
      dataQuery.andWhere("ticket.mode IN(:...modes)", {
        modes: allowedModes,
      });
    }

    const fieldsToSelect = [
      `bill.no AS billNo`,
      `bill.agentId`,
      `bill.resultDate`,
      `bill.ticketName`,
      `bill.createdAt`,
      `ticket.${priceColumnName} AS price`,
      `ticket.count`,
      `ticket.mode`,
      `ticket.number`,
    ];

    if (userType === "Admin") {
      fieldsToSelect.push(
        "bill.subStockistId",
        "bill.stockistId",
        "bill.partnerId"
      );
    } else if (userType === "Stockist") {
      fieldsToSelect.push("bill.subStockistId", "bill.stockistId");
    } else if (userType === "Sub Stockist") {
      fieldsToSelect.push("bill.subStockistId");
    }

    dataQuery.orderBy("bill.no").select(fieldsToSelect);

    const data = await dataQuery.getRawMany();

    return data;
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};

export const numberwiseReport = async ({
  ticketName,
  resultDate,
  userColumnName,
  userId,
  ticketNumber,
  selectedMode,
  selectedGroup,
  isGroupActive,
}) => {
  try {
    const dataQuery = myDataSource
      .getRepository(Bill)
      .createQueryBuilder("bill")
      .leftJoin("bill.tickets", "ticket")
      .where("bill.resultDate = :resultDate", {
        resultDate,
      });

    if (ticketName !== "ALL") {
      dataQuery.andWhere("bill.ticketName = :ticketName", {
        ticketName,
      });
    }

    if (userColumnName !== null) {
      dataQuery.andWhere(`bill.${userColumnName} = :userId`, {
        userId,
      });
    }

    if (ticketNumber !== null) {
      dataQuery.andWhere(`ticket.number = :ticketNumber`, {
        ticketNumber,
      });
    }

    if (selectedMode !== null && selectedMode !== "ALL") {
      dataQuery.andWhere("ticket.mode IN(:...modes)", {
        modes: [selectedMode],
      });
    }

    if (selectedMode === "ALL") {
      let allowedModes: string[];
      switch (selectedGroup) {
        case "3":
          allowedModes = ["SUPER", "BOX"];
          break;
        case "2":
          allowedModes = ["AB", "BC", "AC"];
          break;
        case "1":
          allowedModes = ["A", "B", "C"];
          break;
      }
      dataQuery.andWhere("ticket.mode IN(:...modes)", {
        modes: allowedModes,
      });
    }

    const fieldsToSelect = [`ticket.number`, `SUM(ticket.count) AS count`];

    if (isGroupActive == "true") {
      dataQuery.groupBy("ticket.number");
    } else {
      dataQuery
        .groupBy("ticket.number")
        .addGroupBy("bill.ticketName")
        .addGroupBy("ticket.mode");
      fieldsToSelect.push("bill.ticketName", `ticket.mode`);
    }

    dataQuery.orderBy("count", "DESC").select(fieldsToSelect);

    const data = await dataQuery.getRawMany();

    return data;
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};

export const winningSummery = async ({
  ticketName,
  startDate,
  endDate,
  userColumnName,
  userId,
  superWinColumn,
  ticketNumber,
  selectedMode,
  selectedGroup,
}) => {
  try {
    const dataQuery = myDataSource
      .getRepository(Winning)
      .createQueryBuilder("winning")
      .leftJoin("winning.bill", "bill")
      .leftJoin("winning.ticket", "ticket")
      .where("winning.resultDate >= :startDate", {
        startDate,
      })
      .andWhere("winning.resultDate <= :endDate", {
        endDate,
      });

    if (ticketName !== "ALL") {
      dataQuery.andWhere("winning.ticketName = :ticketName", {
        ticketName,
      });
    }

    if (userColumnName !== null) {
      dataQuery.andWhere(`bill.${userColumnName} = :userId`, {
        userId,
      });
    }

    if (ticketNumber !== null) {
      dataQuery.andWhere(`ticket.number = :ticketNumber`, {
        ticketNumber,
      });
    }

    if (selectedMode !== null && selectedMode !== "ALL") {
      dataQuery.andWhere("ticket.mode IN(:...modes)", {
        modes: [selectedMode],
      });
    }

    if (selectedMode === "ALL") {
      let allowedModes: string[];
      switch (selectedGroup) {
        case "3":
          allowedModes = ["SUPER", "BOX"];
          break;
        case "2":
          allowedModes = ["AB", "BC", "AC"];
          break;
        case "1":
          allowedModes = ["A", "B", "C"];
          break;
      }
      dataQuery.andWhere("ticket.mode IN(:...modes)", {
        modes: allowedModes,
      });
    }

    const fieldsToSelect = [
      `SUM(winning.prize * ticket.count) AS prize`,
      `SUM(ticket.count) AS count`,
      `SUM(winning.${superWinColumn} * ticket.count) AS super`,
    ];

    dataQuery.select(fieldsToSelect);

    const data = await dataQuery.getRawMany();

    return data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const winningUsers = async ({
  ticketName,
  startDate,
  endDate,
  userColumnName,
  userId,
  superWinColumn,
  ticketNumber,
  selectedMode,
  selectedGroup,
  subUserColumn,
  groupByDate,
}) => {
  try {
    const dataQuery = myDataSource
      .getRepository(Winning)
      .createQueryBuilder("winning")
      .leftJoin("winning.bill", "bill")
      .leftJoin("winning.ticket", "ticket")
      .where("winning.resultDate >= :startDate", {
        startDate,
      })
      .andWhere("winning.resultDate <= :endDate", {
        endDate,
      });

    if (ticketName !== "ALL") {
      dataQuery.andWhere("winning.ticketName = :ticketName", {
        ticketName,
      });
    }

    if (userColumnName !== null) {
      dataQuery.andWhere(`bill.${userColumnName} = :userId`, {
        userId,
      });
    }

    if (ticketNumber !== null) {
      dataQuery.andWhere(`ticket.number = :ticketNumber`, {
        ticketNumber,
      });
    }

    if (selectedMode !== null && selectedMode !== "ALL") {
      dataQuery.andWhere("ticket.mode IN(:...modes)", {
        modes: [selectedMode],
      });
    }

    if (selectedMode === "ALL") {
      let allowedModes: string[];
      switch (selectedGroup) {
        case "3":
          allowedModes = ["SUPER", "BOX"];
          break;
        case "2":
          allowedModes = ["AB", "BC", "AC"];
          break;
        case "1":
          allowedModes = ["A", "B", "C"];
          break;
      }
      dataQuery.andWhere("ticket.mode IN(:...modes)", {
        modes: allowedModes,
      });
    }

    const fieldsToSelect = [
      `bill.${subUserColumn} as userId`,
      `SUM(winning.prize * ticket.count) AS prize`,
      `SUM(ticket.count) AS count`,
      `SUM(winning.${superWinColumn} * ticket.count) AS super`,
    ];

    if (groupByDate) {
      fieldsToSelect.push("bill.resultDate AS resultDate");
    }

    dataQuery.select(fieldsToSelect);

    dataQuery.groupBy(`userId`);

    if (groupByDate) {
      dataQuery.addGroupBy(`bill.resultDate`);
    }

    const data = await dataQuery.getRawMany();
    return data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const salesSummery = async ({
  ticketName,
  startDate,
  endDate,
  targetUserColumn,
  targetUserId,
  ticketNumber,
  selectedMode,
  selectedGroup,
  priceColumnName,
  subUserColumn,
}) => {
  try {
    const dataQuery = myDataSource
      .getRepository(Bill)
      .createQueryBuilder("bill")
      .leftJoin("bill.tickets", "ticket")
      .where("bill.resultDate >= :startDate", {
        startDate,
      })
      .andWhere("bill.resultDate <= :endDate", {
        endDate,
      });

    if (ticketName !== "ALL") {
      dataQuery.andWhere("bill.ticketName = :ticketName", {
        ticketName,
      });
    }

    if (targetUserColumn !== null) {
      dataQuery.andWhere(`bill.${targetUserColumn} = :targetUserId`, {
        targetUserId,
      });
    }

    if (ticketNumber !== null) {
      dataQuery.andWhere(`ticket.number = :ticketNumber`, {
        ticketNumber,
      });
    }

    if (selectedMode !== null && selectedMode !== "ALL") {
      dataQuery.andWhere("ticket.mode IN(:...modes)", {
        modes: [selectedMode],
      });
    }

    if (selectedMode === "ALL") {
      let allowedModes: string[];
      switch (selectedGroup) {
        case "3":
          allowedModes = ["SUPER", "BOX"];
          break;
        case "2":
          allowedModes = ["AB", "BC", "AC"];
          break;
        case "1":
          allowedModes = ["A", "B", "C"];
          break;
      }
      dataQuery.andWhere("ticket.mode IN(:...modes)", {
        modes: allowedModes,
      });
    }

    dataQuery
      .groupBy(`bill.${subUserColumn}`)
      .addGroupBy("bill.resultDate")
      .select([
        "bill.resultDate AS resultDate",
        `bill.${subUserColumn} AS userId`,
        `SUM(ticket.${priceColumnName} * ticket.count) AS price`,
        "SUM(ticket.count) AS count",
      ]);

    const data = await dataQuery.getRawMany();

    return data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const winners = async ({
  ticketName,
  startDate,
  endDate,
  userColumnName,
  userId,
  ticketNumber,
  selectedMode,
  selectedGroup,
  targetSuperColumn,
  userType,
}) => {
  try {
    const dataQuery = myDataSource
      .getRepository(Winning)
      .createQueryBuilder("winning")
      .leftJoin("winning.bill", "bill")
      .leftJoin("winning.ticket", "ticket")
      .where("winning.resultDate >= :startDate", {
        startDate,
      })
      .andWhere("winning.resultDate <= :endDate", {
        endDate,
      });

    if (ticketName !== "ALL") {
      dataQuery.andWhere("winning.ticketName = :ticketName", {
        ticketName,
      });
    }

    if (userColumnName !== null) {
      dataQuery.andWhere(`bill.${userColumnName} = :userId`, {
        userId,
      });
    }

    if (ticketNumber !== null) {
      dataQuery.andWhere(`ticket.number = :ticketNumber`, {
        ticketNumber,
      });
    }

    if (selectedMode !== null && selectedMode !== "ALL") {
      dataQuery.andWhere("ticket.mode IN(:...modes)", {
        modes: [selectedMode],
      });
    }

    if (selectedMode === "ALL") {
      let allowedModes: string[];
      switch (selectedGroup) {
        case "3":
          allowedModes = ["SUPER", "BOX"];
          break;
        case "2":
          allowedModes = ["AB", "BC", "AC"];
          break;
        case "1":
          allowedModes = ["A", "B", "C"];
          break;
      }
      dataQuery.andWhere("ticket.mode IN(:...modes)", {
        modes: allowedModes,
      });
    }

    const fieldsToSelect = [
      `winning.billNo`,
      `winning.ticketName`,
      `ticket.mode`,
      `ticket.number`,
      `winning.position`,
      `winning.prize * ticket.count as prize`,
      `ticket.count`,
      `winning.${targetSuperColumn} * ticket.count as super`,
    ];

    if (userType === "Admin" || userType === "Partner") {
      fieldsToSelect.push(
        `bill.partnerId AS partnerid`,
        `bill.stockistId AS stockistid`,
        `bill.subStockistId AS substockistid`,
        `bill.agentId AS agentid`
      );
    } else if (userType === "Stockist") {
      fieldsToSelect.push(
        `bill.stockistId AS stockistid`,
        `bill.subStockistId AS substockistid`,
        `bill.agentId AS agentid`
      );
    } else if (userType === "Sub Stockist") {
      fieldsToSelect.push(
        `bill.subStockistId AS substockistid`,
        `bill.agentId AS agentid`
      );
    } else if (userType === "Agent") {
      fieldsToSelect.push(`bill.agentId AS agentid`);
    }

    dataQuery.select(fieldsToSelect);

    const data = await dataQuery.getRawMany();
    return data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const changeBlockTime = async ({
  ticketName,
  userType,
  startTime,
  endTime,
}) => {
  try {
    await myDataSource
      .createQueryBuilder()
      .update(Blocktime)
      .set({ startTime, endTime })
      .where("ticketName = :ticketName", { ticketName })
      .andWhere("userType = :userType", { userType })
      .execute();
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const getBlockTime = async () => {
  try {
    const blockRepository = myDataSource.getRepository(Blocktime);
    const data = await blockRepository.find();
    return data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const blockTimeForTicket = async ({ ticketName }) => {
  try {
    const blockRepository = myDataSource.getRepository(Blocktime);
    const data = await blockRepository.find({
      where: {
        ticketName,
      },
    });
    return data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const hardDeleteWithDate = async ({
  ticketName,
  startDate,
  endDate,
}) => {
  try {
    const query = myDataSource
      .getRepository(Bill)
      .createQueryBuilder("bill")
      .delete()
      .where("resultDate >= :startDate", {
        startDate,
      })
      .andWhere("resultDate <= :endDate", {
        endDate,
      });

    if (ticketName !== "ALL") {
      query.andWhere("ticketName = :ticketName", {
        ticketName,
      });
    }

    await query.execute();
  } catch (error) {
    console.log("Error in hardDeleteWithDate");
    console.log(error);
    throw error;
  }
};

export const editTicketInDB = async ({ billNo, ticketId, newCount }) => {
  try {
    const ticketRepository = myDataSource.getRepository(Ticket);
    const ticketToEdit = await ticketRepository.findOneBy({
      id: ticketId,
      billNo,
    });
    ticketToEdit.count = newCount;
    ticketToEdit.editedDate = new Date();
    await ticketRepository.save(ticketToEdit);
    return true;
  } catch (err) {
    console.log(err);
    throw new Error("Error editing ticket");
  }
};

export const getDeletedBills = async ({
  ticketName,
  startDate,
  endDate,
  selectedGroup,
  selectedMode,
  ticketNumber,
  userId,
  userColumnName,
}) => {
  try {
    const dataQuery = myDataSource
      .getRepository(Bill)
      .createQueryBuilder("bill")
      .withDeleted()
      .leftJoinAndSelect("bill.tickets", "ticket")
      .where("bill.resultDate >= :startDate", {
        startDate,
      })
      .andWhere("bill.resultDate <= :endDate", {
        endDate,
      })
      .andWhere("bill.deletedDate IS NOT NULL");

    if (ticketName !== "ALL") {
      dataQuery.andWhere("bill.ticketName = :ticketName", {
        ticketName,
      });
    }

    if (userColumnName !== null) {
      dataQuery.andWhere(`bill.${userColumnName} = :userId`, {
        userId,
      });
    }

    if (ticketNumber !== null) {
      dataQuery.andWhere(`ticket.number = :ticketNumber`, {
        ticketNumber,
      });
    }

    if (selectedMode !== null && selectedMode !== "ALL") {
      dataQuery.andWhere("ticket.mode IN(:...modes)", {
        modes: [selectedMode],
      });
    }

    if (selectedMode === "ALL") {
      let allowedModes: string[];
      switch (selectedGroup) {
        case "3":
          allowedModes = ["SUPER", "BOX"];
          break;
        case "2":
          allowedModes = ["AB", "BC", "AC"];
          break;
        case "1":
          allowedModes = ["A", "B", "C"];
          break;
      }
      dataQuery.andWhere("ticket.mode IN(:...modes)", {
        modes: allowedModes,
      });
    }

    const data = await dataQuery.getMany();

    return data;
  } catch (err) {
    console.log(err);
    throw new Error("Error fetching deleted bills");
  }
};
