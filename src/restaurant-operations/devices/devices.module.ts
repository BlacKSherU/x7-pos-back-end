import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MerchantDevice } from './entities/merchant-device.entity';
import { DevicePairingCode } from './entities/device-pairing-code.entity';
import { User } from '../../platform-saas/users/entities/user.entity';
import { KitchenStation } from '../kitchen-display-system/kitchen-station/entities/kitchen-station.entity';
import { Merchant } from '../../platform-saas/merchants/entities/merchant.entity';
import { AuthModule } from '../../auth/auth.module';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MerchantDevice,
      DevicePairingCode,
      User,
      KitchenStation,
      Merchant,
    ]),
    AuthModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
