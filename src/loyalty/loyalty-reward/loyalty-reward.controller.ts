import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LoyaltyRewardService } from './loyalty-reward.service';
import { CreateLoyaltyRewardDto } from './dto/create-loyalty-reward.dto';
import { UpdateLoyaltyRewardDto } from './dto/update-loyalty-reward.dto';

@Controller('loyalty-reward')
export class LoyaltyRewardController {
  constructor(private readonly loyaltyRewardService: LoyaltyRewardService) {}

  @Post()
  create(@Body() createLoyaltyRewardDto: CreateLoyaltyRewardDto) {
    return this.loyaltyRewardService.create(createLoyaltyRewardDto);
  }

  @Get()
  findAll() {
    return this.loyaltyRewardService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.loyaltyRewardService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLoyaltyRewardDto: UpdateLoyaltyRewardDto) {
    return this.loyaltyRewardService.update(+id, updateLoyaltyRewardDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.loyaltyRewardService.remove(+id);
  }
}
