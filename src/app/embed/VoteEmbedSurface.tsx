'use client';

import { useEffect, useState } from 'react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import AuthProvider from '@/components/providers/AuthProvider';
import { SWRProvider } from '@/components/providers/SWRProvider';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/constants';
import type { CompaniesResponse } from '@/types/api';
import VoteBoardEmbedClient from './vote-board/VoteBoardEmbedClient';

export default function VoteEmbedSurface({
  initialLocale,
  initialMessages,
  initialData,
  surfaceOverride,
}: {
  initialLocale: SupportedLocale;
  initialMessages: AbstractIntlMessages;
  initialData: CompaniesResponse | null;
  surfaceOverride?: 'kpopface';
}) {
  const [language, setLanguage] = useState({
    locale: initialLocale,
    messages: initialMessages,
  });

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('lang');
    if (!requested || !SUPPORTED_LOCALES.includes(requested as SupportedLocale)) return;
    let disposed = false;
    const locale = requested as SupportedLocale;
    import(`@/messages/${locale}.json`).then((module) => {
      if (disposed) return;
      document.documentElement.lang = locale;
      setLanguage({ locale, messages: module.default });
    });
    return () => { disposed = true; };
  }, []);

  return (
    <NextIntlClientProvider locale={language.locale} messages={language.messages}>
      <SWRProvider>
        <AuthProvider>
          <VoteBoardEmbedClient
            locale={language.locale}
            surfaceOverride={surfaceOverride}
            initialData={initialData}
          />
        </AuthProvider>
      </SWRProvider>
    </NextIntlClientProvider>
  );
}
