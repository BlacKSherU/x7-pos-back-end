import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ApplicationEntity } from '../applications/entity/application-entity';

@Entity('nav_category')
export class NavCategory {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the navigation category',
  })
  @PrimaryGeneratedColumn({
    type: 'int',
    primaryKeyConstraintName: 'PK_nav_category_id',
  })
  id: number;

  @ApiProperty({
    example: 'restaurant-operations',
    description: 'Unique slug/code of the category',
  })
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @ApiProperty({
    example: 'Restaurant Operations',
    description: 'Display name of the category',
  })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({
    example: 'restaurant',
    description: 'Material Symbols glyph icon name',
  })
  @Column({ type: 'varchar', length: 50 })
  icon: string;

  @ApiProperty({ example: 1, description: 'Sort order index of the category' })
  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder: number;

  @OneToMany(() => ApplicationEntity, (app) => app.navCategory)
  applications?: ApplicationEntity[];
}
