import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAdjustmentNoteDto } from './create-adjustment-note.dto';

const errorsFor = async (body: Record<string, unknown>) =>
  (await validate(plainToInstance(CreateAdjustmentNoteDto, body))).map(
    (error) => error.property,
  );

describe('CreateAdjustmentNoteDto (Historia 7)', () => {
  const valid = {
    noteType: 'CREDIT_NOTE',
    adjustmentAmount: 25.5,
    reasonCode: 'PARTIAL_RETURN',
  };

  it('accepts a complete note', async () => {
    await expect(errorsFor(valid)).resolves.toEqual([]);
  });

  it('requires note_type, adjustment_amount and reason_code', async () => {
    await expect(errorsFor({})).resolves.toEqual([
      'noteType',
      'adjustmentAmount',
      'reasonCode',
    ]);
  });

  it('rejects unknown types / reasons, non-positive amounts and more than 2 decimals', async () => {
    await expect(errorsFor({ ...valid, noteType: 'REFUND' })).resolves.toEqual([
      'noteType',
    ]);
    await expect(
      errorsFor({ ...valid, reasonCode: 'WHATEVER' }),
    ).resolves.toEqual(['reasonCode']);
    for (const adjustmentAmount of [0, -5, 1.234, '10']) {
      await expect(errorsFor({ ...valid, adjustmentAmount })).resolves.toEqual([
        'adjustmentAmount',
      ]);
    }
  });
});
