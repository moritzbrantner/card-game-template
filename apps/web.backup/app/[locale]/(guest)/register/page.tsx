import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { RegisterForm } from '@/components/auth/register-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createTranslator } from '@/src/i18n/messages';
import { notFoundUnlessFeatureEnabled, requireGuest, resolveLocale } from '@/src/server/page-guards';

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  notFoundUnlessFeatureEnabled('account.register');
  await requireGuest(locale);
  const t = createTranslator(locale, 'AuthPages.register');

  return (
    <div className="mx-auto grid min-h-[calc(100vh-10rem)] max-w-5xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="order-2 space-y-6 lg:order-1">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">{t('eyebrow')}</p>
        <div className="space-y-4">
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{t('heroTitle')}</h1>
          <p className="max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">{t('heroDescription')}</p>
        </div>
      </section>

      <Card className="order-1 border-zinc-200/80 shadow-xl shadow-zinc-950/5 dark:border-zinc-800/80 dark:shadow-black/20 lg:order-2">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RegisterForm
            locale={locale}
            labels={{
              name: t('form.name'),
              email: t('form.email'),
              password: t('form.password'),
              confirmPassword: t('form.confirmPassword'),
              submit: t('form.submit'),
              submitting: t('form.submitting'),
              requiredEmail: t('form.requiredEmail'),
              invalidEmail: t('form.invalidEmail'),
              requiredPassword: t('form.requiredPassword'),
              weakPassword: t('form.weakPassword'),
              requiredConfirmPassword: t('form.requiredConfirmPassword'),
              passwordMismatch: t('form.passwordMismatch'),
              nameTooLong: t('form.nameTooLong'),
              genericError: t('form.genericError'),
              loginPrompt: t('form.loginPrompt'),
              loginCta: t('form.loginCta'),
            }}
          />

          <ForgotPasswordForm
            locale={locale}
            labels={{
              title: t('form.resetPasswordTitle'),
              description: t('form.resetPasswordDescription'),
              email: t('form.resetPasswordEmail'),
              submit: t('form.resetPasswordSubmit'),
              submitting: t('form.resetPasswordSubmitting'),
              requiredEmail: t('form.requiredEmail'),
              invalidEmail: t('form.invalidEmail'),
              success: t('form.resetPasswordSuccess'),
              genericError: t('form.resetPasswordGenericError'),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
