import { Injectable, NotImplementedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PaymentProvider } from '../constants/payment-provider.enum';
import { GatewayConfig, IPaymentGateway } from './payment-gateway.interface';
import { CardPointeAdapter } from './adapters/cardpointe.adapter';
import { StripeAdapter } from './adapters/stripe.adapter';

type AdapterBuilder = (
  http: HttpService,
  credentials: Record<string, string>,
) => IPaymentGateway;

// Un proveedor nuevo se suma aquí con su adaptador; nada más cambia
const ADAPTERS: Partial<Record<PaymentProvider, AdapterBuilder>> = {
  [PaymentProvider.CARDPOINTE]: (http, credentials) =>
    new CardPointeAdapter(http, credentials),
  [PaymentProvider.STRIPE]: (http, credentials) =>
    new StripeAdapter(http, credentials),
};

/** Arma, por cobro, el adaptador del proveedor de la configuración con sus credenciales. */
@Injectable()
export class PaymentAdapterFactory {
  constructor(private readonly http: HttpService) {}

  create(config: GatewayConfig): IPaymentGateway {
    const build = ADAPTERS[config.provider];
    if (!build) {
      throw new NotImplementedException(
        `Payments through ${config.provider} are not supported yet`,
      );
    }
    return build(this.http, config.credentials);
  }
}
