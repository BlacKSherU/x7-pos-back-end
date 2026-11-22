import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { ReceiptAuditAction } from '../receipt-audit-action.enum';

export class ReceiptTotalsSnapshotDto {
  @ApiProperty({ example: 100 })
  subtotal: number;

  @ApiProperty({ example: 19 })
  total_tax: number;

  @ApiProperty({ example: 0 })
  total_discount: number;

  @ApiProperty({ example: 119 })
  grand_total: number;
}

export class ReceiptActivityLogEventDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({
    enum: ReceiptAuditAction,
    example: ReceiptAuditAction.UPDATED,
  })
  action: ReceiptAuditAction;

  @ApiProperty({ example: 7, nullable: true })
  user_id: number | null;

  @ApiProperty({
    example: 'jdoe',
    nullable: true,
    description: 'Username (or email) of the performing user',
  })
  user_name: string | null;

  @ApiProperty({ example: 'merchant_admin', nullable: true })
  role: string | null;

  @ApiProperty({
    type: () => ReceiptTotalsSnapshotDto,
    nullable: true,
    description:
      'subtotal / total_tax / total_discount / grand_total before the event',
  })
  previous_values: ReceiptTotalsSnapshotDto | null;

  @ApiProperty({
    type: () => ReceiptTotalsSnapshotDto,
    nullable: true,
    description:
      'subtotal / total_tax / total_discount / grand_total after the event',
  })
  new_values: ReceiptTotalsSnapshotDto | null;

  @ApiProperty({
    example: { changed_fields: ['currency'] },
    nullable: true,
    description:
      'Event details (changed fields, item / tax affected, blocked request…)',
  })
  metadata: Record<string, unknown> | null;

  @ApiProperty({
    example: '2026-11-22T10:15:30.123Z',
    description: 'Exact timestamp of the event',
  })
  created_at: Date;
}

export class ReceiptActivityLogDto {
  @ApiProperty({ example: 10 })
  receipt_id: number;

  @ApiProperty({ example: 'INV-000010', nullable: true })
  invoice_number: string | null;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({
    type: () => [ReceiptActivityLogEventDto],
    description: 'Events in exact chronological order (created_at, id)',
  })
  events: ReceiptActivityLogEventDto[];
}

export class ReceiptActivityLogResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => ReceiptActivityLogDto })
  data: ReceiptActivityLogDto;
}
