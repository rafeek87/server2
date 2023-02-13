import { NextFunction, Request, Response } from "express";

const ACCESS_LEVEL = [
  {
    name: "Admin",
    level: 900,
  },
  {
    name: "Partner",
    level: 800,
  },
  {
    name: "Stockist",
    level: 700,
  },
  {
    name: "Sub Stockist",
    level: 600,
  },
  {
    name: "Agent",
    level: 500,
  },
];

const authorize = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const requiredLevel = ACCESS_LEVEL.find((i) => i.name === requiredRole);
      const userLevel = ACCESS_LEVEL.find((i) => i.name === req.user.type);
      if (requiredLevel === undefined || userLevel === undefined) {
        return res
          .status(401)
          .json({ message: "There was an error authorizing user" });
      }

      if (userLevel.level < requiredLevel.level) {
        return res.status(403).json({ message: "No permission" });
      }

      next();
    } catch (err) {
      return res
        .status(500)
        .json({ message: "There was an error authorizing user" });
    }
  };
};

export default authorize;
