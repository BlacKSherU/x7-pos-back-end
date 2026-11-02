// src/subscriptions/applications/entity/application-entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { NavCategory } from '../../entities/nav-category.entity';
import { NavItem } from '../../entities/nav-item.entity';

@Entity('application')
export class ApplicationEntity {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the application',
  })
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @ApiProperty({
    example: 'cash-drawers',
    description: 'Unique code/slug of the application',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  code?: string | null;

  @ApiProperty({
    example: 'My Application',
    description: 'Name of the application',
  })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({
    example: 'This is a sample application',
    description: 'Description of the application',
  })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({
    example: 'Utility',
    description: 'Legacy Category name of the application',
  })
  @Column({ type: 'varchar', length: 50 })
  category: string;

  @ApiProperty({
    example: 1,
    description: 'Foreign key to nav_category table',
    nullable: true,
  })
  @Column({ type: 'int', name: 'category_id', nullable: true })
  categoryId?: number | null;

  @ApiProperty({
    example: 'payments',
    description: 'Material Symbols glyph icon name',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  icon?: string | null;

  @ApiProperty({
    example: 1,
    description: 'Display sort order of application within category',
    nullable: true,
  })
  @Column({ type: 'int', name: 'sort_order', nullable: true, default: 0 })
  sortOrder?: number | null;

  @ApiProperty({
    example: 'active',
    description: 'Status of the application',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;

  @ManyToOne(() => NavCategory, (cat) => cat.applications, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({
    name: 'category_id',
    foreignKeyConstraintName: 'FK_application_nav_category',
  })
  navCategory?: NavCategory | null;

  @OneToMany(() => NavItem, (item) => item.application)
  navItems?: NavItem[];
}
