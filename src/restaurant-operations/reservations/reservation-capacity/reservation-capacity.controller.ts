import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { ReservationCapacityService } from './reservation-capacity.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { UpdateReservationSettingsDto } from './dto/update-reservation-settings.dto';

const SETTINGS_EXAMPLE = {
  statusCode: 200,
  message: 'Reservation capacity settings retrieved successfully',
  data: {
    seat_capacity: null,
    effective_seat_capacity: 64,
    capacity_source: 'tables',
    slot_interval_minutes: 15,
    max_covers_per_slot: 20,
    shifts: [
      { name: 'Lunch', start: '12:00', end: '16:00' },
      { name: 'Dinner', start: '19:00', end: '23:00' },
    ],
    updated_at: '2026-04-16T10:00:00.000Z',
  },
};

@ApiTags('Restaurant operations - Reservations - Capacity')
@ApiBearerAuth()
@Controller('reservation-capacity')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.RESERVATIONS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class ReservationCapacityController {
  constructor(private readonly capacityService: ReservationCapacityService) {}

  @Get('availability')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary: 'Slot availability matrix for a service day',
    description:
      'Every slot of every service shift evaluated for a party of `party_size` staying ' +
      '`duration_minutes`. `booked_seats` is the peak number of guests from CONFIRMED/SEATED ' +
      'bookings seated at the same time during that window; `level` is available (<70 %), ' +
      'limited (70–99 %) or sold_out (≥100 %, or the party does not fit / exceeds the arrival ' +
      'pacing limit). A non-bookable slot needs a manager override.',
  })
  @ApiOkResponse({
    example: {
      statusCode: 200,
      message: 'Availability retrieved successfully',
      data: {
        date: '2026-04-16',
        party_size: 4,
        duration_minutes: 90,
        seat_capacity: 64,
        capacity_source: 'tables',
        slot_interval_minutes: 15,
        max_covers_per_slot: 20,
        shifts: [
          {
            name: 'Dinner',
            start: '19:00',
            end: '23:00',
            occupancy_pct: 93.8,
            level: 'limited',
            slots: [
              {
                time: '19:00',
                start: '2026-04-16T23:00:00.000Z',
                booked_seats: 60,
                projected_seats: 64,
                occupancy_pct: 93.8,
                level: 'limited',
                arrivals: 12,
                fits_capacity: true,
                fits_throttle: true,
                bookable: true,
              },
              {
                time: '19:15',
                start: '2026-04-16T23:15:00.000Z',
                booked_seats: 62,
                projected_seats: 66,
                occupancy_pct: 96.9,
                level: 'sold_out',
                arrivals: 4,
                fits_capacity: false,
                fits_throttle: true,
                bookable: false,
              },
            ],
          },
        ],
      },
    },
  })
  @ApiBadRequestResponse({
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed',
        errors: ['date must be YYYY-MM-DD'],
        timestamp: '2026-04-16T20:55:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({
    schema: { example: { message: 'Unauthorized', statusCode: 401 } },
  })
  availability(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.capacityService.availability(user.merchant.id, query);
  }

  @Get('settings')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Capacity, pacing and service shift settings' })
  @ApiOkResponse({ example: SETTINGS_EXAMPLE })
  @ApiUnauthorizedResponse({
    schema: { example: { message: 'Unauthorized', statusCode: 401 } },
  })
  async getSettings(@CurrentUser() user: AuthenticatedUser) {
    return {
      statusCode: 200,
      message: 'Reservation capacity settings retrieved successfully',
      data: await this.capacityService.getSettings(user.merchant.id),
    };
  }

  @Put('settings')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary:
      'Update capacity, pacing and service shift settings (manager only)',
    description:
      'Omitted fields are left unchanged; null resets a field to its default.',
  })
  @ApiOkResponse({
    example: {
      ...SETTINGS_EXAMPLE,
      message: 'Reservation capacity settings updated successfully',
    },
  })
  @ApiBadRequestResponse({
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed',
        errors: [
          'slot_interval_minutes must be one of the following values: 15, 30',
        ],
        timestamp: '2026-04-16T20:55:00.000Z',
      },
    },
  })
  @ApiForbiddenResponse({
    schema: {
      example: {
        message: 'Forbidden resource',
        error: 'Forbidden',
        statusCode: 403,
      },
    },
  })
  async updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateReservationSettingsDto,
  ) {
    return {
      statusCode: 200,
      message: 'Reservation capacity settings updated successfully',
      data: await this.capacityService.updateSettings(
        user.merchant.id,
        dto,
        user.id,
      ),
    };
  }
}
