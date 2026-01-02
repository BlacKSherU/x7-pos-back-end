// src/common/utils/error-handler.util.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ErrorMessage } from '../constants/error-messages';

export class ErrorHandler {
  // 400 Bad Request Errors
  static invalidInput(message: string = ErrorMessage.INVALID_INPUT): never {
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
    // PostgreSQL error codes
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    switch (error?.code) {
      case '23505': // unique_violation
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        if (error?.detail?.includes('email')) {
          this.emailExists();
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        if (error?.detail?.includes('username')) {
          this.usernameExists();
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        if (error?.detail?.includes('name')) {
          this.duplicateResource('Resource', 'name', 'provided value');
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        if (error?.detail?.includes('rut')) {
          this.rutExists();
        }
        throw new ConflictException('Duplicate entry detected');

      case '23503': // foreign_key_violation
        throw new BadRequestException('Referenced resource does not exist');

      case '23502': // not_null_violation
        throw new BadRequestException(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          `Required field '${error?.column}' cannot be null`,
        );

      case '22001': // string_data_right_truncation
        throw new BadRequestException('Data too long for field');

      case '42P01': // undefined_table
        this.internalError('Database configuration error');
        break;

      default:
        console.error('Database error:', error);
        this.databaseError();
        break;
    }
  }
}
