import { promises as fs } from 'node:fs';
import path from 'node:path';

import type {
  JsonStoreEnvelope,
  JsonStoreMigrationMap,
  JsonStoreOptions,
  JsonStoreSubscriber,
  JsonStoreValidator,
} from './shared.ts';

function cloneValue<TValue>(value: TValue): TValue {
  return structuredClone(value);
}

function isEnvelope(value: unknown): value is JsonStoreEnvelope<unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return typeof (value as JsonStoreEnvelope<unknown>).version === 'number' && 'data' in value;
}

export class JsonStore<TValue> {
  private readonly defaultValue: TValue;

  private readonly filePath: string;

  private readonly migrations: JsonStoreMigrationMap;

  private readonly resetOnError: boolean;

  private readonly subscribers = new Set<JsonStoreSubscriber<TValue>>();

  private readonly validate?: JsonStoreValidator<TValue>;

  private readonly version: number;

  private cache: TValue | null = null;

  constructor(options: JsonStoreOptions<TValue>) {
    this.defaultValue = cloneValue(options.defaultValue);
    this.filePath = options.filePath;
    this.migrations = options.migrations ?? {};
    this.resetOnError = options.resetOnError ?? false;
    this.validate = options.validate;
    this.version = options.version;
  }

  async load(): Promise<TValue> {
    if (this.cache !== null) {
      return cloneValue(this.cache);
    }

    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      const migrated = this.migrateValue(parsed);
      this.assertValid(migrated.data);
      this.cache = cloneValue(migrated.data);

      if (migrated.didMigrate) {
        await this.writeEnvelope(migrated.data);
      }

      return cloneValue(this.cache);
    } catch (error) {
      if (this.isMissingFileError(error)) {
        this.cache = cloneValue(this.defaultValue);
        return cloneValue(this.cache);
      }

      if (!this.resetOnError) {
        throw error;
      }

      this.cache = cloneValue(this.defaultValue);
      await this.writeEnvelope(this.cache);
      return cloneValue(this.cache);
    }
  }

  async reset(): Promise<TValue> {
    return this.save(this.defaultValue);
  }

  async save(value: TValue): Promise<TValue> {
    this.assertValid(value);
    const nextValue = cloneValue(value);
    this.cache = nextValue;
    await this.writeEnvelope(nextValue);
    this.notify();
    return cloneValue(nextValue);
  }

  async update(updater: (value: TValue) => TValue): Promise<TValue> {
    const current = await this.load();
    return this.save(updater(current));
  }

  subscribe(subscriber: JsonStoreSubscriber<TValue>): () => void {
    this.subscribers.add(subscriber);

    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  private assertValid(value: unknown): asserts value is TValue {
    if (this.validate && !this.validate(value)) {
      throw new Error(`Invalid persisted data in ${this.filePath}`);
    }
  }

  private isMissingFileError(error: unknown): boolean {
    return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT');
  }

  private migrateValue(parsed: unknown): {
    data: TValue;
    didMigrate: boolean;
  } {
    let version = 0;
    let data: unknown = parsed;
    let didMigrate = false;

    if (isEnvelope(parsed)) {
      version = parsed.version;
      data = parsed.data;
    }

    while (version < this.version) {
      const migrate = this.migrations[version];

      if (!migrate) {
        throw new Error(`Missing migration ${version} for ${this.filePath}`);
      }

      data = migrate(data);
      version += 1;
      didMigrate = true;
    }

    return {
      data: data as TValue,
      didMigrate: didMigrate || !isEnvelope(parsed) || version !== this.version,
    };
  }

  private notify() {
    if (this.cache === null) {
      return;
    }

    const snapshot = cloneValue(this.cache);

    this.subscribers.forEach((subscriber) => {
      subscriber(cloneValue(snapshot));
    });
  }

  private async writeEnvelope(value: TValue) {
    const envelope: JsonStoreEnvelope<TValue> = {
      version: this.version,
      data: cloneValue(value),
    };
    const serialized = `${JSON.stringify(envelope, null, 2)}\n`;
    const directory = path.dirname(this.filePath);
    const tempFilePath = `${this.filePath}.tmp`;

    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(tempFilePath, serialized, 'utf8');
    await fs.rename(tempFilePath, this.filePath);
  }
}

export function createJsonStore<TValue>(options: JsonStoreOptions<TValue>) {
  return new JsonStore(options);
}
