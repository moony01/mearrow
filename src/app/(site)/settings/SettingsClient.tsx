'use client';

import { useTranslations } from 'next-intl';
import { Palette } from 'lucide-react';
import ThemeToggle from '@/components/common/ThemeToggle';
import styles from './settings.module.scss';

export default function SettingsClient() {
  const t = useTranslations('SettingsPage');

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
    </div>
  );
}
