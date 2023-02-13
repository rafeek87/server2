const express = require("express");
import { Express, Request, Response } from "express";
import { check, header, query } from "express-validator";
const { body, validationResult } = require("express-validator");
import * as jwt from "jsonwebtoken";
import authenticate from "../middleware/authentication";
import authorize from "../middleware/authorize";
const UserServices = require("../services/user.service");
import {
  createUser,
  generateAppToken,
  listUserCreditLimit,
  updateUserCreditLimit,
} from "../services/user.service";

const router = express.Router();

router.post(
  "/login",
  body("userName").isString().notEmpty(),
  body("password").isString().notEmpty(),
  header("appToken").isString().notEmpty(),
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const appTokenVerification = jwt.verify(
        req.headers.apptoken as string,
        process.env.APP_JWT_SECRET,
        { complete: true, ignoreExpiration: true }
      );
      const serviceFn = await UserServices.loginUser({
        userName: req.body.userName,
        password: req.body.password,
        ip: req.socket.remoteAddress,
        appId: appTokenVerification.payload["appId"],
      });

      return res
        .status(serviceFn.status)
        .json({ message: serviceFn.message, data: serviceFn.data });
    } catch (error) {
      if (
        error.name == "JsonWebTokenError" ||
        error.name == "TokenExpiredError" ||
        error.name == "NotBeforeError"
      ) {
        return res.status(401).json({
          message: "E058: Login application verification failed " + error.name,
          data: null,
        });
      }
      console.log(error);
      return res.status(500).json({
        message: "Error logging in user",
        data: null,
      });
    }
  }
);

router.get("/sub-users", authenticate, async (req: Request, res: Response) => {
  // check req validator
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // TODO validation for super user IDs

  const serviceFn = await UserServices.getSubUsers({
    userId: req.user.id,
    userType: req.user.type,
    partnerId: req.query.partnerId,
    stockistId: req.query.stockistId,
    subStockistId: req.query.subStockistId,
  });

  return res
    .status(serviceFn.status)
    .json({ message: serviceFn.message, data: serviceFn.data });
});

router.get("/app-token-512/:appId", async (req: Request, res: Response) => {
  const serviceFn = await generateAppToken(req.params.appId);

  return res
    .status(serviceFn.status)
    .json({ message: serviceFn.message, data: serviceFn.data });
});

router.post(
  "/",
  header("appToken").isString().notEmpty(),
  body("type").isString().notEmpty(),
  body("userName").isString().notEmpty(),
  body("password").isString().notEmpty(),
  body("partner").isString().optional(),
  body("stockist").isString().optional(),
  body("subStockist").isString().optional(),
  body("schemeName").isIn(["scheme_1", "scheme_2", "scheme_3", "scheme_4"]),
  check("privileges.canCreateAgents").not().isEmpty(),
  check("privileges.canCreateSubStockists").not().isEmpty(),
  check("privileges.canCreateStockists").not().isEmpty(),
  authenticate,
  authorize("Sub Stockist"),
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // validate username and password are not same
    if (req.body.userName === req.body.password) {
      return res
        .status(400)
        .json({ message: "Username and password cannot be same", data: null });
    }

    // TODO if usertype is admin: partner, stockist, sub stockist values are mandatory
    // if usertype is partner: stockist, sub stockist values are mandatory
    // if usertype is stockist: sub stockist values are mandatory

    // users cannot create a super user
    let userPermission = req.body.type === "1" ? false : true;
    if (req.user.type === "Agent") {
      userPermission = false;
    } else if (
      req.user.type === "Sub Stockist" &&
      ["2", "3", "4"].includes(req.body.type)
    ) {
      userPermission = false;
    } else if (
      req.user.type === "Stockist" &&
      ["2", "3"].includes(req.body.type)
    ) {
      userPermission = false;
    } else if (req.user.type === "Partner" && ["2"].includes(req.body.type)) {
      userPermission = false;
    }

    if (!userPermission) {
      return res.status(400).json({
        message: "E853: Insufficient permission to create user.",
        data: null,
      });
    }

    const serviceFn = await createUser({
      userId: req.user.id,
      userType: req.user.type,
      newUserType: req.body.type,
      newUserName: req.body.userName,
      password: req.body.password,
      privileges: req.body.privileges,
      partner: req.body.partner,
      stockist: req.body.stockist,
      subStockist: req.body.subStockist,
      schemeName: req.body.schemeName,
      ip: req.socket.remoteAddress,
      appToken: req.headers.apptoken,
    });

    return res
      .status(serviceFn.status)
      .json({ message: serviceFn.message, data: serviceFn.data });
  }
);

router.put(
  "/update-credit-limit",
  body("targetUserId").isString().notEmpty(),
  body("limitsArray").isArray({ min: 0, max: 4 }), // TODO validate limitsArray
  authenticate,
  authorize("Sub Stockist"),
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const serviceFn = await updateUserCreditLimit({
      userId: req.user.id,
      userType: req.user.type,
      targetUserId: req.body.targetUserId,
      limitsArray: req.body.limitsArray,
    });

    return res
      .status(serviceFn.status)
      .json({ message: serviceFn.message, data: serviceFn.data });
  }
);

router.get(
  "/user-credit-limit",
  query("targetUserId").isString().notEmpty(),
  authenticate,
  authorize("Sub Stockist"),
  async (req: Request, res: Response) => {
    // check req validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const serviceFn = await listUserCreditLimit({
      userId: req.user.id,
      userType: req.user.type,
      targetUserId: req.query.targetUserId,
    });

    return res
      .status(serviceFn.status)
      .json({ message: serviceFn.message, data: serviceFn.data });
  }
);

module.exports = router;
