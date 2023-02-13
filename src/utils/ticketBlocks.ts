var dayjs = require("dayjs");
var objectSupport = require("dayjs/plugin/objectSupport");
var utc = require("dayjs/plugin/utc");
var timezone = require("dayjs/plugin/timezone");
import { Blocktime } from "../entity/Blocktime";
import { myDataSource } from "../app-data-source";

dayjs.extend(objectSupport);
dayjs.extend(utc);
dayjs.extend(timezone);
const blockRepository = myDataSource.getRepository(Blocktime);

export const checkIfTicketIsBlocked = async ({ userType, ticketName }) => {
  try {
    let targetUserType: string;
    let resultDate: string | null = null;
    switch (userType) {
      case "Admin":
        targetUserType = "Admin";
        break;
      case "Partner":
        targetUserType = "Partner";
        break;
      default:
        targetUserType = "Other";
        break;
    }
    const data = await blockRepository.findOneBy({
      ticketName,
      userType: targetUserType,
    });

    if (data === null) {
      return {
        isBlocked: true,
        message: "Time not set for ticket",
        resultDate,
      };
    }

    const today = dayjs().tz("Asia/Calcutta");
    const now = today.hour() * 60 + today.minute();

    if (data.startTime <= now && now <= data.endTime) {
      const blockStartHour = data.startTime % 60;
      const blockStartMinute = data.startTime - blockStartHour * 60;
      const blockEndHour = data.endTime % 60;
      const blockEndMinute = data.endTime - blockEndHour * 60;

      const dayStart = new dayjs().startOf("day");
      const blockStart = dayStart
        .add(blockStartHour, "hour")
        .add(blockStartMinute, "minutes");
      const formattedBlockStart = dayjs(blockStart).format("hh:mm a");

      const blockEnd = dayStart
        .add(blockEndHour, "hour")
        .add(blockEndMinute, "minutes");
      const formattedBlockEnd = dayjs(blockEnd).format("hh:mm a");

      return {
        isBlocked: true,
        message: `Entry Locked from ${formattedBlockStart} - ${formattedBlockEnd}`,
        resultDate,
      };
    }

    if (now <= data.startTime) {
      // resultDate is currentDate
      resultDate = today.format("YYYY-MM-DD");
    } else {
      // resultDate is today + 1
      resultDate = today.add(1, "day").format("YYYY-MM-DD");
    }

    return {
      isBlocked: false,
      message: null,
      resultDate,
    };
  } catch (err) {
    console.log(err);
    return {
      isBlocked: true,
      message: "Error getting block time",
      resultDate: null,
    };
  }
};

export const findTicketTime = async ({ userType, ticketName }) => {
  try {
    let targetUserType: string;
    switch (userType) {
      case "Admin":
        targetUserType = "Admin";
        break;
      case "Partner":
        targetUserType = "Partner";
        break;
      default:
        targetUserType = "Other";
        break;
    }
    const data = await blockRepository.findOneBy({
      ticketName,
      userType: targetUserType,
    });

    if (data === null) {
      return {
        start: false,
        end: false,
        status: "ERROR",
      };
    }

    const blockStartHour = data.startTime % 60;
    const blockStartMinute = data.startTime - blockStartHour * 60;
    const blockEndHour = data.endTime % 60;
    const blockEndMinute = data.endTime - blockEndHour * 60;

    return {
      start: blockStartHour * 60 + blockStartMinute,
      end: blockEndHour * 60 + blockEndMinute,
      status: "OK",
    };
  } catch (err) {
    console.log(err);
    return {
      start: false,
      end: false,
      status: "ERROR",
    };
  }
};
