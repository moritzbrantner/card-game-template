export const reportProblemPage = {
  eyebrow: 'Support intake',
  title: 'Report a problem',
  description:
    'Share the issue, where it happened, and enough detail for someone to reproduce it quickly. A lightweight intake endpoint will return a reference ID after submission.',
  checklistTitle: 'Make the report actionable',
  checklistDescription:
    'A few concrete details usually cut the back-and-forth in half.',
  checklist: {
    summary: {
      title: 'Lead with the symptom',
      description:
        'Describe the visible failure first so triage can classify it without reading the whole report twice.',
    },
    context: {
      title: 'Point to the exact surface',
      description:
        'Include the page, workflow, or action that triggered the problem and note whether it happens every time.',
    },
    contact: {
      title: 'Leave a reachable contact',
      description:
        'Use an email someone can reply to in case engineering needs screenshots, timestamps, or a repro session.',
    },
  },
  responseTitle: 'What happens next',
  responseBody:
    'Submitting the form sends the report to the app backend for validation and generates a reference ID you can share in follow-up conversations.',
  privacyNote:
    'Avoid pasting passwords, secrets, or personal data that is not needed to understand the issue.',
  fields: {
    name: {
      label: 'Your name',
      placeholder: 'Alex Johnson',
    },
    email: {
      label: 'Email address',
      placeholder: 'alex@example.com',
    },
    area: {
      label: 'Problem area',
      options: {
        bug: 'Bug',
        performance: 'Performance',
        account: 'Account or access',
        billing: 'Billing',
        other: 'Other',
      },
    },
    pageUrl: {
      label: 'Page URL',
      placeholder: 'https://app.example.com/settings',
    },
    subject: {
      label: 'Short summary',
      placeholder: 'Saving changes closes the modal unexpectedly',
    },
    details: {
      label: 'What happened?',
      placeholder:
        'What did you expect, what actually happened, and how can someone reproduce it?',
    },
  },
  footnote:
    'Required fields are enough to file the issue. Optional context just makes triage faster.',
  actions: {
    submit: 'Send report',
    submitting: 'Sending report...',
  },
  success: {
    message: 'Problem report received. Reference ID: {referenceId}.',
  },
  errors: {
    generic: 'The report could not be submitted. Check the form and try again.',
  },
};
