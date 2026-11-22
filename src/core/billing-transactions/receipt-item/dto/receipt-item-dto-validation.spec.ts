import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { CreateReceiptItemDto } from './create-receipt-item.dto';
import { UpdateReceiptItemDto } from './update-receipt-item.dto';
import { GetReceiptItemsQueryDto } from './get-receipt-items-query.dto';

/**
 * Same options as the global pipe (src/app.setup.ts): the precision checks of the DTOs
 * have to reject the request before it reaches the service, otherwise Postgres would
 * silently round 1.255 to 1.26 in the decimal(…,2) columns.
 */
describe('ReceiptItem DTO validation', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
  const bodyOf = (metatype: ArgumentMetadata['metatype']): ArgumentMetadata => ({
    type: 'body',
    metatype,
  });

  const validCreate = {
    receiptId: 10,
    name: 'Burger Combo',
    quantity: 2,
    unitPrice: 12.5,
    discountAmount: 2.5,
  };

  it('accepts a valid create payload', async () => {
    await expect(
      pipe.transform(validCreate, bodyOf(CreateReceiptItemDto)),
    ).resolves.toBeInstanceOf(CreateReceiptItemDto);
  });

  it.each([
    ['quantity with 3 decimals', { quantity: 1.255 }],
    ['unitPrice with 3 decimals', { unitPrice: 9.999 }],
    ['discountAmount with 3 decimals', { discountAmount: 0.001 }],
    ['quantity 0', { quantity: 0 }],
    ['negative unitPrice', { unitPrice: -1 }],
    ['negative discountAmount', { discountAmount: -0.5 }],
    ['quantity over decimal(10,2)', { quantity: 100_000_000 }],
    ['client-provided subtotal', { subtotal: 25 }],
    ['client-provided total', { total: 1 }],
  ])('rejects create with %s', async (_label, patch) => {
    await expect(
      pipe.transform({ ...validCreate, ...patch }, bodyOf(CreateReceiptItemDto)),
    ).rejects.toThrow(BadRequestException);
  });

  describe('list filters (query string)', () => {
    const queryOf: ArgumentMetadata = {
      type: 'query',
      metatype: GetReceiptItemsQueryDto,
    };

    it("keeps isActive='false' as the string 'false' (no Boolean('false') === true trap)", async () => {
      const result = (await pipe.transform(
        { isActive: 'false', receiptId: '10', search: 'burger', sku: 'SKU-001' },
        queryOf,
      )) as GetReceiptItemsQueryDto;
      expect(result.isActive).toBe('false');
      expect(result.receiptId).toBe(10);
      expect(result.search).toBe('burger');
    });

    it.each(['true', 'false', 'all'])('accepts isActive=%s', async (value) => {
      await expect(
        pipe.transform({ isActive: value }, queryOf),
      ).resolves.toBeDefined();
    });

    it('rejects an unknown isActive value', async () => {
      await expect(
        pipe.transform({ isActive: 'maybe' }, queryOf),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('accepts a partial update with amounts, sku null and isActive', async () => {
    const result = (await pipe.transform(
      { quantity: 3, unitPrice: 10.25, sku: null, isActive: false },
      bodyOf(UpdateReceiptItemDto),
    )) as UpdateReceiptItemDto;
    expect(result.quantity).toBe(3);
    expect(result.sku).toBeNull();
    expect(result.isActive).toBe(false);
  });

  it.each([
    ['quantity with 3 decimals', { quantity: 0.333 }],
    ['blank name', { name: '' }],
    ['receiptId (cannot move a line between receipts)', { receiptId: 11 }],
  ])('rejects update with %s', async (_label, body) => {
    await expect(
      pipe.transform(body, bodyOf(UpdateReceiptItemDto)),
    ).rejects.toThrow(BadRequestException);
  });
});
