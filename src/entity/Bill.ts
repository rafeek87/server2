import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Timestamp,
  Index,
  OneToMany,
  DeleteDateColumn,
} from "typeorm";
import {
  Contains,
  IsInt,
  Length,
  IsEmail,
  IsFQDN,
  IsDateString,
  Min,
  Max,
  IsIn,
  IsNotIn,
  IsNotEmpty,
} from "class-validator";
import { Ticket } from "./Ticket";
import { Winning } from "./Winning";

const ticketNames = ["DEAR1", "LSK3", "DEAR8", "DEAR8"];

@Entity()
export class Bill {
  @PrimaryGeneratedColumn({ type: "integer" })
  no: number;

  @Column()
  @IsNotEmpty()
  agentId: string;

  @Column()
  @IsNotEmpty()
  agentScheme: string;

  @Column()
  @IsNotEmpty()
  createdBy: string;

  @Column({ type: "date" })
  @IsDateString()
  @Index()
  resultDate: Date;

  @Column()
  @IsNotEmpty()
  partnerId: string;

  @Column()
  @IsNotEmpty()
  partnerScheme: string;

  @Column()
  @IsNotEmpty()
  stockistId: string;

  @Column()
  @IsNotEmpty()
  stockistScheme: string;

  @Column()
  @IsNotEmpty()
  subStockistId: string;

  @Column()
  @IsNotEmpty()
  subStockistScheme: string;

  @Column()
  @IsNotEmpty()
  // @IsIn(ticketNames)
  @Index()
  ticketName: string;

  @Column({ type: "timestamptz", default: () => "LOCALTIMESTAMP" })
  createdAt: Date;

  @Column({ type: "timestamptz", default: () => "LOCALTIMESTAMP" })
  updatedAt: Date;

  @DeleteDateColumn()
  deletedDate: Date;

  @Column({ nullable: true })
  deletedBy?: string;

  @Column({ nullable: true })
  deviceId?: string;

  @Column({ nullable: true })
  enteredIp?: string;

  @OneToMany(() => Ticket, (ticket) => ticket.bill)
  tickets: Ticket[];

  @OneToMany(() => Winning, (winning) => winning.bill, {
    cascade: true,
    onDelete: "CASCADE",
  })
  winnings: Winning[];
}
