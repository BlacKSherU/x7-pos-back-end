import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateSaasCompanyProfileDto } from './dtos/update-saas-company-profile.dto';
import { UpdateSaasMerchantDto } from './dtos/update-saas-merchant.dto';
import { QuerySaasCompaniesDto } from './dtos/query-saas-companies.dto';
import { QuerySaasMerchantsDto } from './dtos/query-saas-merchants.dto';
import { QuerySaasMerchantUsersDto } from './dtos/query-saas-merchant-users.dto';
import { QuerySaasMerchantTerminalsDto } from './dtos/query-saas-merchant-terminals.dto';
import { SUPPORTED_CURRENCIES } from './constants/supported-currencies';

type Ctor<T> = new () => T;

/** Same transformation as the global ValidationPipe (implicit conversion on). */
async function check<T extends object>(cls: Ctor<T>, plain: object) {
  const dto = plainToInstance(cls, plain, { enableImplicitConversion: true });
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { dto, failed: errors.map((e) => e.property) };
}

describe('SaaS admin DTOs', () => {
  describe('UpdateSaasCompanyProfileDto', () => {
    it('accepts an empty body and a full valid body', async () => {
      expect((await check(UpdateSaasCompanyProfileDto, {})).failed).toEqual([]);
      const { failed, dto } = await check(UpdateSaasCompanyProfileDto, {
        legalName: '  Acme Holdings LLC ',
        commercialName: 'Acme',
        taxId: '12-3456789',
        email: 'billing@acme.com',
        phone: '+1 (555) 123-4567',
        address: '1 Main St',
        city: 'Miami',
        state: 'Florida',
        country: 'USA',
        baseCurrency: 'EUR',
        status: 'suspended',
      });
      expect(failed).toEqual([]);
      expect(dto.legalName).toBe('Acme Holdings LLC');
    });

    it('rejects empty or null mandatory fields', async () => {
      const { failed } = await check(UpdateSaasCompanyProfileDto, {
        legalName: '   ',
        commercialName: null,
        taxId: '',
        baseCurrency: null,
        status: null,
      });
      expect(failed.sort()).toEqual(
        [
          'baseCurrency',
          'commercialName',
          'legalName',
          'status',
          'taxId',
        ].sort(),
      );
    });

    it('enforces lengths: legalName <= 150, commercialName <= 100', async () => {
      expect(
        (
          await check(UpdateSaasCompanyProfileDto, {
            legalName: 'a'.repeat(150),
          })
        ).failed,
      ).toEqual([]);
      const { failed } = await check(UpdateSaasCompanyProfileDto, {
        legalName: 'a'.repeat(151),
        commercialName: 'b'.repeat(101),
      });
      expect(failed.sort()).toEqual(['commercialName', 'legalName']);
    });

    it.each(['12-3456789', 'B12345678', '76.123.456-7', 'RFC ABC123'])(
      'accepts tax id %s',
      async (taxId) => {
        expect(
          (await check(UpdateSaasCompanyProfileDto, { taxId })).failed,
        ).toEqual([]);
      },
    );

    it.each(['ABCDEF', '-123', '12_34', 'x'.repeat(49) + '1-'])(
      'rejects tax id %s',
      async (taxId) => {
        expect(
          (await check(UpdateSaasCompanyProfileDto, { taxId })).failed,
        ).toEqual(['taxId']);
      },
    );

    it('supports the full ISO 4217 list, not a handful of currencies', () => {
      expect(SUPPORTED_CURRENCIES.length).toBeGreaterThanOrEqual(170);
      expect(new Set(SUPPORTED_CURRENCIES).size).toBe(
        SUPPORTED_CURRENCIES.length,
      );
      for (const code of ['JPY', 'CHF', 'CNY', 'INR', 'ZAR', 'SEK', 'KRW']) {
        expect(SUPPORTED_CURRENCIES).toContain(code);
      }
      // every code is 3 upper-case letters and sorted (the back office lists them in order)
      expect(SUPPORTED_CURRENCIES.every((c) => /^[A-Z]{3}$/.test(c))).toBe(
        true,
      );
      expect([...SUPPORTED_CURRENCIES].sort()).toEqual([
        ...SUPPORTED_CURRENCIES,
      ]);
      // codes that are not money stay out
      expect(SUPPORTED_CURRENCIES).not.toContain('XXX');
      expect(SUPPORTED_CURRENCIES).not.toContain('XTS');
    });

    it('only takes upper-case supported ISO 4217 codes', async () => {
      for (const code of SUPPORTED_CURRENCIES) {
        expect(
          (await check(UpdateSaasCompanyProfileDto, { baseCurrency: code }))
            .failed,
        ).toEqual([]);
      }
      for (const code of ['usd', 'jpy', 'US', 'XYZ', 'XXX', 'USDT', 'HRK']) {
        expect(
          (await check(UpdateSaasCompanyProfileDto, { baseCurrency: code }))
            .failed,
        ).toEqual(['baseCurrency']);
      }
    });

    it('clears optional contact fields with an empty string, validates them otherwise', async () => {
      const cleared = await check(UpdateSaasCompanyProfileDto, {
        email: '',
        phone: ' ',
        city: '',
      });
      expect(cleared.failed).toEqual([]);
      expect(cleared.dto).toMatchObject({
        email: null,
        phone: null,
        city: null,
      });

      const { failed } = await check(UpdateSaasCompanyProfileDto, {
        email: 'not-an-email',
        phone: 'abc',
        status: 'closed',
      });
      expect(failed.sort()).toEqual(['email', 'phone', 'status']);
    });

    it('rejects unknown fields (forbidNonWhitelisted)', async () => {
      const { failed } = await check(UpdateSaasCompanyProfileDto, {
        name: 'Acme',
        tax_id: '12-3456789',
      });
      expect(failed.sort()).toEqual(['name', 'tax_id']);
    });
  });

  describe('UpdateSaasMerchantDto', () => {
    it('accepts a valid partial body', async () => {
      const { failed } = await check(UpdateSaasMerchantDto, {
        name: 'Downtown Bistro',
        timezone: 'America/New_York',
        status: 'inactive',
        email: '',
      });
      expect(failed).toEqual([]);
    });

    it('rejects empty name, long name, bad time zone and status', async () => {
      expect((await check(UpdateSaasMerchantDto, { name: '' })).failed).toEqual(
        ['name'],
      );
      expect(
        (await check(UpdateSaasMerchantDto, { name: null })).failed,
      ).toEqual(['name']);
      expect(
        (await check(UpdateSaasMerchantDto, { name: 'a'.repeat(101) })).failed,
      ).toEqual(['name']);
      const { failed } = await check(UpdateSaasMerchantDto, {
        timezone: 'Mars/Olympus',
        status: 'closed',
        address: '',
        companyId: 2,
      });
      expect(failed.sort()).toEqual([
        'address',
        'companyId',
        'status',
        'timezone',
      ]);
    });
  });

  describe('query DTOs', () => {
    it('converts and validates the companies filters', async () => {
      const ok = await check(QuerySaasCompaniesDto, {
        search: ' acme ',
        status: 'active',
        tier: '2',
        page: '3',
        limit: '20',
      });
      expect(ok.failed).toEqual([]);
      expect(ok.dto).toMatchObject({
        search: 'acme',
        tier: 2,
        page: 3,
        limit: 20,
      });

      const bad = await check(QuerySaasCompaniesDto, {
        status: 'deleted',
        tier: 'pro',
        page: '0',
        limit: '101',
      });
      expect(bad.failed.sort()).toEqual(['limit', 'page', 'status', 'tier']);
    });

    it('treats a blank search as no search', async () => {
      const { dto, failed } = await check(QuerySaasMerchantsDto, {
        search: '  ',
        city: '',
      });
      expect(failed).toEqual([]);
      expect(dto.search).toBeNull();
      expect(dto.city).toBeNull();
    });

    it('validates the merchant and user status filters', async () => {
      expect(
        (await check(QuerySaasMerchantsDto, { status: 'gone' })).failed,
      ).toEqual(['status']);
      expect(
        (await check(QuerySaasMerchantUsersDto, { status: 'active' })).failed,
      ).toEqual([]);
      expect(
        (await check(QuerySaasMerchantUsersDto, { status: 'banned' })).failed,
      ).toEqual(['status']);
    });

    it('validates the terminal filters', async () => {
      const ok = await check(QuerySaasMerchantTerminalsDto, {
        search: ' bolt ',
        status: 'inactive',
      });
      expect(ok.failed).toEqual([]);
      expect(ok.dto).toMatchObject({ search: 'bolt', status: 'inactive' });
      expect(
        (await check(QuerySaasMerchantTerminalsDto, { search: '   ' })).dto
          .search,
      ).toBeNull();
      const bad = await check(QuerySaasMerchantTerminalsDto, {
        status: 'broken',
        search: 'x'.repeat(101),
        provider: 'stripe',
      });
      expect(bad.failed.sort()).toEqual(['provider', 'search', 'status']);
    });
  });
});
