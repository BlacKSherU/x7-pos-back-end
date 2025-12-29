import { Injectable } from '@nestjs/common';
import { CreateLoyaltyRewardDto } from './dto/create-loyalty-reward.dto';
import { UpdateLoyaltyRewardDto } from './dto/update-loyalty-reward.dto';

@Injectable()
export class LoyaltyRewardService {
  create(createLoyaltyRewardDto: CreateLoyaltyRewardDto) {
    return 'This action adds a new loyaltyReward';
  }

  findAll() {
    return `This action returns all loyaltyReward`;
  }

  findOne(id: number) {
    return `This action returns a #${id} loyaltyReward`;
  }

  update(id: number, updateLoyaltyRewardDto: UpdateLoyaltyRewardDto) {
    return `This action updates a #${id} loyaltyReward`;
  }

  remove(id: number) {
    return `This action removes a #${id} loyaltyReward`;
  }
}
