import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  Not,
  Repository,
  type FindOptionsWhere,
  type QueryDeepPartialEntity,
} from 'typeorm';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import {
  paginationMeta,
  requestedPage,
} from 'src/common/utils/pagination.util';
import {
  lockMerchantScope,
  MerchantLockScope,
} from 'src/common/utils/merchant-lock.util';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { MerchantPaymentConfig } from './entities/merchant-payment-config.entity';
import { PaymentTerminal } from '../payment-terminals/entities/payment-terminal.entity';
import { CreateMerchantPaymentConfigDto } from './dto/create-merchant-payment-config.dto';
import { UpdateMerchantPaymentConfigDto } from './dto/update-merchant-payment-config.dto';
import {
  AllMerchantPaymentConfigsResponseDto,
  GetMerchantPaymentConfigsQueryDto,
  MerchantPaymentConfigResponseDto,
  OneMerchantPaymentConfigResponseDto,
} from './dto/merchant-payment-config-response.dto';
import {
  PaymentEnvironment,
  PaymentProvider,
} from '../constants/payment-provider.enum';
import { credentialErrors } from '../constants/provider-credentials';
import { CredentialsCipherService } from '../utils/credentials-cipher.service';
import { credentialsPreview } from '../utils/credentials-mask.util';
import {
  assertCompanyAccess,
  isUniqueViolation,
} from '../utils/company-access.util';
import { GatewayConfig } from '../gateway/payment-gateway.interface';

/** AAD del cifrado: empresa y proveedor no cambian en la vida de una fila. */
function credentialsAad(companyId: number, provider: PaymentProvider): string {
  return `merchant_payment_config:${companyId}:${provider}`;
}

@Injectable()
export class MerchantPaymentConfigsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(MerchantPaymentConfig)
    private readonly configRepository: Repository<MerchantPaymentConfig>,
    private readonly cipher: CredentialsCipherService,
  ) {}

  async create(
    companyId: number,
    dto: CreateMerchantPaymentConfigDto,
    user: AuthenticatedUser,
  ): Promise<OneMerchantPaymentConfigResponseDto> {
    assertCompanyAccess(user, companyId);

    const environment = dto.environment ?? PaymentEnvironment.SANDBOX;
    const credentials = this.validCredentials(
      dto.provider,
      environment,
      dto.credentials,
    );
    const isActive = dto.isActive ?? true;
    if (dto.isDefault && !isActive) {
      ErrorHandler.badRequest(
        'An inactive payment config cannot be the default',
      );
    }

    const id = await this.inDefaultsTransaction(companyId, async (manager) => {
      if (dto.merchantId != null) {
        await this.assertBranch(manager, companyId, dto.merchantId);
      }
      const hasDefault = await manager.exists(MerchantPaymentConfig, {
        where: { company_id: companyId, is_default: true },
      });
      // La primera configuración activa de la empresa queda por defecto
      const isDefault = dto.isDefault ?? (isActive && !hasDefault);
      if (isDefault && hasDefault) {
        await this.unsetDefault(manager, companyId);
      }

      const saved = await manager.save(
        manager.create(MerchantPaymentConfig, {
          company_id: companyId,
          merchant_id: dto.merchantId ?? null,
          provider: dto.provider,
          environment,
          display_name: dto.displayName.trim(),
          credentials: this.cipher.encrypt(
            credentials,
            credentialsAad(companyId, dto.provider),
          ),
          credentials_preview: credentialsPreview(dto.provider, credentials),
          is_active: isActive,
          is_default: isDefault,
        }),
      );
      return saved.id;
    });

    return {
      statusCode: 201,
      message: 'Payment config created successfully',
      data: this.format(await this.findOrFail(companyId, id)),
    };
  }

  async findAll(
    companyId: number,
    query: GetMerchantPaymentConfigsQueryDto,
    user: AuthenticatedUser,
  ): Promise<AllMerchantPaymentConfigsResponseDto> {
    assertCompanyAccess(user, companyId);

    const where: FindOptionsWhere<MerchantPaymentConfig> = {
      company_id: companyId,
    };
    if (query.provider) where.provider = query.provider;
    if (query.merchantId) where.merchant_id = query.merchantId;
    if (query.isActive !== undefined) where.is_active = query.isActive;

    const page = requestedPage(query);
    const [rows, total] = await this.configRepository.findAndCount({
      where,
      order: { is_default: 'DESC', id: 'ASC' },
      ...(page ? { skip: page.skip, take: page.limit } : {}),
    });

    return {
      statusCode: 200,
      message: 'Payment configs retrieved successfully',
      data: rows.map((row) => this.format(row)),
      ...(page ? paginationMeta(page.page, page.limit, total) : {}),
    };
  }

  async findOne(
    companyId: number,
    id: number,
    user: AuthenticatedUser,
  ): Promise<OneMerchantPaymentConfigResponseDto> {
    assertCompanyAccess(user, companyId);
    return {
      statusCode: 200,
      message: 'Payment config retrieved successfully',
      data: this.format(await this.findOrFail(companyId, id)),
    };
  }

  async update(
    companyId: number,
    id: number,
    dto: UpdateMerchantPaymentConfigDto,
    user: AuthenticatedUser,
  ): Promise<OneMerchantPaymentConfigResponseDto> {
    assertCompanyAccess(user, companyId);

    await this.inDefaultsTransaction(companyId, async (manager) => {
      const row = await manager
        .createQueryBuilder(MerchantPaymentConfig, 'config')
        .addSelect('config.credentials')
        .where('config.id = :id AND config.company_id = :companyId', {
          id,
          companyId,
        })
        .getOne();
      if (!row) ErrorHandler.notFound('Payment config not found');

      const patch: QueryDeepPartialEntity<MerchantPaymentConfig> = {};
      const environment = dto.environment ?? row.environment;
      if (dto.environment !== undefined) patch.environment = environment;
      if (dto.displayName !== undefined) {
        patch.display_name = dto.displayName.trim();
      }

      // Las credenciales se vuelven a validar también al cambiar de entorno (test/live)
      if (dto.credentials !== undefined || environment !== row.environment) {
        const aad = credentialsAad(companyId, row.provider);
        const merged = this.cipher.decrypt(row.credentials, aad);
        for (const [key, value] of Object.entries(dto.credentials ?? {})) {
          if (value === null) delete merged[key];
          else merged[key] = value;
        }
        const credentials = this.validCredentials(
          row.provider,
          environment,
          merged,
        );
        patch.credentials = this.cipher.encrypt(credentials, aad);
        patch.credentials_preview = credentialsPreview(
          row.provider,
          credentials,
        );
      }

      if (dto.merchantId !== undefined && dto.merchantId !== row.merchant_id) {
        if (dto.merchantId !== null) {
          await this.assertBranch(manager, companyId, dto.merchantId);
          const elsewhere = await manager.count(PaymentTerminal, {
            where: { payment_config_id: id, merchant_id: Not(dto.merchantId) },
          });
          if (elsewhere > 0) {
            ErrorHandler.exists(
              `${elsewhere} terminal(s) of other branches use this config; move or unbind them first`,
            );
          }
        }
        patch.merchant_id = dto.merchantId;
      }

      const isActive = dto.isActive ?? row.is_active;
      let isDefault = dto.isDefault ?? row.is_default;
      if (dto.isDefault === true && !isActive) {
        ErrorHandler.badRequest(
          'An inactive payment config cannot be the default',
        );
      }
      if (!isActive) isDefault = false;
      if (isDefault && !row.is_default) {
        await this.unsetDefault(manager, companyId);
      }
      patch.is_active = isActive;
      patch.is_default = isDefault;

      await manager.update(MerchantPaymentConfig, { id }, patch);
    });

    return {
      statusCode: 200,
      message: 'Payment config updated successfully',
      data: this.format(await this.findOrFail(companyId, id)),
    };
  }

  async remove(
    companyId: number,
    id: number,
    user: AuthenticatedUser,
  ): Promise<OneMerchantPaymentConfigResponseDto> {
    assertCompanyAccess(user, companyId);
    const row = await this.findOrFail(companyId, id);

    const terminals = await this.dataSource.manager.count(PaymentTerminal, {
      where: { payment_config_id: id },
    });
    if (terminals > 0) {
      ErrorHandler.exists(
        `${terminals} terminal(s) are bound to this payment config; delete or rebind them first`,
      );
    }

    await this.configRepository.delete({ id, company_id: companyId });
    return {
      statusCode: 200,
      message: 'Payment config deleted successfully',
      data: this.format(row),
    };
  }

  /**
   * Configuración activa y descifrada para cobrar: la indicada o, sin id, la de por
   * defecto de la empresa. Solo la usa el motor de pagos; nunca sale por la API.
   */
  async resolveGatewayConfig(
    companyId: number,
    configId?: number,
  ): Promise<GatewayConfig> {
    const qb = this.configRepository
      .createQueryBuilder('config')
      .addSelect('config.credentials')
      .where('config.company_id = :companyId', { companyId })
      .andWhere('config.is_active = true');
    if (configId !== undefined)
      qb.andWhere('config.id = :configId', { configId });
    else qb.andWhere('config.is_default = true');

    const row = await qb.getOne();
    if (!row) {
      if (configId !== undefined) {
        ErrorHandler.notFound(`Active payment config ${configId} not found`);
      }
      ErrorHandler.badRequest('The company has no default payment config');
    }

    return {
      id: row.id,
      provider: row.provider,
      environment: row.environment,
      credentials: this.cipher.decrypt(
        row.credentials,
        credentialsAad(companyId, row.provider),
      ),
    };
  }

  private validCredentials(
    provider: PaymentProvider,
    environment: PaymentEnvironment,
    credentials: Record<string, unknown>,
  ): Record<string, string> {
    const errors = credentialErrors(provider, environment, credentials);
    if (errors.length > 0) ErrorHandler.badRequest(errors.join('; '));
    return credentials as Record<string, string>;
  }

  /**
   * Las escrituras que mueven la marca de por defecto se serializan por empresa; el
   * índice único parcial es la red de seguridad si algo se salta el candado.
   */
  private async inDefaultsTransaction<T>(
    companyId: number,
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        await lockMerchantScope(
          manager,
          MerchantLockScope.COMPANY_PAYMENT_DEFAULT,
          companyId,
        );
        const companyExists = await manager.exists(Company, {
          where: { id: companyId },
        });
        if (!companyExists) ErrorHandler.resourceNotFound('Company', companyId);
        return work(manager);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        ErrorHandler.exists('The company already has a default payment config');
      }
      throw error;
    }
  }

  private async unsetDefault(
    manager: EntityManager,
    companyId: number,
  ): Promise<void> {
    await manager.update(
      MerchantPaymentConfig,
      { company_id: companyId, is_default: true },
      { is_default: false },
    );
  }

  private async assertBranch(
    manager: EntityManager,
    companyId: number,
    merchantId: number,
  ): Promise<void> {
    const belongs = await manager.exists(Merchant, {
      where: { id: merchantId, companyId },
    });
    if (!belongs) {
      ErrorHandler.badRequest(
        `Merchant ${merchantId} is not a branch of company ${companyId}`,
      );
    }
  }

  private async findOrFail(
    companyId: number,
    id: number,
  ): Promise<MerchantPaymentConfig> {
    const row = await this.configRepository.findOne({
      where: { id, company_id: companyId },
    });
    if (!row) ErrorHandler.notFound('Payment config not found');
    return row;
  }

  private format(row: MerchantPaymentConfig): MerchantPaymentConfigResponseDto {
    return {
      id: row.id,
      companyId: row.company_id,
      merchantId: row.merchant_id,
      provider: row.provider,
      environment: row.environment,
      displayName: row.display_name,
      credentials: row.credentials_preview,
      isActive: row.is_active,
      isDefault: row.is_default,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
