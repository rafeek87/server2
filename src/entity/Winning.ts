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
  IsDateString,
} from "class-validator";
import { Bill } from "./Bill";
import { Ticket } from "./Ticket";

@Entity()
export class Winning {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "integer" })
  @IsNumber()
  position: number;

  @Column({ type: "decimal" })
  @IsNumber()
  prize: number;

  @Column({ type: "decimal" })
  @IsNumberString()
  partnerWin: number;

  @Column({ type: "decimal" })
  @IsNumberString()
  stockistWin: number;

  @Column({ type: "decimal" })
  @IsNumberString()
  subStockistWin: number;

  @Column({ type: "decimal" })
  @IsNumberString()
  agentWin: number;

  @Column({ type: "date" })
  @IsDateString()
  @Index()
  resultDate: Date;

  @Column()
  @IsNotEmpty()
  // @IsIn(ticketNames)
  @Index()
  ticketName: string;

  @ManyToOne(() => Bill, (bill) => bill.no, {
    cascade: false,
  })
  bill: Bill;

  @Column()
  billNo: number;

  @ManyToOne(() => Ticket, (ticket) => ticket.winning, {
    cascade: false,
  })
  ticket: Ticket;

  @Column()
  ticketId: number;

  @Column({ type: "timestamptz", default: () => "LOCALTIMESTAMP" })
  createdAt: Date;

  @Column({ type: "timestamptz", default: () => "LOCALTIMESTAMP" })
  updatedAt: Date;
}
