import {
  Controller,
  Post,
  Body,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Request as ExpressRequest } from 'express';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { KitchenOrderService } from './kitchen-order.service';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };

@ApiTags('Kitchen Orders (Dev Simulator)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('kitchen-orders')
export class KitchenOrderSimulatorController {
  constructor(
    private readonly kitchenOrderService: KitchenOrderService,
    private readonly dataSource: DataSource,
  ) {}

  @Post('reset-test-data')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Isolated dev simulator: Reset and re-seed KDS test data',
    description:
      'Separate developer testing controller. Delete this file to remove KDS simulator from backend.',
  })
  async resetTestData(
    @Request() _req: AuthenticatedRequest,
    @Body()
    body?: {
      mode?: 'seed' | 'clear' | 'simple' | 'multi' | 'multi2' | 'allergy';
    },
  ) {
    const mode = body?.mode || 'seed';

    if (mode === 'clear') {
      await this.dataSource.query(
        `TRUNCATE TABLE kitchen_event_log, kitchen_order_item, kitchen_order RESTART IDENTITY CASCADE;`,
      );
      return {
        success: true,
        message: 'All kitchen orders cleared successfully',
      };
    }

    const filename =
      mode === 'simple'
        ? 'seed-simple-orders.sql'
        : mode === 'multi'
          ? 'seed-multi-orders.sql'
          : mode === 'multi2'
            ? 'seed-multi2-orders.sql'
            : mode === 'allergy'
              ? 'seed-allergy-orders.sql'
              : 'seed-test-orders.sql';

    const possiblePaths = [
      path.resolve(process.cwd(), `scripts/${filename}`),
      path.resolve(__dirname, `../../../../../../scripts/${filename}`),
      path.resolve(__dirname, `../../../../../scripts/${filename}`),
      `/home/rafac183/x7pos/x7-pos-back-end/scripts/${filename}`,
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        const sql = fs.readFileSync(p, 'utf8');
        await this.dataSource.query(sql);
        return {
          success: true,
          message:
            mode === 'simple'
              ? '2 simple test orders reseeded successfully (Smash Burger + Iced Latte)'
              : mode === 'multi'
                ? '1 multi-course order reseeded successfully (Appetizer, Beverage, Main, Dessert)'
                : mode === 'multi2'
                  ? '2 multi-course orders reseeded successfully (Appetizer, Beverage, Main, Dessert)'
                  : mode === 'allergy'
                    ? '3 allergy and modifier test orders reseeded successfully (Severe Allergy, Celiac/Vegan, Color Badges)'
                    : '8 test orders reseeded successfully with full multi-course pacing',
        };
      }
    }

    throw new BadRequestException(`Seed script ${filename} not found`);
  }
}
