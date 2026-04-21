// CargoHold — the primitive container for carryable contents on a unit.
//
// Two orthogonal stores:
//   - resources: resource-id (string) → positive integer qty (fungible goods)
//   - artifacts: set of unique artifact-id strings (singular, non-fungible)
//
// ResourceId/ArtifactId are opaque strings because packages/core has no
// ResourceType yet — TASK-044 introduces the canonical const-object union.
// At the wire-level these are stable kebab-case identifiers already, matching
// every other save-format-bound kind in the codebase.
//
// Orchestration (detect friendly-colony entry, trigger delivery, apply
// artifact bonuses) lives with the task that owns the colony collection.
// See CLAUDE.md: "Ship the entity's primitive; leave iteration / scheduling
// to the task that owns the collection."

export type ResourceId = string;
export type ArtifactId = string;

export interface CargoHoldJSON {
  readonly resources: { readonly [resourceId: string]: number };
  readonly artifacts: readonly ArtifactId[];
}

export interface CargoHoldInit {
  readonly resources?: { readonly [resourceId: string]: number };
  readonly artifacts?: readonly ArtifactId[];
}

export class CargoHold {
  private readonly _resources: Map<ResourceId, number>;
  private readonly _artifacts: Set<ArtifactId>;

  constructor(init: CargoHoldInit = {}) {
    this._resources = new Map();
    this._artifacts = new Set();
    if (init.resources !== undefined) {
      if (init.resources === null || typeof init.resources !== 'object') {
        throw new TypeError('CargoHold init.resources must be a plain object');
      }
      for (const [id, qty] of Object.entries(init.resources)) {
        this.addResource(id, qty);
      }
    }
    if (init.artifacts !== undefined) {
      if (!Array.isArray(init.artifacts)) {
        throw new TypeError('CargoHold init.artifacts must be an array');
      }
      for (const id of init.artifacts) {
        this.addArtifact(id);
      }
    }
  }

  get isEmpty(): boolean {
    return this._resources.size === 0 && this._artifacts.size === 0;
  }

  get resourceTotal(): number {
    let sum = 0;
    for (const qty of this._resources.values()) sum += qty;
    return sum;
  }

  get artifacts(): readonly ArtifactId[] {
    return [...this._artifacts].sort();
  }

  getQuantity(resourceId: ResourceId): number {
    return this._resources.get(resourceId) ?? 0;
  }

  hasArtifact(artifactId: ArtifactId): boolean {
    return this._artifacts.has(artifactId);
  }

  entries(): IterableIterator<[ResourceId, number]> {
    return this._resources.entries();
  }

  addResource(resourceId: ResourceId, qty: number): void {
    assertResourceId('addResource', resourceId);
    if (!Number.isInteger(qty) || qty < 0) {
      throw new RangeError(`addResource: qty must be a non-negative integer (got ${qty})`);
    }
    if (qty === 0) return;
    const current = this._resources.get(resourceId) ?? 0;
    this._resources.set(resourceId, current + qty);
  }

  removeResource(resourceId: ResourceId, qty: number): void {
    assertResourceId('removeResource', resourceId);
    if (!Number.isInteger(qty) || qty < 0) {
      throw new RangeError(`removeResource: qty must be a non-negative integer (got ${qty})`);
    }
    if (qty === 0) return;
    const current = this._resources.get(resourceId) ?? 0;
    if (qty > current) {
      throw new RangeError(
        `removeResource: cannot remove ${qty} of "${resourceId}" (have ${current})`,
      );
    }
    const remaining = current - qty;
    if (remaining === 0) {
      this._resources.delete(resourceId);
    } else {
      this._resources.set(resourceId, remaining);
    }
  }

  addArtifact(artifactId: ArtifactId): void {
    assertArtifactId('addArtifact', artifactId);
    this._artifacts.add(artifactId);
  }

  removeArtifact(artifactId: ArtifactId): void {
    assertArtifactId('removeArtifact', artifactId);
    if (!this._artifacts.has(artifactId)) {
      throw new Error(`removeArtifact: artifact "${artifactId}" not present in hold`);
    }
    this._artifacts.delete(artifactId);
  }

  clear(): void {
    this._resources.clear();
    this._artifacts.clear();
  }

  /**
   * Move every resource qty + every artifact from this hold into `other`,
   * leaving this hold empty. The delivery primitive — orchestration belongs
   * to the task that owns the receiving entity (e.g. friendly-colony entry).
   */
  transferTo(other: CargoHold): void {
    if (!(other instanceof CargoHold)) {
      throw new TypeError('transferTo: other must be a CargoHold');
    }
    if (other === this) {
      throw new Error('transferTo: cannot transfer to self');
    }
    for (const [id, qty] of this._resources) {
      other.addResource(id, qty);
    }
    for (const id of this._artifacts) {
      other.addArtifact(id);
    }
    this.clear();
  }

  toJSON(): CargoHoldJSON {
    const resources: { [resourceId: string]: number } = {};
    const sortedResources = [...this._resources.entries()].sort(([a], [b]) => a.localeCompare(b));
    for (const [id, qty] of sortedResources) resources[id] = qty;
    const artifacts = [...this._artifacts].sort();
    return { resources, artifacts };
  }

  static fromJSON(data: CargoHoldJSON): CargoHold {
    if (data === null || typeof data !== 'object') {
      throw new TypeError('CargoHoldJSON must be an object');
    }
    if (data.resources === null || typeof data.resources !== 'object') {
      throw new TypeError('CargoHoldJSON.resources must be a plain object');
    }
    if (!Array.isArray(data.artifacts)) {
      throw new TypeError('CargoHoldJSON.artifacts must be an array');
    }
    return new CargoHold({
      resources: data.resources,
      artifacts: data.artifacts,
    });
  }
}

function assertResourceId(op: string, value: unknown): asserts value is ResourceId {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${op}: resourceId must be a non-empty string`);
  }
}

function assertArtifactId(op: string, value: unknown): asserts value is ArtifactId {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${op}: artifactId must be a non-empty string`);
  }
}
