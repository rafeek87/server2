import * as crypto from "crypto";

const getRefreshToken = () => {
  return crypto.randomBytes(40).toString("hex");
};

module.exports = {
  getRefreshToken,
};
