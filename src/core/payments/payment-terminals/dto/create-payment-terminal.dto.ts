import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreatePaymentTerminalDto {
  @ApiProperty({
    example: 3,
    description: 'Branch (merchant) the terminal is in',
  })
  @IsInt()
  @Min(1)
  merchantId: number;

  @ApiProperty({
    example: 1,
    description:
      'Payment config the terminal charges through; it must exist, be active and cover the branch',
  })
  @IsInt()
  @Min(1)
  paymentConfigId: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Register (cash drawer) of the branch the terminal sits at',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  cashDrawerId?: number;

  @ApiProperty({ example: 'Front counter terminal', maxLength: 100 })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({
    example: 'Ingenico Lane/3000',
    maxLength: 50,
    description:
      'e.g. CardPointe Bolt, Ingenico Lane/3000, Stripe WisePOS E, Clover Flex',
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  model?: string;

  @ApiProperty({
    example: 'C032UQ03960231',
    description:
      'CardPointe Bolt: hardware serial number (HSN). Stripe: reader ID (tmr_...). Clover: device serial number.',
  })
  @IsString()
  @Length(4, 100)
  deviceIdentifier: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
