//src/qr-code/qr-menu-section/dto/create-qr-menu-section.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsIn } from 'class-validator';

export class CreateQRMenuSectionDto {
  @ApiProperty({ example: 'QR MENU ID' })
  @IsNumber()
  @IsNotEmpty()
  qrMenu: number;

  @ApiProperty({ example: 'Ice cream Section' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Includes a variety of flavors' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status: string;

  @ApiProperty({ example: 'DISPPLAY ORDER OF THE SECTION' })
  @IsNumber()
  @IsNotEmpty()
  display_order: number;
}
