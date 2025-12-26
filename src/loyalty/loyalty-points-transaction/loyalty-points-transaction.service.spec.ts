import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyPointsTransactionService } from './loyalty-points-transaction.service';

describe('LoyaltyPointsTransactionService', () => {
  let service: LoyaltyPointsTransactionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoyaltyPointsTransactionService],
    }).compile();

    service = module.get<LoyaltyPointsTransactionService>(LoyaltyPointsTransactionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
