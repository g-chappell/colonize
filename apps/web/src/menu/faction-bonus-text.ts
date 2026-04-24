import { getFactionBonus, type PlayableFactionId } from '@colonize/core';

export function describeFactionBonuses(id: PlayableFactionId): readonly string[] {
  const bonus = getFactionBonus(id);
  const lines: string[] = [];

  if (bonus.redTideImmunity) {
    lines.push('Safe passage through Red Tide tiles.');
  }
  if (bonus.canRedeemLegendaryBlueprint) {
    lines.push('Can redeem Legendary Ship blueprints.');
  }
  if (bonus.colonyProductionMultiplier !== 1) {
    lines.push(`${signedPercent(bonus.colonyProductionMultiplier - 1)} colony production.`);
  }
  if (bonus.shipyardCostMultiplier !== 1) {
    lines.push(`${signedPercent(bonus.shipyardCostMultiplier - 1)} shipyard cost.`);
  }
  if (bonus.openOceanStealth) {
    lines.push('Stealth on open-ocean tiles.');
  }
  if (bonus.raidLootMultiplier !== 1) {
    lines.push(`${signedPercent(bonus.raidLootMultiplier - 1)} raid loot.`);
  }
  if (bonus.combatDamageMultiplier !== 1) {
    lines.push(`${signedPercent(bonus.combatDamageMultiplier - 1)} combat damage.`);
  }
  if (bonus.freeSoldierPerColonyPerTurn) {
    lines.push('One free soldier per colony each turn.');
  }

  return lines;
}

function signedPercent(delta: number): string {
  const pct = Math.round(delta * 100);
  if (pct > 0) return `+${pct}%`;
  return `−${Math.abs(pct)}%`;
}
