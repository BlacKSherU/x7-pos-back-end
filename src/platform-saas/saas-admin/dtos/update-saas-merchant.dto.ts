import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsTimeZone,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { MerchantStatus } from '../../merchants/constants/merchant-status.enum';
import { trimString, trimToNull } from '../saas-admin.util';

/** Validated only when present: a field sent as null is rejected, not cleared. */
const isPresent = (_object: object, value: unknown) => value !== undefined;

/**
 * Partial update of a merchant branch profile. Same rules as creating a branch
 * (CreateCompanyMerchantDto); email and phone can be cleared with an empty string.
 */
export class UpdateSaasMerchantDto {
  @ApiPropertyOptional({
    example: 'Downtown Bistro',
    maxLength: 100,
    description: 'Branch name, unique within its company',
  })
  @ValidateIf(isPresent)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[\p{L}\p{M}\p{N}\s\-.&'’()]+$/u, {
    message:
      'Merchant name can only contain letters, numbers, spaces, and common punctuation',
  })
  name?: string;

  @ApiPropertyOptional({ example: 'contact@store.com', nullable: true })
  @IsOptional()
  @Transform(trimToNull)
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({ example: '+15550001234', nullable: true })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @Matches(/^\+?[\d\s().-]{7,20}$/, {
    message: 'Phone must be a valid international phone number',
  })
  phone?: string | null;

  @ApiPropertyOptional({ example: '123 Main Street' })
  @ValidateIf(isPresent)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ example: 'Miami' })
  @ValidateIf(isPresent)
  @Transform(trimString)
  @IsString()
  @Length(2, 80)
  city?: string;

  @ApiPropertyOptional({ example: 'Florida' })
  @ValidateIf(isPresent)
  @Transform(trimString)
  @IsString()
  @Length(2, 80)
  state?: string;

  @ApiPropertyOptional({ example: 'USA' })
  @ValidateIf(isPresent)
  @Transform(trimString)
  @IsString()
  @Length(2, 80)
  country?: string;

  @ApiPropertyOptional({
    example: 'America/New_York',
    description: 'IANA time zone of the branch',
  })
  @ValidateIf(isPresent)
  @IsString()
  @IsTimeZone({
    message: 'timezone must be a valid IANA time zone, e.g. America/New_York',
  })
  timezone?: string;

  @ApiPropertyOptional({ enum: MerchantStatus })
  @ValidateIf(isPresent)
  @IsEnum(MerchantStatus)
  status?: MerchantStatus;
}
