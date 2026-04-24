import { isAuthorizedForFeature } from './is-authorized-for-feature.util';

describe('isAuthorizedForFeature', () => {
  it('returns false when authorizedFeatureIds is undefined', () => {
    expect(isAuthorizedForFeature({}, 1)).toBe(false);
  });

  it('returns false when authorizedFeatureIds is empty', () => {
    expect(isAuthorizedForFeature({ authorizedFeatureIds: [] }, 1)).toBe(false);
  });

  it('returns true when featureId is in the list', () => {
    expect(
      isAuthorizedForFeature({ authorizedFeatureIds: [2, 5, 8] }, 5),
    ).toBe(true);
  });

  it('returns false when featureId is not in the list', () => {
    expect(
      isAuthorizedForFeature({ authorizedFeatureIds: [2, 5, 8] }, 3),
    ).toBe(false);
  });
});
