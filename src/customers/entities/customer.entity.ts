// src/customers/entities/customer.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Company } from 'src/companies/entities/company.entity';
import { OneToMany } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { LoyaltyCustomer } from 'src/loyalty/loyalty-customer/entities/loyalty-customer.entity';

@Entity()
export class Customer {
  @ApiProperty({ example: 1, description: 'Unique identifier of the customer' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'johndoe', description: 'Name of the customer' })
  @Column()
  name: string;

  @ApiProperty({
    example: 'johndoe@example.com',
    description: 'Email of the customer',
  })
  @Column()
  email: string;

  @ApiProperty({
    example: '1234567890',
    description: 'Phone number of the customer',
  })
  @Column({ nullable: true })
  phone?: string;

  @ApiProperty({
    example: '1234567890',
    description: 'RUT of the customer',
  })
  @Column()
  rut: string;

  @ApiProperty({
    example: '123 Main St',
    description: 'Address of the customer',
  })
  @Column()
  address: string;

  @ApiProperty({
    example: 'Miami',
    description: 'City of the customer',
  })
  @Column()
  city: string;

  @ApiProperty({
    example: 'California',
    description: 'State of the customer',
  })
  @Column()
  state: string;

  @ApiProperty({
    example: 'USA',
    description: 'Country of the customer',
  })
  @Column()
  country: string;

  @ApiProperty({
    example: 1234567890,
    description: 'Merchant ID of the customer',
  })
  @Column()
  merchantId: number;

  @ManyToOne(() => Merchant, (merchant) => merchant.customers, {
    onDelete: 'CASCADE',
  })
  merchant: Merchant;

  @ApiProperty({
    example: 1234567890,
    description: 'Company ID of the customer',
  })
  @Column({ nullable: true })
  companyId: number;

  @ManyToOne(() => Company, (company) => company.customers, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  company: Company;

  @ApiProperty({
    type: () => Order,
    isArray: true,
    required: false,
    description: 'List of orders for this customer',
  })
  @OneToMany(() => Order, (order) => order.customer)
  orders: Order[];
  @OneToMany(
    () => LoyaltyCustomer,
    (loyaltyCustomer) => loyaltyCustomer.customer,
  )
  loyaltyCustomers: LoyaltyCustomer[];
}
