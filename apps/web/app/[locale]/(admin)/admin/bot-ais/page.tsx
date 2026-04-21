import { revalidatePath } from 'next/cache';

import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getAuthSession } from '@/src/auth.server';
import { getAuthorizedAdminPageDefinitions } from '@/src/admin/pages';
import {
  listUnoBotAiProfiles,
  saveUnoBotAiProfile,
  unoBotAiStrategies,
  type UnoBotAiProfileId,
} from '@/src/domain/game-bot-ai/service';
import { hasPermissionForRole } from '@/src/domain/authorization/service';
import { createTranslator } from '@/src/i18n/messages';
import { notFoundUnlessFeatureEnabled, requirePermission, resolveLocale } from '@/src/server/page-guards';

async function forbidUnlessAllowed(permission: 'admin.systemSettings.edit' | 'admin.systemSettings.read') {
  const session = await getAuthSession();

  if (!await hasPermissionForRole(session?.user.role, permission)) {
    throw new Error('Forbidden');
  }
}

async function saveBotAiProfile(formData: FormData) {
  'use server';

  await forbidUnlessAllowed('admin.systemSettings.edit');

  const locale = String(formData.get('locale') ?? 'en');

  await saveUnoBotAiProfile({
    id: String(formData.get('id') ?? '') as UnoBotAiProfileId,
    displayName: String(formData.get('displayName') ?? ''),
    enabled: formData.get('enabled') === 'on',
    strategy: String(formData.get('strategy') ?? ''),
    aggression: String(formData.get('aggression') ?? ''),
    actionCardBias: String(formData.get('actionCardBias') ?? ''),
    wildCardBias: String(formData.get('wildCardBias') ?? ''),
    drawBias: String(formData.get('drawBias') ?? ''),
    unoCallBias: String(formData.get('unoCallBias') ?? ''),
    notes: String(formData.get('notes') ?? ''),
  });

  revalidatePath(`/${locale}/admin/bot-ais`);
}

export default async function AdminBotAisPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  await notFoundUnlessFeatureEnabled('admin.systemSettings');
  const session = await requirePermission(locale, 'admin.systemSettings.read');
  const t = createTranslator(locale, 'AdminPage');
  const [adminPages, profiles, canEdit] = await Promise.all([
    getAuthorizedAdminPageDefinitions(session.user.role),
    listUnoBotAiProfiles(),
    hasPermissionForRole(session.user.role, 'admin.systemSettings.edit'),
  ]);

  return (
    <AdminPageShell title={t('botAis.title')} description={t('botAis.description')} adminPages={adminPages}>
      <section className="grid gap-4 lg:grid-cols-2">
        {profiles.map((profile) => (
          <Card key={profile.id} className="h-full">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle>{profile.displayName}</CardTitle>
                  <CardDescription>{profile.description}</CardDescription>
                </div>
                <Badge variant={profile.enabled ? 'default' : 'outline'}>
                  {profile.enabled ? 'Active' : 'Fallback'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <form action={saveBotAiProfile} className="grid gap-4">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={profile.id} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`${profile.id}-displayName`}>Display name</Label>
                    <Input
                      id={`${profile.id}-displayName`}
                      name="displayName"
                      defaultValue={profile.displayName}
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${profile.id}-strategy`}>Strategy</Label>
                    <select
                      id={`${profile.id}-strategy`}
                      name="strategy"
                      defaultValue={profile.strategy}
                      disabled={!canEdit}
                      className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700"
                    >
                      {unoBotAiStrategies.map((strategy) => (
                        <option key={strategy} value={strategy}>
                          {strategy}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-3 rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
                  <input
                    type="checkbox"
                    name="enabled"
                    defaultChecked={profile.enabled}
                    disabled={!canEdit}
                    className="size-4 rounded border-zinc-300"
                  />
                  <span className="font-medium">Use this profile when matching bot seats</span>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`${profile.id}-aggression`}>Aggression</Label>
                    <Input
                      id={`${profile.id}-aggression`}
                      name="aggression"
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={profile.aggression}
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${profile.id}-unoCallBias`}>UNO call bias</Label>
                    <Input
                      id={`${profile.id}-unoCallBias`}
                      name="unoCallBias"
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={profile.unoCallBias}
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${profile.id}-actionCardBias`}>Action card bias</Label>
                    <Input
                      id={`${profile.id}-actionCardBias`}
                      name="actionCardBias"
                      type="number"
                      min={-200}
                      max={200}
                      defaultValue={profile.actionCardBias}
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${profile.id}-wildCardBias`}>Wild card bias</Label>
                    <Input
                      id={`${profile.id}-wildCardBias`}
                      name="wildCardBias"
                      type="number"
                      min={-200}
                      max={200}
                      defaultValue={profile.wildCardBias}
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor={`${profile.id}-drawBias`}>Draw/pass bias</Label>
                    <Input
                      id={`${profile.id}-drawBias`}
                      name="drawBias"
                      type="number"
                      min={-200}
                      max={200}
                      defaultValue={profile.drawBias}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${profile.id}-notes`}>Notes</Label>
                  <Textarea
                    id={`${profile.id}-notes`}
                    name="notes"
                    defaultValue={profile.notes}
                    maxLength={280}
                    disabled={!canEdit}
                  />
                </div>

                <Button type="submit" disabled={!canEdit} className="w-fit">
                  Save AI
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </section>
    </AdminPageShell>
  );
}
