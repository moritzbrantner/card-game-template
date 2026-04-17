export interface JsonStoreEnvelope<TValue> {
  version: number;
  data: TValue;
}

export type JsonStoreValidator<TValue> = (value: unknown) => value is TValue;

export type JsonStoreMigrationMap = Record<number, (value: unknown) => unknown>;

export type JsonStoreSubscriber<TValue> = (value: TValue) => void;

export interface JsonStoreOptions<TValue> {
  defaultValue: TValue;
  filePath: string;
  migrations?: JsonStoreMigrationMap;
  resetOnError?: boolean;
  validate?: JsonStoreValidator<TValue>;
  version: number;
}
