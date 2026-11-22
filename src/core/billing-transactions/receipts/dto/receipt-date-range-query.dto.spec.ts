import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { GetReceiptsQueryDto } from './get-receipts-query.dto';
import { GetReceiptsSummaryQueryDto } from './get-receipts-summary-query.dto';

/** Mismas opciones que el ValidationPipe global (whitelist + conversión implícita). */
async function errorsOf(
  cls: typeof GetReceiptsQueryDto | typeof GetReceiptsSummaryQueryDto,
  query: Record<string, unknown>,
): Promise<string[]> {
  const dto = plainToInstance(cls, query, { enableImplicitConversion: true });
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.map((error) => error.property);
}

describe('Receipt date range query (Historia 13)', () => {
  it.each([GetReceiptsQueryDto, GetReceiptsSummaryQueryDto])(
    '%p accepts YYYY-MM-DD dates and an open range',
    async (cls) => {
      expect(
        await errorsOf(cls, { dateFrom: '2026-11-01', dateTo: '2026-11-30' }),
      ).toEqual([]);
      expect(await errorsOf(cls, { dateFrom: '2026-02-28' })).toEqual([]);
      expect(await errorsOf(cls, {})).toEqual([]);
    },
  );

  it.each([GetReceiptsQueryDto, GetReceiptsSummaryQueryDto])(
    '%p rejects timestamps, other formats and impossible dates',
    async (cls) => {
      expect(await errorsOf(cls, { dateFrom: '2026-11-01T10:00:00Z' })).toEqual(
        ['dateFrom'],
      );
      expect(await errorsOf(cls, { dateTo: '01/11/2026' })).toEqual(['dateTo']);
      expect(await errorsOf(cls, { dateTo: '2026-02-30' })).toEqual(['dateTo']);
    },
  );
});
