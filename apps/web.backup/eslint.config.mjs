import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const DEPRECATED_IMPORT_PATTERNS = [
  '@features/*',
  '@stores/*',
  '@services/*',
  '@/features/*',
  '@/stores/*',
  '@/lib/services/*',
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}', 'scripts/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: DEPRECATED_IMPORT_PATTERNS,
        },
      ],
    },
  },
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['@/app/*', '@/components/*'],
        },
      ],
    },
  },
  {
    files: ['src/db/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['@/app/*', '@/components/*', '@/src/domain/*', '@/src/profile/*'],
        },
      ],
    },
  },
  {
    files: ['lib/validation/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@/app/*',
            '@/components/*',
            '@/src/*',
            '@features/*',
            '@/features/*',
            '@stores/*',
            '@/stores/*',
            '@services/*',
            '@/lib/services/*',
          ],
        },
      ],
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'dist/**',
    'coverage/**',
    'vendor/**',
    'next-env.d.ts',
    'src/routes/**',
    'src/routeTree.gen.ts',
    'src/router.tsx',
    'components/router-devtools.tsx',
  ]),
]);

export default eslintConfig;
