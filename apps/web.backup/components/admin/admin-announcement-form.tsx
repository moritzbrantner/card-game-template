'use client';

import { useActionState } from 'react';

import { buttonVariants, Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';
import type { SiteAnnouncementStatus } from '@/src/site-config/service';

export type AnnouncementFormState = {
  error?: string;
  fieldErrors?: Partial<Record<'title' | 'body' | 'status' | 'publishAt' | 'unpublishAt', string>>;
};

export type AnnouncementFormValues = {
  id?: string;
  locale: 'en' | 'de';
  title: string;
  body: string;
  href: string;
  status: SiteAnnouncementStatus;
  publishAt: string;
  unpublishAt: string;
};

type AdminAnnouncementFormProps = {
  mode: 'create' | 'edit';
  initialValues: AnnouncementFormValues;
  cancelHref?: string;
  action: (state: AnnouncementFormState, formData: FormData) => Promise<AnnouncementFormState>;
};

const initialState: AnnouncementFormState = {};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-red-600 dark:text-red-400">{message}</p>;
}

export function AdminAnnouncementForm({
  mode,
  initialValues,
  cancelHref,
  action,
}: AdminAnnouncementFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="locale" value={initialValues.locale} />
      <input type="hidden" name="id" value={initialValues.id ?? ''} />

      <div className="grid gap-2">
        <Label htmlFor="announcement-title">Title</Label>
        <Input id="announcement-title" name="title" defaultValue={initialValues.title} />
        <FieldError message={state.fieldErrors?.title} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="announcement-body">Body</Label>
        <Textarea id="announcement-body" name="body" defaultValue={initialValues.body} rows={5} />
        <FieldError message={state.fieldErrors?.body} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="announcement-href">Destination link</Label>
        <Input id="announcement-href" name="href" defaultValue={initialValues.href} placeholder="/status" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="announcement-status">Status</Label>
          <select
            id="announcement-status"
            name="status"
            defaultValue={initialValues.status}
            className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:ring-zinc-50"
          >
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <FieldError message={state.fieldErrors?.status} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="announcement-publish-at">Publish at</Label>
          <Input id="announcement-publish-at" type="datetime-local" name="publishAt" defaultValue={initialValues.publishAt} />
          <FieldError message={state.fieldErrors?.publishAt} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="announcement-unpublish-at">Unpublish at</Label>
          <Input id="announcement-unpublish-at" type="datetime-local" name="unpublishAt" defaultValue={initialValues.unpublishAt} />
          <FieldError message={state.fieldErrors?.unpublishAt} />
        </div>
      </div>

      {state.error ? <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : mode === 'edit' ? 'Update announcement' : 'Create announcement'}
        </Button>
        {cancelHref ? (
          <Link href={cancelHref} className={buttonVariants({ variant: 'ghost' })}>
            Cancel
          </Link>
        ) : null}
      </div>
    </form>
  );
}
