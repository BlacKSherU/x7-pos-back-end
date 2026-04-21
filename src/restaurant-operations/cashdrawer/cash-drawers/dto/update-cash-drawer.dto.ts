import { PartialType } from '@nestjs/swagger';
import { CreateCashDrawerDto } from './create-cash-drawer.dto';

export class UpdateCashDrawerDto extends PartialType(CreateCashDrawerDto) {}
