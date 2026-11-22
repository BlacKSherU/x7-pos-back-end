import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateReceiptTaxStatusDto {
  @ApiProperty({
    example: false,
    description:
      'true activates the tax (counts in the receipt totals); false deactivates it without deleting it',
  })
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}
