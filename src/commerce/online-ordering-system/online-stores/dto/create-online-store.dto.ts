import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateOnlineStoreDto {
  @ApiProperty({
    example: 'my-store',
    description:
      'Subdomain of the online store (alphanumeric and hyphens only)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'Subdomain must contain only lowercase letters, numbers, and hyphens',
  })
  subdomain: string;

  @ApiProperty({
    example: 'default',
    description: 'Theme of the online store',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  theme: string;

  @ApiProperty({
    example: 'USD',
    description: 'Currency code used in the online store (ISO 4217 format)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  currency: string;

  @ApiProperty({
    example: 'America/New_York',
    description: 'Timezone of the online store (IANA timezone format)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  timezone: string;
}
