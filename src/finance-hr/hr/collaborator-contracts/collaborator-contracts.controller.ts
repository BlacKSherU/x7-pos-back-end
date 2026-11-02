import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Delete,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  PayloadTooLargeException,
  ParseIntPipe,
  UseGuards,
  Request,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import { CollaboratorContractsService } from './collaborator-contracts.service';
import { CreateCollaboratorContractDto } from './dto/create-collaborator-contract.dto';
import { UpdateCollaboratorContractDto } from './dto/update-collaborator-contract.dto';
import { GetCollaboratorContractQueryDto } from './dto/get-collaborator-contract-query.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import {
  ContractRevisionsResponseDto,
  OneCollaboratorContractResponseDto,
} from './dto/collaborator-contract-response.dto';
import {
  ALLOWED_CONTRACT_DOCUMENT_EXTENSIONS,
  ALLOWED_CONTRACT_DOCUMENT_MIME_TYPES,
  CONTRACT_DOCUMENT_DIR,
  MAX_CONTRACT_DOCUMENT_BYTES,
} from './constants/contract-document.constants';
import { PaginatedCollaboratorContractsResponseDto } from './dto/paginated-collaborator-contracts-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

/**
 * File uploaded, with the fields provided by the memory storage.
 *
 * It is declared here because the project does not include `@types/multer`, and the attachment is written to disk manually instead of using `diskStorage` to avoid relying on those types.
 */
interface UploadedContractDocument {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/** The attachment under `uploads/contracts` persists, which main.ts already serves as static.. */
function storeContractDocument(file: UploadedContractDocument): string {
  const dir = join(process.cwd(), CONTRACT_DOCUMENT_DIR);
  mkdirSync(dir, { recursive: true });
  const ext = extname(file.originalname).toLowerCase();
  // unguessable name; the folder is private and downloads go through signed links
  const filename = `${randomUUID()}${ext}`;
  writeFileSync(join(dir, filename), file.buffer);
  return filename;
}

@ApiTags('Finance & HR - HR - Collaborator contracts')
@ApiBearerAuth()
@Controller('collaborator-contracts')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.COLLABORATOR_CONTRACTS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class CollaboratorContractsController {
  constructor(
    private readonly collaboratorContractsService: CollaboratorContractsService,
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

  /** Obtains the user ID of the authenticated user. */
  private userIdOf(
    req: ExpressRequest & { user?: AuthenticatedUser },
  ): number | null {
    return req.user?.id ?? null;
  }

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create collaborator contract' })
  @ApiBody({
    type: CreateCollaboratorContractDto,
    description: 'Contract data. "active" is optional and defaults to true.',
    examples: {
      minimal: {
        summary: 'Minimal (active defaults to true)',
        value: {
          company_id: 1,
          merchant_id: 1,
          collaborator_id: 1,
          contract_type: 'hourly',
          start_date: '2024-01-01',
        },
      },
      full: {
        summary: 'With all optional fields',
        value: {
          company_id: 1,
          merchant_id: 1,
          collaborator_id: 1,
          contract_type: 'salary',
          base_salary: 500000,
          hourly_rate: 0,
          overtime_multiplier: 1.5,
          double_overtime_multiplier: 2,
          tips_included_in_payroll: false,
          start_date: '2024-01-01',
          end_date: '2025-12-31',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Contract created',
    type: OneCollaboratorContractResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({
    description: 'Company, Merchant or Collaborator not found',
  })
  async create(
    @Body() dto: CreateCollaboratorContractDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneCollaboratorContractResponseDto> {
    const merchantId = this.merchantIdOf(req);
    return this.collaboratorContractsService.create(dto, merchantId);
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Get all collaborator contracts (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'company_id', required: false })
  @ApiQuery({ name: 'merchant_id', required: false })
  @ApiQuery({ name: 'collaborator_id', required: false })
  @ApiQuery({ name: 'active', required: false })
  @ApiOkResponse({
    description: 'Paginated contracts',
    type: PaginatedCollaboratorContractsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: GetCollaboratorContractQueryDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<PaginatedCollaboratorContractsResponseDto> {
    const merchantId = this.merchantIdOf(req);
    return this.collaboratorContractsService.findAll(query, merchantId);
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
  @ApiOperation({ summary: 'Get collaborator contract by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Contract found',
    type: OneCollaboratorContractResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Contract not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneCollaboratorContractResponseDto> {
    const merchantId = this.merchantIdOf(req);
    return this.collaboratorContractsService.findOne(id, merchantId);
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
  @ApiOperation({ summary: 'Update collaborator contract' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Contract updated',
    type: OneCollaboratorContractResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiNotFoundResponse({ description: 'Contract not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCollaboratorContractDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneCollaboratorContractResponseDto> {
    const merchantId = this.merchantIdOf(req);
    return this.collaboratorContractsService.update(
      id,
      dto,
      merchantId,
      this.userIdOf(req),
    );
  }

  /**
   * PUT alias for partial amendments.
   *
   * The DTO is now entirely optional, so both verbs do the same thing; PATCH is exposed because that's what the client expects when sending only the terms that change..
   */
  @Patch(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Amend collaborator contract (partial update)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Contract amended',
    type: OneCollaboratorContractResponseDto,
  })
  async amend(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCollaboratorContractDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneCollaboratorContractResponseDto> {
    const merchantId = this.merchantIdOf(req);
    return this.collaboratorContractsService.update(
      id,
      dto,
      merchantId,
      this.userIdOf(req),
    );
  }

  @Post(':id/document')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseInterceptors(
    FileInterceptor('document', {
      limits: { fileSize: MAX_CONTRACT_DOCUMENT_BYTES },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        const allowed =
          ALLOWED_CONTRACT_DOCUMENT_MIME_TYPES.includes(file.mimetype) ||
          ALLOWED_CONTRACT_DOCUMENT_EXTENSIONS.includes(ext);
        cb(
          allowed
            ? null
            : new BadRequestException(
                'Only PDF or Word documents are accepted as signed contracts',
              ),
          allowed,
        );
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload the signed contract document (PDF/DOCX)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { document: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({
    description: 'Document attached',
    type: OneCollaboratorContractResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Missing or unsupported file' })
  async uploadDocument(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: UploadedContractDocument | undefined,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneCollaboratorContractResponseDto> {
    const merchantId = this.merchantIdOf(req);
    if (!file) {
      throw new BadRequestException('A contract document file is required');
    }
    if (file.size > MAX_CONTRACT_DOCUMENT_BYTES) {
      throw new PayloadTooLargeException(
        'The signed contract must be 10MB or smaller',
      );
    }
    const filename = storeContractDocument(file);
    return this.collaboratorContractsService.attachDocument(
      id,
      {
        url: `/${CONTRACT_DOCUMENT_DIR}/${filename}`,
        name: file.originalname,
      },
      merchantId,
      this.userIdOf(req),
    );
  }

  @Get(':id/revisions')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Amendment history of a contract' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Amendment log, newest first',
    type: ContractRevisionsResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Contract not found' })
  async revisions(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<ContractRevisionsResponseDto> {
    const merchantId = this.merchantIdOf(req);
    return this.collaboratorContractsService.revisions(id, merchantId);
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
  @ApiOperation({ summary: 'Delete collaborator contract' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Contract deleted',
    type: OneCollaboratorContractResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Contract not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneCollaboratorContractResponseDto> {
    const merchantId = this.merchantIdOf(req);
    return this.collaboratorContractsService.remove(id, merchantId);
  }
}
