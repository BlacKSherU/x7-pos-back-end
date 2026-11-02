import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ApplicationEntity } from '../applications/entity/application-entity';
import { FeatureEntity } from '../features/entity/features.entity';

export const NavItemKind = {
  HUB: 'hub',
  SCREEN: 'screen',
} as const;
export type NavItemKind = (typeof NavItemKind)[keyof typeof NavItemKind];

export const NavItemStatus = {
  LIVE: 'live',
  IN_DEVELOPMENT: 'in_development',
} as const;
export type NavItemStatus = (typeof NavItemStatus)[keyof typeof NavItemStatus];

@Entity('nav_item')
@Unique('UQ_nav_item_surface_code', ['surface', 'code'])
@Index('IDX_nav_item_surface', ['surface'])
@Index('IDX_nav_item_application_id', ['applicationId'])
@Index('IDX_nav_item_feature_id', ['featureId'])
export class NavItem {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the navigation item',
  })
  @PrimaryGeneratedColumn({
    type: 'int',
    primaryKeyConstraintName: 'PK_nav_item_id',
  })
  id: number;

  @ApiProperty({
    example: 'merchant_web',
    description: 'Target client surface',
  })
  @Column({ type: 'varchar', length: 50 })
  surface: string;

  @ApiProperty({
    example: 15,
    description: 'Application ID to which this item belongs',
  })
  @Column({ type: 'bigint', name: 'application_id' })
  applicationId: number;

  @ApiProperty({
    example: 45,
    description: 'Required feature ID (null for hubs)',
    nullable: true,
  })
  @Column({ type: 'bigint', name: 'feature_id', nullable: true })
  featureId: number | null;

  @ApiProperty({
    example: 'products',
    description: 'Stable unique slug/code of the item',
  })
  @Column({ type: 'varchar', length: 100 })
  code: string;

  @ApiProperty({
    example: 'PRODUCT DIRECTORY',
    description: 'Display label of the item',
  })
  @Column({ type: 'varchar', length: 150 })
  label: string;

  @ApiProperty({
    example: 'inventory_2',
    description: 'Material Symbols glyph name',
  })
  @Column({ type: 'varchar', length: 50 })
  icon: string;

  @ApiProperty({
    example: 'Product directory and inventory control.',
    description: 'Brief description',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({
    example: '/dashboard/products',
    description: 'Target frontend route',
    nullable: true,
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  route: string | null;

  @ApiProperty({
    example: 1,
    description: 'Display sort order within application',
  })
  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder: number;

  @ApiProperty({
    example: 'screen',
    description: 'Navigation kind: hub or screen',
  })
  @Column({ type: 'varchar', length: 20, default: NavItemKind.SCREEN })
  kind: NavItemKind;

  @ApiProperty({
    example: 'live',
    description: 'Development lifecycle status: live or in_development',
  })
  @Column({ type: 'varchar', length: 50, default: NavItemStatus.LIVE })
  status: NavItemStatus;

  @ManyToOne(() => ApplicationEntity, (app) => app.navItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'application_id',
    foreignKeyConstraintName: 'FK_nav_item_application',
  })
  application: ApplicationEntity;

  @ManyToOne(() => FeatureEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({
    name: 'feature_id',
    foreignKeyConstraintName: 'FK_nav_item_feature',
  })
  feature?: FeatureEntity | null;
}
