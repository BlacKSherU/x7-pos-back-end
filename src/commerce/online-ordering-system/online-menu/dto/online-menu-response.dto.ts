import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../../common/dtos/success-response.dto';

export class BasicOnlineStoreInfoDto {
  @ApiProperty({ example: 1, description: 'Online Store ID' })
  id: number;

  @ApiProperty({ example: 'my-store', description: 'Online Store subdomain' })
  subdomain: string;
}

export class OnlineMenuResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Online Menu',
  })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Online Store owning the Menu',
  })
  storeId: number;

  @ApiProperty({ example: 'Main Menu', description: 'Name of the online menu' })
  name: string;

  @ApiProperty({
    example: 'This is the main menu for our restaurant',
    description: 'Description of the online menu',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ example: true, description: 'Whether the menu is active' })
  isActive: boolean;

  @ApiProperty({
    example: '2024-01-15T08:00:00Z',
    description: 'Creation timestamp of the Online Menu',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2024-01-15T09:00:00Z',
    description: 'Last update timestamp of the Online Menu',
  })
  updatedAt: Date;

  @ApiProperty({
    type: () => BasicOnlineStoreInfoDto,
    description: 'Online Store information',
  })
  store: BasicOnlineStoreInfoDto;
}

export class OneOnlineMenuResponseDto extends SuccessResponse {
  @ApiProperty({
    type: () => OnlineMenuResponseDto,
    description: 'Online menu data',
  })
  data: OnlineMenuResponseDto;
}
