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
import { ReservationTableService } from './reservation-table.service';
import { CreateReservationTableDto } from './dto/create-reservation-table.dto';
import { UpdateReservationTableDto } from './dto/update-reservation-table.dto';
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
import { OneReservationTableResponse } from './dto/reservation-table-response.dto';
import { AllPaginatedReservationTables } from './dto/all-paginated-reservation-tables.dto';
import { GetReservationTablesQueryDto } from './dto/get-reservation-tables-query.dto';
import { BulkAssignReservationTablesDto } from './dto/bulk-assign-reservation-tables.dto';

@ApiTags('Restaurant operations - Reservations - Tables')
@ApiBearerAuth()
@Controller('reservation-table')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.RESERVATION_TABLES)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class ReservationTableController {
  constructor(
    private readonly reservationTableService: ReservationTableService,
  ) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Assign a table to a reservation' })
  @ApiResponse({ status: 201, type: OneReservationTableResponse })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createReservationTableDto: CreateReservationTableDto,
  ): Promise<OneReservationTableResponse> {
    return this.reservationTableService.create(
      createReservationTableDto,
      user.merchant.id,
    );
  }

  @Post('bulk')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary: 'Assign several tables to one reservation in a single transaction',
  })
  @ApiResponse({ status: 201, type: AllPaginatedReservationTables })
  @ApiResponse({
    status: 409,
    description: 'One of the tables is already booked during the time window',
  })
  createBulk(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkAssignReservationTablesDto,
  ): Promise<AllPaginatedReservationTables> {
    return this.reservationTableService.createBulk(dto, user.merchant.id);
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Get all reservation tables of the merchant' })
  @ApiResponse({ status: 200, type: AllPaginatedReservationTables })
  findAllGlobal(
    @CurrentUser() user: AuthenticatedUser,
    @Query() queryDto: GetReservationTablesQueryDto,
  ): Promise<AllPaginatedReservationTables> {
    return this.reservationTableService.findAllGlobal(
      user.merchant.id,
      queryDto,
    );
  }

  @Get('by-reservation/:reservationId')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Get all tables of a reservation' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: AllPaginatedReservationTables })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<AllPaginatedReservationTables> {
    return this.reservationTableService.findAll(
      reservationId,
      user.merchant.id,
      page,
      limit,
    );
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Get a reservation table assignment by ID' })
  @ApiResponse({ status: 200, type: OneReservationTableResponse })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneReservationTableResponse> {
    return this.reservationTableService.findOne(id, user.merchant.id);
  }

  @Patch(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Update a reservation table assignment' })
  @ApiResponse({ status: 200, type: OneReservationTableResponse })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateReservationTableDto,
  ): Promise<OneReservationTableResponse> {
    return this.reservationTableService.update(id, updateDto, user.merchant.id);
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Remove a table assignment by ID' })
  @ApiResponse({ status: 200, type: OneReservationTableResponse })
  removeById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneReservationTableResponse> {
    return this.reservationTableService.removeById(id, user.merchant.id);
  }

  @Delete(':reservationId/:tableId')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Remove a table assignment from a reservation' })
  @ApiResponse({ status: 200, type: OneReservationTableResponse })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Param('tableId', ParseIntPipe) tableId: number,
  ): Promise<OneReservationTableResponse> {
    return this.reservationTableService.remove(
      reservationId,
      tableId,
      user.merchant.id,
    );
  }
}
