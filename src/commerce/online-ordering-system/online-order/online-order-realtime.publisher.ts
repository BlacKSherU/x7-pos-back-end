import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { OnlineOrderResponseDto } from './dto/online-order-response.dto';

export const ONLINE_ORDER_UPDATED_EVENT = 'online-order.updated';

export interface OnlineOrderUpdatedPayload {
  onlineOrderId: number;
  orderId: number | null;
  data: OnlineOrderResponseDto;
}

/**
 * Contrato de tiempo real: emite eventos en proceso. Sustituir/adaptar el
 * transporte (WebSocket, SSE, etc.) sin cambiar los productores de dominio.
 */
@Injectable()
export class OnlineOrderRealtimePublisher {
  private readonly logger = new Logger(OnlineOrderRealtimePublisher.name);
  readonly emitter = new EventEmitter();

  publishUpdated(payload: OnlineOrderUpdatedPayload): void {
    this.logger.debug(
      `online-order.updated id=${payload.onlineOrderId} orderId=${payload.orderId}`,
    );
    this.emitter.emit(ONLINE_ORDER_UPDATED_EVENT, payload);
  }
}
