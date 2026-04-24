import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { MovementsService } from './movements.service';
import { MovementsController } from './movements.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movement } from './entities/movement.entity';
import { Item } from '../items/entities/item.entity';
import { ItemsModule } from '../items/items.module';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([Movement, Item]),
    forwardRef(() => ItemsModule),
  ],
  controllers: [MovementsController],
  providers: [MovementsService],
  exports: [MovementsService],
})
export class MovementsModule {}
