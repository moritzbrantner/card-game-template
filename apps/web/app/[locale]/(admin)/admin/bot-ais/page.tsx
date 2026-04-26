import { revalidatePath } from 'next/cache';

import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getAuthSession } from '@/src/auth.server';
import { getAuthorizedAdminPageDefinitions } from '@/src/admin/pages';
import {
  listPhase10BotAiProfiles,
  listPokerBotAiProfiles,
  listUnoBotAiProfiles,
  savePhase10BotAiProfile,
  savePokerBotAiProfile,
  saveUnoBotAiProfile,
  type Phase10BotAiProfile,
  type PokerBotAiProfile,
  type UnoBotAiProfile,
} from '@/src/domain/game-bot-ai/service';
import { hasPermissionForRole } from '@/src/domain/authorization/service';
import { createTranslator } from '@/src/i18n/messages';
import {
  notFoundUnlessFeatureEnabled,
  requirePermission,
  resolveLocale,
} from '@/src/server/page-guards';

type GameKey = 'uno' | 'poker' | 'phase10';

type ProfileCard = UnoBotAiProfile | PokerBotAiProfile | Phase10BotAiProfile;

type FieldConfig = {
  name: string;
  label: string;
  hint: string;
  min: number;
  max: number;
};

type EditorSection = {
  gameId: GameKey;
  title: string;
  description: string;
  badgeLabel: string;
  fields: readonly FieldConfig[];
  profiles: readonly ProfileCard[];
};

const unoFields = [
  {
    name: 'aggression',
    label: 'Aggression',
    hint: 'Higher values prefer getting cards out of hand sooner.',
    min: 0,
    max: 100,
  },
  {
    name: 'actionCardBias',
    label: 'Action-card rule',
    hint: 'Positive values favor skip, reverse, and draw penalties.',
    min: -200,
    max: 200,
  },
  {
    name: 'wildCardBias',
    label: 'Wild-card rule',
    hint: 'Negative values save wilds for later. Positive values spend them.',
    min: -200,
    max: 200,
  },
  {
    name: 'drawBias',
    label: 'Draw/pass rule',
    hint: 'Negative values avoid drawing or passing when a play exists.',
    min: -200,
    max: 200,
  },
  {
    name: 'unoCallBias',
    label: 'UNO-call rule',
    hint: 'Higher values strongly prefer moves that explicitly call UNO.',
    min: 0,
    max: 100,
  },
] as const satisfies readonly FieldConfig[];

const pokerFields = [
  {
    name: 'betBias',
    label: 'Betting rule',
    hint: 'Positive values push the bot toward betting or raising.',
    min: -200,
    max: 200,
  },
  {
    name: 'callBias',
    label: 'Calling rule',
    hint: 'Positive values keep the bot in the hand more often.',
    min: -200,
    max: 200,
  },
  {
    name: 'foldBias',
    label: 'Folding rule',
    hint: 'Positive values make the bot release marginal spots sooner.',
    min: -200,
    max: 200,
  },
  {
    name: 'bigBetBias',
    label: 'Big-bet rule',
    hint: 'Positive values favor larger bet sizes over smaller ones.',
    min: -200,
    max: 200,
  },
  {
    name: 'stackPreservationBias',
    label: 'Stack-preservation rule',
    hint: 'Higher values protect chips when calls or bets become expensive.',
    min: -200,
    max: 200,
  },
] as const satisfies readonly FieldConfig[];

const phase10Fields = [
  {
    name: 'phaseLayBias',
    label: 'Lay-phase rule',
    hint: 'Higher values strongly prioritize laying a completed phase.',
    min: -200,
    max: 200,
  },
  {
    name: 'hitBias',
    label: 'Hit rule',
    hint: 'Positive values favor adding cards onto laid groups quickly.',
    min: -200,
    max: 200,
  },
  {
    name: 'discardPickupBias',
    label: 'Discard-pickup rule',
    hint: 'Positive values make the bot take useful discard cards more often.',
    min: -200,
    max: 200,
  },
  {
    name: 'wildRetentionBias',
    label: 'Wild-retention rule',
    hint: 'Higher values protect wild and skip cards from being discarded.',
    min: -200,
    max: 200,
  },
  {
    name: 'highCardDiscardBias',
    label: 'High-card discard rule',
    hint: 'Positive values dump larger number cards earlier.',
    min: -200,
    max: 200,
  },
] as const satisfies readonly FieldConfig[];

async function forbidUnlessAllowed(
  permission: 'admin.systemSettings.edit' | 'admin.systemSettings.read',
) {
  const session = await getAuthSession();

  if (!(await hasPermissionForRole(session?.user.role, permission))) {
    throw new Error('Forbidden');
  }
}

function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '');
}

async function saveBotAiProfile(formData: FormData) {
  'use server';

  await forbidUnlessAllowed('admin.systemSettings.edit');

  const locale = readText(formData, 'locale');
  const gameId = readText(formData, 'gameId');
  const id = readText(formData, 'id');
  const displayName = readText(formData, 'displayName');
  const notes = readText(formData, 'notes');
  const enabled = formData.get('enabled') === 'on';

  switch (gameId) {
    case 'uno':
      await saveUnoBotAiProfile({
        id,
        displayName,
        enabled,
        aggression: readText(formData, 'aggression'),
        actionCardBias: readText(formData, 'actionCardBias'),
        wildCardBias: readText(formData, 'wildCardBias'),
        drawBias: readText(formData, 'drawBias'),
        unoCallBias: readText(formData, 'unoCallBias'),
        notes,
      });
      break;
    case 'poker':
      await savePokerBotAiProfile({
        id,
        displayName,
        enabled,
        betBias: readText(formData, 'betBias'),
        callBias: readText(formData, 'callBias'),
        foldBias: readText(formData, 'foldBias'),
        bigBetBias: readText(formData, 'bigBetBias'),
        stackPreservationBias: readText(formData, 'stackPreservationBias'),
        notes,
      });
      break;
    case 'phase10':
      await savePhase10BotAiProfile({
        id,
        displayName,
        enabled,
        phaseLayBias: readText(formData, 'phaseLayBias'),
        hitBias: readText(formData, 'hitBias'),
        discardPickupBias: readText(formData, 'discardPickupBias'),
        wildRetentionBias: readText(formData, 'wildRetentionBias'),
        highCardDiscardBias: readText(formData, 'highCardDiscardBias'),
        notes,
      });
      break;
    default:
      throw new Error('Unknown bot AI game.');
  }

  revalidatePath(`/${locale}/admin/bot-ais`);
}

function renderProfileCard(input: {
  canEdit: boolean;
  fields: readonly FieldConfig[];
  gameId: GameKey;
  locale: string;
  profile: ProfileCard;
}) {
  const profileRecord = input.profile as Record<
    string,
    string | number | boolean
  >;

  return (
    <Card key={`${input.gameId}-${input.profile.id}`} className="h-full">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{input.profile.displayName}</CardTitle>
            <CardDescription>{input.profile.description}</CardDescription>
          </div>
          <Badge variant={input.profile.enabled ? 'default' : 'outline'}>
            {input.profile.enabled ? 'Enabled' : 'Fallback only'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form action={saveBotAiProfile} className="grid gap-4">
          <input type="hidden" name="locale" value={input.locale} />
          <input type="hidden" name="gameId" value={input.gameId} />
          <input type="hidden" name="id" value={input.profile.id} />

          <div className="space-y-2">
            <Label htmlFor={`${input.gameId}-${input.profile.id}-displayName`}>
              Display name
            </Label>
            <Input
              id={`${input.gameId}-${input.profile.id}-displayName`}
              name="displayName"
              defaultValue={input.profile.displayName}
              disabled={!input.canEdit}
            />
          </div>

          <label className="flex items-center gap-3 rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={input.profile.enabled}
              disabled={!input.canEdit}
              className="size-4 rounded border-zinc-300"
            />
            <span className="font-medium">
              Use this rule set when its matching bot seat appears
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            {input.fields.map((field) => (
              <div
                key={`${input.gameId}-${input.profile.id}-${field.name}`}
                className="space-y-2"
              >
                <Label
                  htmlFor={`${input.gameId}-${input.profile.id}-${field.name}`}
                >
                  {field.label}
                </Label>
                <Input
                  id={`${input.gameId}-${input.profile.id}-${field.name}`}
                  name={field.name}
                  type="number"
                  min={field.min}
                  max={field.max}
                  defaultValue={String(profileRecord[field.name] ?? '')}
                  disabled={!input.canEdit}
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {field.hint}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${input.gameId}-${input.profile.id}-notes`}>
              Notes
            </Label>
            <Textarea
              id={`${input.gameId}-${input.profile.id}-notes`}
              name="notes"
              defaultValue={input.profile.notes}
              maxLength={280}
              disabled={!input.canEdit}
            />
          </div>

          <Button type="submit" disabled={!input.canEdit} className="w-fit">
            Save AI rules
          </Button>
        </form>
      </CardContent>
    </Card>
  );
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
  const [adminPages, unoProfiles, pokerProfiles, phase10Profiles, canEdit] =
    await Promise.all([
      getAuthorizedAdminPageDefinitions(session.user.role),
      listUnoBotAiProfiles(),
      listPokerBotAiProfiles(),
      listPhase10BotAiProfiles(),
      hasPermissionForRole(session.user.role, 'admin.systemSettings.edit'),
    ]);

  const sections: readonly EditorSection[] = [
    {
      gameId: 'uno',
      title: 'UNO',
      description:
        'Tune the rules for server-run UNO bot seats, including wild-card timing and UNO calls.',
      badgeLabel: 'Server',
      fields: unoFields,
      profiles: unoProfiles,
    },
    {
      gameId: 'poker',
      title: 'Poker',
      description:
        'Adjust how Texas Hold’em bots balance betting pressure, calls, folds, and stack protection.',
      badgeLabel: 'Server',
      fields: pokerFields,
      profiles: pokerProfiles,
    },
    {
      gameId: 'phase10',
      title: 'Phase 10',
      description:
        'Define the local Phase 10 bot rules for laying phases, hitting, and discarding.',
      badgeLabel: 'Local + Showcase',
      fields: phase10Fields,
      profiles: phase10Profiles,
    },
  ];

  return (
    <AdminPageShell
      title={t('botAis.title')}
      description={t('botAis.description')}
      adminPages={adminPages}
    >
      <div className="grid gap-6">
        {sections.map((section) => (
          <section
            key={section.gameId}
            className="space-y-4 rounded-[1.75rem] border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight">
                  {section.title}
                </h2>
                <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-300">
                  {section.description}
                </p>
              </div>
              <Badge variant="outline">{section.badgeLabel}</Badge>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {section.profiles.map((profile) => (
                <div key={`${section.gameId}-${profile.id}`}>
                  {renderProfileCard({
                    canEdit,
                    fields: section.fields,
                    gameId: section.gameId,
                    locale,
                    profile,
                  })}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AdminPageShell>
  );
}
