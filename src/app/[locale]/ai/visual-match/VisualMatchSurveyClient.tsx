'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ChangeEvent, DragEvent, FormEvent } from 'react';
import { ImagePlus, Save, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/constants';
import {
  VISUAL_MATCH_CHECKOUT_IDEMPOTENCY_KEY,
  VISUAL_MATCH_ORDER_ID_KEY,
  VISUAL_MATCH_PAYMENT_COMPLETE_KEY,
  VISUAL_MATCH_PENDING_REQUEST_KEY,
  type PendingVisualMatchRequest,
  type VisualMatchConcept,
  type VisualMatchDiscipline,
} from '@/lib/visual-match/client';
import {
  cleanupExpiredVisualMatchImages,
  removeVisualMatchImage,
  saveVisualMatchImage,
} from '@/lib/visual-match/image-storage';
import styles from './visual-match.module.scss';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const TOTAL_STEPS = 4;

const LOCALE_LABELS: Record<SupportedLocale, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文(简体)',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
};

const COUNTRY_OPTIONS = [
  ['KR', '대한민국'],
  ['JP', '일본'],
  ['US', '미국'],
  ['CA', '캐나다'],
  ['GB', '영국'],
  ['AU', '호주'],
  ['OTHER', '기타'],
] as const;

const PRIMARY_FIELD_OPTIONS = ['vocal', 'rap', 'dance', 'acting', 'model', 'songwriting'] as const;
const INTEREST_OPTIONS = ['vocal', 'rap', 'dance', 'acting', 'model', 'songwriting'] as const;
const CONCEPT_OPTIONS = ['fresh', 'dark', 'elegant', 'street', 'dreamy', 'powerful'] as const;
const STEP_LABEL_KEYS = ['step_image', 'step_profile', 'step_preferences', 'step_consent'] as const;

export default function VisualMatchSurveyClient() {
  const t = useTranslations('VisualMatchPage');
  const locale = useLocale() as SupportedLocale;
  const router = useRouter();
  const { profile } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [country, setCountry] = useState('');
  const [primaryField, setPrimaryField] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [concepts, setConcepts] = useState<string[]>([]);
  const [customConcept, setCustomConcept] = useState('');
  const [reportLanguage, setReportLanguage] = useState<SupportedLocale | 'other'>(locale);
  const [otherLanguage, setOtherLanguage] = useState('');
  const [consent, setConsent] = useState(false);
  const [saveOriginal, setSaveOriginal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  useEffect(() => {
    void cleanupExpiredVisualMatchImages().catch((error) => {
      console.warn('[Visual Match] expired temporary image cleanup failed', error);
    });
  }, []);

  const moveToStep = (step: number) => {
    setCurrentStep(step);
    window.requestAnimationFrame(() => {
      document.querySelector('[data-visual-match-step]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const processImage = (file: File | undefined) => {
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setImageError(t('image_type_error'));
      setImagePreview(null);
      setImageName(null);
      setImageFile(null);
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setImageError(t('image_size_error'));
      setImagePreview(null);
      setImageName(null);
      setImageFile(null);
      return;
    }

    setImageError(null);
    setImageName(file.name);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setFormError(null);
    setSubmitMessage(null);
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    processImage(event.target.files?.[0]);
  };

  const handleImageDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    processImage(event.dataTransfer.files?.[0]);
  };

  const toggleSelection = (
    value: string,
    values: string[],
    setter: (next: string[]) => void,
  ) => {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  const validateStep = (step: number) => {
    if (step === 1 && (!imagePreview || imageError)) return t('error_image_required');
    if (
      step === 2
      && (
        !Number.isInteger(Number(age))
        || Number(age) < 1
        || Number(age) > 100
        || !gender
        || !Number.isFinite(Number(height))
        || Number(height) < 100
        || Number(height) > 250
        || !country
        || !primaryField
      )
    ) return t('error_required');
    if (step === 3 && reportLanguage === 'other' && !otherLanguage.trim()) return t('error_language');
    if (step === 4 && !consent) return t('error_consent');
    return null;
  };

  const handleStepSelect = (targetStep: number) => {
    setFormError(null);
    setSubmitMessage(null);

    if (targetStep > currentStep) {
      for (let step = currentStep; step < targetStep; step += 1) {
        const error = validateStep(step);
        if (error) {
          setFormError(error);
          return;
        }
      }
    }

    moveToStep(targetStep);
  };

  const handlePrevious = () => {
    if (currentStep === 1) {
      setFormError(null);
      setSubmitMessage(null);
      router.push(`/${locale}/ai/visual-match`);
      return;
    }

    handleStepSelect(currentStep - 1);
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) handleStepSelect(currentStep + 1);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSubmitMessage(null);

    const firstInvalidStep = [1, 2, 3, 4].find((step) => validateStep(step));
    if (firstInvalidStep) {
      setFormError(validateStep(firstInvalidStep));
      moveToStep(firstInvalidStep);
      return;
    }

    if (!imageFile) {
      setFormError(t('error_image_required'));
      moveToStep(1);
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('입력 내용을 저장하고 결제를 준비하고 있습니다.');

    let imageStorageKey: string | null = null;
    try {
      const baseRequest = {
        age: Number(age),
        gender: gender as PendingVisualMatchRequest['gender'],
        height: Number(height),
        country,
        primaryField: primaryField as VisualMatchDiscipline,
        interests: interests as VisualMatchDiscipline[],
        concepts: concepts as VisualMatchConcept[],
        customConcept: customConcept.trim() || undefined,
        reportLanguage: reportLanguage === 'other' ? otherLanguage.trim() : reportLanguage,
        saveOriginal,
      } satisfies Omit<PendingVisualMatchRequest, 'imageStorageKey' | 'imageMimeType'>;

      imageStorageKey = crypto.randomUUID();
      await saveVisualMatchImage(imageStorageKey, imageFile);

      const pendingRequest: PendingVisualMatchRequest = {
        ...baseRequest,
        imageStorageKey,
        imageMimeType: imageFile.type as PendingVisualMatchRequest['imageMimeType'],
      };
      window.sessionStorage.removeItem(VISUAL_MATCH_PAYMENT_COMPLETE_KEY);
      window.sessionStorage.removeItem(VISUAL_MATCH_ORDER_ID_KEY);
      window.sessionStorage.removeItem(VISUAL_MATCH_CHECKOUT_IDEMPOTENCY_KEY);
      window.sessionStorage.setItem(VISUAL_MATCH_PENDING_REQUEST_KEY, JSON.stringify(pendingRequest));
      router.push(`/${locale}/ai/visual-match/payment`);
    } catch (error) {
      console.error('[Visual Match] image preparation failed', error);
      if (imageStorageKey) {
        try {
          await removeVisualMatchImage(imageStorageKey);
        } catch (cleanupError) {
          console.warn('[Visual Match] temporary image cleanup failed', cleanupError);
        }
      }
      setSubmitMessage(null);
      setFormError('이미지를 결제 후 분석에 사용할 수 있도록 준비하지 못했습니다. 다시 시도해 주세요.');
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.surveyForm} onSubmit={handleSubmit} noValidate>
      {currentStep === 1 ? (
        <section className={styles.stepPanel} data-visual-match-step aria-labelledby="visual-match-image-title">
          <h1 id="visual-match-image-title" className={styles.screenTitle}>{t('image_section_title')}</h1>

          <label
            className={`${styles.uploadField} ${isDragging ? styles.dragging : ''}`}
            htmlFor="visual-match-image"
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (event.currentTarget === event.target) setIsDragging(false);
            }}
            onDrop={handleImageDrop}
          >
            <input
              id="visual-match-image"
              name="visual-match-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              aria-describedby="visual-match-image-requirements"
              required
            />
            {imagePreview ? (
              <img className={styles.imagePreview} src={imagePreview} alt={t('image_preview_alt')} />
            ) : (
              <span className={styles.uploadIcon} aria-hidden="true">
                <ImagePlus size={36} strokeWidth={1.4} />
              </span>
            )}
            <span className={styles.uploadCopy}>
              <strong>{imageName || t('upload_action')}</strong>
              <span>{imageName ? t('change_image') : t('drop_image')}</span>
              <small id="visual-match-image-requirements">{t('upload_requirements')}</small>
            </span>
          </label>
          {imageError ? <p className={styles.fieldError} role="alert">{imageError}</p> : null}
        </section>
      ) : null}

      {currentStep === 2 ? (
        <section className={styles.stepPanel} data-visual-match-step aria-labelledby="visual-match-profile-title">
          <h1 id="visual-match-profile-title" className={styles.screenTitle}>{t('profile_section_title')}</h1>

          <p className={styles.accountNote}>
            <Sparkles size={16} aria-hidden="true" />
            <span>{t('account_note')} <strong>{profile?.username || t('account_fallback')}</strong></span>
          </p>

          <div className={styles.fieldGrid}>
            <label className={styles.fieldGroup} htmlFor="visual-match-age">
              <span className={styles.fieldLabel}>{t('age_label')}</span>
              <input id="visual-match-age" type="number" inputMode="numeric" min="1" max="100" value={age} onChange={(event) => setAge(event.target.value)} placeholder={t('age_placeholder')} required />
            </label>

            <fieldset className={styles.fieldGroup}>
              <legend className={styles.fieldLabel}>{t('gender_label')}</legend>
              <div className={styles.choiceGrid}>
                <label className={styles.choiceLabel}>
                  <input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={(event) => setGender(event.target.value)} required />
                  <span>{t('gender_male')}</span>
                </label>
                <label className={styles.choiceLabel}>
                  <input type="radio" name="gender" value="female" checked={gender === 'female'} onChange={(event) => setGender(event.target.value)} />
                  <span>{t('gender_female')}</span>
                </label>
              </div>
            </fieldset>

            <label className={styles.fieldGroup} htmlFor="visual-match-height">
              <span className={styles.fieldLabel}>{t('height_label')}</span>
              <span className={styles.inputWithUnit}>
                <input id="visual-match-height" type="number" inputMode="decimal" min="100" max="250" value={height} onChange={(event) => setHeight(event.target.value)} placeholder={t('height_placeholder')} required />
                <span>{t('height_unit')}</span>
              </span>
            </label>

            <label className={styles.fieldGroup} htmlFor="visual-match-country">
              <span className={styles.fieldLabel}>{t('country_label')}</span>
              <select id="visual-match-country" value={country} onChange={(event) => setCountry(event.target.value)} required>
                <option value="">{t('country_placeholder')}</option>
                {COUNTRY_OPTIONS.map(([value, label]) => <option value={value} key={value}>{t(`country_${value}` as never) || label}</option>)}
              </select>
            </label>

            <label className={styles.fieldGroup} htmlFor="visual-match-primary-field">
              <span className={styles.fieldLabel}>{t('primary_field_label')}</span>
              <select id="visual-match-primary-field" value={primaryField} onChange={(event) => setPrimaryField(event.target.value)} required>
                <option value="">{t('primary_field_placeholder')}</option>
                {PRIMARY_FIELD_OPTIONS.map((value) => <option value={value} key={value}>{t(`field_${value}` as never)}</option>)}
              </select>
            </label>
          </div>
        </section>
      ) : null}

      {currentStep === 3 ? (
        <section className={styles.stepPanel} data-visual-match-step aria-labelledby="visual-match-preference-title">
          <h1 id="visual-match-preference-title" className={styles.screenTitle}>{t('preference_section_title')}</h1>

          <fieldset className={styles.preferenceGroup}>
            <legend className={styles.fieldLabel}>{t('interest_label')}</legend>
            <p className={styles.fieldHelp}>{t('interest_description')}</p>
            <div className={styles.choiceGrid}>
              {INTEREST_OPTIONS.map((value) => (
                <label className={styles.choiceLabel} key={value}>
                  <input type="checkbox" checked={interests.includes(value)} onChange={() => toggleSelection(value, interests, setInterests)} />
                  <span>{t(`field_${value}` as never)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.preferenceGroup}>
            <legend className={styles.fieldLabel}>{t('concept_label')}</legend>
            <p className={styles.fieldHelp}>{t('concept_description')}</p>
            <div className={styles.choiceGrid}>
              {CONCEPT_OPTIONS.map((value) => (
                <label className={styles.choiceLabel} key={value}>
                  <input type="checkbox" checked={concepts.includes(value)} onChange={() => toggleSelection(value, concepts, setConcepts)} />
                  <span>{t(`concept_${value}` as never)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className={styles.fieldGroup} htmlFor="visual-match-custom-concept">
            <span className={styles.fieldLabel}>{t('custom_concept_label')}</span>
            <input id="visual-match-custom-concept" type="text" value={customConcept} onChange={(event) => setCustomConcept(event.target.value)} placeholder={t('custom_concept_placeholder')} />
          </label>

          <section className={styles.preferenceLanguage} aria-labelledby="visual-match-language-title">
            <h2 id="visual-match-language-title">{t('language_section_title')}</h2>
            <div className={styles.languageRow}>
              <label className={styles.fieldGroup} htmlFor="visual-match-report-language">
                <span className={styles.fieldLabel}>{t('report_language_label')}</span>
                <select id="visual-match-report-language" value={reportLanguage} onChange={(event) => setReportLanguage(event.target.value as SupportedLocale | 'other')} required>
                  {SUPPORTED_LOCALES.map((supportedLocale) => <option value={supportedLocale} key={supportedLocale}>{LOCALE_LABELS[supportedLocale]}</option>)}
                  <option value="other">{t('other_language')}</option>
                </select>
              </label>
              {reportLanguage === 'other' ? (
                <label className={styles.fieldGroup} htmlFor="visual-match-other-language">
                  <span className={styles.fieldLabel}>{t('other_language_label')}</span>
                  <input id="visual-match-other-language" type="text" value={otherLanguage} onChange={(event) => setOtherLanguage(event.target.value)} placeholder={t('other_language_placeholder')} required />
                </label>
              ) : null}
            </div>
          </section>

        </section>
      ) : null}

      {currentStep === 4 ? (
        <section className={styles.stepPanel} data-visual-match-step aria-labelledby="visual-match-consent-title">
          <h1 id="visual-match-consent-title" className={styles.screenTitle}>{t('consent_step_title')}</h1>
          <p className={styles.screenDescription}>{t('consent_step_description')}</p>

          <div className={styles.consentBlock}>
            <div className={styles.consentHeading}>
              <ShieldCheck size={20} aria-hidden="true" />
              <h2>{t('consent_title')}</h2>
            </div>
            <p>{t('consent_description')}</p>
            <label className={styles.consentRow}>
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required />
              <span>{t('consent_label')}</span>
            </label>
            <label className={styles.optionalRow}>
              <input type="checkbox" checked={saveOriginal} onChange={(event) => setSaveOriginal(event.target.checked)} />
              <span><strong><Save size={15} aria-hidden="true" /> {t('save_original_label')}</strong><small>{t('save_original_description')}</small></span>
            </label>
          </div>
        </section>
      ) : null}

      {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}
      {submitMessage ? <p className={styles.submitMessage} role="status">{submitMessage}</p> : null}

      <div className={styles.paginationControls}>
        <button
          type="button"
          className={styles.paginationButton}
          onClick={handlePrevious}
        >
          {t('previous_step')}
        </button>

        <nav className={styles.dotPagination} aria-label={t('progress_label')}>
          {STEP_LABEL_KEYS.map((labelKey, index) => {
            const step = index + 1;
            return (
              <button
                type="button"
                key={labelKey}
                className={step === currentStep ? styles.activeDot : styles.dot}
                aria-label={`${step}. ${t(labelKey as never)}`}
                aria-current={step === currentStep ? 'step' : undefined}
                onClick={() => handleStepSelect(step)}
              />
            );
          })}
        </nav>

        {currentStep === TOTAL_STEPS ? (
          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>{isSubmitting ? '업로드 중…' : '결제로 계속하기'}</button>
        ) : (
          <button type="button" className={styles.paginationButton} onClick={handleNext}>{t('next_step')}</button>
        )}
      </div>
    </form>
  );
}
