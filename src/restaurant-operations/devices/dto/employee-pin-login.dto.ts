import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class EmployeePinLoginDto {
  @ApiProperty({
    example: '1234',
    description: '4 to 6 digit employee personal PIN',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4,6}$/, {
    message: 'PIN must be between 4 and 6 numeric digits',
  })
  pin: string;

  @ApiProperty({
    example: 1,
    description: 'Registered merchant device ID authorizing the quick session',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  deviceId?: number;
}
