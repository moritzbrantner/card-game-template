export const dataEntryPage = {
  title: 'Schema data entry',
  description: 'Create rows for allowed tables. Access is controlled per table and role.',
  permissions: {
    read: 'Read',
    write: 'Write',
    noWrite: 'You can read this table but do not have write access.',
  },
  form: {
    creating: 'Creating…',
    createRow: 'Create {table} row',
    fields: {
      bio: 'Bio',
      locale: 'Locale',
      timezone: 'Timezone',
      email: 'Email',
      name: 'Name',
      role: 'Role',
      action: 'Action',
      outcome: 'Outcome',
      statusCode: 'Status code',
      metadataJson: 'Metadata JSON',
      key: 'Key',
      count: 'Count',
      resetAt: 'Reset at',
    },
  },
};
