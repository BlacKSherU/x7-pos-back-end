import { SetMetadata } from '@nestjs/common';

export const REQUIRE_FEATURE_KEY = 'requireFeatureId';

export const RequireFeature = (featureId: number) =>
  SetMetadata(REQUIRE_FEATURE_KEY, featureId);
