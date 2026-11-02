import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';

export class CreateFinanceHrLedgerAccountDto {
  @ApiProperty({
    example: '1100',
    description: 'Unique ledger account code (e.g. 1100, 2100)',
  })
  code: string;

  @ApiProperty({
    example: 'Raw Material Inventory',
    description: 'Name of the ledger account',
  })
  name: string;

  @ApiProperty({
    example: 'ASSET',
    description: 'Account type (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)',
  })
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

  @ApiPropertyOptional({
    example: 1,
    description: 'Parent account ID for hierarchy',
    nullable: true,
  })
  parent_account_id?: number | null;
}

export class UpdateFinanceHrLedgerAccountDto {
  @ApiPropertyOptional({
    example: '1105',
    description: 'Updated ledger account code',
  })
  code?: string;

  @ApiPropertyOptional({
    example: 'Updated Raw Material Inventory',
    description: 'Updated ledger account name',
  })
  name?: string;

  @ApiPropertyOptional({
    example: 'ASSET',
    description: 'Updated account type',
  })
  type?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the account is active',
  })
  is_active?: boolean;

  @ApiPropertyOptional({
    example: 1,
    description: 'Updated parent account ID',
    nullable: true,
  })
  parent_account_id?: number | null;
}

export interface LedgerAccountDto {
  id: number;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  is_active: boolean;
  parent_account_id: number | null;
}

const MOCK_LEDGER_ACCOUNTS: LedgerAccountDto[] = [
  {
    id: 1,
    code: '1000',
    name: 'Assets',
    type: 'ASSET',
    is_active: true,
    parent_account_id: null,
  },
  {
    id: 2,
    code: '1100',
    name: 'Raw Material Inventory',
    type: 'ASSET',
    is_active: true,
    parent_account_id: 1,
  },
  {
    id: 3,
    code: '1200',
    name: 'Finished Goods Inventory',
    type: 'ASSET',
    is_active: true,
    parent_account_id: 1,
  },
  {
    id: 4,
    code: '1300',
    name: 'Cash & Bank Accounts',
    type: 'ASSET',
    is_active: true,
    parent_account_id: 1,
  },
  {
    id: 5,
    code: '2000',
    name: 'Liabilities',
    type: 'LIABILITY',
    is_active: true,
    parent_account_id: null,
  },
  {
    id: 6,
    code: '2100',
    name: 'Accounts Payable',
    type: 'LIABILITY',
    is_active: true,
    parent_account_id: 5,
  },
  {
    id: 7,
    code: '2200',
    name: 'Tax Payable',
    type: 'LIABILITY',
    is_active: true,
    parent_account_id: 5,
  },
  {
    id: 8,
    code: '3000',
    name: 'Equity',
    type: 'EQUITY',
    is_active: true,
    parent_account_id: null,
  },
  {
    id: 9,
    code: '3100',
    name: 'Owner Capital',
    type: 'EQUITY',
    is_active: true,
    parent_account_id: 8,
  },
  {
    id: 10,
    code: '4000',
    name: 'Revenue',
    type: 'REVENUE',
    is_active: true,
    parent_account_id: null,
  },
  {
    id: 11,
    code: '4100',
    name: 'POS Food & Beverage Sales',
    type: 'REVENUE',
    is_active: true,
    parent_account_id: 10,
  },
  {
    id: 12,
    code: '5000',
    name: 'Expenses',
    type: 'EXPENSE',
    is_active: true,
    parent_account_id: null,
  },
  {
    id: 13,
    code: '5100',
    name: 'Cost of Goods Sold',
    type: 'EXPENSE',
    is_active: true,
    parent_account_id: 12,
  },
  {
    id: 14,
    code: '5200',
    name: 'Waste & Shrinkage Expense',
    type: 'EXPENSE',
    is_active: true,
    parent_account_id: 12,
  },
  {
    id: 15,
    code: '5300',
    name: 'Inventory Adjustment Variance',
    type: 'EXPENSE',
    is_active: true,
    parent_account_id: 12,
  },
];

@ApiTags('Finance & HR - Accounting - Ledger Accounts Setup')
@ApiExtraModels(
  ErrorResponse,
  CreateFinanceHrLedgerAccountDto,
  UpdateFinanceHrLedgerAccountDto,
)
@ApiBearerAuth()
@Controller('ledger-accounts')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.LEDGER_ACCOUNTS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class LedgerAccountsController {
  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary: 'Get ledger accounts directory',
    description:
      'Retrieves a directory list of ledger accounts with optional search and type filtering.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    example: 'Inventory',
    description: 'Search by account code or name',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    type: String,
    example: 'ASSET',
    description:
      'Filter by account type (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)',
  })
  @ApiOkResponse({
    description: 'Directory list of ledger accounts retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 1,
            code: '1000',
            name: 'Assets',
            type: 'ASSET',
            is_active: true,
            parent_account_id: null,
          },
          {
            id: 2,
            code: '1100',
            name: 'Raw Material Inventory',
            type: 'ASSET',
            is_active: true,
            parent_account_id: 1,
          },
        ],
        total: 2,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid type filter value',
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
  async getAccounts(
    @Query('search') search?: string,
    @Query('type') type?: string,
  ) {
    let filtered = [...MOCK_LEDGER_ACCOUNTS];

    if (search) {
      const term = search.toLowerCase().trim();
      filtered = filtered.filter(
        (a) =>
          a.code.toLowerCase().includes(term) ||
          a.name.toLowerCase().includes(term),
      );
    }

    if (type) {
      filtered = filtered.filter((a) => a.type === type);
    }

    return {
      data: filtered,
      total: filtered.length,
    };
  }

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB)
  @ApiOperation({
    summary: 'Create new ledger account',
    description:
      'Creates a new ledger account entry in the chart of accounts directory.',
  })
  @ApiBody({
    type: CreateFinanceHrLedgerAccountDto,
    description: 'Ledger account creation payload',
    examples: {
      createAccount: {
        summary: 'Create raw material inventory account',
        value: {
          code: '1100',
          name: 'Raw Material Inventory',
          type: 'ASSET',
          parent_account_id: 1,
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Ledger account created successfully',
    schema: {
      example: {
        data: {
          id: 1727091234567,
          code: '1100',
          name: 'Raw Material Inventory',
          type: 'ASSET',
          is_active: true,
          parent_account_id: 1,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or code already exists',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: "Ledger account code '1100' already exists",
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
  async createAccount(@Body() dto: Partial<LedgerAccountDto>) {
    const newAccount: LedgerAccountDto = {
      id: Date.now(),
      code: dto.code || `9${Math.floor(100 + Math.random() * 900)}`,
      name: dto.name || 'New Ledger Account',
      type: dto.type || 'ASSET',
      is_active: true,
      parent_account_id: dto.parent_account_id ?? null,
    };

    MOCK_LEDGER_ACCOUNTS.push(newAccount);
    return { data: newAccount };
  }

  @Patch(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB)
  @ApiOperation({
    summary: 'Update ledger account',
    description:
      'Updates existing ledger account fields such as code, name, type, active status, or parent account ID.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '2',
    description: 'Ledger Account ID to update',
  })
  @ApiBody({
    type: UpdateFinanceHrLedgerAccountDto,
    description: 'Ledger account update payload',
    examples: {
      updateAccount: {
        summary: 'Update account name and code',
        value: {
          code: '1105',
          name: 'Updated Raw Material Inventory',
          type: 'ASSET',
          is_active: true,
          parent_account_id: 1,
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Ledger account updated successfully',
    schema: {
      example: {
        data: {
          id: 2,
          code: '1105',
          name: 'Updated Raw Material Inventory',
          type: 'ASSET',
          is_active: true,
          parent_account_id: 1,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID or body parameters',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'A ledger account cannot be its own parent',
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
  @ApiNotFoundResponse({
    description: 'Ledger account not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Ledger account #99 not found',
        error: 'Not Found',
      },
    },
  })
  async updateAccount(
    @Param('id') id: string,
    @Body() dto: Partial<LedgerAccountDto>,
  ) {
    const numericId = Number(id);
    const account = MOCK_LEDGER_ACCOUNTS.find((a) => a.id === numericId);

    if (!account) {
      throw new NotFoundException(`Ledger account #${id} not found`);
    }

    if (dto.code !== undefined) account.code = dto.code;
    if (dto.name !== undefined) account.name = dto.name;
    if (dto.type !== undefined) account.type = dto.type;
    if (dto.is_active !== undefined) account.is_active = dto.is_active;
    if (dto.parent_account_id !== undefined)
      account.parent_account_id = dto.parent_account_id;

    return { data: account };
  }
}
