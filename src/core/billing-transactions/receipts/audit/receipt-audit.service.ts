import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { ReceiptAuditLog } from './entities/receipt-audit-log.entity';
import {
  ReceiptAuditInput,
  buildReceiptAuditEntry,
} from './receipt-audit.util';
import { ReceiptActivityLogEventDto } from './dto/receipt-activity-log-response.dto';

/**
 * Audit trail de recibos (Historia 6): escribe un evento por cada transición del ciclo de vida
 * y devuelve el historial de un recibo en orden cronológico exacto (created_at, id).
 */
@Injectable()
export class ReceiptAuditService {
  private readonly logger = new Logger(ReceiptAuditService.name);

  constructor(
    @InjectRepository(ReceiptAuditLog)
    private readonly auditRepo: Repository<ReceiptAuditLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Registra un evento después de que la operación ya se guardó. Si la escritura del log
   * falla se registra el error y se devuelve null: la operación ya está hecha y responder 500
   * invitaría a repetirla. Los flujos transaccionales (liquidación de órdenes) guardan el
   * evento con su propio EntityManager vía buildReceiptAuditEntry.
   */
  async record(input: ReceiptAuditInput): Promise<ReceiptAuditLog | null> {
    try {
      return await this.auditRepo.save(
        buildReceiptAuditEntry(input) as ReceiptAuditLog,
      );
    } catch (error) {
      this.logger.error(
        `Could not record ${input.action} for receipt ${input.receipt.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }

  /** Eventos del recibo en orden cronológico exacto, con el nombre del usuario. */
  async findForReceipt(
    receiptId: number,
  ): Promise<ReceiptActivityLogEventDto[]> {
    const rows = await this.auditRepo.find({
      where: { receipt_id: receiptId },
      order: { created_at: 'ASC', id: 'ASC' },
    });
    const names = await this.userNames(rows);
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      user_id: row.user_id ?? null,
      user_name: row.user_id ? (names.get(row.user_id) ?? null) : null,
      role: row.role ?? null,
      previous_values: row.previous_values ?? null,
      new_values: row.new_values ?? null,
      metadata: row.metadata ?? null,
      created_at: row.created_at,
    }));
  }

  /** Username (o email) de cada usuario que aparece en los eventos. */
  private async userNames(
    rows: ReceiptAuditLog[],
  ): Promise<Map<number, string>> {
    const ids = Array.from(
      new Set(
        rows
          .map((row) => row.user_id)
          .filter((id): id is number => typeof id === 'number' && id > 0),
      ),
    );
    if (ids.length === 0) return new Map();
    const users = await this.userRepo.find({
      where: { id: In(ids) },
      select: { id: true, username: true, email: true },
    });
    return new Map(users.map((user) => [user.id, user.username || user.email]));
  }
}
