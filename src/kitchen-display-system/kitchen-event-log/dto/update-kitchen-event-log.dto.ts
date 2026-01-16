import { PartialType } from '@nestjs/swagger';
import { CreateKitchenEventLogDto } from './create-kitchen-event-log.dto';

export class UpdateKitchenEventLogDto extends PartialType(CreateKitchenEventLogDto) {}
