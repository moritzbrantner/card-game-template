import { describe, expect, it } from 'vitest';

import {
  buildSubmissionMessage,
  departmentOptions,
  employeeProfileDefaultValues,
} from '@/src/domain/forms/employee-profile-form';

describe('employee profile form configuration', () => {
  it('exposes ten default values', () => {
    expect(Object.keys(employeeProfileDefaultValues)).toHaveLength(10);
    expect(employeeProfileDefaultValues.department).toBe(departmentOptions[0]);
  });

  it('builds a readable submission message', () => {
    const message = buildSubmissionMessage({
      ...employeeProfileDefaultValues,
      firstName: 'Jane',
      lastName: 'Doe',
      department: 'Engineering',
    });

    expect(message).toBe('Jane Doe submitted their profile for the Engineering team.');
  });
});
