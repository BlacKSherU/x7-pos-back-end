import { Module } from '@nestjs/common';
import { QRCodeModule } from './qr-code/qr-code.module';
import { OnlineOrderingModule } from './online-ordering-system/online-ordering.module';

@Module({
  imports: [QRCodeModule, OnlineOrderingModule],
  exports: [QRCodeModule, OnlineOrderingModule],
})
export class CommerceModule {}
