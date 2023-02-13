import { DataSource } from "typeorm";
import dotenv from "dotenv";
dotenv.config();

const env = process.env.NODE_ENV || "development";

export const myDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: Boolean(process.env.SYNCHRONIZE),
  logging: false,
  entities: env === "production" ? ["build/entity/*.js"] : ["src/entity/*.ts"],
  migrations: ["build/migration/**/*.js"],
  subscribers: ["build/subscriber/**/*.js"],
});
