import { PartialType } from '@nestjs/swagger';
import { CreateTipPoolMemberDto } from './create-tip-pool-member.dto';

export class UpdateTipPoolMemberDto extends PartialType(CreateTipPoolMemberDto) {}
