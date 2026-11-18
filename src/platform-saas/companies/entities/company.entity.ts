// src/companies/entities/company.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { MerchantSummaryDto } from '../../merchants/dtos/merchant-summary.dto';
import { ApiProperty } from '@nestjs/swagger';
import { CustomerSummaryDto } from '../../../core/business-partners/customers/dtos/customer-summary.dto';
import { Customer } from '../../../core/business-partners/customers/entities/customer.entity';
import { Supplier } from '../../../core/business-partners/suppliers/entities/supplier.entity';
import { Configuration } from '../../../core/configuration/entity/configuration-entity';
import { CompanyStatus } from '../constants/company-status.enum';

@Entity()
export class Company {
  @ApiProperty({ example: 1, description: 'Unique identifier of the company' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Acme Corp', description: 'Name of the company' })
  @Column()
  name: string;

  @ApiProperty({
    example: 'Acme Corporation LLC',
    description:
      'Registered legal name of the company (the commercial name is `name`)',
    required: false,
    nullable: true,
  })
  @Column({
    name: 'legal_name',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  legal_name?: string | null;

  @ApiProperty({
    example: 'USD',
    description: 'ISO 4217 code of the base currency of the company',
    default: 'USD',
  })
  @Column({
    name: 'base_currency',
    type: 'varchar',
    length: 3,
    default: 'USD',
  })
  base_currency?: string;

  @ApiProperty({
    example: CompanyStatus.ACTIVE,
    enum: CompanyStatus,
    description:
      'Operational status of the company. Deactivating suspends access for all child merchants without deleting data.',
    default: CompanyStatus.ACTIVE,
  })
  @Column({
    type: 'varchar',
    length: 20,
    default: CompanyStatus.ACTIVE,
  })
  status: CompanyStatus;

  @ApiProperty({
    example: 'contact@acme.com',
    description: 'Contact email of the company',
  })
  @Column({ nullable: true })
  email: string;

  @ApiProperty({
    example: '1234567890',
    description: 'Phone number of the company',
  })
  @Column({ nullable: true })
  phone?: string;

  @ApiProperty({
    example: '12-3456789',
    description: 'Tax ID of the company (e.g. US EIN 12-3456789)',
  })
  @Column({ name: 'tax_id', nullable: true })
  tax_id: string;

  @ApiProperty({
    example: '123 Main St',
    description: 'Address of the company',
  })
  @Column({ nullable: true })
  address: string;

  @ApiProperty({
    example: 'Miami',
    description: 'City of the company',
  })
  @Column({ nullable: true })
  city: string;

  @ApiProperty({
    example: 'California',
    description: 'State of the company',
  })
  @Column({ nullable: true })
  state: string;

  @ApiProperty({
    example: 'USA',
    description: 'Country of the company',
  })
  @Column({ nullable: true })
  country: string;

  @ApiProperty({
    type: () => MerchantSummaryDto,
    isArray: true,
    description:
      'List of merchants (id and merchantId) associated with the company',
    required: false,
  })
  @OneToMany(() => Merchant, (merchant) => merchant.company)
  merchants: Merchant[];

  @ApiProperty({
    type: () => CustomerSummaryDto,
    isArray: true,
    description:
      'List of customers (id and customerId) associated with the company',
    required: false,
  })
  @OneToMany(() => Customer, (customer) => customer.company)
  customers: Customer[];

  @ApiProperty({
    type: () => Configuration,
    description: 'Configuration associated with the company',
    required: false,
  })
  @OneToMany(() => Configuration, (configuration) => configuration.company)
  configurations: Configuration[];

  @OneToMany(() => Supplier, (supplier) => supplier.company)
  suppliers: Supplier[];

  @ApiProperty({
    example: 4,
    description:
      'Number of merchant branches linked to the company (computed).',
    required: false,
  })
  merchantsCount?: number;

  @ApiProperty({
    example: 12,
    description: 'Number of B2B customers linked to the company (computed).',
    required: false,
  })
  customersCount?: number;

  @ApiProperty({
    example: '12-3456789',
    description:
      'Deprecated: same value as tax_id, kept in responses while clients migrate (set by LegacyRutSubscriber, not a column).',
    deprecated: true,
  })
  rut?: string;
}
