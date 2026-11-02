import { ApiProperty } from '@nestjs/swagger';

export class NavigationItemResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of navigation item',
  })
  id: number;

  @ApiProperty({
    example: 'products',
    description: 'Stable unique slug/code of the item',
  })
  code: string;

  @ApiProperty({
    example: 45,
    description: 'Feature ID associated with this screen item (null for hubs)',
    nullable: true,
  })
  featureId: number | null;

  @ApiProperty({
    example: 'PRODUCT DIRECTORY',
    description: 'Display label of navigation item',
  })
  label: string;

  @ApiProperty({
    example: 'inventory_2',
    description: 'Material Symbols glyph icon',
  })
  icon: string;

  @ApiProperty({
    example: 'Product directory and inventory control.',
    description: 'Brief description of the screen or hub',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    example: '/inventory/products',
    description: 'Target frontend route or view tab identifier',
    nullable: true,
  })
  route: string | null;

  @ApiProperty({
    example: 'screen',
    description: 'Kind of item: hub or screen',
    enum: ['hub', 'screen'],
  })
  kind: 'hub' | 'screen';

  @ApiProperty({
    example: 'live',
    description: 'Development lifecycle status',
    enum: ['live', 'in_development'],
  })
  status: 'live' | 'in_development';

  @ApiProperty({
    example: 1,
    description: 'Display sort order within application',
  })
  sortOrder: number;
}

export class NavigationApplicationResponseDto {
  @ApiProperty({ example: 15, description: 'Unique identifier of application' })
  id: number;

  @ApiProperty({
    example: 'products-inventory',
    description: 'Application code/slug',
    nullable: true,
  })
  code: string | null;

  @ApiProperty({ example: 'Products', description: 'Application display name' })
  name: string;

  @ApiProperty({
    example: 'inventory_2',
    description: 'Material Symbols glyph icon',
    nullable: true,
  })
  icon: string | null;

  @ApiProperty({
    example: 1,
    description: 'Display sort order within category',
  })
  sortOrder: number;

  @ApiProperty({
    type: () => [NavigationItemResponseDto],
    description: 'Visible navigation items belonging to this application',
  })
  items: NavigationItemResponseDto[];
}

export class NavigationCategoryResponseDto {
  @ApiProperty({
    example: 2,
    description: 'Unique identifier of navigation category',
  })
  id: number;

  @ApiProperty({ example: 'inventory', description: 'Category code/slug' })
  code: string;

  @ApiProperty({
    example: 'Inventory & Supplies',
    description: 'Category display name',
  })
  name: string;

  @ApiProperty({
    example: 'inventory',
    description: 'Material Symbols glyph icon',
  })
  icon: string;

  @ApiProperty({
    example: 2,
    description: 'Display sort order among categories',
  })
  sortOrder: number;

  @ApiProperty({
    type: () => [NavigationApplicationResponseDto],
    description: 'Visible applications belonging to this category',
  })
  applications: NavigationApplicationResponseDto[];
}

export class NavigationTreeResponseDto {
  @ApiProperty({
    example: 'merchant_web',
    description: 'Requested client navigation surface',
  })
  surface: string;

  @ApiProperty({
    example: 2,
    description: 'Active subscription plan ID of the merchant or company',
    nullable: true,
  })
  planId: number | null;

  @ApiProperty({
    example: 'merchant_user',
    description: 'System role of the authenticated user',
  })
  role: string;

  @ApiProperty({
    example: 'waiter',
    description: 'Restaurant shift role of the collaborator (if merchant_user)',
    nullable: true,
  })
  shiftRole: string | null;

  @ApiProperty({
    type: () => [NavigationCategoryResponseDto],
    description: 'Filtered hierarchical categories and applications',
  })
  categories: NavigationCategoryResponseDto[];
}
