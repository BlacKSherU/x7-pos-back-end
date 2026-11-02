import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SetUserPinDto {
  @ApiProperty({
    example: '5432',
    description: '4 to 6 digit employee personal PIN to set or update',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4,6}$/, {
    message: 'PIN must be between 4 and 6 numeric digits',
  })
  pin: string;
}
