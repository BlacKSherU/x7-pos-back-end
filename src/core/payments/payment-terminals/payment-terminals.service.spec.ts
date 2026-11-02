/* eslint-disable @typescript-eslint/unbound-method */
import { Repository } from 'typeorm';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { CashDrawer } from 'src/restaurant-operations/cashdrawer/cash-drawers/entities/cash-drawer.entity';
import { PaymentTerminalsService } from './payment-terminals.service';
import { PaymentTerminal } from './entities/payment-terminal.entity';
import { MerchantPaymentConfig } from '../merchant-payment-configs/entities/merchant-payment-config.entity';
import { PaymentProvider } from '../constants/payment-provider.enum';

const admin: AuthenticatedUser = {
  id: 1,
  email: 'admin@acme.com',
  role: UserRole.MERCHANT_ADMIN,
  scope: Scope.MERCHANT_WEB,
  merchant: { id: 10, companyId: 1 },
};

describe('PaymentTerminalsService', () => {
  let terminalRepository: jest.Mocked<
    Pick<
      Repository<PaymentTerminal>,
      'save' | 'findOne' | 'update' | 'findAndCount' | 'delete'
    >
  >;
  let configRepository: { findOne: jest.Mock };
  let merchantRepository: { exists: jest.Mock };
  let cashDrawerRepository: { exists: jest.Mock };
  let service: PaymentTerminalsService;
  let config: Partial<MerchantPaymentConfig>;

  beforeEach(() => {
    config = {
      id: 7,
      company_id: 1,
      merchant_id: null,
      provider: PaymentProvider.CARDPOINTE,
      is_active: true,
    };
    terminalRepository = {
      save: jest.fn((row) => Promise.resolve({ ...row, id: 3 })) as never,
      findOne: jest.fn(() =>
        Promise.resolve({
          id: 3,
          company_id: 1,
          merchant_id: 10,
          payment_config_id: 7,
          cash_drawer_id: null,
          name: 'Front',
          model: null,
          device_identifier: 'C032UQ03960231',
          is_active: true,
          paymentConfig: config,
        }),
      ) as never,
      update: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      delete: jest.fn(),
    };
    configRepository = { findOne: jest.fn(() => Promise.resolve(config)) };
    merchantRepository = { exists: jest.fn().mockResolvedValue(true) };
    cashDrawerRepository = { exists: jest.fn().mockResolvedValue(true) };
    service = new PaymentTerminalsService(
      terminalRepository as unknown as Repository<PaymentTerminal>,
      configRepository as unknown as Repository<MerchantPaymentConfig>,
      merchantRepository as unknown as Repository<Merchant>,
      cashDrawerRepository as unknown as Repository<CashDrawer>,
    );
  });

  const dto = {
    merchantId: 10,
    paymentConfigId: 7,
    name: 'Front counter',
    deviceIdentifier: 'C032UQ03960231',
  };

  it('binds the hardware to an active config of the company', async () => {
    const result = await service.create(1, { ...dto, cashDrawerId: 2 }, admin);
    expect(configRepository.findOne).toHaveBeenCalledWith({
      where: { id: 7, company_id: 1 },
    });
    expect(cashDrawerRepository.exists).toHaveBeenCalledWith({
      where: { id: 2, merchant_id: 10 },
    });
    expect(terminalRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_config_id: 7,
        cash_drawer_id: 2,
        device_identifier: 'C032UQ03960231',
      }),
    );
    expect(result.data.provider).toBe(PaymentProvider.CARDPOINTE);
  });

  it('rejects a payment config that does not exist', async () => {
    configRepository.findOne.mockResolvedValueOnce(null);
    await expect(service.create(1, dto, admin)).rejects.toThrow(
      'Payment config 7 not found',
    );
    expect(terminalRepository.save).not.toHaveBeenCalled();
  });

  it('rejects an inactive payment config', async () => {
    config.is_active = false;
    await expect(service.create(1, dto, admin)).rejects.toThrow(
      'Payment config 7 is inactive; activate it before binding terminals',
    );
  });

  it('rejects a config limited to another branch', async () => {
    config.merchant_id = 99;
    await expect(service.create(1, dto, admin)).rejects.toThrow(
      'Payment config 7 is limited to merchant 99',
    );
  });

  it('checks the identifier against the provider: Stripe needs a reader ID', async () => {
    config.provider = PaymentProvider.STRIPE;
    await expect(service.create(1, dto, admin)).rejects.toThrow(
      "deviceIdentifier must be a Stripe Terminal reader ID starting with 'tmr_'",
    );
    await expect(
      service.create(
        1,
        { ...dto, deviceIdentifier: 'tmr_FDOt2wlRZEdpd7' },
        admin,
      ),
    ).resolves.toBeDefined();
  });

  it('rejects a register of another branch', async () => {
    cashDrawerRepository.exists.mockResolvedValueOnce(false);
    await expect(
      service.create(1, { ...dto, cashDrawerId: 4 }, admin),
    ).rejects.toThrow('Cash drawer 4 is not a register of merchant 10');
  });

  it('maps a duplicate device to 409', async () => {
    terminalRepository.save.mockRejectedValueOnce({ code: '23505' });
    await expect(service.create(1, dto, admin)).rejects.toThrow(
      'This device is already registered on the payment config',
    );
  });

  it('re-checks the config when the terminal is rebound', async () => {
    configRepository.findOne.mockResolvedValueOnce({
      ...config,
      id: 8,
      is_active: false,
    });
    await expect(
      service.update(1, 3, { paymentConfigId: 8 }, admin),
    ).rejects.toThrow('Payment config 8 is inactive');
    expect(terminalRepository.update).not.toHaveBeenCalled();
  });

  it('locks branch users to their own merchant when listing', async () => {
    await service.findAll(
      1,
      {},
      { ...admin, role: UserRole.MERCHANT_USER, scope: Scope.MERCHANT_ANDROID },
    );
    expect(terminalRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { company_id: 1, merchant_id: 10 },
      }),
    );
  });
});
