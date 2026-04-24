import { Module } from '@nestjs/common';
import { DeliverySystemController } from './delivery-system.controller';
import { DeliverySystemService } from './delivery-system.service';

@Module({
  controllers: [DeliverySystemController],
  providers: [DeliverySystemService]
})
export class DeliverySystemModule {}
