import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Timestamp,
  Index,
  OneToMany,
  JoinTable,
  ManyToOne,
} from "typeorm";
import {
  Contains,
  IsInt,
  IsNumberString,
  Length,
  IsEmail,
  IsFQDN,
  IsDate,
  Min,
  Max,
  IsNotEmpty,
  IsNumber,
} from "class-validator";
import { Bill } from "./Bill";

@Entity()
export class Blocktime {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ticketName: string;

  @Column()
  userType: string;

  @Column({ type: "integer" })
  @IsNumberString()
  startTime: number;

  @Column({ type: "integer" })
  @IsNumberString()
  endTime: number;

  @Column({ type: "timestamptz", default: () => "LOCALTIMESTAMP" })
  createdAt: Date;

  @Column({ type: "timestamptz", default: () => "LOCALTIMESTAMP" })
  updatedAt: Date;
}
