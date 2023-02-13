const express = require("express");
import { Express, Request, Response } from "express";
const { body, query, validationResult } = require("express-validator");
import authenticate from "../middleware/authentication";
import authorize from "../middleware/authorize";
import { editScheme, getScheme } from "../services/scheme.service";

export const router = express.Router();

router.get(
  "/:schemeName",
  authenticate,
  authorize("Admin"),
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const serviceFn = await getScheme({
      schemeName: req.params.schemeName,
    });

    return res
      .status(serviceFn.status)
      .json({ message: serviceFn.message, data: serviceFn.data });
  }
);

router.put(
  "/:schemeName",
  query("ticketName").isIn(["ALL", "DEAR1", "LSK3", "DEAR6", "DEAR8"]),
  body("ticketIndex").isString().notEmpty(),
  body("newModes").notEmpty(),
  authenticate,
  authorize("Admin"),
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const serviceFn = await editScheme({
      schemeName: req.params.schemeName,
      ticketIndex: req.body.ticketIndex,
      newModes: req.body.newModes,
    });

    return res
      .status(serviceFn.status)
      .json({ message: serviceFn.message, data: serviceFn.data });
  }
);
