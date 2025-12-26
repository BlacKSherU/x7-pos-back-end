import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LoyaltyPointsTransactionService } from './loyalty-points-transaction.service';
import { CreateLoyaltyPointsTransactionDto } from './dto/create-loyalty-points-transaction.dto';
import { UpdateLoyaltyPointsTransactionDto } from './dto/update-loyalty-points-transaction.dto';

@Controller('loyalty-points-transaction')
export class LoyaltyPointsTransactionController {
  constructor(private readonly loyaltyPointsTransactionService: LoyaltyPointsTransactionService) {}

  @Post()
  create(@Body() createLoyaltyPointsTransactionDto: CreateLoyaltyPointsTransactionDto) {
    return this.loyaltyPointsTransactionService.create(createLoyaltyPointsTransactionDto);
  }

  @Get()
  findAll() {
    return this.loyaltyPointsTransactionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.loyaltyPointsTransactionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLoyaltyPointsTransactionDto: UpdateLoyaltyPointsTransactionDto) {
    return this.loyaltyPointsTransactionService.update(+id, updateLoyaltyPointsTransactionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.loyaltyPointsTransactionService.remove(+id);
  }
}
