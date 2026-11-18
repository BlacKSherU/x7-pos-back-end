// src/common/utils/error-handler.util.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ErrorMessage } from '../constants/error-messages';

export class ErrorHandler {
  private static readonly logger = new Logger('ErrorHandler');

  // 400 Bad Request Errors
  static invalidInput(message: string = ErrorMessage.INVALID_INPUT): never {
    throw new BadRequestException(message);
  }

  static badRequest(message: string): never {
    throw new BadRequestException(message);
  }

  static invalidId(message: string = ErrorMessage.INVALID_ID): never {
    throw new BadRequestException(message);
  }

  static invalidFormat(message: string = ErrorMessage.INVALID_FORMAT): never {
    throw new BadRequestException(message);
  }

  static missingField(field: string): never {
    throw new BadRequestException(`${field} is required`);
  }

  // 401 Unauthorized Errors
  static unauthorized(message: string = ErrorMessage.UNAUTHORIZED): never {
    throw new UnauthorizedException(message);
  }

  static invalidCredentials(
    message: string = ErrorMessage.INVALID_CREDENTIALS,
  ): never {
    throw new UnauthorizedException(message);
  }

  static tokenExpired(message: string = ErrorMessage.TOKEN_EXPIRED): never {
    throw new UnauthorizedException(message);
  }

  // 403 Forbidden Errors
  static forbidden(message: string = ErrorMessage.FORBIDDEN): never {
    throw new ForbiddenException(message);
  }

  static insufficientPermissions(
    message: string = ErrorMessage.INSUFFICIENT_PERMISSIONS,
  ): never {
    throw new ForbiddenException(message);
  }

  static differentMerchant(
    message: string = ErrorMessage.DIFFERENT_MERCHANT,
  ): never {
    throw new ForbiddenException(message);
  }

  static changedMerchant(
    message: string = ErrorMessage.CHANGED_MERCHANT,
  ): never {
    throw new ForbiddenException(message);
  }

  static notOwner(message: string = ErrorMessage.NOT_OWNER): never {
    throw new ForbiddenException(message);
  }

  // 404 Not Found Errors
  static notFound(message: string): never {
    throw new NotFoundException(message);
  }

  static productNotFound(
    message: string = ErrorMessage.PRODUCT_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static variantNotFound(
    message: string = ErrorMessage.VARIANT_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static applicationNotFound(
    message: string = ErrorMessage.APPLICATION_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static merchantSubscriptionNotFound(
    message: string = ErrorMessage.MERCHANT_SUBSCRIPTION_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static planApplicationNotFound(
    message: string = ErrorMessage.PLAN_APPLICATION_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static subscriptionPlanNotFound(
    message: string = ErrorMessage.SUBSCRIPTION_PLAN_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static subscriptionApplicationNotFound(
    message: string = ErrorMessage.SUBSCRIPTION_APPLICATION_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static featureNotFound(
    message: string = ErrorMessage.FEATURE_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static planFeatureNotFound(
    message: string = ErrorMessage.PLAN_FEATURE_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static subscriptionPaymentNotFound(
    message: string = ErrorMessage.SUBSCRIPTION_PAYMENT_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static qrMenuNotFound(
    message: string = ErrorMessage.QR_MENU_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static qrMenuSectionNotFound(
    message: string = ErrorMessage.QR_MENU_SECTION_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static qrMenuItemNotFound(
    message: string = ErrorMessage.QR_MENU_ITEM_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static tableNotFound(message: string = ErrorMessage.TABLE_NOT_FOUND): never {
    throw new NotFoundException(message);
  }

  static qrLocationNotFound(
    message: string = ErrorMessage.QR_LOCATION_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static qrOrderNotFound(
    message: string = ErrorMessage.QR_ORDER_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static qrOrderItemNotFound(
    message: string = ErrorMessage.QR_ORDER_ITEM_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static customerNotFound(
    message: string = ErrorMessage.CUSTOMER_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static orderNotFound(message: string = ErrorMessage.ORDER_NOT_FOUND): never {
    throw new NotFoundException(message);
  }

  static merchantTipRuleNotFound(
    message: string = ErrorMessage.MERCHANT_TIP_RULE_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static merchantOvertimeRuleNotFound(
    message: string = ErrorMessage.MERCHANT_OVERTIME_RULE_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static merchantPayrollRuleNotFound(
    message: string = ErrorMessage.MERCHANT_PAYROLL_RULE_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static merchantTaxRuleNotFound(
    message: string = ErrorMessage.MERCHANT_TAX_RULE_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static floorPlanNotFound(
    message: string = ErrorMessage.FLOOR_PLAN_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static floorZoneNotFound(
    message: string = ErrorMessage.FLOOR_ZONE_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static deliveryZoneNotFound(
    message: string = ErrorMessage.DELIVERY_ZONE_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static deliveryFeeNotFound(
    message: string = ErrorMessage.DELIVERY_FEE_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static deliveryDriverNotFound(
    message: string = ErrorMessage.DELIVERY_DRIVER_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static deliveryAssignmentNotFound(
    message: string = ErrorMessage.DELIVERY_ASSIGNMENT_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static deliveryTrackingNotFound(
    message: string = ErrorMessage.DELIVERY_TRACKING_NOT_FOUND,
  ): never {
    throw new NotFoundException(message);
  }

  static userNotFound(message: string = ErrorMessage.USER_NOT_FOUND): never {
    throw new NotFoundException(message);
  }

  static resourceNotFound(resource: string, id?: number | string): never {
    const message = id
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`;
    throw new NotFoundException(message);
  }

  // 409 Conflict Errors
  static emailExists(
    message: string = ErrorMessage.EMAIL_ALREADY_EXISTS,
  ): never {
    throw new ConflictException(message);
  }

  static usernameExists(
    message: string = ErrorMessage.USERNAME_ALREADY_EXISTS,
  ): never {
    throw new ConflictException(message);
  }

  static companyNameExists(
    message: string = ErrorMessage.COMPANY_NAME_EXISTS,
  ): never {
    throw new ConflictException(message);
  }

  static rutExists(message: string = ErrorMessage.RUT_ALREADY_EXISTS): never {
    throw new ConflictException(message);
  }

  static exists(message: string): never {
    throw new ConflictException(message);
  }

  /** 409: the resource's current state does not allow the operation. */
  static conflict(message: string): never {
    throw new ConflictException(message);
  }

  static duplicateResource(
    resource: string,
    field: string,
    value: string,
  ): never {
    throw new ConflictException(
      `${resource} with ${field} '${value}' already exists`,
    );
  }

  // 422 Unprocessable Entity Errors
  static validationFailed(
    message: string = ErrorMessage.VALIDATION_FAILED,
  ): never {
    throw new UnprocessableEntityException(message);
  }

  static businessRuleViolation(
    message: string = ErrorMessage.BUSINESS_RULE_VIOLATION,
  ): never {
    throw new UnprocessableEntityException(message);
  }

  // 500 Internal Server Error
  static internalError(message: string = ErrorMessage.INTERNAL_ERROR): never {
    throw new InternalServerErrorException(message);
  }

  static databaseError(message: string = ErrorMessage.DATABASE_ERROR): never {
    throw new InternalServerErrorException(message);
  }

  // Database error handler
  static handleDatabaseError(error: any): never {
    // Una HttpException (404, 409, 403…) lanzada dentro del try NO es un error de base de
    // datos: se relanza tal cual. Antes caía en el `default` y el cliente recibía un 500.
    if (error instanceof HttpException) throw error;

    // PostgreSQL error codes

    switch (error?.code) {
      case '23505': // unique_violation
        if (error?.detail?.includes('email')) {
          this.emailExists();
        }

        if (error?.detail?.includes('username')) {
          this.usernameExists();
        }

        if (error?.detail?.includes('name')) {
          this.duplicateResource('Resource', 'name', 'provided value');
        }

        if (error?.detail?.includes('tax_id')) {
          this.rutExists();
        }
        throw new ConflictException('Duplicate entry detected');

      case '23503': // foreign_key_violation
        throw new BadRequestException('Referenced resource does not exist');

      case '23502': // not_null_violation
        throw new BadRequestException(
          `Required field '${error?.column}' cannot be null`,
        );

      case '22001': // string_data_right_truncation
        throw new BadRequestException('Data too long for field');

      case '42P01': // undefined_table
        this.internalError('Database configuration error');
        break;

      default:
        // code, message and stack only: the driver error also carries the query and its
        // parameters (emails, hashes…), which must not reach the logs
        this.logger.error(
          `Database error${error?.code ? ` ${error.code}` : ''}: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
        this.databaseError();
        break;
    }
  }
}
