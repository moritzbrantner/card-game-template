type Employee = {
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

const EMPLOYEES: Employee[] = [
  {
    id: 101,
    firstName: 'Ava',
    lastName: 'Thompson',
    birthday: '1992-04-11',
    email: 'ava.thompson@example.com',
    salary: 78000,
    active: true,
    team: 'Engineering',
    startDate: '2020-03-02',
    bonusEligible: true,
    managerId: 16,
  },
  {
    id: 102,
    firstName: 'Noah',
    lastName: 'Bennett',
    birthday: '1987-10-30',
    email: 'noah.bennett@example.com',
    salary: 91500,
    active: true,
    team: 'Product',
    startDate: '2018-09-17',
    bonusEligible: true,
    managerId: null,
  },
  {
    id: 103,
    firstName: 'Mila',
    lastName: 'Garcia',
    birthday: '1995-07-08',
    email: 'mila.garcia@example.com',
    salary: 64250,
    active: false,
    team: 'Support',
    startDate: '2021-01-25',
    bonusEligible: false,
    managerId: 27,
  },
];

export async function GET() {
  return Response.json(EMPLOYEES);
}
