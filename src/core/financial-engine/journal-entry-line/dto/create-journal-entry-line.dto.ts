import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateJournalEntryLineDto {
  @ApiProperty({ example: 1, description: 'Ledger Account ID' })
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  account_id: number;

  @ApiProperty({
    example: 1000.0,
    description: 'Debit amount (0 if credit line)',
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  debit: number;

  @ApiProperty({ example: 0.0, description: 'Credit amount (0 if debit line)' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  credit: number;

  @ApiPropertyOptional({
    example: 'Cash payment received',
    description: 'Optional description for this line',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
