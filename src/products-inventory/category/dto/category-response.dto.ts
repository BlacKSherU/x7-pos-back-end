import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { MerchantLittleResponseDto } from 'src/merchants/dtos/merchant-response.dto';

export class CategoryResponseDto {
  @ApiProperty({ example: 1, description: 'Category ID' })
  id: number;

  @ApiProperty({ example: 'Beverages', description: 'Category name' })
  name: string;

  @ApiProperty({
    type: () => MerchantLittleResponseDto,
    nullable: true,
    description: 'Associated merchant details',
  })
  merchant: MerchantLittleResponseDto | null;

  @ApiProperty({
    example: [{ id: 1, parentName: 'Food' }],
    description: 'Parent categories',
    required: false,
    nullable: true,
  })
  parents?: { id: number; parentName: string }[];
}
export class CategoryLittleResponseDto {
  @ApiProperty({ example: 1, description: 'Category ID' })
  id: number;

  @ApiProperty({ example: 'Beverages', description: 'Category name' })
  name: string;

  @ApiProperty({
    type: () => CategoryLittleResponseDto,
    nullable: true,
    description: 'Parent category details',
  })
  parent?: CategoryLittleResponseDto | null;
}

export class OneCategoryResponse extends SuccessResponse {
  @ApiProperty()
  data: CategoryResponseDto;
}
