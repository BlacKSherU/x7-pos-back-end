import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateKitchenStationDto } from './create-kitchen-station.dto';

export class UpdateKitchenStationDto extends PartialType(
  CreateKitchenStationDto,
) {
  @ApiPropertyOptional({
    example: true,
    description: 'Whether the kitchen station is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
