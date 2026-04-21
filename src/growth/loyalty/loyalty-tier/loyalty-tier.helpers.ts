import { Repository } from 'typeorm';
import { LoyaltyTier } from './entities/loyalty-tier.entity';
import { LoyaltyTierBenefit } from './constants/loyalty-tier-benefit.enum';
import { LoyaltyCustomer } from '../loyalty-customer/entities/loyalty-customer.entity';

interface TierSeed {
  name: string;
  level: number;
  min_points: number;
  multiplier: number;
  benefits: LoyaltyTierBenefit[];
}

export const DEFAULT_PROGRAM_TIERS: TierSeed[] = [
  {
    name: 'Base',
    level: 1,
    min_points: 0,
    multiplier: 1.0,
    benefits: [],
  },
];

export async function findOrCreateAvailableTier(
  loyaltyProgramId: number,
  merchantId: number,
  tierRepo: Repository<LoyaltyTier>,
): Promise<LoyaltyTier> {
  // Buscar el nivel base (el de menor puntos) para este programa
  // En el nuevo sistema, el nivel base será el que tenga level >= 11 o el de menor puntos
  const baseTier = await tierRepo.findOne({
    where: {
      loyalty_program_id: loyaltyProgramId,
      is_active: true,
    },
    order: { min_points: 'ASC' },
  });

  if (baseTier) {
    return baseTier;
  }

  // Si por alguna razón no existe, creamos el default ("Level 1")
  const defaultData = DEFAULT_PROGRAM_TIERS[0];
  const tier = tierRepo.create({
    ...defaultData,
    loyalty_program_id: loyaltyProgramId,
    is_active: true,
  });

  return tierRepo.save(tier);
}

/**
 * Recalcula los niveles de todos los tiers activos de un programa.
 * Ordena por min_points DESC → el de más puntos recibe level 1 (mejor),
 * y así sucesivamente. El merchant define los nombres; el sistema solo
 * asigna el número de nivel según los puntos mínimos.
 */
export async function recalculateProgramLevels(
  loyaltyProgramId: number,
  tierRepo: Repository<LoyaltyTier>,
): Promise<void> {
  const tiers = await tierRepo.find({
    where: {
      loyalty_program_id: loyaltyProgramId,
      is_active: true,
    },
    order: { min_points: 'DESC' },
  });

  console.log(
    `[Recalculate] Program ${loyaltyProgramId}: ${tiers.length} tier(s). Order:`,
    tiers.map((t) => `${t.name}(${t.min_points}pts)`),
  );

  let currentLevel = 0;
  let lastPoints = -1;

  for (const tier of tiers) {
    if (tier.min_points !== lastPoints) {
      currentLevel++;
      lastPoints = tier.min_points;
    }
    tier.level = Math.min(currentLevel, 10);
    await tierRepo.save(tier);
  }
}

/**
 * Evalúa si un loyalty customer debe subir de tier dado su lifetimePoints.
 */
export async function evaluateTierUpgrade(
  loyaltyCustomer: LoyaltyCustomer,
  tierRepo: Repository<LoyaltyTier>,
): Promise<LoyaltyTier | null> {
  const programId =
    loyaltyCustomer.loyaltyProgramId ||
    (loyaltyCustomer.loyaltyProgram ? loyaltyCustomer.loyaltyProgram.id : null);

  if (!programId) {
    console.error(
      'Upgrade Error: No program ID found for customer',
      loyaltyCustomer.id,
    );
    return null;
  }

  // Obtener todos los tiers activos del programa, ordenados de mayor a menor min_points
  const tiers = await tierRepo.find({
    where: {
      loyalty_program_id: programId,
      is_active: true,
    },
    order: { min_points: 'DESC' },
  });

  console.log(
    `Evaluating upgrade for Customer ${loyaltyCustomer.id}. Points: ${loyaltyCustomer.lifetimePoints}. Current Tier ID: ${loyaltyCustomer.loyaltyTierId}. Found ${tiers.length} tiers in program ${programId}`,
  );

  // Encontrar el tier de mayor umbral que el cliente ya superó
  const eligibleTier = tiers.find(
    (t) => loyaltyCustomer.lifetimePoints >= t.min_points,
  );

  if (!eligibleTier) {
    console.log(
      'No eligible tier found for points',
      loyaltyCustomer.lifetimePoints,
    );
    return null;
  }

  console.log(
    `Eligible tier found: ${eligibleTier.name} (ID: ${eligibleTier.id}, MinPoints: ${eligibleTier.min_points})`,
  );

  if (!eligibleTier) return null;

  // Solo hacer upgrade si el tier elegible difiere del actual
  if (loyaltyCustomer.loyaltyTierId === eligibleTier.id) return null;

  return eligibleTier;
}
