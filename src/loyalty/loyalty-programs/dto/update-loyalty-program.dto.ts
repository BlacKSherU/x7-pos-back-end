import { PartialType } from '@nestjs/swagger';
import { CreateLoyaltyProgramDto } from './create-loyalty-program.dto';

export class UpdateLoyaltyProgramDto extends PartialType(
  CreateLoyaltyProgramDto,
) {}
