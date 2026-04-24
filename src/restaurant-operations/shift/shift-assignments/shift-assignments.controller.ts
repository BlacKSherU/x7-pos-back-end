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
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import { ShiftAssignmentsService } from './shift-assignments.service';
import { CreateShiftAssignmentDto } from './dto/create-shift-assignment.dto';
import { UpdateShiftAssignmentDto } from './dto/update-shift-assignment.dto';
import { OneShiftAssignmentResponseDto } from './dto/shift-assignment-response.dto';
import { GetShiftAssignmentsQueryDto } from './dto/get-shift-assignments-query.dto';
import { PaginatedShiftAssignmentsResponseDto } from './dto/paginated-shift-assignments-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiBody,
  ApiForbiddenResponse,
  ApiExtraModels,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from '../../../common/dtos/error-response.dto';

@ApiTags('Shift Assignments')
@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@Controller('shift-assignments')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.SHIFT_ASSIGNMENT)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class ShiftAssignmentsController {
  constructor(
    private readonly shiftAssignmentsService: ShiftAssignmentsService,
  ) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a new shift assignment',
    description:
      'Creates a new shift assignment for a collaborator. Only merchant administrators can create assignments. The collaborator and shift must belong to the same merchant.',
  })
  @ApiCreatedResponse({
    description: 'Shift assignment created successfully',
    type: OneShiftAssignmentResponseDto,
    schema: {
      example: {
        statusCode: 201,
        message: 'Shift assignment created successfully',
        data: {
          id: 1,
          shiftId: 1,
          collaboratorId: 1,
          roleDuringShift: 'waiter',
          startTime: '2024-01-15T08:00:00Z',
          endTime: '2024-01-15T16:00:00Z',
          shift: {
            id: 1,
            merchantId: 1,
            merchantName: 'Restaurant ABC',
          },
          collaborator: {
            id: 1,
            name: 'John Doe',
            role: 'waiter',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or business rule violation',
    schema: {
      examples: {
        invalidTimeFormat: {
          summary: 'Invalid time format',
          value: {
            statusCode: 400,
            message:
              'Invalid start time format. Please provide a valid date string',
            error: 'Bad Request',
          },
        },
        invalidTimeOrder: {
          summary: 'Invalid time order',
          value: {
            statusCode: 400,
            message: 'End time must be after start time',
            error: 'Bad Request',
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
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
      'Forbidden - You can only create assignments for your own merchant',
    schema: {
      example: {
        statusCode: 403,
        message:
          'You can only create assignments for shifts from your own merchant',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Shift or collaborator not found',
    schema: {
      examples: {
        shiftNotFound: {
          summary: 'Shift not found',
          value: {
            statusCode: 404,
            message: 'Shift with ID 999 not found',
            error: 'Not Found',
          },
        },
        collaboratorNotFound: {
          summary: 'Collaborator not found',
          value: {
            statusCode: 404,
            message: 'Collaborator with ID 999 not found',
            error: 'Not Found',
          },
        },
      },
    },
  })
  @ApiConflictResponse({
    description: 'Assignment already exists',
    schema: {
      example: {
        statusCode: 409,
        message: 'This collaborator is already assigned to this shift',
        error: 'Conflict',
      },
    },
  })
  @ApiBody({
    type: CreateShiftAssignmentDto,
    description: 'Shift assignment creation data',
    examples: {
      example1: {
        summary: 'Basic assignment',
        description: 'A simple shift assignment with start and end time',
        value: {
          shiftId: 1,
          collaboratorId: 1,
          roleDuringShift: 'waiter',
          startTime: '2024-01-15T08:00:00Z',
          endTime: '2024-01-15T16:00:00Z',
        },
      },
      example2: {
        summary: 'Assignment without end time',
        description: 'An assignment that is still ongoing',
        value: {
          shiftId: 1,
          collaboratorId: 2,
          roleDuringShift: 'cook',
          startTime: '2024-01-15T08:00:00Z',
        },
      },
    },
  })
  async create(
    @Body() dto: CreateShiftAssignmentDto,
    @Request() req: AuthenticatedUser,
  ): Promise<OneShiftAssignmentResponseDto> {
    // Get the merchant_id of the authenticated user
    const authenticatedUserMerchantId = req.merchant?.id;

    // Validate that the user has a merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to create shift assignments',
      );
    }

    return this.shiftAssignmentsService.create(
      dto,
      authenticatedUserMerchantId,
    );
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get all shift assignments',
    description:
      "Retrieves all shift assignments for the authenticated user's merchant with filtering, sorting, and pagination support. Only users with any merchant role can access this endpoint.",
  })
  @ApiQuery({
    name: 'shiftId',
    required: false,
    type: Number,
    description: 'Filter by shift ID',
  })
  @ApiQuery({
    name: 'collaboratorId',
    required: false,
    type: Number,
    description: 'Filter by collaborator ID',
  })
  @ApiQuery({
    name: 'roleDuringShift',
    required: false,
    enum: [
      'waiter',
      'cook',
      'bartender',
      'host',
      'cashier',
      'manager',
      'busser',
      'delivery',
    ],
    description: 'Filter by role during shift',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter assignments from this date (YYYY-MM-DD format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter assignments until this date (YYYY-MM-DD format)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (minimum 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (minimum 1, maximum 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['startTime', 'endTime', 'roleDuringShift'],
    description: 'Field to sort by',
    example: 'startTime',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
    example: 'DESC',
  })
  @ApiOkResponse({
    description:
      'List of shift assignments retrieved successfully with pagination',
    type: PaginatedShiftAssignmentsResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Shift assignments retrieved successfully',
        data: [
          {
            id: 1,
            shiftId: 1,
            collaboratorId: 1,
            roleDuringShift: 'waiter',
            startTime: '2024-01-15T08:00:00Z',
            endTime: '2024-01-15T16:00:00Z',
            shift: {
              id: 1,
              merchantId: 1,
              merchantName: 'Restaurant ABC',
            },
            collaborator: {
              id: 1,
              name: 'John Doe',
              role: 'waiter',
            },
          },
          {
            id: 2,
            shiftId: 1,
            collaboratorId: 2,
            roleDuringShift: 'cook',
            startTime: '2024-01-15T08:00:00Z',
            endTime: '2024-01-15T16:00:00Z',
            shift: {
              id: 1,
              merchantId: 1,
              merchantName: 'Restaurant ABC',
            },
            collaborator: {
              id: 2,
              name: 'Jane Smith',
              role: 'cook',
            },
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNext: true,
          hasPrev: false,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
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
      'Forbidden - User must be associated with a merchant to view shift assignments',
    schema: {
      example: {
        statusCode: 403,
        message:
          'User must be associated with a merchant to view shift assignments',
        error: 'Forbidden',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or filter parameters',
    schema: {
      examples: {
        invalidDateFormat: {
          summary: 'Invalid date format',
          value: {
            statusCode: 400,
            message: 'Invalid startDate format. Please use YYYY-MM-DD format',
            error: 'Bad Request',
          },
        },
        invalidDateRange: {
          summary: 'Invalid date range',
          value: {
            statusCode: 400,
            message: 'startDate must be before or equal to endDate',
            error: 'Bad Request',
          },
        },
        invalidPagination: {
          summary: 'Invalid pagination parameters',
          value: {
            statusCode: 400,
            message: 'page must be a positive number',
            error: 'Bad Request',
          },
        },
      },
    },
  })
  async findAll(
    @Query() query: GetShiftAssignmentsQueryDto,
    @Request() req: AuthenticatedUser,
  ): Promise<PaginatedShiftAssignmentsResponseDto> {
    // Get the merchant_id from the authenticated user
    const authenticatedUserMerchantId = req.merchant?.id;

    // Validate that the user has merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to view shift assignments',
      );
    }

    return this.shiftAssignmentsService.findAll(
      query,
      authenticatedUserMerchantId,
    );
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get a shift assignment by ID',
    description:
      'Retrieves a specific shift assignment by its ID. Only users with any merchant role can access this endpoint. Users can only access assignments from their own merchant.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Shift Assignment ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Shift assignment found successfully',
    type: OneShiftAssignmentResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Shift assignment retrieved successfully',
        data: {
          id: 1,
          shiftId: 1,
          collaboratorId: 1,
          roleDuringShift: 'waiter',
          startTime: '2024-01-15T08:00:00Z',
          endTime: '2024-01-15T16:00:00Z',
          shift: {
            id: 1,
            merchantId: 1,
            merchantName: 'Restaurant ABC',
          },
          collaborator: {
            id: 1,
            name: 'John Doe',
            role: 'waiter',
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
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
      'Forbidden - User must be associated with a merchant or can only view assignments from their own merchant',
    schema: {
      examples: {
        noMerchant: {
          summary: 'User not associated with merchant',
          value: {
            statusCode: 403,
            message:
              'User must be associated with a merchant to view shift assignments',
            error: 'Forbidden',
          },
        },
        differentMerchant: {
          summary: 'Trying to access assignment from different merchant',
          value: {
            statusCode: 403,
            message:
              'You can only view shift assignments from your own merchant',
            error: 'Forbidden',
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Shift assignment or merchant not found',
    schema: {
      examples: {
        assignmentNotFound: {
          summary: 'Assignment not found',
          value: {
            statusCode: 404,
            message: 'Shift assignment 999 not found',
            error: 'Not Found',
          },
        },
        merchantNotFound: {
          summary: 'Merchant not found',
          value: {
            statusCode: 404,
            message: 'Merchant with ID 999 not found',
            error: 'Not Found',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID format or value',
    schema: {
      examples: {
        invalidId: {
          summary: 'Invalid shift assignment ID',
          value: {
            statusCode: 400,
            message: 'Invalid shift assignment ID',
            error: 'Bad Request',
          },
        },
        negativeId: {
          summary: 'Negative or zero ID',
          value: {
            statusCode: 400,
            message: 'Invalid shift assignment ID',
            error: 'Bad Request',
          },
        },
        nonNumericId: {
          summary: 'Non-numeric ID',
          value: {
            statusCode: 400,
            message: 'Validation failed (numeric string is expected)',
            error: 'Bad Request',
          },
        },
      },
    },
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ): Promise<OneShiftAssignmentResponseDto> {
    // Get the merchant_id of the authenticated user
    const authenticatedUserMerchantId = req.merchant?.id;

    // Validate that the user has a merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to view shift assignments',
      );
    }

    return this.shiftAssignmentsService.findOne(
      id,
      authenticatedUserMerchantId,
    );
  }

  @Put(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Update a shift assignment by ID',
    description:
      "Updates an existing shift assignment for the authenticated user's merchant. Only merchant administrators can update assignments. All fields are optional. Validates existence of shift and collaborator, uniqueness of assignment, and business rules.",
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Shift Assignment ID to update',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Shift assignment updated successfully',
    type: OneShiftAssignmentResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Shift assignment updated successfully',
        data: {
          id: 1,
          shiftId: 1,
          collaboratorId: 1,
          roleDuringShift: 'waiter',
          startTime: '2024-01-15T08:00:00Z',
          endTime: '18:00',
          shift: {
            id: 1,
            merchantId: 1,
            merchantName: 'Restaurant ABC',
          },
          collaborator: {
            id: 1,
            name: 'John Doe',
            role: 'waiter',
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
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
      'Forbidden - User must be associated with a merchant or can only update assignments from their own merchant',
    schema: {
      examples: {
        noMerchant: {
          summary: 'User not associated with merchant',
          value: {
            statusCode: 403,
            message:
              'User must be associated with a merchant to update shift assignments',
            error: 'Forbidden',
          },
        },
        differentMerchant: {
          summary: 'Trying to update assignment from different merchant',
          value: {
            statusCode: 403,
            message:
              'You can only update shift assignments from your own merchant',
            error: 'Forbidden',
          },
        },
        differentShiftMerchant: {
          summary: 'Trying to assign to shift from different merchant',
          value: {
            statusCode: 403,
            message: 'You can only assign to shifts from your own merchant',
            error: 'Forbidden',
          },
        },
        differentCollaboratorMerchant: {
          summary: 'Trying to assign collaborator from different merchant',
          value: {
            statusCode: 403,
            message: 'You can only assign collaborators from your own merchant',
            error: 'Forbidden',
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Shift assignment, shift, or collaborator not found',
    schema: {
      examples: {
        assignmentNotFound: {
          summary: 'Assignment not found',
          value: {
            statusCode: 404,
            message: 'Shift assignment with ID 999 not found',
            error: 'Not Found',
          },
        },
        shiftNotFound: {
          summary: 'Shift not found',
          value: {
            statusCode: 404,
            message: 'Shift with ID 999 not found',
            error: 'Not Found',
          },
        },
        collaboratorNotFound: {
          summary: 'Collaborator not found',
          value: {
            statusCode: 404,
            message: 'Collaborator with ID 999 not found',
            error: 'Not Found',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data, ID format, or business rule violation',
    schema: {
      examples: {
        invalidId: {
          summary: 'Invalid ID format',
          value: {
            statusCode: 400,
            message: 'Invalid shift assignment ID',
            error: 'Bad Request',
          },
        },
        noFieldsProvided: {
          summary: 'No fields provided for update',
          value: {
            statusCode: 400,
            message: 'At least one field must be provided for update',
            error: 'Bad Request',
          },
        },
        invalidTimeFormat: {
          summary: 'Invalid time format',
          value: {
            statusCode: 400,
            message:
              'Invalid start time format. Please provide a valid date string',
            error: 'Bad Request',
          },
        },
        invalidTimeOrder: {
          summary: 'Invalid time order',
          value: {
            statusCode: 400,
            message: 'End time must be after start time',
            error: 'Bad Request',
          },
        },
      },
    },
  })
  @ApiConflictResponse({
    description: 'Conflict - Duplicate assignment or business rule violation',
    schema: {
      example: {
        statusCode: 409,
        message: 'This collaborator is already assigned to this shift',
        error: 'Conflict',
      },
    },
  })
  @ApiBody({
    type: UpdateShiftAssignmentDto,
    description: 'Shift assignment update data (all fields optional)',
    examples: {
      example1: {
        summary: 'Update end time only',
        description: 'Update only the end time of an assignment',
        value: {
          endTime: '2024-01-15T18:00:00Z',
        },
      },
      example2: {
        summary: 'Update multiple fields',
        description: 'Update role and times',
        value: {
          roleDuringShift: 'cook',
          startTime: '2024-01-15T09:00:00Z',
          endTime: '2024-01-15T17:00:00Z',
        },
      },
      example3: {
        summary: 'Remove end time',
        description: 'Set end time to null (ongoing assignment)',
        value: {
          endTime: null,
        },
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShiftAssignmentDto,
    @Request() req: AuthenticatedUser,
  ): Promise<OneShiftAssignmentResponseDto> {
    // Get the merchant_id of the authenticated user
    const authenticatedUserMerchantId = req.merchant?.id;

    // Validate that the user has a merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to update shift assignments',
      );
    }

    return this.shiftAssignmentsService.update(
      id,
      dto,
      authenticatedUserMerchantId,
    );
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Delete a shift assignment by ID',
    description:
      'Deletes a specific shift assignment by its ID. Only merchant administrators can delete assignments from their own merchant. This is a hard delete operation that permanently removes the assignment.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Shift Assignment ID to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Shift assignment deleted successfully',
    type: OneShiftAssignmentResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Shift assignment deleted successfully',
        data: {
          id: 1,
          shiftId: 1,
          collaboratorId: 1,
          roleDuringShift: 'waiter',
          startTime: '2024-01-15T08:00:00Z',
          endTime: '2024-01-15T16:00:00Z',
          shift: {
            id: 1,
            merchantId: 1,
            merchantName: 'Restaurant ABC',
          },
          collaborator: {
            id: 1,
            name: 'John Doe',
            role: 'waiter',
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
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
      'Forbidden - User must be associated with a merchant or can only delete assignments from their own merchant',
    schema: {
      examples: {
        noMerchant: {
          summary: 'User not associated with merchant',
          value: {
            statusCode: 403,
            message:
              'User must be associated with a merchant to delete shift assignments',
            error: 'Forbidden',
          },
        },
        differentMerchant: {
          summary: 'Trying to delete assignment from different merchant',
          value: {
            statusCode: 403,
            message:
              'You can only delete shift assignments from your own merchant',
            error: 'Forbidden',
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Shift assignment not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Shift assignment with ID 999 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID format or value',
    schema: {
      examples: {
        invalidId: {
          summary: 'Invalid shift assignment ID',
          value: {
            statusCode: 400,
            message: 'Invalid shift assignment ID',
            error: 'Bad Request',
          },
        },
        negativeId: {
          summary: 'Negative or zero ID',
          value: {
            statusCode: 400,
            message: 'Invalid shift assignment ID',
            error: 'Bad Request',
          },
        },
        nonNumericId: {
          summary: 'Non-numeric ID',
          value: {
            statusCode: 400,
            message: 'Validation failed (numeric string is expected)',
            error: 'Bad Request',
          },
        },
      },
    },
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ): Promise<OneShiftAssignmentResponseDto> {
    // Get the merchant_id of the authenticated user
    const authenticatedUserMerchantId = req.merchant?.id;

    // Validate that the user has a merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to delete shift assignments',
      );
    }

    return this.shiftAssignmentsService.remove(id, authenticatedUserMerchantId);
  }
}
