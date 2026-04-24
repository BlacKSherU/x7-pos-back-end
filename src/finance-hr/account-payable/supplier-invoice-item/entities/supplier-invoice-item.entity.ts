import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { SupplierInvoice } from '../../supplier-invoices/entities/supplier-invoice.entity';
import { Product } from 'src/inventory/products-inventory/products/entities/product.entity';

@Entity('supplier_invoice_items')
export class SupplierInvoiceItem {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1 })
  @Column({ type: 'int' })
  invoice_id: number;

  @ApiProperty({ example: 12 })
  @Column({ type: 'int', nullable: true })
  product_id?: number;

  @ApiProperty({ example: 'Flour 25kg bag' })
  @Column({ type: 'varchar', length: 255 })
  description: string;

  @ApiProperty({ example: 10 })
  @Column({ type: 'decimal', precision: 15, scale: 4 })
  quantity: number;

  @ApiProperty({ example: 50.0 })
  @Column({ type: 'decimal', precision: 15, scale: 4 })
  unit_price: number;

  @ApiProperty({ example: 500.0 })
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  line_subtotal: number;

  @ApiProperty({ example: 95.0 })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  tax_amount: number;

  @ApiProperty({ example: 595.0 })
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  line_total: number;

  @ApiProperty({
    description: 'Logical delete timestamp (null = active)',
    nullable: true,
  })
  @Column({ type: 'timestamp', name: 'deleted_at', nullable: true })
  deleted_at: Date | null;

  @ManyToOne(() => SupplierInvoice, (invoice) => invoice.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoice_id' })
  invoice: SupplierInvoice;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: Product;
}
