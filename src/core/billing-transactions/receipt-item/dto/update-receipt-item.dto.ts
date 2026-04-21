import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateReceiptItemDto {
  @ApiProperty({
    example: '{"notes":"Sin cebolla"}',
    description: 'Arbitrary metadata in JSON format',
    required: false,
  })
  @IsString()
  @IsOptional()
  metadata?: string;
}
