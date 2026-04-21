import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AccountType } from '../constants/account-type.enum';

export class CreateLedgerAccountDto {
  @ApiProperty({
    example: '1000',
    description: 'Account code (e.g. 1000, 2000)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Cash', description: 'Name of the ledger account' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    example: AccountType.ASSET,
    description: 'Account type',
    enum: AccountType,
  })
  @IsEnum(AccountType)
  @IsNotEmpty()
  type: AccountType;

  @ApiPropertyOptional({
    example: 1,
    description: 'Parent account ID for hierarchical structure',
  })
  @IsOptional()
  @IsNumber()
  parent_account_id?: number;
}
