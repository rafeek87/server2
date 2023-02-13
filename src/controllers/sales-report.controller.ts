const express = require("express");
import { Express, Request, Response } from "express";
const { body, query, validationResult } = require("express-validator");
import authenticate from "../middleware/authentication";
import authorize from "../middleware/authorize";
const ReportServices = require("../services/sales-report.service");

const router = express.Router();

router.get(
  "/summery",
  query("ticketName").isIn(["ALL", "DEAR1", "LSK3", "DEAR6", "DEAR8"]),
  query("startDate").isString().notEmpty(),
  query("endDate").isString().notEmpty(),
  authenticate,
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const serviceFn = await ReportServices.getSalesSummery({
      userId: req.user.id,
      userType: req.user.type,
      ticketName: req.query.ticketName,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      selectedUserType: req.query.selectedUserType,
      selectedUserId: req.query.selectedUserId,
      selectedGroup: req.query.selectedGroup,
      selectedMode: req.query.selectedMode,
      ticketNumber: req.query.ticketNumber,
    });

    return res
      .status(serviceFn.status)
      .json({ message: serviceFn.message, data: serviceFn.data });
  }
);

router.get(
  "/summery-date",
  query("ticketName").isIn(["ALL", "DEAR1", "LSK3", "DEAR6", "DEAR8"]),
  query("resultDate").isString().notEmpty(),
  authenticate,
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const serviceFn = await ReportServices.getSalesSummeryForDate({
      userId: req.user.id,
      userType: req.user.type,
      ticketName: req.query.ticketName,
      resultDate: req.query.resultDate,
      selectedUserType: req.query.selectedUserType,
      selectedUserId: req.query.selectedUserId,
      selectedGroup: req.query.selectedGroup,
      selectedMode: req.query.selectedMode,
      ticketNumber: req.query.ticketNumber,
    });

    return res
      .status(serviceFn.status)
      .json({ message: serviceFn.message, data: serviceFn.data });
  }
);

router.get(
  "/report",
  authenticate,
  query("ticketName").isIn(["ALL", "DEAR1", "LSK3", "DEAR6", "DEAR8"]),
  query("resultDate").isString().notEmpty(),
  query("agentId").optional().isString(),
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.type !== "Agent" && req.query.agentId == null) {
      return res.status(400).json({
        errors: [
          {
            msg: "Invalid value",
            param: "agentId",
            location: "query",
          },
        ],
      });
    }

    const serviceFn = await ReportServices.getSalesReport({
      userId: req.user.id,
      userType: req.user.type,
      agentId: req.query.agentId,
      ticketName: req.query.ticketName,
      resultDate: req.query.resultDate,
      selectedGroup: req.query.selectedGroup,
      selectedMode: req.query.selectedMode,
      ticketNumber: req.query.ticketNumber,
    });

    return res
      .status(serviceFn.status)
      .json({ message: serviceFn.message, data: serviceFn.data });
  }
);

module.exports = router;
