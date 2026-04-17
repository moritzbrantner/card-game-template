import type { ProfileContract } from '@/lib/validation';

type ProfileCardProps = {
  profile: ProfileContract;
};

export function ProfileCard({ profile }: ProfileCardProps) {
  return (
    <section className="rounded-lg border p-4">
      <h2 className="text-lg font-semibold">{profile.displayName}</h2>
      <p className="text-sm text-gray-500">{profile.email}</p>
      <p className="mt-2 text-sm">{profile.bio ?? 'No bio yet.'}</p>
    </section>
  );
}
