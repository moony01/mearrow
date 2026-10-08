import { getRequestConfig } from 'next-intl/server';
import koMessages from '@/messages/ko.json';

export default getRequestConfig(async () => ({
  locale: 'ko',
  messages: koMessages,
}));
