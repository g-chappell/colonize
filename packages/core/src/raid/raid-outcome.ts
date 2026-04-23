import type { ArtifactId, ResourceId } from '../cargo/cargo-hold.js';

export type RaidResult = 'success' | 'blocked-by-escort' | 'empty-target';

export const ALL_RAID_RESULTS: readonly RaidResult[] = [
  'success',
  'blocked-by-escort',
  'empty-target',
];

export interface RaidLootSnapshot {
  readonly resources: Readonly<Record<ResourceId, number>>;
  readonly artifacts: readonly ArtifactId[];
}

export type RaidEvent =
  | { readonly kind: 'raid-blocked-by-escort' }
  | {
      readonly kind: 'cargo-stolen';
      readonly resourceId: ResourceId;
      readonly stolenQty: number;
    }
  | { readonly kind: 'artifact-stolen'; readonly artifactId: ArtifactId }
  | { readonly kind: 'raid-empty-target' };

export interface RaidOutcome {
  readonly result: RaidResult;
  readonly loot: RaidLootSnapshot;
  readonly events: readonly RaidEvent[];
}
