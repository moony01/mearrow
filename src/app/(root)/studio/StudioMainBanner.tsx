'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ExportedImage from 'next-image-export-optimizer';
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import styles from './StudioMainBanner.module.scss';

type BannerSlide = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  action: string;
  href: string;
  video?: {
    src: string;
    poster: string;
  };
};

const slides: BannerSlide[] = [
  {
    id: 'discover',
    eyebrow: 'MEARROW STUDIO',
    title: 'Everything across MEARROW, in one place.',
    description:
      'Explore the stories, opportunities, votes, and services shaping the K-pop community.',
    image: '/images/studio/studio-news.webp',
    action: 'Explore the latest stories',
    href: '#news',
  },
  {
    id: 'auditions',
    eyebrow: 'AUDITIONS',
    title: 'Your next opportunity starts here.',
    description: 'Find audition notices checked against official sources across the K-pop industry.',
    image: '/images/studio/studio-auditions.webp',
    action: 'Browse auditions',
    href: '#auditions',
  },
  {
    id: 'fan-vote',
    eyebrow: 'FAN VOTE',
    title: 'Your support lights up the stage.',
    description: 'Take part in fan voting and stand with your favorite K-pop companies.',
    image: '/images/studio/lightstick-constellation.webp',
    video: {
      src: '/videos/studio/supertree-lights.mp4',
      poster: '/videos/studio/supertree-lights-poster.webp',
    },
    action: 'Go to fan voting',
    href: '#fan-vote',
  },
];

const SLIDE_INTERVAL_MS = 5000;

export default function StudioMainBanner() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocusWithin, setHasFocusWithin] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const slide = slides[activeIndex];
  const shouldPause = prefersReducedMotion || isPaused || isHovered || hasFocusWithin;

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(motionQuery.matches);

    updatePreference();
    motionQuery.addEventListener('change', updatePreference);
    return () => motionQuery.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    if (shouldPause) return;

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [activeIndex, shouldPause]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (shouldPause) {
      video.pause();
      return;
    }

    void video.play().catch((error: unknown) => {
      if (videoRef.current === video && !(error instanceof DOMException && error.name === 'AbortError')) {
        setIsPaused(true);
      }
    });
  }, [activeIndex, shouldPause]);

  const showSlide = (index: number) => {
    setActiveIndex(index);
  };

  const moveSlide = (direction: -1 | 1) => {
    showSlide((activeIndex + direction + slides.length) % slides.length);
  };

  return (
    <section
      className={styles.banner}
      aria-label="MEARROW Studio main banner"
      aria-roledescription="carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setHasFocusWithin(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setHasFocusWithin(false);
        }
      }}
    >
      <div className={styles.media} aria-hidden="true">
        {slide.video ? (
          <>
            <ExportedImage
              className={styles.mediaImage}
              src={slide.video.poster}
              alt=""
              width={1280}
              height={720}
              sizes="100vw"
              unoptimized
            />
            {!prefersReducedMotion && (
              <video
                key={slide.video.src}
                ref={videoRef}
                className={styles.mediaVideo}
                src={slide.video.src}
                poster={slide.video.poster}
                muted
                loop
                playsInline
                autoPlay={!shouldPause}
                preload="none"
                tabIndex={-1}
              />
            )}
            <ExportedImage
              className={styles.constellationArtwork}
              src={slide.image}
              alt=""
              width={1672}
              height={941}
              sizes="100vw"
              unoptimized
            />
          </>
        ) : (
          <ExportedImage
            className={styles.mediaImage}
            src={slide.image}
            alt=""
            width={1672}
            height={941}
            sizes="100vw"
            priority={activeIndex === 0}
            unoptimized
          />
        )}
      </div>
      <div className={styles.scrim} aria-hidden="true" />
      <article
        key={slide.id}
        className={styles.content}
        role="group"
        aria-roledescription="slide"
        aria-label={`${activeIndex + 1} of ${slides.length}`}
      >
        <p className={styles.eyebrow}>{slide.eyebrow}</p>
        <h1 id="studio-title">{slide.title}</h1>
        <p className={styles.description}>{slide.description}</p>
        <Link className={styles.primaryAction} href={slide.href}>
          {slide.action} <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </article>

      <div className={styles.controls}>
        <div className={styles.slidePicker} role="group" aria-label="Choose a banner slide">
          {slides.map((item, index) => (
            <button
              key={item.id}
              className={`${styles.slideButton} ${index === activeIndex ? styles.slideButtonActive : ''}`}
              type="button"
              aria-label={`Show ${item.eyebrow.toLowerCase()} banner`}
              aria-pressed={index === activeIndex}
              onClick={() => showSlide(index)}
            >
              <span />
            </button>
          ))}
        </div>

        <div className={styles.controlActions}>
          {!prefersReducedMotion && (
            <button
              className={styles.controlButton}
              type="button"
              aria-label={isPaused ? 'Play banner' : 'Pause banner'}
              onClick={() => {
                setIsPaused((paused) => !paused);
                setHasFocusWithin(false);
              }}
            >
              {isPaused ? (
                <Play size={17} aria-hidden="true" />
              ) : (
                <Pause size={17} aria-hidden="true" />
              )}
            </button>
          )}
          <span className={styles.counter} aria-hidden="true">
            {String(activeIndex + 1).padStart(2, '0')} <span>/</span> {String(slides.length).padStart(2, '0')}
          </span>
          <button
            className={styles.controlButton}
            type="button"
            aria-label="Previous banner"
            onClick={() => moveSlide(-1)}
          >
            <ChevronLeft size={19} aria-hidden="true" />
          </button>
          <button
            className={styles.controlButton}
            type="button"
            aria-label="Next banner"
            onClick={() => moveSlide(1)}
          >
            <ChevronRight size={19} aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className={styles.announcement} aria-live={shouldPause ? 'polite' : 'off'} aria-atomic="true">
        Banner {activeIndex + 1} of {slides.length}: {slide.eyebrow}
      </p>
    </section>
  );
}
