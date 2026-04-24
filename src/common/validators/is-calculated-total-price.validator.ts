import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { CreatePurchaseOrderItemDto } from 'src/inventory/products-inventory/purchase-order-item/dto/create-purchase-order-item.dto';
import { UpdatePurchaseOrderItemDto } from 'src/inventory/products-inventory/purchase-order-item/dto/update-purchase-order-item.dto';

@ValidatorConstraint({ async: false })
export class IsCalculatedTotalPriceConstraint implements ValidatorConstraintInterface {
  validate(totalPrice: number, args: ValidationArguments) {
    const obj = args.object as
      | CreatePurchaseOrderItemDto
      | UpdatePurchaseOrderItemDto;

    // If totalPrice is provided, then quantity and unitPrice must also be provided to validate
    if (typeof obj.quantity !== 'number' || typeof obj.unitPrice !== 'number') {
      // If totalPrice is present but quantity or unitPrice are missing, it's an invalid state for this validation
      return false;
    }

    const calculatedTotalPrice = obj.quantity * obj.unitPrice;
    // Allow a small tolerance for floating point issues
    return Math.abs(totalPrice - calculatedTotalPrice) < 0.001;
  }

  defaultMessage(args: ValidationArguments) {
    const obj = args.object as
      | CreatePurchaseOrderItemDto
      | UpdatePurchaseOrderItemDto;

    if (typeof obj.quantity !== 'number' || typeof obj.unitPrice !== 'number') {
      return `Cannot validate total price: 'quantity' and 'unitPrice' must be provided.`;
    }

    const calculatedTotalPrice = (obj.quantity * obj.unitPrice).toFixed(2);
    return `Total price (${args.value}) does not match the calculated price (${calculatedTotalPrice} = quantity * unit price).`;
  }
}

export function IsCalculatedTotalPrice(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCalculatedTotalPriceConstraint,
    });
  };
}
