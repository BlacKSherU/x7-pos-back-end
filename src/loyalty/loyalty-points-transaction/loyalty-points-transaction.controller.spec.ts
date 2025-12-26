import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyPointsTransactionController } from './loyalty-points-transaction.controller';
import { LoyaltyPointsTransactionService } from './loyalty-points-transaction.service';

describe('LoyaltyPointsTransactionController', () => {
  let controller: LoyaltyPointsTransactionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoyaltyPointsTransactionController],
      providers: [LoyaltyPointsTransactionService],
    }).compile();

    controller = module.get<LoyaltyPointsTransactionController>(LoyaltyPointsTransactionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
