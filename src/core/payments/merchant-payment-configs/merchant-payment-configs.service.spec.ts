/* eslint-disable @typescript-eslint/unbound-method */
import { ConfigService } from '@nestjs/config';
import { Repository, type DataSource, type EntityManager } from 'typeorm';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { MerchantPaymentConfigsService } from './merchant-payment-configs.service';
import { MerchantPaymentConfig } from './entities/merchant-payment-config.entity';
import { CredentialsCipherService } from '../utils/credentials-cipher.service';
import {
  PaymentEnvironment,
  PaymentProvider,
} from '../constants/payment-provider.enum';

const SECRET = 'sk_test_51H8xYzAbCdEfGhIjKl1234';

const admin: AuthenticatedUser = {
  id: 1,
  email: 'admin@acme.com',
  role: UserRole.MERCHANT_ADMIN,
  scope: Scope.MERCHANT_WEB,
  merchant: { id: 10, companyId: 1 },
};

describe('MerchantPaymentConfigsService', () => {
  const cipher = new CredentialsCipherService({
    get: () => 'b'.repeat(64),
  } as unknown as ConfigService);

  let manager: jest.Mocked<
    Pick<
      EntityManager,
      'query' | 'exists' | 'update' | 'save' | 'create' | 'count'
    >
  > & { createQueryBuilder: jest.Mock };
  let configRepository: jest.Mocked<
    Pick<Repository<MerchantPaymentConfig>, 'findOne' | 'delete'>
  >;
  let service: MerchantPaymentConfigsService;
  let stored: MerchantPaymentConfig;

  beforeEach(() => {
    stored = undefined as unknown as MerchantPaymentConfig;
    manager = {
      query: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue(true),
      update: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((_entity, data) => data) as never,
      save: jest.fn((row: MerchantPaymentConfig) => {
        stored = {
          ...row,
          id: 5,
          created_at: new Date(),
          updated_at: new Date(),
        };
        return Promise.resolve(stored);
      }) as never,
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(() => ({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn(() => Promise.resolve(stored)),
      })),
    };
    configRepository = {
      findOne: jest.fn(() => Promise.resolve(stored)) as never,
      delete: jest.fn(),
    };
    const dataSource = {
      transaction: jest.fn((work: (m: EntityManager) => unknown) =>
        work(manager as unknown as EntityManager),
      ),
      manager,
    } as unknown as DataSource;
    service = new MerchantPaymentConfigsService(
      dataSource,
      configRepository as unknown as Repository<MerchantPaymentConfig>,
      cipher,
    );
  });

  /** exists(): company -> true; default config already present -> hasDefault */
  function companyWithDefault(hasDefault: boolean) {
    manager.exists.mockImplementation((entity: unknown) =>
      Promise.resolve(entity === MerchantPaymentConfig ? hasDefault : true),
    );
  }

  const createDto = {
    provider: PaymentProvider.STRIPE,
    displayName: 'Stripe main',
    credentials: { secretKey: SECRET },
  };

  it('encrypts the credentials and returns them masked', async () => {
    companyWithDefault(true);
    const result = await service.create(1, createDto, admin);

    expect(JSON.stringify(stored.credentials)).not.toContain(SECRET);
    expect(
      cipher.decrypt(stored.credentials, 'merchant_payment_config:1:stripe'),
    ).toEqual({ secretKey: SECRET });
    expect(result.data.credentials).toEqual({ secretKey: 'sk_test_****1234' });
    expect(JSON.stringify(result)).not.toContain(SECRET);
  });

  it("makes the company's first active config the default", async () => {
    companyWithDefault(false);
    const result = await service.create(1, createDto, admin);
    expect(result.data.isDefault).toBe(true);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('keeps the existing default when isDefault is omitted', async () => {
    companyWithDefault(true);
    const result = await service.create(1, createDto, admin);
    expect(result.data.isDefault).toBe(false);
  });

  it('moves the default when isDefault is true, under the company lock', async () => {
    companyWithDefault(true);
    await service.create(1, { ...createDto, isDefault: true }, admin);

    expect(manager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock($1, $2)',
      [7303, 1],
    );
    expect(manager.update).toHaveBeenCalledWith(
      MerchantPaymentConfig,
      { company_id: 1, is_default: true },
      { is_default: false },
    );
    expect(stored.is_default).toBe(true);
  });

  it('rejects an inactive default', async () => {
    await expect(
      service.create(
        1,
        { ...createDto, isActive: false, isDefault: true },
        admin,
      ),
    ).rejects.toThrow('An inactive payment config cannot be the default');
  });

  it('rejects invalid credentials before touching the database', async () => {
    await expect(
      service.create(
        1,
        { ...createDto, credentials: { secretKey: 'nope' } },
        admin,
      ),
    ).rejects.toThrow('credentials.secretKey has an invalid format');
    expect(manager.save).not.toHaveBeenCalled();
  });

  it("rejects another company's admin", async () => {
    await expect(service.create(2, createDto, admin)).rejects.toThrow(
      'You do not have access to this company',
    );
  });

  it('maps a unique violation on the default index to 409', async () => {
    companyWithDefault(false);
    manager.save.mockRejectedValueOnce({ code: '23505' });
    await expect(service.create(1, createDto, admin)).rejects.toThrow(
      'The company already has a default payment config',
    );
  });

  describe('update', () => {
    beforeEach(async () => {
      companyWithDefault(false);
      await service.create(
        1,
        {
          ...createDto,
          credentials: {
            secretKey: SECRET,
            webhookSecret: 'whsec_abc123456789xyz',
          },
        },
        admin,
      );
      manager.update.mockImplementation((_e, _w, patch) => {
        Object.assign(stored, patch);
        return Promise.resolve(undefined as never);
      });
    });

    it('merges credential changes and removes null keys', async () => {
      const result = await service.update(
        1,
        5,
        {
          credentials: {
            secretKey: 'sk_test_newKeyValue99999',
            webhookSecret: null,
          },
        },
        admin,
      );
      expect(
        cipher.decrypt(stored.credentials, 'merchant_payment_config:1:stripe'),
      ).toEqual({ secretKey: 'sk_test_newKeyValue99999' });
      expect(result.data.credentials).toEqual({
        secretKey: 'sk_test_****9999',
      });
    });

    it('re-validates the stored key when the environment changes', async () => {
      await expect(
        service.update(
          1,
          5,
          { environment: PaymentEnvironment.PRODUCTION },
          admin,
        ),
      ).rejects.toThrow('must be a live key for the production environment');
    });

    it('deactivating the default also unsets it', async () => {
      const result = await service.update(1, 5, { isActive: false }, admin);
      expect(result.data.isActive).toBe(false);
      expect(result.data.isDefault).toBe(false);
    });
  });

  it('refuses to delete a config with bound terminals', async () => {
    companyWithDefault(false);
    await service.create(1, createDto, admin);
    manager.count.mockResolvedValueOnce(2);
    await expect(service.remove(1, 5, admin)).rejects.toThrow(
      '2 terminal(s) are bound to this payment config',
    );
    expect(configRepository.delete).not.toHaveBeenCalled();
  });
});
