import { PartialType } from '@nestjs/swagger';
import { CreateTipPoolDto } from './create-tip-pool.dto';

export class UpdateTipPoolDto extends PartialType(CreateTipPoolDto) {}
