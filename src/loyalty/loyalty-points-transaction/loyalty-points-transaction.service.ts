import { Injectable } from '@nestjs/common';
import { CreateLoyaltyPointsTransactionDto } from './dto/create-loyalty-points-transaction.dto';
import { UpdateLoyaltyPointsTransactionDto } from './dto/update-loyalty-points-transaction.dto';

@Injectable()
export class LoyaltyPointsTransactionService {
  create(createLoyaltyPointsTransactionDto: CreateLoyaltyPointsTransactionDto) {
    return 'This action adds a new loyaltyPointsTransaction';
  }

  findAll() {
    return `This action returns all loyaltyPointsTransaction`;
  }

  findOne(id: number) {
    return `This action returns a #${id} loyaltyPointsTransaction`;
  }

  update(id: number, updateLoyaltyPointsTransactionDto: UpdateLoyaltyPointsTransactionDto) {
    return `This action updates a #${id} loyaltyPointsTransaction`;
  }

  remove(id: number) {
    return `This action removes a #${id} loyaltyPointsTransaction`;
  }
}
