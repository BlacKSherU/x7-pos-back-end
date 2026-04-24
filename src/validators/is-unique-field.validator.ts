import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

@ValidatorConstraint({ name: 'IsUniqueField', async: true })
@Injectable()
export class IsUniqueField implements ValidatorConstraintInterface {
  constructor(private readonly entityManager: EntityManager) {}

  async validate(value: any, args: ValidationArguments): Promise<boolean> {
    const [entityName, fieldName] = args.constraints as string[];

    if (!value || !entityName || !fieldName) return false;

    const exists = await this.entityManager
      .getRepository(entityName)
      .createQueryBuilder(entityName)
      .where(`${entityName}.${fieldName} = :value`, { value })
      .getExists();

    return !exists;
  }

  defaultMessage(args: ValidationArguments): string {
    const [entityName, fieldName] = args.constraints as string[];
    return `${fieldName} ya está en uso en ${entityName}`;
  }
}
