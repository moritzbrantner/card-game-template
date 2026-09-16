'use client';

import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  formatInputSequence,
  navigationInputRegistry,
  type InputBinding,
  type InputBindingPatch,
  type InputProfile,
} from '@/src/input-bindings/foundation';
import { useInputBindings } from '@/src/input-bindings/provider';
import { useTranslations } from '@/src/i18n';

export function InputBindingsSettingsCard() {
  const t = useTranslations('SettingsPage');
  const {
    browserModule,
    profile,
    report,
    status,
    updateProfile,
    resetProfile,
  } = useInputBindings();
  const [recordingBindingId, setRecordingBindingId] = useState<string | null>(
    null,
  );
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const bindingsByAction = useMemo(() => {
    const result = new Map<string, InputBinding[]>();
    const bindings =
      report?.effectiveBindings ??
      navigationInputRegistry.actions.flatMap((action) => action.defaults ?? []);
    for (const binding of bindings) {
      const actionBindings = result.get(binding.action) ?? [];
      actionBindings.push(binding);
      result.set(binding.action, actionBindings);
    }
    return result;
  }, [report]);

  useEffect(() => {
    if (!recordingBindingId || !browserModule) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setRecordingBindingId(null);
        setRecordingError(null);
        return;
      }

      const stroke = browserModule.keyboardEventToStroke(event, {
        mode: 'physical',
      });
      if (!stroke) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const existingBinding = report?.effectiveBindings.find(
        (binding) => binding.id === recordingBindingId,
      );
      if (!existingBinding) {
        setRecordingError(t('inputBindings.invalid'));
        setRecordingBindingId(null);
        return;
      }

      const nextBinding: InputBinding = {
        ...existingBinding,
        sequence: [stroke],
      };
      const nextProfile = replaceBinding(profile, nextBinding);
      const nextReport = browserModule.validateRegistry(
        navigationInputRegistry,
        nextProfile,
      );
      const bindingConflict = nextReport.conflicts.find(
        (conflict) =>
          conflict.leftBindingId === recordingBindingId ||
          conflict.rightBindingId === recordingBindingId,
      );

      if (!nextReport.valid || bindingConflict) {
        setRecordingError(
          bindingConflict
            ? `${t('inputBindings.conflict')}: ${bindingConflict.kind}`
            : t('inputBindings.invalid'),
        );
        setRecordingBindingId(null);
        return;
      }

      updateProfile(nextProfile);
      setRecordingBindingId(null);
      setRecordingError(null);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [
    browserModule,
    profile,
    recordingBindingId,
    report,
    t,
    updateProfile,
  ]);

  const statusLabel =
    status === 'loading'
      ? t('inputBindings.loading')
      : status === 'degraded'
        ? t('inputBindings.degraded')
        : status === 'invalid'
          ? t('inputBindings.invalid')
          : t('inputBindings.ready');

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{t('inputBindings.title')}</CardTitle>
            <CardDescription>{t('inputBindings.description')}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={status === 'ready' ? 'secondary' : 'outline'}>
              {statusLabel}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!browserModule}
              onClick={() => {
                resetProfile();
                setRecordingBindingId(null);
                setRecordingError(null);
              }}
            >
              {t('inputBindings.resetAll')}
            </Button>
          </div>
        </div>
        {recordingError ? (
          <p className="text-sm text-destructive" role="alert">
            {recordingError}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-5">
        {navigationInputRegistry.actions.map((action) => {
          const bindings = bindingsByAction.get(action.id) ?? [];
          return (
            <section key={action.id} className="space-y-2">
              <div>
                <p className="text-sm font-medium">{action.title}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {action.id}
                </p>
              </div>
              <div className="space-y-2">
                {bindings.map((binding) => {
                  const isRecording = recordingBindingId === binding.id;
                  const isCustomized = profile.patches.some(
                    (patch) => patchBindingId(patch) === binding.id,
                  );
                  return (
                    <div
                      key={binding.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Badge variant="outline">
                          {isRecording
                            ? t('inputBindings.recording')
                            : formatInputSequence(binding.sequence)}
                        </Badge>
                        {isCustomized ? (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {t('inputBindings.customized')}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!browserModule || status === 'degraded'}
                          onClick={() => {
                            setRecordingError(null);
                            setRecordingBindingId(
                              isRecording ? null : binding.id,
                            );
                          }}
                        >
                          {isRecording
                            ? t('inputBindings.cancel')
                            : t('inputBindings.record')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={!isCustomized}
                          onClick={() =>
                            updateProfile(resetBinding(profile, binding.id))
                          }
                        >
                          {t('inputBindings.reset')}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}

function replaceBinding(
  profile: InputProfile,
  binding: InputBinding,
): InputProfile {
  return {
    ...profile,
    patches: [
      ...profile.patches.filter(
        (patch) => patchBindingId(patch) !== binding.id,
      ),
      { op: 'replace', bindingId: binding.id, binding },
    ],
  };
}

function resetBinding(profile: InputProfile, bindingId: string): InputProfile {
  return {
    ...profile,
    patches: profile.patches.filter(
      (patch) => patchBindingId(patch) !== bindingId,
    ),
  };
}

function patchBindingId(patch: InputBindingPatch) {
  return patch.op === 'add' ? patch.binding.id : patch.bindingId;
}
