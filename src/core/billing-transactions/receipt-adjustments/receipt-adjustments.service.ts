import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  MerchantLockScope,
  lockMerchantScope,
} from 'src/common/utils/merchant-lock.util';
import { Receipt } from '../receipts/entities/receipt.entity';
import { ReceiptAuditLog } from '../receipts/audit/entities/receipt-audit-log.entity';
import { ReceiptAuditAction } from '../receipts/audit/receipt-audit-action.enum';
import {
  ReceiptActor,
  buildReceiptAuditEntry,
  snapshotTotals,
} from '../receipts/audit/receipt-audit.util';
import { centsToNumber, toCents } from '../receipts/utils/receipt-money.util';
import { ReceiptAdjustmentNote } from './entities/receipt-adjustment-note.entity';
import {
  ADJUSTMENT_NOTE_PREFIX,
  AdjustmentNoteType,
} from './constants/adjustment-note-type.enum';
import { CreateAdjustmentNoteDto } from './dto/create-adjustment-note.dto';
import {
  AdjustmentNoteDto,
  IssuedAdjustmentNoteResponseDto,
  ReceiptAdjustmentSummaryDto,
  ReceiptAdjustmentsResponseDto,
} from './dto/adjustment-note-response.dto';
import {
  ADJUSTMENT_REQUIRES_LOCK_MESSAGE,
  adjustmentTotals,
  evaluateAdjustment,
  formatNoteNumber,
  signedAdjustment,
} from './receipt-adjustments.util';

/**
 * Notas de crédito / débito sobre recibos fiscalmente bloqueados (Historia 7).
 *
 * El recibo original no se toca: cada nota es un asiento compensatorio que referencia su
 * invoice_number y registra el delta y el pasivo neto resultante, con el usuario y el rol que
 * la emiten. La emisión corre en una transacción serializada por merchant (cerrojo consultivo)
 * para que el número de nota y el tope acumulado de créditos no se pisen entre peticiones
 * concurrentes, y deja el evento ADJUSTMENT_ISSUED en el audit trail del recibo (Historia 6).
 */
@Injectable()
export class ReceiptAdjustmentsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    @InjectRepository(ReceiptAdjustmentNote)
    private readonly noteRepo: Repository<ReceiptAdjustmentNote>,
  ) {}

  async issue(
    receiptId: number,
    dto: CreateAdjustmentNoteDto,
    actor: ReceiptActor,
    merchantId: number,
  ): Promise<IssuedAdjustmentNoteResponseDto> {
    this.assertRequest(receiptId, merchantId);
    if (!actor?.id) {
      throw new ForbiddenException('An authenticated user is required');
    }

    try {
      const { note, receipt, notes } = await this.dataSource.transaction(
        (manager) =>
          this.issueInTransaction(manager, receiptId, dto, actor, merchantId),
      );
      return {
        statusCode: 201,
        message: 'Adjustment note issued successfully',
        data: {
          note: this.toDto(note),
          summary: this.summarize(receipt, notes),
        },
      };
    } catch (error) {
      if ((error as { code?: string } | null)?.code === '23505') {
        throw new ConflictException(
          'Another adjustment note was issued at the same time; please retry',
        );
      }
      throw error;
    }
  }

  /** Notas del recibo (cualquier estado) en orden (created_at, id) y su pasivo neto. */
  async findForReceipt(
    receiptId: number,
    merchantId: number,
  ): Promise<ReceiptAdjustmentsResponseDto> {
    this.assertRequest(receiptId, merchantId);
    const receipt = this.assertOwned(
      await this.receiptRepo.findOne({ where: { id: receiptId } }),
      merchantId,
    );
    const notes = await this.noteRepo.find({
      where: { receipt_id: receiptId },
      order: { created_at: 'ASC', id: 'ASC' },
    });
    return {
      statusCode: 200,
      message: 'Adjustment notes retrieved successfully',
      data: {
        summary: this.summarize(receipt, notes),
        notes: notes.map((note) => this.toDto(note)),
      },
    };
  }

  private async issueInTransaction(
    manager: EntityManager,
    receiptId: number,
    dto: CreateAdjustmentNoteDto,
    actor: ReceiptActor,
    merchantId: number,
  ): Promise<{
    note: ReceiptAdjustmentNote;
    receipt: Receipt;
    notes: ReceiptAdjustmentNote[];
  }> {
    await lockMerchantScope(
      manager,
      MerchantLockScope.RECEIPT_ADJUSTMENT_NOTES,
      merchantId,
    );

    const receipt = this.assertOwned(
      await manager
        .getRepository(Receipt)
        .findOne({ where: { id: receiptId } }),
      merchantId,
    );
    if (receipt.is_locked !== true || receipt.is_active === false) {
      throw new BadRequestException(ADJUSTMENT_REQUIRES_LOCK_MESSAGE);
    }

    const noteRepo = manager.getRepository(ReceiptAdjustmentNote);
    const existing = await noteRepo.find({
      where: { receipt_id: receipt.id },
      order: { created_at: 'ASC', id: 'ASC' },
    });
    const netBefore = adjustmentTotals(receipt.grand_total, existing).net;
    const { amountCents, netAfterCents } = evaluateAdjustment(
      receipt.grand_total,
      existing,
      dto.noteType,
      dto.adjustmentAmount,
    );

    const note = await noteRepo.save(
      noteRepo.create({
        receipt_id: receipt.id,
        merchant_id: receipt.merchant_id,
        note_type: dto.noteType,
        note_number: await this.nextNoteNumber(
          manager,
          receipt.merchant_id,
          dto.noteType,
        ),
        original_invoice_number: receipt.invoice_number ?? null,
        adjustment_amount: centsToNumber(amountCents),
        resulting_net_amount: centsToNumber(netAfterCents),
        currency: receipt.currency,
        reason_code: dto.reasonCode,
        processed_by_user_id: actor.id,
        processed_by_role: actor.role,
      }),
    );

    // El recibo no cambia: sus totales quedan iguales antes y después del evento.
    const totals = snapshotTotals(receipt);
    await manager.getRepository(ReceiptAuditLog).save(
      buildReceiptAuditEntry({
        receipt,
        action: ReceiptAuditAction.ADJUSTMENT_ISSUED,
        actor,
        previous: totals,
        next: totals,
        metadata: {
          note_id: note.id,
          note_type: note.note_type,
          note_number: note.note_number,
          original_invoice_number: note.original_invoice_number,
          adjustment_amount: centsToNumber(amountCents),
          reason_code: note.reason_code,
          net_total_before: centsToNumber(netBefore),
          net_total_after: centsToNumber(netAfterCents),
        },
      }) as ReceiptAuditLog,
    );

    return { note, receipt, notes: [...existing, note] };
  }

  /** Mayor consecutivo CN-###### / DN-###### del merchant + 1. */
  private async nextNoteNumber(
    manager: EntityManager,
    merchantId: number,
    noteType: AdjustmentNoteType,
  ): Promise<string> {
    const prefix = ADJUSTMENT_NOTE_PREFIX[noteType];
    const raw = await manager
      .getRepository(ReceiptAdjustmentNote)
      .createQueryBuilder('n')
      .select(
        `MAX(CAST(SUBSTRING(n.note_number FROM ${prefix.length + 2}) AS BIGINT))`,
        'last_sequence',
      )
      .where('n.merchant_id = :merchantId', { merchantId })
      .andWhere('n.note_number ~ :pattern', {
        pattern: `^${prefix}-[0-9]{1,15}$`,
      })
      .getRawOne<{ last_sequence: string | number | null }>();
    const last = Number(raw?.last_sequence ?? 0) || 0;
    return formatNoteNumber(noteType, last + 1);
  }

  private assertRequest(receiptId: number, merchantId: number): void {
    if (!merchantId) {
      throw new ForbiddenException('You must be associated with a merchant');
    }
    if (!receiptId || receiptId <= 0) {
      throw new BadRequestException('Invalid receipt id');
    }
  }

  private assertOwned(receipt: Receipt | null, merchantId: number): Receipt {
    if (!receipt) throw new NotFoundException('Receipt not found');
    if (receipt.merchant_id !== merchantId) {
      throw new ForbiddenException(
        'You can only access receipts from your merchant',
      );
    }
    return receipt;
  }

  private summarize(
    receipt: Receipt,
    notes: readonly ReceiptAdjustmentNote[],
  ): ReceiptAdjustmentSummaryDto {
    const totals = adjustmentTotals(receipt.grand_total, notes);
    return {
      receipt_id: receipt.id,
      invoice_number: receipt.invoice_number ?? null,
      currency: receipt.currency,
      is_locked: receipt.is_locked === true,
      grand_total: centsToNumber(totals.grandTotal),
      credited_total: centsToNumber(totals.credited),
      debited_total: centsToNumber(totals.debited),
      net_total: centsToNumber(totals.net),
      available_credit: centsToNumber(totals.grandTotal - totals.credited),
      notes_count: notes.length,
    };
  }

  private toDto(note: ReceiptAdjustmentNote): AdjustmentNoteDto {
    return {
      id: note.id,
      receipt_id: note.receipt_id,
      merchant_id: note.merchant_id,
      note_type: note.note_type,
      note_number: note.note_number,
      original_invoice_number: note.original_invoice_number ?? null,
      adjustment_amount: centsToNumber(toCents(note.adjustment_amount)),
      signed_amount: signedAdjustment(note),
      resulting_net_amount: centsToNumber(toCents(note.resulting_net_amount)),
      currency: note.currency,
      reason_code: note.reason_code,
      processed_by_user_id: note.processed_by_user_id,
      processed_by_role: note.processed_by_role,
      created_at: note.created_at,
    };
  }
}
