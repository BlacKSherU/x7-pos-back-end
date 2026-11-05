import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NavCategory } from '../entities/nav-category.entity';
import { NavItem } from '../entities/nav-item.entity';
import { PlanApplication } from '../plan-applications/entity/plan-applications.entity';
import { AuthModule } from '../../../auth/auth.module';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NavCategory, NavItem, PlanApplication]),
    AuthModule,
  ],
  controllers: [NavigationController],
  providers: [NavigationService],
  exports: [NavigationService],
})
export class NavigationModule {}
