import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateReceiptTaxDto } from './create-receipt-tax.dto';
import { UpdateReceiptTaxDto } from './update-receipt-tax.dto';
import { UpdateReceiptTaxStatusDto } from './update-receipt-tax-status.dto';
import { GetReceiptTaxesQueryDto } from './get-receipt-taxes-query.dto';
import { GetReceiptTaxesSummaryQueryDto } from './get-receipt-taxes-summary-query.dto';
import { ReceiptTaxScope } from '../constants/receipt-tax-scope.enum';

const messagesFor = async (cls: any, plain: object): Promise<string[]> => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const errors = await validate(plainToInstance(cls, plain), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
};

describe('ReceiptTax DTOs', () => {
  const valid = {
    receiptId: 10,
    name: 'IVA 19%',
    rate: 19.5,
    scope: ReceiptTaxScope.RECEIPT,
  };

  it('accepts a valid create payload', async () => {
    expect(await messagesFor(CreateReceiptTaxDto, valid)).toEqual([]);
  });

  it('explains the decimal(5,2) precision of the rate', async () => {
    expect(
      await messagesFor(CreateReceiptTaxDto, { ...valid, rate: 19.555 }),
    ).toContain(
      'rate must be a number with at most 2 decimal places (column precision decimal(5,2))',
    );
    expect(
      await messagesFor(CreateReceiptTaxDto, { ...valid, rate: 1000 }),
    ).toContain('rate cannot exceed 999.99 (column precision decimal(5,2))');
    expect(
      await messagesFor(CreateReceiptTaxDto, { ...valid, rate: -1 }),
    ).toContain('rate cannot be negative');
  });

  it('does not accept a client-calculated amount', async () => {
    expect(
      await messagesFor(CreateReceiptTaxDto, { ...valid, amount: 3.5 }),
    ).toContain('property amount should not exist');
  });

  it('validates the update payload', async () => {
    expect(
      await messagesFor(UpdateReceiptTaxDto, {
        rate: 7.25,
        scope: ReceiptTaxScope.ITEM,
        receiptItemId: 3,
      }),
    ).toEqual([]);
    expect(
      await messagesFor(UpdateReceiptTaxDto, { rate: 7.255 }),
    ).toContain(
      'rate must be a number with at most 2 decimal places (column precision decimal(5,2))',
    );
  });

  it('accepts the tax type and rate filters on the list and the summary', async () => {
    for (const cls of [GetReceiptTaxesQueryDto, GetReceiptTaxesSummaryQueryDto]) {
      expect(
        await messagesFor(cls, { taxName: 'IVA 19%', rate: 19.5 }),
      ).toEqual([]);
      expect(
        (await messagesFor(cls, { rate: 19.555 })).some((m) =>
          m.includes('decimal(5,2)'),
        ),
      ).toBe(true);
    }
    expect(
      await messagesFor(GetReceiptTaxesSummaryQueryDto, { status: 'all' }),
    ).toContain('property status should not exist');
  });

  it('requires a boolean isActive for the status change', async () => {
    expect(
      await messagesFor(UpdateReceiptTaxStatusDto, { isActive: false }),
    ).toEqual([]);
    expect(
      (await messagesFor(UpdateReceiptTaxStatusDto, { isActive: 'no' })).length,
    ).toBeGreaterThan(0);
  });
});
