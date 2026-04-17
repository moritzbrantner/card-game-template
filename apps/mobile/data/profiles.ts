export type UserProfile = {
  username: string;
  name: string;
  role: string;
  location: string;
  bio: string;
  about: string;
  interests: string[];
};

const profiles: UserProfile[] = [
  {
    username: 'alex',
    name: 'Alex Mercer',
    role: 'Product engineer',
    location: 'Berlin, Germany',
    bio: 'Designing calm tools for teams that ship across web, mobile, and desktop.',
    about:
      'Alex focuses on turning rough product ideas into typed, reusable interfaces with strong defaults.',
    interests: ['Design systems', 'DX', 'Animation'],
  },
  {
    username: 'jules',
    name: 'Jules Costa',
    role: 'Frontend platform lead',
    location: 'Porto, Portugal',
    bio: 'Keeping shared packages predictable while teams move quickly.',
    about:
      'Jules owns platform primitives, cross-app contracts, and migration paths that stay boring in production.',
    interests: ['Type safety', 'Performance', 'Monorepos'],
  },
  {
    username: 'mika',
    name: 'Mika Chen',
    role: 'Design technologist',
    location: 'Taipei, Taiwan',
    bio: 'Blending motion, interaction, and content systems into one product language.',
    about:
      'Mika prototypes UI direction directly in code and helps product teams keep visual decisions consistent.',
    interests: ['Motion', 'Brand systems', 'Accessibility'],
  },
];

export const currentUser = profiles[0]!;

export function getProfileByUsername(username: string) {
  return (
    profiles.find(
      (profile) => profile.username.toLowerCase() === username.toLowerCase(),
    ) ?? null
  );
}

export function getProfileFromSegment(segment: string) {
  if (!segment.startsWith('@')) {
    return null;
  }

  return getProfileByUsername(segment.slice(1));
}
