import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, Min, ValidateIf } from 'class-validator';
import { CreatePaymentTerminalDto } from './create-payment-terminal.dto';

export class UpdatePaymentTerminalDto extends PartialType(
  OmitType(CreatePaymentTerminalDto, ['cashDrawerId'] as const),
) {
  @ApiPropertyOptional({
    example: 2,
    nullable: true,
    description: 'Register (cash drawer) of the branch; null unassigns it',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  cashDrawerId?: number | null;
}
