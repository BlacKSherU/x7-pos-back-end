import { PartialType } from '@nestjs/swagger';
import { CreateMarketingMessageLogDto } from './create-marketing-message-log.dto';

export class UpdateMarketingMessageLogDto extends PartialType(CreateMarketingMessageLogDto) {}
