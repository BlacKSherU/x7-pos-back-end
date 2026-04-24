import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Location } from './entities/location.entity';
import { Item } from '../items/entities/item.entity';
import { ItemsModule } from '../items/items.module';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([Location, Merchant, Item]),
    forwardRef(() => ItemsModule),
  ],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
