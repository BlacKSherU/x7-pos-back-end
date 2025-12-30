import { Injectable } from '@nestjs/common';
import { CreateLoyaltyRewardDto } from './dto/create-loyalty-reward.dto';
import { UpdateLoyaltyRewardDto } from './dto/update-loyalty-reward.dto';
import { GetLoyaltyRewardQueryDto } from './dto/get-loyalty-reward-query.dto';
import { AllPaginatedLoyaltyRewardDto } from './dto/all-paginated-loyalty-reward.dto';
import { OneLoyaltyRewardResponse } from './dto/loyalty-reward-response.dto';

@Injectable()
export class LoyaltyRewardService {
  create(
    merchantId: number,
    createLoyaltyRewardDto: CreateLoyaltyRewardDto,
  ): Promise<OneLoyaltyRewardResponse> {
    return 'This action adds a new loyaltyReward';
  }

  findAll(
    query: GetLoyaltyRewardQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedLoyaltyRewardDto> {
    return `This action returns all loyaltyReward`;
  }

  findOne(id: number, merchantId: number): Promise<OneLoyaltyRewardResponse> {
    return `This action returns a #${id} loyaltyReward`;
  }

  update(
    id: number,
    merchantId: number,
    updateLoyaltyRewardDto: UpdateLoyaltyRewardDto,
  ): Promise<OneLoyaltyRewardResponse> {
    return `This action updates a #${id} loyaltyReward`;
  }

  remove(id: number, merchantId: number): Promise<OneLoyaltyRewardResponse> {
    return `This action removes a #${id} loyaltyReward`;
  }
}
