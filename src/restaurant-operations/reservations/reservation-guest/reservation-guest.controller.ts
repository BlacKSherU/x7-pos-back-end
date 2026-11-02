import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ReservationGuestService } from './reservation-guest.service';
import { CreateReservationGuestDto } from './dto/create-reservation-guest.dto';
import { UpdateReservationGuestDto } from './dto/update-reservation-guest.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { OneReservationGuestResponse } from './dto/reservation-guest-response.dto';
import { AllPaginatedReservationGuests } from './dto/all-paginated-reservation-guests.dto';
import { GetReservationGuestsQueryDto } from './dto/get-reservation-guests-query.dto';

@ApiTags('Restaurant operations - Reservations - Guests')
@ApiBearerAuth()
@Controller('reservation-guest')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.RESERVATION_GUESTS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class ReservationGuestController {
  constructor(
    private readonly reservationGuestService: ReservationGuestService,
  ) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Add a guest to a reservation' })
  @ApiResponse({ status: 201, type: OneReservationGuestResponse })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createGuestDto: CreateReservationGuestDto,
  ): Promise<OneReservationGuestResponse> {
    return this.reservationGuestService.create(
      createGuestDto,
      user.merchant.id,
    );
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Get all guests of the merchant' })
  @ApiResponse({ status: 200, type: AllPaginatedReservationGuests })
  findAllGlobal(
    @CurrentUser() user: AuthenticatedUser,
    @Query() queryDto: GetReservationGuestsQueryDto,
  ): Promise<AllPaginatedReservationGuests> {
    return this.reservationGuestService.findAllGlobal(
      user.merchant.id,
      queryDto,
    );
  }

  @Get('by-reservation/:reservationId')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Get all guests of a reservation' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: AllPaginatedReservationGuests })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<AllPaginatedReservationGuests> {
    return this.reservationGuestService.findAll(
      reservationId,
      user.merchant.id,
      page,
      limit,
    );
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Get a guest by ID' })
  @ApiResponse({ status: 200, type: OneReservationGuestResponse })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneReservationGuestResponse> {
    return this.reservationGuestService.findOne(id, user.merchant.id);
  }

  @Patch(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Update guest details' })
  @ApiResponse({ status: 200, type: OneReservationGuestResponse })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGuestDto: UpdateReservationGuestDto,
  ): Promise<OneReservationGuestResponse> {
    return this.reservationGuestService.update(
      id,
      updateGuestDto,
      user.merchant.id,
    );
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Remove a guest from a reservation' })
  @ApiResponse({ status: 200, type: OneReservationGuestResponse })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneReservationGuestResponse> {
    return this.reservationGuestService.remove(id, user.merchant.id);
  }
}
