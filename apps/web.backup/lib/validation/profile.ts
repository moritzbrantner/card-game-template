export type ProfileContract = {
  id: string;
  displayName: string;
  bio: string | null;
  email: string;
};

export type UpdateProfileInput = {
  displayName: string;
  bio?: string;
};

export function parseUpdateProfileInput(input: unknown): UpdateProfileInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("Profile input must be an object");
  }

  const candidate = input as Record<string, unknown>;
  if (typeof candidate.displayName !== "string" || candidate.displayName.trim().length < 2) {
    throw new Error("displayName must be at least 2 characters");
  }

  if (
    typeof candidate.bio !== "undefined" &&
    candidate.bio !== null &&
    typeof candidate.bio !== "string"
  ) {
    throw new Error("bio must be a string when provided");
  }

  return {
    displayName: candidate.displayName.trim(),
    bio: typeof candidate.bio === "string" ? candidate.bio.trim() : undefined,
  };
}
