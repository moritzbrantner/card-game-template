import { describe, expect, it } from 'vitest';

import {
  TEST_USER_FOLLOWS,
  TEST_USER_NOTIFICATIONS,
  TEST_USERS,
} from '@/src/testing/test-users';

describe('test user seed fixtures', () => {
  it('provides a larger seeded account set with unique identities', () => {
    expect(TEST_USERS.length).toBeGreaterThanOrEqual(8);

    const emails = TEST_USERS.map((user) => user.email);
    const tags = TEST_USERS.map((user) => user.tag);

    expect(new Set(emails).size).toBe(emails.length);
    expect(new Set(tags).size).toBe(tags.length);
    expect(emails).toContain('delete-account@example.com');
  });

  it('creates a follow graph where the default user both follows and is followed', () => {
    const emails = new Set(TEST_USERS.map((user) => user.email));

    for (const relationship of TEST_USER_FOLLOWS) {
      expect(emails.has(relationship.followerEmail)).toBe(true);
      expect(emails.has(relationship.followingEmail)).toBe(true);
      expect(relationship.followerEmail).not.toBe(relationship.followingEmail);
    }

    expect(
      TEST_USER_FOLLOWS.some(
        (relationship) => relationship.followerEmail === 'user@example.com',
      ),
    ).toBe(true);
    expect(
      TEST_USER_FOLLOWS.some(
        (relationship) => relationship.followingEmail === 'user@example.com',
      ),
    ).toBe(true);
  });

  it('seeds notification history for multiple member accounts', () => {
    const emails = new Set(TEST_USERS.map((user) => user.email));

    for (const notification of TEST_USER_NOTIFICATIONS) {
      expect(emails.has(notification.userEmail)).toBe(true);
      if (notification.actorEmail) {
        expect(emails.has(notification.actorEmail)).toBe(true);
      }
    }

    const primaryUserNotifications = TEST_USER_NOTIFICATIONS.filter(
      (notification) => notification.userEmail === 'user@example.com',
    );

    expect(
      primaryUserNotifications.some(
        (notification) => notification.status === 'unread',
      ),
    ).toBe(true);
    expect(
      primaryUserNotifications.some(
        (notification) => notification.status === 'read',
      ),
    ).toBe(true);
  });
});
