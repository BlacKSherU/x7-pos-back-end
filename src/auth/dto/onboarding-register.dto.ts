import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  IsBusinessEmail,
} from 'src/common/decorators/validation.decorators';

/** Public onboarding: creates legal entity, first branch, and merchant admin in one transaction. */
export class OnboardingRegisterDto {
  @ApiProperty({
    example: 'Acme Corp',
    description: 'Legal name of the company',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  @Matches(/^[a-zA-Z0-9\s\-.&]+$/, {
    message:
      'Company name can only contain letters, numbers, spaces, hyphens, dots, and ampersands',
  })
  companyName: string;

  @ApiProperty({
    example: 'contact@acme.com',
    description: 'Business email for the company',
  })
  @IsEmail()
  @IsBusinessEmail({
    message:
      'Please use a business email address (personal providers are not allowed)',
  })
  companyEmail: string;

  @ApiPropertyOptional({
    example: '+56 9 1234 5678',
    description: 'Company phone number',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s\-()]{8,20}$/, {
    message:
      'Phone number must be between 8 and 20 characters and contain only digits, spaces, hyphens, and parentheses',
  })
  companyPhone?: string;

  @ApiProperty({
    example: '12.345.678-9',
    description: 'Company tax ID (Chilean RUT); must be unique',
  })
  @IsString()
  @IsNotEmpty()
  @Length(7, 15)
  rut: string;

  @ApiProperty({
    example: '123 Main Street, Suite 100',
    description: 'Registered address of the company',
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 200)
  address: string;

  @ApiProperty({ example: 'Santiago', description: 'City' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  @Matches(/^[a-zA-Z\s\-.]+$/, {
    message: 'City can only contain letters, spaces, hyphens, and dots',
  })
  city: string;

  @ApiProperty({ example: 'Metropolitan Region', description: 'State or region' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  @Matches(/^[a-zA-Z\s\-.]+$/, {
    message: 'State can only contain letters, spaces, hyphens, and dots',
  })
  state: string;

  @ApiProperty({ example: 'Chile', description: 'Country' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  @Matches(/^[a-zA-Z\s\-.]+$/, {
    message: 'Country can only contain letters, spaces, hyphens, and dots',
  })
  country: string;

  @ApiProperty({
    example: 'Downtown Branch',
    description:
      'Display name for the first outlet; combined with tax ID for a globally unique merchant record',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9\s\-.&]+$/, {
    message:
      'Branch name can only contain letters, numbers, spaces, hyphens, dots, and ampersands',
  })
  branchName: string;

  @ApiProperty({
    example: 'admin@acme.com',
    description: 'Administrator account email (must not already be registered)',
  })
  @IsEmail()
  adminEmail: string;

  @ApiPropertyOptional({
    example: 'admin_acme',
    description: 'Optional username; defaults to the local part of adminEmail',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  username?: string;

  @ApiProperty({
    example: 'SecurePass123',
    description: 'Password for the administrator account',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    description:
      'Subscription plan ID from checkout (optional). Falls back to ONBOARDING_DEFAULT_PLAN_ID when omitted.',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  planId?: number;
}

