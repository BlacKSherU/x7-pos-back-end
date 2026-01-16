import { PartialType } from '@nestjs/swagger';
import { CreateMarketingCampaignAudienceDto } from './create-marketing-campaing-audience.dto';

export class UpdateMarketingCampaignAudienceDto extends PartialType(CreateMarketingCampaignAudienceDto) {}
