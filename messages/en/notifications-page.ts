export const notificationsPage = {
  fallbackUser: 'there',
  badge: 'Signed-in updates',
  title: 'Notifications',
  description: 'A simple inbox for {name}. Keep track of security events, workspace updates, and scheduled digests.',
  summary: {
    unread: {
      label: 'Unread',
      hint: 'Everything new since your last session is grouped here.',
    },
    today: {
      label: 'Today',
      hint: 'Fresh activity from your account and workspace over the last few hours.',
    },
    preferences: {
      label: 'Delivery',
      value: 'Email + in-app',
      hint: 'Use settings to switch between instant alerts and quieter digests.',
    },
  },
  feed: {
    title: 'Recent activity',
    description: 'Your latest in-app notifications are listed below.',
    empty: 'No notifications yet.',
    markRead: 'Mark as read',
    markingRead: 'Updating...',
    markReadError: 'Unable to update this notification right now.',
    status: {
      unread: 'Unread',
      read: 'Read',
    },
  },
  actions: {
    title: 'Quick actions',
    description: 'Jump directly to the areas most often connected to account notifications.',
    profile: 'Open profile',
    settings: 'Notification settings',
    markAllRead: 'Mark all as read',
    markingAllRead: 'Updating...',
    markAllReadError: 'Unable to update your notifications right now.',
  },
  preferences: {
    title: 'Delivery preferences',
    description: 'Use this page as a lightweight notification center while your full preference controls live in settings.',
    email: 'Email alerts stay enabled for security and account-recovery events.',
    push: 'In-app notices are ideal for workspace activity that does not require immediate attention.',
    digest: 'Weekly digests help reduce noise while still summarizing changes worth reviewing.',
  },
};
