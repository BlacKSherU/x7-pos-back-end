import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyRewardService } from './loyalty-reward.service';

describe('LoyaltyRewardService', () => {
  let service: LoyaltyRewardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoyaltyRewardService],
    }).compile();

    service = module.get<LoyaltyRewardService>(LoyaltyRewardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
