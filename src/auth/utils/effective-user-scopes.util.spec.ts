import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { effectiveUserScopes } from './effective-user-scopes.util';

describe('effectiveUserScopes', () => {
  it('returns scopes array when set', () => {
    expect(
      effectiveUserScopes({
        scope: Scope.MERCHANT_WEB,
        scopes: [Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID],
      }),
    ).toEqual([Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID]);
  });

  it('falls back to legacy single scope', () => {
    expect(
      effectiveUserScopes({
        scope: Scope.MERCHANT_ANDROID,
        scopes: null,
      }),
    ).toEqual([Scope.MERCHANT_ANDROID]);
  });

  it('returns empty when neither is set', () => {
    expect(
      effectiveUserScopes({
        scope: null as unknown as Scope,
        scopes: null,
      }),
    ).toEqual([]);
  });
});
