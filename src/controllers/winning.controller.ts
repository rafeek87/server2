const express = require("express");
import { Express, Request, Response } from "express";
const { body, query, validationResult } = require("express-validator");
import authenticate from "../middleware/authentication";
import authorize from "../middleware/authorize";
import {
  getWinners,
  getWinningSummery,
  getWinningUsers,
} from "../services/winning.service";

const router = express.Router();

router.get(
  "/summery",
  query("ticketName").isIn(["ALL", "DEAR1", "LSK3", "DEAR6", "DEAR8"]),
  query("startDate").isString().notEmpty(),
  query("endDate").isString().notEmpty(), // TODO validate date
  authenticate,
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const serviceFn = await getWinningSummery({
      userId: req.user.id,
      userType: req.user.type,
      ticketName: req.query.ticketName as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      selectedUserType: req.query.selectedUserType as string,
      selectedUserId: req.query.selectedUserId as string,
      selectedGroup: req.query.selectedGroup as string,
      selectedMode: req.query.selectedMode as string,
      ticketNumber: req.query.ticketNumber as string,
    });

    return res
      .status(serviceFn.status)
      .json({ message: serviceFn.message, data: serviceFn.data });
  }
);

router.get(
  "/users",
  query("ticketName").isIn(["ALL", "DEAR1", "LSK3", "DEAR6", "DEAR8"]),
  query("startDate").isString().notEmpty(),
  query("endDate").isString().notEmpty(), // TODO validate date
  authenticate,
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const serviceFn = await getWinningUsers({
      userId: req.user.id,
      userType: req.user.type,
      ticketName: req.query.ticketName as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      selectedUserType: req.query.selectedUserType as string,
      selectedUserId: req.query.selectedUserId as string,
      selectedGroup: req.query.selectedGroup as string,
      selectedMode: req.query.selectedMode as string,
      ticketNumber: req.query.ticketNumber as string,
    });

    return res
      .status(serviceFn.status)
      .json({ message: serviceFn.message, data: serviceFn.data });
  }
);

router.get(
  "/winners",
  query("ticketName").isIn(["ALL", "DEAR1", "LSK3", "DEAR6", "DEAR8"]),
  query("startDate").isString().notEmpty(),
  query("endDate").isString().notEmpty(), // TODO validate date
  authenticate,
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const serviceFn = await getWinners({
      userId: req.user.id,
      userType: req.user.type,
      ticketName: req.query.ticketName as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      selectedUserType: req.query.selectedUserType as string,
      selectedUserId: req.query.selectedUserId as string,
      selectedGroup: req.query.selectedGroup as string,
      selectedMode: req.query.selectedMode as string,
      ticketNumber: req.query.ticketNumber as string,
    });

    return res
      .status(serviceFn.status)
      .json({ message: serviceFn.message, data: serviceFn.data });
  }
);

module.exports = router;
