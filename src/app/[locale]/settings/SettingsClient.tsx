'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Languages, Palette } from 'lucide-react';
import type { ChangeEvent } from 'react';
import ThemeToggle from '@/components/common/ThemeToggle';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/constants';
import styles from './settings.module.scss';

const LOCALE_LABELS: Record<SupportedLocale, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文(简体)',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
};

export default function SettingsClient() {
  const t = useTranslations('SettingsPage');
  const locale = useLocale() as SupportedLocale;
  const router = useRouter();

  const changeLanguage = (event: ChangeEvent<HTMLSelectElement>) => {
    const newLocale = event.target.value as SupportedLocale;
    router.push(`/${newLocale}/settings`);
  };

  return (
    <div className={styles.settingsList}>
      <section className={styles.settingsSection} aria-labelledby="settings-appearance-title">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionIcon} aria-hidden="true"><Palette size={20} /></span>
          <div>
            <h2 id="settings-appearance-title">{t('appearance_title')}</h2>
            <p>{t('appearance_description')}</p>
          </div>
        </div>

        <div className={styles.settingRow}>
          <div>
            <p className={styles.settingLabel}>{t('theme_label')}</p>
            <p className={styles.settingDescription}>{t('theme_description')}</p>
          </div>
          <ThemeToggle />
        </div>
      </section>

      <section className={styles.settingsSection} aria-labelledby="settings-language-title">
        <div className={styles.sectionHeading}>
          <span className={styles.sectionIcon} aria-hidden="true"><Languages size={20} /></span>
          <div>
            <h2 id="settings-language-title">{t('language_title')}</h2>
            <p>{t('language_description')}</p>
          </div>
        </div>

        <label className={styles.languageField}>
          <span>{t('language_label')}</span>
          <select value={locale} onChange={changeLanguage} aria-label={t('language_label')}>
            {SUPPORTED_LOCALES.map((supportedLocale) => (
              <option value={supportedLocale} key={supportedLocale}>{LOCALE_LABELS[supportedLocale]}</option>
            ))}
          </select>
        </label>
      </section>
    </div>
  );
}
