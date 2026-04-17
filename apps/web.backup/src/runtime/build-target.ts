import { getEnv } from '@/src/config/env';

export const isGithubPagesBuild = getEnv().deploymentTarget === 'gh-pages';
