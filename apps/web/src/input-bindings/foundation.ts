import { appPageDefinitions } from '@/src/navigation/app-routes';

export const INPUT_BINDINGS_BROWSER_BUNDLE_URL =
  'https://moritzbrantner.github.io/input-bindings/input-bindings-browser.js';
export const INPUT_BINDINGS_STORAGE_KEY = 'card-game-template.input-bindings.v1';
export const NAVIGATION_CONTEXT_ID = 'app.navigation';
export const NAVIGATION_PALETTE_ACTION_ID = 'navigation.palette';

export type InputModifiers = {
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  altGraph?: boolean;
};

export type KeyStroke = {
  key: { kind: 'logical' | 'physical'; value: string };
  modifiers?: InputModifiers;
};

export type InputBinding = {
  id: string;
  action: string;
  sequence: KeyStroke[];
  when?: { op: 'context'; id: string } | { op: 'always' };
  priority?: number;
};

export type InputBindingPatch =
  | { op: 'add'; binding: InputBinding }
  | { op: 'remove'; bindingId: string }
  | { op: 'replace'; bindingId: string; binding: InputBinding };

export type InputProfile = {
  id: string;
  patches: InputBindingPatch[];
};

export type InputAction = {
  id: string;
  title: string;
  description?: string;
  categoryPath?: string[];
  repeatPolicy?: 'never' | 'allow';
  allowedDevices?: Array<'keyboard' | 'mouse' | 'gamepad' | 'pointer'>;
  defaults?: InputBinding[];
  provenance?: { source: string; version?: string };
};

export type InputActionRegistry = {
  actions: InputAction[];
};

export type InputConflict = {
  leftBindingId: string;
  rightBindingId: string;
  kind: string;
};

export type InputValidationReport = {
  valid: boolean;
  effectiveBindings: InputBinding[];
  diagnostics: Array<{
    kind: string;
    actionId?: string;
    bindingId?: string;
    patchIndex?: number;
    strokeIndex?: number;
  }>;
  conflicts: InputConflict[];
};

export type RuntimeDispatch = {
  action: string;
  bindingId: string;
  phase: 'press' | 'repeat' | 'release';
};

type RuntimeController = {
  updateConfiguration(
    registry: InputActionRegistry,
    profile?: InputProfile,
  ): unknown;
  reset(reason?: string): unknown;
};

type RuntimeControllerConstructor = new (options: {
  registry: InputActionRegistry;
  profile?: InputProfile;
  getActiveContexts: () => ReadonlySet<string>;
  chordTimeoutMs?: number;
  consumePolicy?: 'never' | 'matched' | 'dispatched';
  onDispatch?: (dispatch: RuntimeDispatch) => void;
}) => RuntimeController;

export type InputBindingsBrowserModule = {
  InputRuntimeController: RuntimeControllerConstructor;
  attachKeyboardRuntime(
    controller: RuntimeController,
    options: {
      keyTarget: Document;
      focusTarget: Window;
      visibilityTarget: Document;
      ignoreTextEntry: boolean;
      mode: 'logical' | 'physical';
    },
  ): () => void;
  keyboardEventToStroke(
    event: KeyboardEvent,
    options?: { mode?: 'logical' | 'physical' },
  ): KeyStroke | null;
  validateRegistry(
    registry: InputActionRegistry,
    profile?: InputProfile,
  ): InputValidationReport;
};

export const defaultInputProfile: InputProfile = {
  id: 'card-game-template',
  patches: [],
};

export const navigationInputRegistry: InputActionRegistry = {
  actions: [
    {
      id: NAVIGATION_PALETTE_ACTION_ID,
      title: 'Open shortcut navigator',
      categoryPath: ['Application', 'Navigation'],
      repeatPolicy: 'never',
      allowedDevices: ['keyboard'],
      defaults: [
        binding(
          'card-game.navigation.palette.question',
          NAVIGATION_PALETTE_ACTION_ID,
          'Slash',
          { shift: true },
        ),
        binding(
          'card-game.navigation.palette.ctrl-k',
          NAVIGATION_PALETTE_ACTION_ID,
          'KeyK',
          { ctrl: true },
        ),
        binding(
          'card-game.navigation.palette.meta-k',
          NAVIGATION_PALETTE_ACTION_ID,
          'KeyK',
          { meta: true },
        ),
      ],
      provenance: { source: 'card-game-template/navigation', version: '1' },
    },
    ...appPageDefinitions.map<InputAction>((page) => ({
      id: navigationActionId(page.key),
      title: `Go to ${humanize(page.key)}`,
      categoryPath: ['Application', 'Navigation'],
      repeatPolicy: 'never',
      allowedDevices: ['keyboard'],
      defaults: [
        binding(
          `card-game.navigation.${page.key}.default`,
          navigationActionId(page.key),
          `Key${page.hotkey[1].toUpperCase()}`,
          { alt: true },
        ),
      ],
      provenance: { source: 'card-game-template/navigation', version: '1' },
    })),
  ],
};

let browserModulePromise: Promise<InputBindingsBrowserModule> | undefined;

export function loadInputBindingsBrowser(): Promise<InputBindingsBrowserModule> {
  browserModulePromise ??= import(
    /* webpackIgnore: true */ INPUT_BINDINGS_BROWSER_BUNDLE_URL
  ) as Promise<InputBindingsBrowserModule>;
  return browserModulePromise;
}

export function navigationActionId(pageKey: string) {
  return `navigation.go.${pageKey}`;
}

export function readInputProfile(
  storage: Pick<Storage, 'getItem'> = window.localStorage,
): InputProfile {
  const stored = storage.getItem(INPUT_BINDINGS_STORAGE_KEY);
  if (!stored) {
    return structuredClone(defaultInputProfile);
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!isRecord(parsed) || typeof parsed.id !== 'string' || !Array.isArray(parsed.patches)) {
      return structuredClone(defaultInputProfile);
    }
    return parsed as InputProfile;
  } catch {
    return structuredClone(defaultInputProfile);
  }
}

export function writeInputProfile(
  profile: InputProfile,
  storage: Pick<Storage, 'setItem'> = window.localStorage,
) {
  storage.setItem(INPUT_BINDINGS_STORAGE_KEY, JSON.stringify(profile));
}

export function formatInputSequence(sequence: readonly KeyStroke[]) {
  return sequence.map(formatKeyStroke).join(' then ');
}

export function formatKeyStroke(stroke: KeyStroke) {
  const parts = [
    stroke.modifiers?.ctrl ? 'Ctrl' : null,
    stroke.modifiers?.alt ? 'Alt' : null,
    stroke.modifiers?.shift ? 'Shift' : null,
    stroke.modifiers?.meta ? 'Meta' : null,
    stroke.modifiers?.altGraph ? 'AltGr' : null,
    displayKey(stroke.key.value),
  ].filter((part): part is string => Boolean(part));
  return parts.join('+');
}

function binding(
  id: string,
  action: string,
  keyCode: string,
  modifiers: InputModifiers,
): InputBinding {
  return {
    id,
    action,
    sequence: [
      {
        key: { kind: 'physical', value: keyCode },
        modifiers,
      },
    ],
    when: { op: 'context', id: NAVIGATION_CONTEXT_ID },
    priority: 0,
  };
}

function humanize(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function displayKey(code: string) {
  if (code.startsWith('Key') && code.length === 4) {
    return code.slice(3);
  }
  if (code === 'Slash') {
    return '/';
  }
  return code;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
