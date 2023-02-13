const tables_DEV = {
  USER: "Users-Tirur",
  RESULT: "Results-Tirur",
  SCHEME: "Schemes-Tirur",
  BLOCKS: "Blocks-Tirur",
  APPID: "Users-appid-tirur",
};

const tables_PROD = {
  USER: "Users-Tirur",
  RESULT: "Results-Tirur",
  SCHEME: "Schemes-Tirur",
  BLOCKS: "Blocks-Tirur",
  APPID: "Users-appid-tirur",
};

export const tables = process.env.MODE === "PROD" ? tables_PROD : tables_DEV;
