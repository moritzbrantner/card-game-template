export type SharedButtonProps = {
  label: string;
};

export function createSharedButtonLabel({ label }: SharedButtonProps): string {
  return `shared:${label}`;
}
