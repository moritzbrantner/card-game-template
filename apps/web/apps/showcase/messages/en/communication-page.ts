export const communicationPage = {
  eyebrow: 'Communication category',
  title: 'Realtime communication',
  description:
    'A quick reference for the collaboration primitives that matter once multiple clients must share state.',
  intro:
    'Use this page as a template stub when you need to compare transport choices against shared-state choices. WebSockets move events quickly; CRDTs keep replicas convergent when edits happen concurrently.',
  newsletter: {
    eyebrow: 'Email channel',
    title: 'Newsletter',
    description:
      'Capture an email address and send a real message through Mailpit during local and e2e testing.',
    email: 'Email address',
    submit: 'Subscribe',
    submitting: 'Subscribing...',
    requiredEmail: 'Email is required.',
    invalidEmail: 'Enter a valid email address.',
    success: 'You are subscribed. Check your inbox for the welcome message.',
    genericError: 'Unable to create the subscription right now.',
  },
  sections: {
    websockets: {
      eyebrow: 'Communication topic',
      title: 'WebSockets',
      summary:
        'WebSockets keep one long-lived connection open so clients and servers can exchange low-latency events without repeated request setup.',
      bullets: {
        0: 'Useful for presence, chat, collaborative cursors, and streaming updates.',
        1: 'Most apps need connection management, auth refresh, heartbeats, and reconnection state.',
        2: 'Small event payloads are easier to merge incrementally in the UI.',
      },
    },
    crdts: {
      eyebrow: 'Communication topic',
      title: 'CRDTs',
      summary:
        'CRDTs let multiple clients edit shared state concurrently and still converge on the same result without central lock-step coordination.',
      bullets: {
        0: 'Useful when collaboration must continue through offline periods or unstable connectivity.',
        1: 'Most apps persist operations locally and sync them back once a connection is available.',
        2: 'Conflict resolution moves into the data structure instead of living as ad hoc UI merge logic.',
      },
    },
  },
};
