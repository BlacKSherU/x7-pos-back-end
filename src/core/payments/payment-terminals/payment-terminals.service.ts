import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  type FindOptionsWhere,
  type QueryDeepPartialEntity,
} from 'typeorm';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import {
  paginationMeta,
  requestedPage,
} from 'src/common/utils/pagination.util';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { CashDrawer } from 'src/restaurant-operations/cashdrawer/cash-drawers/entities/cash-drawer.entity';
import { PaymentTerminal } from './entities/payment-terminal.entity';
import { MerchantPaymentConfig } from '../merchant-payment-configs/entities/merchant-payment-config.entity';
import { CreatePaymentTerminalDto } from './dto/create-payment-terminal.dto';
import { UpdatePaymentTerminalDto } from './dto/update-payment-terminal.dto';
import {
  AllPaymentTerminalsResponseDto,
  GetPaymentTerminalsQueryDto,
  OnePaymentTerminalResponseDto,
  PaymentTerminalResponseDto,
} from './dto/payment-terminal-response.dto';
import { DEVICE_IDENTIFIER_PATTERNS } from '../constants/provider-credentials';
import {
  assertCompanyAccess,
  isUniqueViolation,
} from '../utils/company-access.util';

const TERMINAL_RELATIONS = ['paymentConfig'] as const;

/** Lo que el motor de pagos necesita de un terminal para cobrar en él. */
export interface TerminalRoute {
  terminalId: number;
  merchantId: number;
  paymentConfigId: number;
  deviceIdentifier: string;
}

@Injectable()
export class PaymentTerminalsService {
  constructor(
    @InjectRepository(PaymentTerminal)
    private readonly terminalRepository: Repository<PaymentTerminal>,
    @InjectRepository(MerchantPaymentConfig)
    private readonly configRepository: Repository<MerchantPaymentConfig>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    @InjectRepository(CashDrawer)
    private readonly cashDrawerRepository: Repository<CashDrawer>,
  ) {}

  async create(
    companyId: number,
    dto: CreatePaymentTerminalDto,
    user: AuthenticatedUser,
  ): Promise<OnePaymentTerminalResponseDto> {
    assertCompanyAccess(user, companyId);
    await this.assertBranch(companyId, dto.merchantId);
    const config = await this.bindableConfig(
      companyId,
      dto.paymentConfigId,
      dto.merchantId,
    );
    const deviceIdentifier = this.validDeviceIdentifier(
      config,
      dto.deviceIdentifier,
    );
    if (dto.cashDrawerId != null) {
      await this.assertCashDrawer(dto.merchantId, dto.cashDrawerId);
    }

    const saved = await this.uniqueDevice(() =>
      this.terminalRepository.save({
        company_id: companyId,
        merchant_id: dto.merchantId,
        payment_config_id: config.id,
        cash_drawer_id: dto.cashDrawerId ?? null,
        name: dto.name.trim(),
        model: dto.model?.trim() || null,
        device_identifier: deviceIdentifier,
        is_active: dto.isActive ?? true,
      }),
    );

    return {
      statusCode: 201,
      message: 'Payment terminal created successfully',
      data: this.format(await this.findOrFail(companyId, saved.id)),
    };
  }

  async findAll(
    companyId: number,
    query: GetPaymentTerminalsQueryDto,
    user: AuthenticatedUser,
  ): Promise<AllPaymentTerminalsResponseDto> {
    assertCompanyAccess(user, companyId);

    const where: FindOptionsWhere<PaymentTerminal> = { company_id: companyId };
    const ownMerchant = this.ownMerchantOnly(user);
    if (ownMerchant !== undefined) {
      if (query.merchantId && query.merchantId !== ownMerchant) {
        ErrorHandler.forbidden('You can only list terminals of your merchant');
      }
      where.merchant_id = ownMerchant;
    } else if (query.merchantId) {
      where.merchant_id = query.merchantId;
    }
    if (query.paymentConfigId) where.payment_config_id = query.paymentConfigId;
    if (query.cashDrawerId) where.cash_drawer_id = query.cashDrawerId;
    if (query.isActive !== undefined) where.is_active = query.isActive;

    const page = requestedPage(query);
    const [rows, total] = await this.terminalRepository.findAndCount({
      where,
      relations: [...TERMINAL_RELATIONS],
      order: { merchant_id: 'ASC', name: 'ASC' },
      ...(page ? { skip: page.skip, take: page.limit } : {}),
    });

    return {
      statusCode: 200,
      message: 'Payment terminals retrieved successfully',
      data: rows.map((row) => this.format(row)),
      ...(page ? paginationMeta(page.page, page.limit, total) : {}),
    };
  }

  async findOne(
    companyId: number,
    id: number,
    user: AuthenticatedUser,
  ): Promise<OnePaymentTerminalResponseDto> {
    assertCompanyAccess(user, companyId);
    const row = await this.findOrFail(companyId, id);
    const ownMerchant = this.ownMerchantOnly(user);
    if (ownMerchant !== undefined && row.merchant_id !== ownMerchant) {
      ErrorHandler.notFound('Payment terminal not found');
    }
    return {
      statusCode: 200,
      message: 'Payment terminal retrieved successfully',
      data: this.format(row),
    };
  }

  async update(
    companyId: number,
    id: number,
    dto: UpdatePaymentTerminalDto,
    user: AuthenticatedUser,
  ): Promise<OnePaymentTerminalResponseDto> {
    assertCompanyAccess(user, companyId);
    const row = await this.findOrFail(companyId, id);

    const merchantId = dto.merchantId ?? row.merchant_id;
    const configId = dto.paymentConfigId ?? row.payment_config_id;
    const cashDrawerId =
      dto.cashDrawerId !== undefined ? dto.cashDrawerId : row.cash_drawer_id;
    const isActive = dto.isActive ?? row.is_active;

    const patch: QueryDeepPartialEntity<PaymentTerminal> = {};
    if (merchantId !== row.merchant_id) {
      await this.assertBranch(companyId, merchantId);
      patch.merchant_id = merchantId;
    }

    // Volver a enlazar (otra config, otra sucursal) o reactivar exige una config activa
    const rebinding =
      configId !== row.payment_config_id ||
      merchantId !== row.merchant_id ||
      (isActive && !row.is_active);
    const config = rebinding
      ? await this.bindableConfig(companyId, configId, merchantId)
      : row.paymentConfig;
    if (configId !== row.payment_config_id) patch.payment_config_id = configId;

    if (
      dto.deviceIdentifier !== undefined ||
      config.provider !== row.paymentConfig.provider
    ) {
      patch.device_identifier = this.validDeviceIdentifier(
        config,
        dto.deviceIdentifier ?? row.device_identifier,
      );
    }

    // La caja debe ser de la sucursal, también cuando el terminal cambia de sucursal
    if (
      cashDrawerId !== null &&
      (cashDrawerId !== row.cash_drawer_id || merchantId !== row.merchant_id)
    ) {
      await this.assertCashDrawer(merchantId, cashDrawerId);
    }
    if (cashDrawerId !== row.cash_drawer_id)
      patch.cash_drawer_id = cashDrawerId;

    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.model !== undefined) patch.model = dto.model.trim() || null;
    if (dto.isActive !== undefined) patch.is_active = dto.isActive;

    if (Object.keys(patch).length > 0) {
      await this.uniqueDevice(() =>
        this.terminalRepository.update({ id }, patch),
      );
    }

    return {
      statusCode: 200,
      message: 'Payment terminal updated successfully',
      data: this.format(await this.findOrFail(companyId, id)),
    };
  }

  async remove(
    companyId: number,
    id: number,
    user: AuthenticatedUser,
  ): Promise<OnePaymentTerminalResponseDto> {
    assertCompanyAccess(user, companyId);
    const row = await this.findOrFail(companyId, id);
    await this.terminalRepository.delete({ id, company_id: companyId });
    return {
      statusCode: 200,
      message: 'Payment terminal deleted successfully',
      data: this.format(row),
    };
  }

  /** Terminal activo de la empresa, listo para recibir un cobro. */
  async resolveRoute(
    companyId: number,
    terminalId: number,
  ): Promise<TerminalRoute> {
    const row = await this.terminalRepository.findOne({
      where: { id: terminalId, company_id: companyId },
    });
    if (!row) ErrorHandler.notFound('Payment terminal not found');
    if (!row.is_active) {
      ErrorHandler.badRequest(`Payment terminal ${terminalId} is inactive`);
    }
    return {
      terminalId: row.id,
      merchantId: row.merchant_id,
      paymentConfigId: row.payment_config_id,
      deviceIdentifier: row.device_identifier,
    };
  }

  /** Usuarios de sucursal: solo ven los terminales de su propio merchant. */
  private ownMerchantOnly(user: AuthenticatedUser): number | undefined {
    return user.role === UserRole.MERCHANT_USER ? user.merchant.id : undefined;
  }

  private async bindableConfig(
    companyId: number,
    configId: number,
    merchantId: number,
  ): Promise<MerchantPaymentConfig> {
    const config = await this.configRepository.findOne({
      where: { id: configId, company_id: companyId },
    });
    if (!config) ErrorHandler.notFound(`Payment config ${configId} not found`);
    if (!config.is_active) {
      ErrorHandler.badRequest(
        `Payment config ${configId} is inactive; activate it before binding terminals`,
      );
    }
    if (config.merchant_id !== null && config.merchant_id !== merchantId) {
      ErrorHandler.badRequest(
        `Payment config ${configId} is limited to merchant ${config.merchant_id}`,
      );
    }
    return config;
  }

  private validDeviceIdentifier(
    config: MerchantPaymentConfig,
    identifier: string,
  ): string {
    const value = identifier.trim();
    const { pattern, description } =
      DEVICE_IDENTIFIER_PATTERNS[config.provider];
    if (!pattern.test(value)) {
      ErrorHandler.badRequest(
        `deviceIdentifier must be ${description} for ${config.provider} terminals`,
      );
    }
    return value;
  }

  private async assertBranch(
    companyId: number,
    merchantId: number,
  ): Promise<void> {
    const belongs = await this.merchantRepository.exists({
      where: { id: merchantId, companyId },
    });
    if (!belongs) {
      ErrorHandler.badRequest(
        `Merchant ${merchantId} is not a branch of company ${companyId}`,
      );
    }
  }

  private async assertCashDrawer(
    merchantId: number,
    cashDrawerId: number,
  ): Promise<void> {
    const belongs = await this.cashDrawerRepository.exists({
      where: { id: cashDrawerId, merchant_id: merchantId },
    });
    if (!belongs) {
      ErrorHandler.badRequest(
        `Cash drawer ${cashDrawerId} is not a register of merchant ${merchantId}`,
      );
    }
  }

  private async uniqueDevice<T>(write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (isUniqueViolation(error)) {
        ErrorHandler.exists(
          'This device is already registered on the payment config',
        );
      }
      throw error;
    }
  }

  private async findOrFail(
    companyId: number,
    id: number,
  ): Promise<PaymentTerminal> {
    const row = await this.terminalRepository.findOne({
      where: { id, company_id: companyId },
      relations: [...TERMINAL_RELATIONS],
    });
    if (!row) ErrorHandler.notFound('Payment terminal not found');
    return row;
  }

  private format(row: PaymentTerminal): PaymentTerminalResponseDto {
    return {
      id: row.id,
      companyId: row.company_id,
      merchantId: row.merchant_id,
      paymentConfigId: row.payment_config_id,
      provider: row.paymentConfig.provider,
      cashDrawerId: row.cash_drawer_id,
      name: row.name,
      model: row.model,
      deviceIdentifier: row.device_identifier,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
