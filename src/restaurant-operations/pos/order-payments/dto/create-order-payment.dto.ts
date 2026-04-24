import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateOrderPaymentDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsPositive()
  orderId: number;

  @ApiProperty({ example: 50.25 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'card', description: 'cash, card, online, qr, etc.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  method: string;

  @ApiPropertyOptional({ example: 'stripe' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  provider?: string;

  @ApiPropertyOptional({ example: 'ch_abc123' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isRefund?: boolean;
}
