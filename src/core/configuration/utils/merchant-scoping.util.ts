//src/core/configuration/utils/merchant-scoping.util.ts
import { Repository } from 'typeorm';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { ErrorHandler } from 'src/common/utils/error-handler.util';

export async function resolveMerchantContext(
  merchantRepository: Repository<Merchant>,
  user: AuthenticatedUser,
): Promise<{ merchant: Merchant; companyId: number }> {
  const merchant = await merchantRepository.findOne({
    where: { id: user.merchant.id },
    select: ['id', 'companyId'],
  });

  if (!merchant?.companyId) {
    ErrorHandler.forbidden('Unable to resolve company for the current user.');
  }

  return { merchant, companyId: merchant.companyId };
}

export async function assertOwnsCompany(
  merchantRepository: Repository<Merchant>,
  user: AuthenticatedUser,
  companyId: number,
): Promise<void> {
  if (
    user.role === UserRole.PORTAL_ADMIN ||
    user.role === UserRole.SUPER_ADMIN
  ) {
    return;
  }
  const { companyId: ownCompanyId } = await resolveMerchantContext(
    merchantRepository,
    user,
  );
  if (companyId !== ownCompanyId) {
    ErrorHandler.forbidden('You do not have access to this record.');
  }
}
