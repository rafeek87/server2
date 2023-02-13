const express = require("express");
import { Express, Request, Response } from "express";
const { body, query, validationResult } = require("express-validator");
import authenticate from "../middleware/authentication";
import authorize from "../middleware/authorize";
const Services = require("../services/summery.service");

export const router = express.Router();

router.get(
  "/numberwise",
  authenticate,
  query("ticketName").isIn(["ALL", "DEAR1", "LSK3", "DEAR6", "DEAR8"]),
  query("resultDate").isString().notEmpty(),
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const serviceFn = await Services.getNumberwiseReport({
      userId: req.user.id,
      userType: req.user.type,
      ticketName: req.query.ticketName,
      resultDate: req.query.resultDate,
      selectedUserType: req.query.selectedUserType,
      selectedUserId: req.query.selectedUserId,
      selectedGroup: req.query.selectedGroup,
      selectedMode: req.query.selectedMode,
      ticketNumber: req.query.ticketNumber,
      isGroupActive: req.query.isGroupActive,
    });

    return res
      .status(serviceFn.status)
      .json({ message: serviceFn.message, data: serviceFn.data });
  }
);

router.get(
  "/account-summery",
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

    const serviceFn = await Services.accountSummery({
      userId: req.user.id,
      userType: req.user.type,
      ticketName: req.query.ticketName,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      selectedGroup: req.query.selectedGroup,
      selectedMode: req.query.selectedMode,
      selectedUserType: req.query.selectedUserType,
      selectedUserId: req.query.selectedUserId,
    });

    return res
      .status(serviceFn.status)
      .json({ message: serviceFn.message, data: serviceFn.data });
  }
);

router.get(
  "/net-pay-summery",
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

    const serviceFn = await Services.netPaySummery({
      userId: req.user.id,
      userType: req.user.type,
      ticketName: req.query.ticketName,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      selectedGroup: req.query.selectedGroup,
      selectedMode: req.query.selectedMode,
      selectedUserType: req.query.selectedUserType,
      selectedUserId: req.query.selectedUserId,
      ticketNumber: req.query.ticketNumber,
    });

    return res
      .status(serviceFn.status)
      .json({ message: serviceFn.message, data: serviceFn.data });
  }
);
