import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('next-env contract', () => {
  it('pins typed-route imports to the stable .next/types output', () => {
    const nextEnv = readFileSync(
      path.join(process.cwd(), 'next-env.d.ts'),
      'utf8',
    );

    expect(nextEnv).toContain('/// <reference types="next" />');
    expect(nextEnv).toContain('/// <reference types="next/image-types/global" />');
    expect(nextEnv).toContain('import "./.next/types/routes.d.ts";');
    expect(nextEnv).not.toContain('.next/dev/types/routes.d.ts');
  });
});
