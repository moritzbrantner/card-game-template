import type { AppLocale } from '@/i18n/routing';

import { RestDataTable, type RestDataColumn } from '@/apps/showcase/components/rest-data-table';

type EmployeeRow = {
  id: number;
  firstName: string;
  lastName: string;
  birthday: string;
  email: string;
  salary: number;
  active: boolean;
  team: string;
  startDate: string;
  bonusEligible: boolean;
  managerId: number | null;
};

const employeeColumns: Array<RestDataColumn<EmployeeRow>> = [
  { key: 'id', header: 'ID', valueType: 'number' },
  { key: 'firstName', header: 'First name' },
  { key: 'lastName', header: 'Last name' },
  { key: 'birthday', header: 'Birthday', valueType: 'date' },
  { key: 'email', header: 'Email' },
  { key: 'salary', header: 'Salary (USD)', valueType: 'currency' },
  { key: 'active', header: 'Active', valueType: 'boolean' },
  { key: 'team', header: 'Team' },
  { key: 'startDate', header: 'Start date', valueType: 'date' },
  { key: 'bonusEligible', header: 'Bonus', valueType: 'boolean' },
  { key: 'managerId', header: 'Manager ID', valueType: 'number' },
];

export default function TablePage({ locale }: { locale: AppLocale }) {
  void locale;
  return (
    <section className="flex min-h-[calc(100vh-8.5rem)] w-full flex-col">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Employee table</h1>
      <div className="flex-1 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <RestDataTable<EmployeeRow> endpoint="/api/examples/employees" columns={employeeColumns} />
      </div>
    </section>
  );
}
