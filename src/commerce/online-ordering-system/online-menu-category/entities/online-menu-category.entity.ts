import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { OnlineMenu } from '../../online-menu/entities/online-menu.entity';
import { Category } from '../../../../inventory/products-inventory/category/entities/category.entity';
import { OnlineMenuCategoryStatus } from '../constants/online-menu-category-status.enum';

@Entity('online_menu_category')
@Index(['menu_id', 'display_order'])
@Index(['category_id'])
@Index(['status'])
export class OnlineMenuCategory {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Online Menu Category',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Online Menu' })
  @Column({ name: 'menu_id' })
  menu_id: number;

  @ManyToOne(() => OnlineMenu, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'menu_id' })
  menu: OnlineMenu;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Category from product inventory',
  })
  @Column({ name: 'category_id' })
  category_id: number;

  @ManyToOne(() => Category, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ApiProperty({
    example: 1,
    description: 'Display order of the category in the menu',
  })
  @Column({ type: 'int', name: 'display_order' })
  display_order: number;

  @ApiProperty({
    example: OnlineMenuCategoryStatus.ACTIVE,
    enum: OnlineMenuCategoryStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  @Column({
    type: 'enum',
    enum: OnlineMenuCategoryStatus,
    default: OnlineMenuCategoryStatus.ACTIVE,
  })
  status: OnlineMenuCategoryStatus;

  @ApiProperty({
    example: '2024-01-15T08:00:00Z',
    description: 'Creation timestamp',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2024-01-15T09:00:00Z',
    description: 'Last update timestamp',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
