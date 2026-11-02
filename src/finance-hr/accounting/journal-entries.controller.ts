import {
  Controller,
  Get,
  Post,
  Delete,
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

export class CreateFinanceHrJournalEntryLineDto {
  @ApiProperty({ example: 2, description: 'Ledger Account ID' })
  account_id: number;

  @ApiPropertyOptional({ example: '1100', description: 'Account code' })
  account_code?: string;

  @ApiPropertyOptional({
    example: 'Raw Material Inventory',
    description: 'Account name',
  })
  account_name?: string;

  @ApiProperty({
    example: 1250.0,
    description: 'Debit amount (0 if credit line)',
  })
  debit: number;

  @ApiProperty({
    example: 0.0,
    description: 'Credit amount (0 if debit line)',
  })
  credit: number;

  @ApiPropertyOptional({
    example: 'Stock receipt: 50.0 KG Flour 25kg bag via PO #PO-2026-089',
    description: 'Line description',
  })
  description?: string;
}

export class CreateFinanceHrJournalEntryDto {
  @ApiPropertyOptional({
    example: '2026-08-20',
    description: 'Entry date (YYYY-MM-DD)',
  })
  entry_date?: string;

  @ApiProperty({
    example:
      'Stock Receipt: 50 KG Flour 25kg bag via Purchase Order #PO-2026-089',
    description: 'Entry description',
  })
  description: string;

  @ApiPropertyOptional({
    example: 'INVENTORY',
    description: 'Reference type (ORDER, INVENTORY, ADJUSTMENT, MANUAL)',
  })
  reference_type?: 'ORDER' | 'INVENTORY' | 'ADJUSTMENT' | 'MANUAL';

  @ApiPropertyOptional({ example: 89, description: 'Referenced entity ID' })
  reference_id?: number;

  @ApiProperty({
    type: [CreateFinanceHrJournalEntryLineDto],
    description: 'List of debit and credit lines (must be balanced)',
  })
  lines: CreateFinanceHrJournalEntryLineDto[];
}

export interface JournalEntryLineDto {
  id: number;
  account: { id: number; code: string; name: string };
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntryDto {
  id: number;
  entry_number: string;
  entry_date: string;
  description: string;
  status: 'DRAFT' | 'POSTED' | 'VOIDED';
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
  reference_type?: 'ORDER' | 'INVENTORY' | 'ADJUSTMENT' | 'MANUAL';
  reference_id?: number | null;
  created_at: string;
  updated_at: string;
  company?: { id: number; name: string };
  lines: JournalEntryLineDto[];
}

let MOCK_JOURNAL_ENTRIES: JournalEntryDto[] = [
  {
    id: 1,
    entry_number: 'JE-2026-001',
    entry_date: '2026-08-20',
    description:
      'Stock Receipt: 50 KG Flour 25kg bag via Purchase Order #PO-2026-089',
    status: 'POSTED',
    total_debit: 1250.0,
    total_credit: 1250.0,
    is_balanced: true,
    reference_type: 'INVENTORY',
    reference_id: 89,
    created_at: '2026-08-20T10:00:00Z',
    updated_at: '2026-08-20T10:00:00Z',
    company: { id: 1, name: 'Main Merchant Branch' },
    lines: [
      {
        id: 101,
        account: { id: 2, code: '1100', name: 'Raw Material Inventory' },
        debit: 1250.0,
        credit: 0.0,
        description:
          'Stock receipt: 50.0 KG Flour 25kg bag via PO #PO-2026-089',
      },
      {
        id: 102,
        account: { id: 6, code: '2100', name: 'Accounts Payable' },
        debit: 0.0,
        credit: 1250.0,
        description:
          'Supplier Accounts Payable liability for Purchase Order #PO-2026-089',
      },
    ],
  },
  {
    id: 2,
    entry_number: 'JE-2026-002',
    entry_date: '2026-08-19',
    description: 'POS Sales Depletion & Cost Allocation Order #1088',
    status: 'POSTED',
    total_debit: 345.5,
    total_credit: 345.5,
    is_balanced: true,
    reference_type: 'ORDER',
    reference_id: 1088,
    created_at: '2026-08-19T15:30:00Z',
    updated_at: '2026-08-19T15:30:00Z',
    company: { id: 1, name: 'Main Merchant Branch' },
    lines: [
      {
        id: 103,
        account: { id: 13, code: '5100', name: 'Cost of Goods Sold' },
        debit: 345.5,
        credit: 0.0,
        description:
          'Stock depletion: 15.5 KG Flour 25kg bag via POS Sales Order #1088',
      },
      {
        id: 104,
        account: { id: 2, code: '1100', name: 'Raw Material Inventory' },
        debit: 0.0,
        credit: 345.5,
        description:
          'Raw material inventory reduction via POS Sales Order #1088',
      },
    ],
  },
  {
    id: 3,
    entry_number: 'JE-2026-003',
    entry_date: '2026-08-18',
    description: 'Stock Waste Write-off: Expired Whole Milk Batch #042',
    status: 'POSTED',
    total_debit: 88.0,
    total_credit: 88.0,
    is_balanced: true,
    reference_type: 'INVENTORY',
    reference_id: 42,
    created_at: '2026-08-18T09:15:00Z',
    updated_at: '2026-08-18T09:15:00Z',
    company: { id: 1, name: 'Main Merchant Branch' },
    lines: [
      {
        id: 105,
        account: { id: 14, code: '5200', name: 'Waste & Shrinkage Expense' },
        debit: 88.0,
        credit: 0.0,
        description:
          'Inventory waste breakdown: 2.0 L Whole Milk (Expired batch)',
      },
      {
        id: 106,
        account: { id: 2, code: '1100', name: 'Raw Material Inventory' },
        debit: 0.0,
        credit: 88.0,
        description: 'Raw material inventory write-off for expired batch #042',
      },
    ],
  },
  {
    id: 4,
    entry_number: 'JE-2026-004',
    entry_date: '2026-08-17',
    description: 'Physical Inventory Audit Adjustment - Main Storage Hub',
    status: 'DRAFT',
    total_debit: 150.0,
    total_credit: 150.0,
    is_balanced: true,
    reference_type: 'ADJUSTMENT',
    reference_id: 15,
    created_at: '2026-08-17T11:45:00Z',
    updated_at: '2026-08-17T11:45:00Z',
    company: { id: 1, name: 'Main Merchant Branch' },
    lines: [
      {
        id: 107,
        account: { id: 2, code: '1100', name: 'Raw Material Inventory' },
        debit: 150.0,
        credit: 0.0,
        description:
          'Physical count adjustment: System count 10 -> Actual count 15 (+5 units)',
      },
      {
        id: 108,
        account: {
          id: 15,
          code: '5300',
          name: 'Inventory Adjustment Variance',
        },
        debit: 0.0,
        credit: 150.0,
        description: 'Physical count variance adjustment gain credit',
      },
    ],
  },
];

@ApiTags('Finance & HR - Accounting - Journal Entries Engine')
@ApiExtraModels(ErrorResponse, CreateFinanceHrJournalEntryDto)
@ApiBearerAuth()
@Controller('journal-entry')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.JOURNAL_ENTRIES)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class JournalEntriesController {
  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary: 'Get journal entries directory',
    description:
      'Retrieves a list of journal entries filtered by search term, status, or reference type.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    example: 'Stock',
    description: 'Search by entry number, description, or line account details',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    example: 'POSTED',
    description: 'Filter by status (DRAFT, POSTED, VOIDED)',
  })
  @ApiQuery({
    name: 'referenceType',
    required: false,
    type: String,
    example: 'INVENTORY',
    description:
      'Filter by reference type (ORDER, INVENTORY, ADJUSTMENT, MANUAL)',
  })
  @ApiOkResponse({
    description: 'Journal entries directory retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 1,
            entry_number: 'JE-2026-001',
            entry_date: '2026-08-20',
            description:
              'Stock Receipt: 50 KG Flour 25kg bag via Purchase Order #PO-2026-089',
            status: 'POSTED',
            total_debit: 1250.0,
            total_credit: 1250.0,
            is_balanced: true,
            reference_type: 'INVENTORY',
            reference_id: 89,
            created_at: '2026-08-20T10:00:00Z',
            updated_at: '2026-08-20T10:00:00Z',
            company: { id: 1, name: 'Main Merchant Branch' },
            lines: [
              {
                id: 101,
                account: {
                  id: 2,
                  code: '1100',
                  name: 'Raw Material Inventory',
                },
                debit: 1250.0,
                credit: 0.0,
                description:
                  'Stock receipt: 50.0 KG Flour 25kg bag via PO #PO-2026-089',
              },
              {
                id: 102,
                account: { id: 6, code: '2100', name: 'Accounts Payable' },
                debit: 0.0,
                credit: 1250.0,
                description:
                  'Supplier Accounts Payable liability for Purchase Order #PO-2026-089',
              },
            ],
          },
        ],
        total: 1,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid search query parameters',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid query parameters',
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
  async getEntries(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('referenceType') referenceType?: string,
  ) {
    let filtered = [...MOCK_JOURNAL_ENTRIES];

    if (search) {
      const term = search.toLowerCase().trim();
      filtered = filtered.filter(
        (e) =>
          e.entry_number.toLowerCase().includes(term) ||
          e.description.toLowerCase().includes(term) ||
          e.lines.some(
            (l) =>
              l.account?.code.toLowerCase().includes(term) ||
              l.account?.name.toLowerCase().includes(term),
          ),
      );
    }

    if (status) {
      filtered = filtered.filter((e) => e.status === status);
    }

    if (referenceType) {
      filtered = filtered.filter((e) => e.reference_type === referenceType);
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
    summary: 'Create new journal entry',
    description:
      'Creates a new draft journal entry with debit and credit lines.',
  })
  @ApiBody({
    type: CreateFinanceHrJournalEntryDto,
    description: 'Journal entry creation payload with lines',
    examples: {
      createEntry: {
        summary: 'Create balanced inventory entry',
        value: {
          entry_date: '2026-08-20',
          description:
            'Stock Receipt: 50 KG Flour 25kg bag via Purchase Order #PO-2026-089',
          reference_type: 'INVENTORY',
          reference_id: 89,
          lines: [
            {
              account_id: 2,
              account_code: '1100',
              account_name: 'Raw Material Inventory',
              debit: 1250.0,
              credit: 0.0,
              description:
                'Stock receipt: 50.0 KG Flour 25kg bag via PO #PO-2026-089',
            },
            {
              account_id: 6,
              account_code: '2100',
              account_name: 'Accounts Payable',
              debit: 0.0,
              credit: 1250.0,
              description:
                'Supplier Accounts Payable liability for Purchase Order #PO-2026-089',
            },
          ],
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Journal entry created successfully',
    schema: {
      example: {
        data: {
          id: 1727091234567,
          entry_number: 'JE-2026-005',
          entry_date: '2026-08-20',
          description:
            'Stock Receipt: 50 KG Flour 25kg bag via Purchase Order #PO-2026-089',
          status: 'DRAFT',
          total_debit: 1250.0,
          total_credit: 1250.0,
          is_balanced: true,
          reference_type: 'INVENTORY',
          reference_id: 89,
          created_at: '2026-09-23T11:20:00.000Z',
          updated_at: '2026-09-23T11:20:00.000Z',
          company: { id: 1, name: 'Main Merchant Branch' },
          lines: [
            {
              id: 1727091234568,
              account: {
                id: 2,
                code: '1100',
                name: 'Raw Material Inventory',
              },
              debit: 1250.0,
              credit: 0.0,
              description:
                'Stock receipt: 50.0 KG Flour 25kg bag via PO #PO-2026-089',
            },
            {
              id: 1727091234569,
              account: { id: 6, code: '2100', name: 'Accounts Payable' },
              debit: 0.0,
              credit: 1250.0,
              description:
                'Supplier Accounts Payable liability for Purchase Order #PO-2026-089',
            },
          ],
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid payload or unbalanced entry (debit ≠ credit)',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message:
          'Journal entry is not balanced: total debit (1250) ≠ total credit (1000)',
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
  async createEntry(@Body() dto: any) {
    const nextSeq = MOCK_JOURNAL_ENTRIES.length + 1;
    const entryNumber = `JE-2026-00${nextSeq}`;

    const lines: JournalEntryLineDto[] = (dto.lines || []).map(
      (l: any, idx: number) => ({
        id: Date.now() + idx,
        account: {
          id: l.account_id || 1100,
          code: l.account_code || '1100',
          name: l.account_name || 'Raw Material Inventory',
        },
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
        description: l.description || '',
      }),
    );

    const totalDebit = lines.reduce((acc, l) => acc + l.debit, 0);
    const totalCredit = lines.reduce((acc, l) => acc + l.credit, 0);

    const newEntry: JournalEntryDto = {
      id: Date.now(),
      entry_number: entryNumber,
      entry_date: dto.entry_date || new Date().toISOString().split('T')[0],
      description: dto.description || 'Manual Journal Entry',
      status: 'DRAFT',
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_balanced: Math.abs(totalDebit - totalCredit) < 0.01,
      reference_type: dto.reference_type || 'MANUAL',
      reference_id: dto.reference_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      company: { id: 1, name: 'Main Merchant Branch' },
      lines,
    };

    MOCK_JOURNAL_ENTRIES.unshift(newEntry);
    return { data: newEntry };
  }

  @Post(':id/post')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB)
  @ApiOperation({
    summary: 'Post journal entry',
    description:
      'Posts a draft journal entry, locking it against further changes.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '4',
    description: 'Journal Entry ID to post',
  })
  @ApiOkResponse({
    description: 'Journal entry posted successfully',
    schema: {
      example: {
        data: {
          id: 4,
          entry_number: 'JE-2026-004',
          entry_date: '2026-08-17',
          description: 'Physical Inventory Audit Adjustment - Main Storage Hub',
          status: 'POSTED',
          total_debit: 150.0,
          total_credit: 150.0,
          is_balanced: true,
          reference_type: 'ADJUSTMENT',
          reference_id: 15,
          created_at: '2026-08-17T11:45:00Z',
          updated_at: '2026-09-23T11:20:00.000Z',
          company: { id: 1, name: 'Main Merchant Branch' },
          lines: [
            {
              id: 107,
              account: {
                id: 2,
                code: '1100',
                name: 'Raw Material Inventory',
              },
              debit: 150.0,
              credit: 0.0,
              description:
                'Physical count adjustment: System count 10 -> Actual count 15 (+5 units)',
            },
            {
              id: 108,
              account: {
                id: 15,
                code: '5300',
                name: 'Inventory Adjustment Variance',
              },
              debit: 0.0,
              credit: 150.0,
              description: 'Physical count variance adjustment gain credit',
            },
          ],
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid journal entry ID or entry is already posted',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Journal entry is already posted',
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
    description: 'Journal entry not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Journal entry #99 not found',
        error: 'Not Found',
      },
    },
  })
  async postEntry(@Param('id') id: string) {
    const entry = MOCK_JOURNAL_ENTRIES.find((e) => e.id === Number(id));
    if (!entry) throw new NotFoundException(`Journal entry #${id} not found`);

    entry.status = 'POSTED';
    entry.updated_at = new Date().toISOString();

    return { data: entry };
  }

  @Post(':id/void')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB)
  @ApiOperation({
    summary: 'Void journal entry',
    description: 'Voids a posted journal entry for audit purposes.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
    description: 'Journal Entry ID to void',
  })
  @ApiOkResponse({
    description: 'Journal entry voided successfully',
    schema: {
      example: {
        data: {
          id: 1,
          entry_number: 'JE-2026-001',
          entry_date: '2026-08-20',
          description:
            'Stock Receipt: 50 KG Flour 25kg bag via Purchase Order #PO-2026-089',
          status: 'VOIDED',
          total_debit: 1250.0,
          total_credit: 1250.0,
          is_balanced: true,
          reference_type: 'INVENTORY',
          reference_id: 89,
          created_at: '2026-08-20T10:00:00Z',
          updated_at: '2026-09-23T11:20:00.000Z',
          company: { id: 1, name: 'Main Merchant Branch' },
          lines: [
            {
              id: 101,
              account: {
                id: 2,
                code: '1100',
                name: 'Raw Material Inventory',
              },
              debit: 1250.0,
              credit: 0.0,
              description:
                'Stock receipt: 50.0 KG Flour 25kg bag via PO #PO-2026-089',
            },
            {
              id: 102,
              account: { id: 6, code: '2100', name: 'Accounts Payable' },
              debit: 0.0,
              credit: 1250.0,
              description:
                'Supplier Accounts Payable liability for Purchase Order #PO-2026-089',
            },
          ],
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid journal entry ID or entry is already voided',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Journal entry is already voided',
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
    description: 'Journal entry not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Journal entry #99 not found',
        error: 'Not Found',
      },
    },
  })
  async voidEntry(@Param('id') id: string) {
    const entry = MOCK_JOURNAL_ENTRIES.find((e) => e.id === Number(id));
    if (!entry) throw new NotFoundException(`Journal entry #${id} not found`);

    entry.status = 'VOIDED';
    entry.updated_at = new Date().toISOString();

    return { data: entry };
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB)
  @ApiOperation({
    summary: 'Delete draft journal entry',
    description: 'Permanently removes a draft journal entry.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '4',
    description: 'Journal Entry ID to delete',
  })
  @ApiOkResponse({
    description: 'Journal entry deleted successfully',
    schema: {
      example: {
        success: true,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID or entry is not in DRAFT status',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Only DRAFT journal entries can be deleted',
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
    description: 'Journal entry not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Journal entry #99 not found',
        error: 'Not Found',
      },
    },
  })
  async deleteEntry(@Param('id') id: string) {
    const numericId = Number(id);
    MOCK_JOURNAL_ENTRIES = MOCK_JOURNAL_ENTRIES.filter(
      (e) => e.id !== numericId,
    );
    return { success: true };
  }
}
