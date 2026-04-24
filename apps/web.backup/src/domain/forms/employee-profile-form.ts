export type EmployeeProfileFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: number;
  jobTitle: string;
  startDate: string;
  department: string;
  newsletter: boolean;
  bio: string;
};

export const departmentOptions = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'People Ops',
] as const;

export const employeeProfileDefaultValues: EmployeeProfileFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  age: 18,
  jobTitle: '',
  startDate: '',
  department: departmentOptions[0],
  newsletter: false,
  bio: '',
};

export function buildSubmissionMessage(
  values: EmployeeProfileFormValues,
): string {
  return `${values.firstName} ${values.lastName} submitted their profile for the ${values.department} team.`;
}
