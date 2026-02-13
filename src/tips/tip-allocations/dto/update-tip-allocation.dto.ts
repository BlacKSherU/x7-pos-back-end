import { PartialType } from '@nestjs/swagger';
import { CreateTipAllocationDto } from './create-tip-allocation.dto';

export class UpdateTipAllocationDto extends PartialType(CreateTipAllocationDto) {}
