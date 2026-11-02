import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { GetReservationsQueryDto } from './dto/get-reservations-query.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { OneReservationResponse } from './dto/reservation-response.dto';
import { AllPaginatedReservations } from './dto/all-paginated-reservations.dto';

@ApiTags('Restaurant operations - Reservations - Reservation')
@ApiBearerAuth()
@Controller('reservation')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.RESERVATIONS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Create a new reservation' })
  @ApiResponse({ status: 201, type: OneReservationResponse })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createReservationDto: CreateReservationDto,
  ): Promise<OneReservationResponse> {
    const merchantId = user.merchant.id;
    // El id del miembro del personal que toma la reserva sale del token, no del cuerpo:
    // así `created_by` audita de verdad quién la creó.
    return this.reservationService.create(
      merchantId,
      createReservationDto,
      user.id,
    );
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Get all reservations with pagination and filters' })
  @ApiResponse({ status: 200, type: AllPaginatedReservations })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetReservationsQueryDto,
  ): Promise<AllPaginatedReservations> {
    const merchantId = user.merchant.id;
    return this.reservationService.findAll(query, merchantId);
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Get a reservation by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: OneReservationResponse })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneReservationResponse> {
    const merchantId = user.merchant.id;
    return this.reservationService.findOne(id, merchantId);
  }

  @Patch(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Update a reservation' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: OneReservationResponse })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReservationDto: UpdateReservationDto,
  ): Promise<OneReservationResponse> {
    const merchantId = user.merchant.id;
    return this.reservationService.update(
      id,
      merchantId,
      updateReservationDto,
      user.id,
    );
  }

  @Patch(':id/cancel')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Cancel a reservation' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: OneReservationResponse })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const merchantId = user.merchant.id;
    return this.reservationService.cancel(id, merchantId, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Cancel a reservation' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: OneReservationResponse })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneReservationResponse> {
    const merchantId = user.merchant.id;
    return this.reservationService.remove(id, merchantId);
  }
}
