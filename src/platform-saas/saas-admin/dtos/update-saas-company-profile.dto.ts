import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { IsTaxId } from 'src/common/decorators/validation.decorators';
import { CompanyStatus } from '../../companies/constants/company-status.enum';
import { SUPPORTED_CURRENCIES } from '../constants/supported-currencies';
import { trimString, trimToNull } from '../saas-admin.util';

/** Validated only when present: a field sent as null is rejected, not cleared. */
const isPresent = (_object: object, value: unknown) => value !== undefined;

/**
 * Partial update of a company profile. legalName, commercialName, taxId, baseCurrency
 * and status are mandatory attributes: they can change but not be emptied. The contact
 * and billing address fields can be cleared with an empty string (stored as null).
 */
export class UpdateSaasCompanyProfileDto {
  @ApiPropertyOptional({ example: 'Acme Corporation LLC', maxLength: 150 })
  @ValidateIf(isPresent)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  legalName?: string;

  @ApiPropertyOptional({
    example: 'Acme Corp',
    maxLength: 100,
    description: 'Commercial name (stored as the company name)',
  })
  @ValidateIf(isPresent)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  commercialName?: string;

  @ApiPropertyOptional({
    example: '12-3456789',
    description:
      'Tax ID: 1-50 letters, digits, dots, dashes, slashes or spaces, starting and ending with a letter or digit and containing at least one digit (e.g. EIN 12-3456789)',
  })
  @ValidateIf(isPresent)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @IsTaxId()
  taxId?: string;

  @ApiPropertyOptional({ example: 'contact@acme.com', nullable: true })
  @IsOptional()
  @Transform(trimToNull)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({ example: '+1 (555) 123-4567', nullable: true })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @Matches(/^\+?[\d\s().-]{7,20}$/, {
    message: 'phone must be a valid international phone number',
  })
  phone?: string | null;

  @ApiPropertyOptional({
    example: '123 Main Street, Suite 100',
    nullable: true,
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(200)
  address?: string | null;

  @ApiPropertyOptional({ example: 'Miami', nullable: true })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(80)
  city?: string | null;

  @ApiPropertyOptional({ example: 'Florida', nullable: true })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(80)
  state?: string | null;

  @ApiPropertyOptional({ example: 'USA', nullable: true })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(80)
  country?: string | null;

  @ApiPropertyOptional({
    example: 'USD',
    enum: SUPPORTED_CURRENCIES,
    description:
      'ISO 4217 code (3 upper-case letters): any active code of the ISO 4217 list',
  })
  @ValidateIf(isPresent)
  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'baseCurrency must be an ISO 4217 code of 3 upper-case letters',
  })
  @IsIn(SUPPORTED_CURRENCIES, {
    message: 'baseCurrency must be an active ISO 4217 currency code',
  })
  baseCurrency?: string;

  @ApiPropertyOptional({ enum: CompanyStatus })
  @ValidateIf(isPresent)
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;
}
