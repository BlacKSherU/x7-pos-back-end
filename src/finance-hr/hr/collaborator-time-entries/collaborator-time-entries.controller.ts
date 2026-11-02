import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ParseIntPipe,
  UseGuards,
  Request,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { CollaboratorTimeEntriesService } from './collaborator-time-entries.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import { GetTimeEntryQueryDto } from './dto/get-time-entry-query.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiBody,
} from '@nestjs/swagger';
import { OneTimeEntryResponseDto } from './dto/time-entry-response.dto';
import { PaginatedTimeEntriesResponseDto } from './dto/paginated-time-entries-response.dto';
import { TimeEntryRevisionsResponseDto } from './dto/time-entry-revisions-response.dto';
import { TimeEntryRevision } from './entities/time-entry-revision.entity';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ShiftRole } from 'src/restaurant-operations/shift/shifts/constants/shift-role.enum';

@ApiExtraModels(
  ErrorResponse,
  OneTimeEntryResponseDto,
  PaginatedTimeEntriesResponseDto,
  TimeEntryRevisionsResponseDto,
  TimeEntryRevision,
)
@ApiTags('Finance & HR - HR - Collaborator time entries')
@ApiBearerAuth()
@Controller('collaborator-time-entries')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.COLLABORATOR_TIME_ENTRIES)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class CollaboratorTimeEntriesController {
  constructor(
    private readonly collaboratorTimeEntriesService: CollaboratorTimeEntriesService,
  ) {}

  /**
   * Obtains the merchant ID of the authenticated user.
   *
   * Passport hangs the user from `req.user`. Reading it as `req.merchant?.id` by typing the request as AuthenticatedUser, which passed the error in front of the compiler, always returned undefined and the service responded 403 to all calls.
   */
  private merchantIdOf(
    req: ExpressRequest & { user?: AuthenticatedUser },
  ): number {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant for this operation',
      );
    }
    return merchantId;
  }

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create time entry',
    description:
      'Creates a new collaborator time entry with clock-in/out timestamps and break minutes.',
  })
  @ApiCreatedResponse({
    description: 'Time entry created',
    type: OneTimeEntryResponseDto,
    schema: {
      example: {
        statusCode: 201,
        message: 'Time entry created successfully',
        data: {
          id: 1,
          company_id: 1,
          merchant_id: 1,
          collaborator_id: 4,
          shift_id: 7,
          clock_in: '2024-01-15T08:00:00.000Z',
          clock_out: '2024-01-15T16:00:00.000Z',
          regular_hours: 8,
          overtime_hours: 0,
          double_overtime_hours: 0,
          approved: false,
          created_at: '2024-01-15T16:05:00.000Z',
          break_minutes: 45,
          adjustment_reason: null,
          is_edited: false,
          edited_by_user_id: null,
          edited_at: null,
          collaborator: { id: 4, name: 'Juan Pérez', role: 'waiter' },
          shift: {
            id: 7,
            role: 'waiter',
            startTime: '2024-01-15T08:00:00Z',
            endTime: '2024-01-15T16:00:00Z',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'collaborator_id is required',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Company, Merchant, Collaborator or Shift not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Collaborator with ID 4 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiBody({ type: CreateTimeEntryDto })
  async create(
    @Body() dto: CreateTimeEntryDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneTimeEntryResponseDto> {
    const merchantId = this.merchantIdOf(req);
    const user = req.user;
    const isManagerOrAdmin =
      user?.role === UserRole.SUPER_ADMIN ||
      user?.role === UserRole.MERCHANT_ADMIN ||
      user?.shiftRole === ShiftRole.MANAGER;

    if (!isManagerOrAdmin && user?.collaboratorId) {
      dto.collaborator_id = user.collaboratorId;
    }

    return this.collaboratorTimeEntriesService.create(dto, merchantId);
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get all time entries (paginated)',
    description:
      'Retrieves paginated collaborator time entries with optional filters by date range, collaborator, shift, or approval status.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'company_id', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'merchant_id', required: false, type: Number, example: 1 })
  @ApiQuery({
    name: 'collaborator_id',
    required: false,
    type: Number,
    example: 4,
  })
  @ApiQuery({ name: 'shift_id', required: false, type: Number, example: 7 })
  @ApiQuery({
    name: 'approved',
    required: false,
    type: Boolean,
    example: false,
  })
  @ApiQuery({
    name: 'from_date',
    required: false,
    type: String,
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'to_date',
    required: false,
    type: String,
    example: '2024-01-31',
  })
  @ApiOkResponse({
    description: 'Paginated time entries retrieved successfully',
    type: PaginatedTimeEntriesResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Time entries retrieved successfully',
        data: [
          {
            id: 1,
            company_id: 1,
            merchant_id: 1,
            collaborator_id: 4,
            shift_id: 7,
            clock_in: '2024-01-15T08:00:00.000Z',
            clock_out: '2024-01-15T16:00:00.000Z',
            regular_hours: 8,
            overtime_hours: 0,
            double_overtime_hours: 0,
            approved: true,
            created_at: '2024-01-15T16:05:00.000Z',
            break_minutes: 45,
            adjustment_reason: null,
            is_edited: false,
            edited_by_user_id: null,
            edited_at: null,
            collaborator: { id: 4, name: 'Juan Pérez', role: 'waiter' },
            shift: {
              id: 7,
              role: 'waiter',
              startTime: '2024-01-15T08:00:00Z',
              endTime: '2024-01-15T16:00:00Z',
            },
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid filter parameters',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Page must be >= 1',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  async findAll(
    @Query() query: GetTimeEntryQueryDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<PaginatedTimeEntriesResponseDto> {
    const merchantId = this.merchantIdOf(req);
    const user = req.user;
    const isManagerOrAdmin =
      user?.role === UserRole.SUPER_ADMIN ||
      user?.role === UserRole.MERCHANT_ADMIN ||
      user?.shiftRole === ShiftRole.MANAGER;

    const effectiveQuery = { ...query };
    if (!isManagerOrAdmin && user?.collaboratorId) {
      effectiveQuery.collaborator_id = user.collaboratorId;
    }

    return this.collaboratorTimeEntriesService.findAll(
      effectiveQuery,
      merchantId,
    );
  }

  @Get(':id/revisions')
  @Roles(UserRole.MERCHANT_ADMIN)
  @ApiOperation({
    summary: 'Correction history for one time entry',
    description:
      'Every supervisor correction, newest first, with the punch values before and after. Insert-only: nothing rewrites this history, which is what makes it usable in a payroll dispute.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Time entry ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Time entry correction history retrieved successfully',
    type: TimeEntryRevisionsResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Revisions retrieved successfully',
        data: [
          {
            id: 1,
            time_entry_id: 1,
            edited_by_user_id: 7,
            adjustment_reason:
              'Supervisor corrected clock-out time due to missed punch',
            previous_clock_in: '2024-01-15T08:00:00.000Z',
            previous_clock_out: '2024-01-15T16:00:00.000Z',
            previous_break_minutes: 30,
            new_clock_in: '2024-01-15T08:00:00.000Z',
            new_clock_out: '2024-01-15T17:00:00.000Z',
            new_break_minutes: 45,
            created_at: '2024-01-15T17:05:00.000Z',
          },
        ],
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid time entry ID',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid time entry ID',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - User can only read time entries from their own merchant',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only read time entries from your own merchant',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Time entry not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Time entry with ID 1 not found',
        error: 'Not Found',
      },
    },
  })
  async revisions(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ) {
    return this.collaboratorTimeEntriesService.revisions(
      id,
      this.merchantIdOf(req),
    );
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get time entry by ID',
    description:
      'Retrieves single collaborator time entry by its unique identifier.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Time entry ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Time entry found',
    type: OneTimeEntryResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Time entry retrieved successfully',
        data: {
          id: 1,
          company_id: 1,
          merchant_id: 1,
          collaborator_id: 4,
          shift_id: 7,
          clock_in: '2024-01-15T08:00:00.000Z',
          clock_out: '2024-01-15T16:00:00.000Z',
          regular_hours: 8,
          overtime_hours: 0,
          double_overtime_hours: 0,
          approved: true,
          created_at: '2024-01-15T16:05:00.000Z',
          break_minutes: 45,
          adjustment_reason: null,
          is_edited: false,
          edited_by_user_id: null,
          edited_at: null,
          collaborator: { id: 4, name: 'Juan Pérez', role: 'waiter' },
          shift: {
            id: 7,
            role: 'waiter',
            startTime: '2024-01-15T08:00:00Z',
            endTime: '2024-01-15T16:00:00Z',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input ID',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid time entry ID',
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Time entry not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Time entry with ID 1 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneTimeEntryResponseDto> {
    const merchantId = this.merchantIdOf(req);
    return this.collaboratorTimeEntriesService.findOne(id, merchantId);
  }

  @Put(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Update time entry',
    description:
      'Updates clock-in/out timestamps or break minutes of a time entry. Creates a revision audit entry recording the previous and new punch details.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Time entry ID',
    example: 1,
  })
  @ApiBody({ type: UpdateTimeEntryDto })
  @ApiOkResponse({
    description: 'Time entry updated',
    type: OneTimeEntryResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Time entry updated successfully',
        data: {
          id: 1,
          company_id: 1,
          merchant_id: 1,
          collaborator_id: 4,
          shift_id: 7,
          clock_in: '2024-01-15T08:00:00.000Z',
          clock_out: '2024-01-15T17:00:00.000Z',
          regular_hours: 8,
          overtime_hours: 1,
          double_overtime_hours: 0,
          approved: true,
          created_at: '2024-01-15T16:05:00.000Z',
          break_minutes: 45,
          adjustment_reason:
            'Supervisor corrected clock-out time due to missed punch',
          is_edited: true,
          edited_by_user_id: 7,
          edited_at: '2024-01-15T17:05:00.000Z',
          collaborator: { id: 4, name: 'Juan Pérez', role: 'waiter' },
          shift: {
            id: 7,
            role: 'waiter',
            startTime: '2024-01-15T08:00:00Z',
            endTime: '2024-01-15T16:00:00Z',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'clock_out cannot be earlier than clock_in',
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Time entry not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Time entry with ID 1 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTimeEntryDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneTimeEntryResponseDto> {
    const merchantId = this.merchantIdOf(req);
    return this.collaboratorTimeEntriesService.update(
      id,
      dto,
      merchantId,
      req.user?.id,
    );
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Delete time entry',
    description: 'Deletes a collaborator time entry by ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Time entry ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Time entry deleted',
    type: OneTimeEntryResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Time entry deleted successfully',
        data: {
          id: 1,
          company_id: 1,
          merchant_id: 1,
          collaborator_id: 4,
          shift_id: 7,
          clock_in: '2024-01-15T08:00:00.000Z',
          clock_out: '2024-01-15T16:00:00.000Z',
          regular_hours: 8,
          overtime_hours: 0,
          double_overtime_hours: 0,
          approved: false,
          created_at: '2024-01-15T16:05:00.000Z',
          break_minutes: 45,
          adjustment_reason: null,
          is_edited: false,
          edited_by_user_id: null,
          edited_at: null,
          collaborator: { id: 4, name: 'Juan Pérez', role: 'waiter' },
          shift: {
            id: 7,
            role: 'waiter',
            startTime: '2024-01-15T08:00:00Z',
            endTime: '2024-01-15T16:00:00Z',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input ID',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid time entry ID',
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Time entry not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Time entry with ID 1 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneTimeEntryResponseDto> {
    const merchantId = this.merchantIdOf(req);
    return this.collaboratorTimeEntriesService.remove(id, merchantId);
  }
}
