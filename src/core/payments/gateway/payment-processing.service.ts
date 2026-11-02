import { Injectable } from '@nestjs/common';
import { MerchantPaymentConfigsService } from '../merchant-payment-configs/merchant-payment-configs.service';
import { PaymentTerminalsService } from '../payment-terminals/payment-terminals.service';
import { PaymentAdapterFactory } from './payment-adapter.factory';
import {
  ChargeRequest,
  IPaymentGateway,
  RefundRequest,
  TerminalPaymentRequest,
  VoidRequest,
} from './payment-gateway.interface';
import { PaymentResultDto } from './dto/payment-result.dto';

/**
 * Motor de pagos: elige la configuración (la indicada o la de por defecto de la empresa),
 * pide el adaptador a la fábrica y opera solo a través de IPaymentGateway.
 */
@Injectable()
export class PaymentProcessingService {
  constructor(
    private readonly configsService: MerchantPaymentConfigsService,
    private readonly terminalsService: PaymentTerminalsService,
    private readonly adapterFactory: PaymentAdapterFactory,
  ) {}

  async charge(
    companyId: number,
    request: ChargeRequest,
    paymentConfigId?: number,
  ): Promise<PaymentResultDto> {
    const gateway = await this.gatewayFor(companyId, paymentConfigId);
    return gateway.charge(request);
  }

  /** Cobra en el terminal registrado, por la configuración a la que está ligado. */
  async processTerminalPayment(
    companyId: number,
    terminalId: number,
    request: Omit<TerminalPaymentRequest, 'deviceIdentifier'>,
  ): Promise<PaymentResultDto> {
    const route = await this.terminalsService.resolveRoute(
      companyId,
      terminalId,
    );
    const gateway = await this.gatewayFor(companyId, route.paymentConfigId);
    return gateway.processTerminalPayment({
      ...request,
      deviceIdentifier: route.deviceIdentifier,
    });
  }

  /** Devoluciones y anulaciones van por la configuración que hizo el cobro original. */
  async refund(
    companyId: number,
    paymentConfigId: number,
    request: RefundRequest,
  ): Promise<PaymentResultDto> {
    const gateway = await this.gatewayFor(companyId, paymentConfigId);
    return gateway.refund(request);
  }

  async void(
    companyId: number,
    paymentConfigId: number,
    request: VoidRequest,
  ): Promise<PaymentResultDto> {
    const gateway = await this.gatewayFor(companyId, paymentConfigId);
    return gateway.void(request);
  }

  private async gatewayFor(
    companyId: number,
    paymentConfigId?: number,
  ): Promise<IPaymentGateway> {
    const config = await this.configsService.resolveGatewayConfig(
      companyId,
      paymentConfigId,
    );
    return this.adapterFactory.create(config);
  }
}
