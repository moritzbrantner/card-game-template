import type { AppRole } from '@/lib/authorization';

export type AppSessionUser = {
  id: string;
  email: string;
  tag: string | null;
  name: string | null;
  image: string | null;
  role: AppRole;
};

export type AppSession = {
  user: AppSessionUser;
};
