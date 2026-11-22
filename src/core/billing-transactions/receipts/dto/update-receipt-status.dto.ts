import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/** Baja lógica (false) o reactivación (true) de un recibo. */
export class UpdateReceiptStatusDto {
  @ApiProperty({
    example: false,
    description:
      'false = logical deletion (the receipt is kept for the financial history), true = reactivate it',
  })
  @IsBoolean()
  isActive: boolean;
}
