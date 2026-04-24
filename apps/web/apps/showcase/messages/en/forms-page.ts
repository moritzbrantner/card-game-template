export const formsPage = {
  title: 'Employee profile form',
  description:
    'A production-leaning `react-hook-form` example paired with a quick state-management reference.',
  overviewTitle: 'Core primitives',
  interactionsTitle: 'State interactions',
  overview: {
    useForm:
      'Creates the form API, default values, validation mode, and state object that everything else reads from.',
    register:
      'Connects native inputs to the form and attaches rules without extra wrappers.',
    controller:
      'Bridges controlled components into the same form state when direct registration is not possible.',
    reset:
      'Restores defaults, clears errors, and can optionally keep parts of the current state.',
  },
  interactions: {
    initialRender: {
      title: 'Initial render',
      required:
        'Rules are registered, but untouched fields usually do not show errors yet.',
      dirty: '`isDirty` is false because current values still match defaults.',
      validity: '`isValid` depends on the chosen validation mode.',
      reset: '`reset()` returns to this clean baseline.',
    },
    validInput: {
      title: 'User enters a valid value',
      required: 'The required rule is now satisfied.',
      dirty:
        'Dirty state becomes true because the value diverged from the default.',
      validity:
        'Validity turns true once validation runs and no other errors remain.',
      reset: '`reset()` restores the original value and clears dirty state.',
    },
    invalidClear: {
      title: 'User clears a required field',
      required: 'The field fails the required rule again.',
      dirty: 'The field stays dirty until it matches the default exactly.',
      validity: '`isValid` becomes false after validation runs.',
      reset: '`reset()` clears the error when defaults are valid.',
    },
    resetWithValues: {
      title: 'reset(newValues)',
      required: 'Rules stay attached to the field definitions.',
      dirty: 'Dirty tracking is re-based against the new defaults.',
      validity: 'Validity is recalculated from the new reset state.',
      reset: 'Those new values become the fresh clean snapshot.',
    },
  },
};
