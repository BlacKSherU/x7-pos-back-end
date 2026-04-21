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
import { OnlineStore } from '../../online-stores/entities/online-store.entity';

@Entity('online_menu')
@Index(['store_id', 'is_active', 'created_at'])
export class OnlineMenu {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Online Menu',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Online Store owning the Menu',
  })
  @Column({ name: 'store_id' })
  store_id: number;

  @ManyToOne(() => OnlineStore, (onlineStore) => onlineStore.id, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'store_id' })
  store: OnlineStore;

  @ApiProperty({ example: 'Main Menu', description: 'Name of the online menu' })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({
    example: 'This is the main menu for our restaurant',
    description: 'Description of the online menu',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ example: true, description: 'Whether the menu is active' })
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  is_active: boolean;

  @ApiProperty({
    example: '2024-01-15T08:00:00Z',
    description: 'Creation timestamp of the Online Menu',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2024-01-15T09:00:00Z',
    description: 'Last update timestamp of the Online Menu',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
