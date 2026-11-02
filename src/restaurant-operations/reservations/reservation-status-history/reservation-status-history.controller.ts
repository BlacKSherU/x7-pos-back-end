import {
  Controller,
  Delete,
  Get,
  MethodNotAllowedException,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ReservationStatusHistoryService } from './reservation-status-history.service';
import { OneReservationStatusHistoryResponse } from './dto/reservation-status-history-response.dto';
import { AllPaginatedReservationStatusHistory } from './dto/all-paginated-reservation-status-history.dto';
import { GetReservationStatusHistoryQueryDto } from './dto/get-reservation-status-history-query.dto';
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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Ejemplos con la forma REAL de la respuesta (snake_case, sobre paginado plano). Un 400
// pasa por ValidationExceptionFilter (lleva `timestamp`); 401/404 son los de Nest tal cual.
const HISTORY_ENTRY_EXAMPLES = [
  {
    id: 33,
    reservation_id: 14,
    status: 'completed',
    previous_status: 'seated',
    previous_changed_at: '2026-04-16T19:07:12.000Z',
    changed_at: '2026-04-16T20:52:03.000Z',
    changed_by: 2,
    is_active: true,
    reservation: {
      id: 14,
      reservation_date: '2026-04-16T19:00:00.000Z',
      duration_minutes: 90,
      seated_at: '2026-04-16T19:07:12.000Z',
      party_size: 4,
      status: 'completed',
      guest_name: 'Carlos Mendoza',
    },
  },
  {
    id: 32,
    reservation_id: 14,
    status: 'seated',
    previous_status: 'confirmed',
    previous_changed_at: '2026-04-16T14:20:00.000Z',
    changed_at: '2026-04-16T19:07:12.000Z',
    changed_by: 12,
    is_active: true,
    reservation: {
      id: 14,
      reservation_date: '2026-04-16T19:00:00.000Z',
      duration_minutes: 90,
      seated_at: '2026-04-16T19:07:12.000Z',
      party_size: 4,
      status: 'completed',
      guest_name: 'Carlos Mendoza',
    },
  },
  {
    id: 30,
    reservation_id: 14,
    status: 'confirmed',
    previous_status: 'pending',
    previous_changed_at: '2026-04-16T14:00:00.000Z',
    changed_at: '2026-04-16T14:20:00.000Z',
    changed_by: null,
    is_active: true,
    reservation: {
      id: 14,
      reservation_date: '2026-04-16T19:00:00.000Z',
      duration_minutes: 90,
      seated_at: '2026-04-16T19:07:12.000Z',
      party_size: 4,
      status: 'completed',
      guest_name: 'Carlos Mendoza',
    },
  },
  {
    id: 27,
    reservation_id: 14,
    status: 'pending',
    previous_status: null,
    previous_changed_at: null,
    changed_at: '2026-04-16T14:00:00.000Z',
    changed_by: 2,
    is_active: true,
    reservation: {
      id: 14,
      reservation_date: '2026-04-16T19:00:00.000Z',
      duration_minutes: 90,
      seated_at: '2026-04-16T19:07:12.000Z',
      party_size: 4,
      status: 'completed',
      guest_name: 'Carlos Mendoza',
    },
  },
];

const paginatedExample = (message: string) => ({
  statusCode: 200,
  message,
  data: HISTORY_ENTRY_EXAMPLES,
  page: 1,
  limit: 10,
  total: 4,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
});

const UNAUTHORIZED_EXAMPLE = { message: 'Unauthorized', statusCode: 401 };

@ApiTags('Restaurant operations - Reservations - Status History')
@ApiBearerAuth()
@Controller('reservation-status-history')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.RESERVATION_STATUS_HISTORY)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class ReservationStatusHistoryController {
  constructor(
    private readonly historyService: ReservationStatusHistoryService,
  ) {}

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary: 'Get all merchant status history',
    description:
      'Immutable audit log of reservation status transitions, ordered strictly by changed_at DESC ' +
      '(ties by id DESC). Filter by reservation, target status, the local day the change was ' +
      'logged on, the staff member who made it, or automated (system) changes only.',
  })
  @ApiOkResponse({
    type: AllPaginatedReservationStatusHistory,
    example: paginatedExample(
      'All merchant status history retrieved successfully',
    ),
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameter',
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed',
        errors: [
          'status must be one of the following values: pending, confirmed, seated, completed, cancelled, white_list, no_show',
        ],
        timestamp: '2026-04-16T20:55:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({ schema: { example: UNAUTHORIZED_EXAMPLE } })
  findAllGlobal(
    @CurrentUser() user: AuthenticatedUser,
    @Query() queryDto: GetReservationStatusHistoryQueryDto,
  ): Promise<AllPaginatedReservationStatusHistory> {
    return this.historyService.findAllGlobal(user.merchant.id, queryDto);
  }

  @Get('by-reservation/:reservationId')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary: 'Get status history of a reservation',
    description:
      'Every transition of one reservation, newest first. Each entry carries previous_status and ' +
      'previous_changed_at (changed_at − previous_changed_at = time spent in previous_status) ' +
      'and a summary of the parent reservation. 404 when the reservation does not exist, was ' +
      'deleted, or belongs to another merchant.',
  })
  @ApiParam({
    name: 'reservationId',
    type: Number,
    example: 14,
    description: 'Parent reservation ID',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({
    type: AllPaginatedReservationStatusHistory,
    example: paginatedExample(
      'All merchant status history retrieved successfully',
    ),
  })
  @ApiBadRequestResponse({
    description: 'reservationId (or page/limit) is not a number',
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed (numeric string is expected)',
        timestamp: '2026-04-16T20:55:00.000Z',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Reservation not found for this merchant',
    schema: {
      example: {
        message: 'Reservation not found',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  })
  @ApiUnauthorizedResponse({ schema: { example: UNAUTHORIZED_EXAMPLE } })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.historyService.findAll(
      reservationId,
      user.merchant.id,
      page,
      limit,
    );
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Get status history entry by ID' })
  @ApiParam({ name: 'id', type: Number, example: 33 })
  @ApiOkResponse({
    type: OneReservationStatusHistoryResponse,
    example: {
      statusCode: 200,
      message: 'Status history entry retrieved successfully',
      data: HISTORY_ENTRY_EXAMPLES[0],
    },
  })
  @ApiNotFoundResponse({
    schema: {
      example: {
        message: 'Status history entry not found',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  })
  @ApiUnauthorizedResponse({ schema: { example: UNAUTHORIZED_EXAMPLE } })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneReservationStatusHistoryResponse> {
    return this.historyService.findOne(id, user.merchant.id);
  }

  /**
   * El histórico es de sólo-anexar: las entradas las escribe ReservationService al cambiar el
   * estado, nunca un cliente. Sin estas rutas un PUT/PATCH respondía 404 ("no existe"), que
   * es falso — la entrada existe, lo que no se permite es tocarla. 405 lo dice con claridad.
   *
   * Un handler por verbo: apilar @Put/@Patch/@Delete sobre el mismo método NO registra los
   * tres — cada decorador sobrescribe los metadatos de ruta del anterior y sólo queda uno.
   */
  @Post()
  @ApiOperation({
    summary: 'Rejected (405) — entries are created automatically',
  })
  @ApiResponse({ status: 405, description: 'History entries are immutable' })
  rejectCreate(): never {
    return this.rejectWrite();
  }

  @Put(':id')
  @ApiOperation({ summary: 'Rejected (405) — history entries are immutable' })
  @ApiResponse({ status: 405, description: 'History entries are immutable' })
  rejectReplace(): never {
    return this.rejectWrite();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rejected (405) — history entries are immutable' })
  @ApiResponse({ status: 405, description: 'History entries are immutable' })
  rejectUpdate(): never {
    return this.rejectWrite();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Rejected (405) — history entries are immutable' })
  @ApiResponse({ status: 405, description: 'History entries are immutable' })
  rejectDelete(): never {
    return this.rejectWrite();
  }

  rejectWrite(): never {
    throw new MethodNotAllowedException(
      'Reservation status history is an immutable audit log: entries are created automatically when a reservation changes status and cannot be created, edited or deleted.',
    );
  }
}
