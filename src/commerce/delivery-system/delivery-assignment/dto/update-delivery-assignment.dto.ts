//src/commerce/delivery-system/delivery-assignment/dto/update-delivery-assignment.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateDeliveryAssignmentDto } from './create-delivery-assignment.dto';

export class UpdateDeliveryAssignmentDto extends PartialType(
  CreateDeliveryAssignmentDto,
) {}
