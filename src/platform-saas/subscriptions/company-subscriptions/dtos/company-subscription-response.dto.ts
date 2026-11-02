import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompanySubscriptionItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: { id: 3, name: 'Acme Corp' } })
  company: { id: number; name: string };

  @ApiProperty({ example: { id: 2, name: 'Professional' } })
  plan: { id: number; name: string };

  @ApiProperty({ example: '2026-10-23' })
  startDate: string;

  @ApiPropertyOptional({ example: '2026-11-23', nullable: true })
  endDate: string | null;

  @ApiPropertyOptional({ example: '2026-11-23', nullable: true })
  renewalDate: string | null;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  status: string;

  @ApiProperty({ example: 'onboarding' })
  paymentMethod: string;

  @ApiProperty({
    example: false,
    description:
      'Active but past its end date: the login no longer grants this plan (the company has no access)',
  })
  isExpired: boolean;
}

export class CompanySubscriptionListResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Company subscriptions retrieved successfully' })
  message: string;

  @ApiProperty({ type: [CompanySubscriptionItemDto] })
  data: CompanySubscriptionItemDto[];

  @ApiProperty({ example: { total: 2, page: 1, limit: 10, totalPages: 1 } })
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class OneCompanySubscriptionResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Company subscription updated successfully' })
  message: string;

  @ApiProperty({ type: CompanySubscriptionItemDto })
  data: CompanySubscriptionItemDto;
}
