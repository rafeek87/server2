import { NextFunction, Request, Response } from "express";
const jwt = require("jsonwebtoken");

const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.headers.authorization) {
      return res.status(401).json({ message: "No credentials sent!" });
    }
    const token = req.headers.authorization.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = {
        id: decoded.id,
        type: decoded.type,
      };
      req.user = user;
      next();
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      } else {
        console.log(err);
        return res.status(401).json({ message: "Invalid token" });
      }
    }
  } catch (err) {
    return res
      .status(500)
      .json({ message: "There was an error authenticating user" });
  }
};

export default authenticate;
