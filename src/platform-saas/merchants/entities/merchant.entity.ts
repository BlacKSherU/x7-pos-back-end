// src/companies/entities/Merchant.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';
import { Customer } from 'src/core/business-partners/customers/entities/customer.entity';
import { CustomerSummaryDto } from 'src/core/business-partners/customers/dtos/customer-summary.dto';
import { ApiProperty } from '@nestjs/swagger';
import { UserSummaryDto } from 'src/platform-saas/users/dtos/user-summary.dto';
import { Category } from 'src/inventory/products-inventory/category/entities/category.entity';
import { Table } from 'src/restaurant-operations/dining-system/tables/entities/table.entity';
import { Collaborator } from 'src/finance-hr/hr/collaborators/entities/collaborator.entity';
import { Product } from 'src/inventory/products-inventory/products/entities/product.entity';
// import { Supplier } from 'src/business-partners/suppliers/entities/supplier.entity';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';
import { Shift } from '../../../restaurant-operations/shift/shifts/entities/shift.entity';
import { ShiftAssignment } from '../../../restaurant-operations/shift/shift-assignments/entities/shift-assignment.entity';
import { TableAssignment } from '../../../restaurant-operations/dining-system/table-assignments/entities/table-assignment.entity';
import { CashDrawer } from '../../../restaurant-operations/cashdrawer/cash-drawers/entities/cash-drawer.entity';
import { Movement } from 'src/inventory/products-inventory/stocks/movements/entities/movement.entity';
import { LoyaltyProgram } from 'src/growth/loyalty/loyalty-programs/entities/loyalty-program.entity';
import { PurchaseOrder } from 'src/inventory/products-inventory/purchase-order/entities/purchase-order.entity';
import { Location } from 'src/inventory/products-inventory/stocks/locations/entities/location.entity';

@Entity()
export class Merchant {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Merchant' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Acme Corp', description: 'Name of the Merchant' })
  @Column({ unique: true })
  name: string;

  @ApiProperty({
    example: 'contact@acme.com',
    description: 'Contact email of the Merchant',
  })
  @Column({ nullable: true })
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
  @Column({ nullable: true })
  rut: string;

  @ApiProperty({
    example: '123 Main St',
    description: 'Address of the Merchant',
  })
  @Column({ nullable: true })
  address: string;

  @ApiProperty({
    example: 'Miami',
    description: 'City of the Merchant',
  })
  @Column({ nullable: true })
  city: string;

  @ApiProperty({
    example: 'California',
    description: 'State of the Merchant',
  })
  @Column({ nullable: true })
  state: string;

  @ApiProperty({
    example: 'USA',
    description: 'Country of the Merchant',
  })
  @Column({ nullable: true })
  country: string;

  @ApiProperty({
    example: 1234567890,
    description: 'company ID associated with the Merchant ',
  })
  @Column()
  companyId: number;

  @ApiProperty({
    type: () => Company,
    example: 1234567890,
    description: 'Company associated with the merchant',
  })
  @ManyToOne(() => Company, (company) => company, {
    nullable: true,
  })
  company?: Company;

  @ApiProperty({
    type: () => UserSummaryDto,
    isArray: true,
    description:
      'List of users (id and merchantId) associated with the merchant',
  })
  @OneToMany(() => User, (user) => user.merchant)
  users: UserSummaryDto[];

  @ApiProperty({
    type: () => CustomerSummaryDto,
    isArray: true,
    description:
      'List of customers (id and merchantId) associated with the merchant',
    required: false,
  })
  @OneToMany(() => Customer, (customer) => customer.merchant)
  customers: CustomerSummaryDto[];

  @ApiProperty({
    type: () => Category,
    isArray: true,
    required: false,
    description: 'List of categories associated with the merchant',
  })
  @OneToMany(() => Category, (category) => category.merchant)
  categories: Category[];

  @ApiProperty({
    type: () => Product,
    isArray: true,
    required: false,
    description: 'List of product associated with the merchant',
  })
  @OneToMany(() => Product, (Product) => Product.merchant)
  products: Product[];

  @ApiProperty({
    type: () => Movement,
    isArray: true,
    required: false,
    description: 'List of movements associated with the merchant',
  })
  @OneToMany(() => Movement, (movement) => movement.merchant)
  movements: Movement[];

  @ApiProperty({
    type: () => Table,
    isArray: true,
    required: false,
    description: 'List of tables associated with the merchant',
  })
  @OneToMany(() => Table, (table) => table.merchant_id)
  tables: Table[];

  @ApiProperty({
    type: () => Collaborator,
    isArray: true,
    required: false,
    description: 'List of collaborators associated with the merchant',
  })
  @OneToMany(() => Collaborator, (collaborator) => collaborator.merchant)
  collaborators: Collaborator[];

  @ApiProperty({
    type: () => Shift,
    isArray: true,
    required: false,
    description: 'List of shifts associated with the merchant',
  })
  @OneToMany(() => Shift, (shift) => shift.merchant)
  shifts: Shift[];

  @ApiProperty({
    type: () => ShiftAssignment,
    isArray: true,
    required: false,
    description: 'List of shift assignments associated with the merchant',
  })
  @OneToMany(() => ShiftAssignment, (shiftAssignment) => shiftAssignment.shift)
  shiftAssignments: ShiftAssignment[];

  @ApiProperty({
    type: () => TableAssignment,
    isArray: true,
    required: false,
    description: 'List of table assignments associated with the merchant',
  })
  @OneToMany(() => TableAssignment, (tableAssignment) => tableAssignment.shift)
  tableAssignments: TableAssignment[];

  @ApiProperty({
    type: () => CashDrawer,
    isArray: true,
    required: false,
    description: 'List of cash drawers associated with the merchant',
  })
  @OneToMany(() => CashDrawer, (cashDrawer) => cashDrawer.merchant)
  cashDrawers: CashDrawer[];

  @ApiProperty({
    type: () => Order,
    isArray: true,
    required: false,
    description: 'List of orders associated with the merchant',
  })
  @OneToMany(() => Order, (order) => order.merchant)
  orders: Order[];

  @OneToMany(() => LoyaltyProgram, (loyaltyProgram) => loyaltyProgram.merchant)
  loyaltyPrograms: LoyaltyProgram[];

  @OneToMany(() => PurchaseOrder, (purchaseOrder) => purchaseOrder.merchant)
  purchaseOrders: PurchaseOrder[];

  @OneToMany(() => Location, (location) => location.merchant)
  stockLocations: Location[];
}
