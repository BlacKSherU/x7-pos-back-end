import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { DeviceType } from '../constants/device-type.constant';

export class CreatePairingCodeDto {
  @ApiProperty({
    example: 'kds',
    enum: ['pos', 'kds', 'kiosk', 'pickup', 'host'],
    description: 'Target physical terminal or station type',
  })
  @IsNotEmpty()
  @IsIn(['pos', 'kds', 'kiosk', 'pickup', 'host'])
  type: DeviceType;

  @ApiProperty({
    example: 2,
    description: 'Kitchen Station ID to bind if type is kds',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  stationId?: number;
}
