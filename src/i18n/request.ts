import { getRequestConfig } from 'next-intl/server';
import koMessages from '@/messages/ko.json';
import enMessages from '@/messages/en.json';

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) === 'en' ? 'en' : 'ko';
  return { locale, messages: locale === 'en' ? enMessages : koMessages };
});
