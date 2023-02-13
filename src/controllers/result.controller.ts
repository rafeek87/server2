const express = require("express");
import { Express, Request, Response } from "express";
const { body, validationResult, query } = require("express-validator");
import authenticate from "../middleware/authentication";
import authorize from "../middleware/authorize";
const ResultServices = require("../services/result.service");

const router = express.Router();

router.post(
  "/",
  // authenticate,
  // TODO authorize
  body("resultDate").isString().notEmpty(),
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await ResultServices.upsertResult({
      resultDate: req.body.resultDate,
      results: req.body.results,
      ticketName: req.body.ticketName,
    });

    return res.status(result.status).json({
      message: result.message,
      data: result.data,
    });
  }
);

router.get(
  "/",
  // authenticate,
  // TODO authorize
  query("resultDate").isString().notEmpty(),
  query("ticketName").isString().notEmpty(),
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await ResultServices.getResult({
      resultDate: req.query.resultDate,
      ticketName: req.query.ticketName,
    });

    return res.status(result.status).json({
      message: result.message,
      data: result.data,
    });
  }
);

module.exports = router;
