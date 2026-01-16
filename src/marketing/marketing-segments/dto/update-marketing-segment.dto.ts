import { PartialType } from '@nestjs/swagger';
import { CreateMarketingSegmentDto } from './create-marketing-segment.dto';

export class UpdateMarketingSegmentDto extends PartialType(CreateMarketingSegmentDto) {}
