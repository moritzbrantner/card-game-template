export const followerVisibilityRoles = ['PUBLIC', 'MEMBERS', 'PRIVATE'] as const;

export type FollowerVisibilityRole = (typeof followerVisibilityRoles)[number];

export function canViewerSeeFollower(input: {
  viewerUserId?: string | null;
  profileOwnerId: string;
  followerUserId: string;
  followerVisibility: FollowerVisibilityRole;
}) {
  if (input.viewerUserId === input.profileOwnerId || input.viewerUserId === input.followerUserId) {
    return true;
  }

  switch (input.followerVisibility) {
    case 'PUBLIC':
      return true;
    case 'MEMBERS':
      return Boolean(input.viewerUserId);
    case 'PRIVATE':
      return false;
  }
}
