import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Timestamp,
  Index,
  OneToMany,
  JoinTable,
  ManyToOne,
  DeleteDateColumn,
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
import { Winning } from "./Winning";

@Entity()
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "decimal" })
  @IsNumber()
  adminPrice: number;

  @Column({ type: "decimal" })
  @IsNumber()
  agentPrice: number;

  @Column({ type: "integer" })
  @IsNumberString()
  count: number;

  @Column()
  @IsNotEmpty()
  mode: string;

  @Column()
  @IsNumberString()
  @Length(1, 3)
  @Index()
  number: string;

  @Column({ type: "decimal" })
  @IsNumber()
  partnerPrice: number;

  @Column({ type: "decimal" })
  @IsNumber()
  stockistPrice: number;

  @Column({ type: "decimal" })
  @IsNumber()
  subStockistPrice: number;

  // @Column({ type: "integer" })
  // @Index()
  // @IsInt()
  // bill_no: number;

  @ManyToOne(() => Bill, (bill) => bill.no, {
    cascade: true,
    onDelete: "CASCADE",
  })
  bill: Bill;

  @Column({ type: "integer" })
  @IsNumber()
  billNo: number;

  @ManyToOne(() => Winning, (winning) => winning.ticket, {
    cascade: true,
    onDelete: "CASCADE",
  })
  winning: Winning;

  @Column({ type: "timestamptz", nullable: true })
  editedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;

  @Column({ nullable: true })
  deletedBy?: string;

  @Column({ nullable: true })
  editedDeviceId?: string;

  @Column({ nullable: true })
  editedIp?: string;

  @Column({ type: "timestamptz", default: () => "LOCALTIMESTAMP" })
  createdAt: Date;

  @Column({ type: "timestamptz", default: () => "LOCALTIMESTAMP" })
  updatedAt: Date;
}
