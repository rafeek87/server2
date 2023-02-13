const express = require("express");
import { Express, Request, Response } from "express";
import { param, query } from "express-validator";
const { body, validationResult } = require("express-validator");
import authenticate from "../middleware/authentication";
import authorize from "../middleware/authorize";
import { getAppIdInfo, getUserInfo } from "../utils/getBasicUserInfo";
const BillServices = require("../services/bill.service");

const router = express.Router();

router.post(
  "/",
  authenticate,
  body("reqPartnerId").isString().notEmpty(),
  body("reqStockistId").isString().notEmpty(),
  body("reqSubStockistId").isString().notEmpty(),
  body("reqAgentId").isString().notEmpty(),
  body("ticketName").isString().notEmpty(),
  body("tickets").isArray().notEmpty(),
  // TODO sub users must be valid subuserId of super user
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const deviceId = req.get("deviceId");

      // validating token user id with body data
      if (
        req.user.type === "Partner" &&
        req.body.reqPartnerId !== req.user.id
      ) {
        return res
          .status(403)
          .json({ message: "Partner user not matching user ID" });
      } else if (
        req.user.type === "Stockist" &&
        req.body.reqStockistId !== req.user.id
      ) {
        return res
          .status(403)
          .json({ message: "Stockist user not matching user ID" });
      } else if (
        req.user.type === "Sub Stockist" &&
        req.body.reqSubStockistId !== req.user.id
      ) {
        return res
          .status(403)
          .json({ message: "Sub Stockist user not matching user ID" });
      } else if (
        req.user.type === "Agent" &&
        req.body.reqAgentId !== req.user.id
      ) {
        return res
          .status(403)
          .json({ message: "Agent user not matching user ID" });
      }

      const result = await BillServices.TicketsCreate({
        userId: req.user.id,
        userType: req.user.type,
        reqPartnerId: req.body.reqPartnerId,
        reqStockistId: req.body.reqStockistId,
        reqSubStockistId: req.body.reqSubStockistId,
        reqAgentId: req.body.reqAgentId,
        ticketName: req.body.ticketName,
        tickets: req.body.tickets,
        ip,
        deviceId,
      });

      return res.status(result.status).json({
        statusMessage: result.statusMessage,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      console.log("Error entering ticket E:82F");
      console.log(error);
      return res.status(500).json({
        message: "There was a problem entering bill",
        data: null,
      });
    }
  }
);

router.post(
  "/api/",
  query("APPID").isString().isLength({ min: 10, max: 20 }),
  body("ticketName").isString().notEmpty(),
  body("tickets").isArray().notEmpty(), // TODO validate array format
  // TODO validate APPID
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // get partner, stockist, substockist and agent from APPID
      const appIdData = await getAppIdInfo(req.query.APPID as string);
      if (appIdData.Count === 0) {
        // invalid app id
        return res.status(401).json({
          message: "Invalid app ID",
          data: null,
        });
      }
      const agentId = appIdData.Items[0]?.agentId;
      const agentInfoData = await getUserInfo(agentId);
      if (agentInfoData.Count === 0) {
        // invalid agent id
        return res.status(401).json({
          message: "Invalid agent ID associated with app id",
          data: null,
        });
      }
      const agentInfo = agentInfoData.Items[0];

      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

      const result = await BillServices.TicketsCreate({
        userId: agentId,
        userType: "Agent",
        reqPartnerId: agentInfo.partner,
        reqStockistId: agentInfo.stockist,
        reqSubStockistId: agentInfo.subStockist,
        reqAgentId: agentId,
        ticketName: req.body.ticketName,
        tickets: req.body.tickets,
        ip,
        deviceId: "API-ENTRY",
      });

      return res.status(result.status).json({
        statusMessage: result.statusMessage,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        message: "There was an error entering bill data",
        data: null,
      });
    }
  }
);

router.post(
  "/:billNo",
  authenticate,
  param("billNo").isInt(),
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await BillServices.getBillData({
      billNo: req.params.billNo,
      userId: req.user.id,
      userType: req.user.type,
    });

    return res.status(result.status).json({
      statusMessage: result.statusMessage,
      message: result.message,
      data: result.data,
    });
  }
);

router.delete(
  "/:billNo",
  authenticate,
  param("billNo").isInt(),
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await BillServices.softDeleteBill({
      billNo: req.params.billNo,
      userId: req.user.id,
      userType: req.user.type,
    });

    return res.status(result.status).json({
      statusMessage: result.statusMessage,
      message: result.message,
      data: result.data,
    });
  }
);

router.patch(
  "/:billNo/ticket/:ticketId",
  authenticate,
  param("billNo").isInt(),
  param("ticketId").isInt(),
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await BillServices.editTicket({
      billNo: req.params.billNo,
      ticketId: req.params.ticketId,
      userId: req.user.id,
      userType: req.user.type,
      newCount: req.body.newCount,
    });

    return res.status(result.status).json({
      statusMessage: result.statusMessage,
      message: result.message,
      data: result.data,
    });
  }
);

router.delete(
  "/:billNo/ticket/:ticketId",
  authenticate,
  param("billNo").isInt(),
  param("ticketId").isInt(),
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await BillServices.softDeleteTicket({
      billNo: req.params.billNo,
      ticketId: req.params.ticketId,
      userId: req.user.id,
      userType: req.user.type,
    });

    return res.status(result.status).json({
      statusMessage: result.statusMessage,
      message: result.message,
      data: result.data,
    });
  }
);

router.patch(
  "/time/:ticketName",
  param("ticketName").isIn(["LSK3", "DEAR1", "DEAR6", "DEAR8"]),
  body("updatedTime").notEmpty(), // TODO validate format of array
  authenticate,
  authorize("Admin"),
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await BillServices.updateBillTime({
      ticketName: req.params.ticketName,
      updatedTime: req.body.updatedTime,
    });

    return res.status(result.status).json({
      statusMessage: result.statusMessage,
      message: result.message,
      data: result.data,
    });
  }
);

router.get(
  "/time/",
  authenticate,
  authorize("Admin"),
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await BillServices.getTicketTime();

    return res.status(result.status).json({
      statusMessage: result.statusMessage,
      message: result.message,
      data: result.data,
    });
  }
);

router.get(
  "/time/:ticketName",
  param("ticketName").isIn(["LSK3", "DEAR1", "DEAR6", "DEAR8"]),
  authenticate,
  authorize("Admin"),
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await BillServices.getBlockTimeForTicket({
      ticketName: req.params.ticketName,
    });

    return res.status(result.status).json({
      statusMessage: result.statusMessage,
      message: result.message,
      data: result.data,
    });
  }
);

router.delete(
  "/hard-delete/:billNo",
  authenticate,
  authorize("Admin"),
  param("billNo").isInt(),
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await BillServices.hardDeleteBill({
      billNo: req.params.billNo,
      userId: req.user.id,
    });

    return res.status(result.status).json({
      statusMessage: result.statusMessage,
      message: result.message,
      data: result.data,
    });
  }
);

router.delete(
  "/hard-delete-with-date/:ticketName",
  authenticate,
  authorize("Admin"),
  param("ticketName").isIn(["ALL", "LSK3", "DEAR1", "DEAR6", "DEAR8"]),
  body("startDate").isString().notEmpty(),
  body("endDate").isString().notEmpty(),
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await BillServices.deleteBetweenDate({
      ticketName: req.params.ticketName,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
    });

    return res.status(result.status).json({
      statusMessage: result.statusMessage,
      message: result.message,
      data: result.data,
    });
  }
);

router.get(
  "/deleted-bills",
  authenticate,
  authorize("Admin"),
  query("ticketName").isIn(["ALL", "LSK3", "DEAR1", "DEAR6", "DEAR8"]),
  query("startDate").isString().notEmpty(),
  query("endDate").isString().notEmpty(),
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await BillServices.listDeletedBills({
      ticketName: req.query.ticketName,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      selectedUserType: req.query.selectedUserType as string,
      selectedUserId: req.query.selectedUserId as string,
      selectedGroup: req.query.selectedGroup as string,
      selectedMode: req.query.selectedMode as string,
      ticketNumber: req.query.ticketNumber as string,
    });

    return res.status(result.status).json({
      statusMessage: result.statusMessage,
      message: result.message,
      data: result.data,
    });
  }
);

module.exports = router;
