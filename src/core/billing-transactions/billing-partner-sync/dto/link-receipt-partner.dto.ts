import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, Min } from 'class-validator';

import { PartnerType } from '../constants/partner-sync.enums';

/** LINK CUSTOMER PROFILE: asigna (o reasigna) un recibo a un cliente o proveedor. */
export class LinkReceiptPartnerDto {
  @ApiProperty({ enum: PartnerType, example: PartnerType.CUSTOMER })
  @IsEnum(PartnerType)
  partnerType: PartnerType;

  @ApiProperty({ example: 12, description: 'Customer or supplier ID' })
  @IsInt()
  @Min(1)
  partnerId: number;
}
