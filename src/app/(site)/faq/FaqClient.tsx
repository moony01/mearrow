'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import PageFrame, { PageHeader } from '@/components/layout/PageFrame';
import styles from './page.module.scss';

interface FaqItem {
  question: string;
  answer: string;
  actionHref?: string;
  actionLabel?: string;
}

interface FaqClientProps {
  title: string;
  subtitle: string;
  items: FaqItem[];
}

/**
 * FAQ 아코디언 클라이언트 컴포넌트
 * 클릭 시 답변을 펼치거나 접는 인터랙션 제공
 */
export default function FaqClient({ title, subtitle, items }: FaqClientProps) {
  return (
    <PageFrame size="narrow">
      <PageHeader title={title} description={subtitle} />
      <div className={styles.container}>
        {/* FAQ 아코디언 목록 */}
        <div className={styles.faqList}>
          {items.map((item, index) => {
            const answerId = `faq-answer-${index}`;

            return (
              <details
                key={index}
                className={styles.faqItem}
                name="mearrow-faq"
              >
                <summary
                  className={styles.faqQuestion}
                  aria-controls={answerId}
                >
                  <span>{item.question}</span>
                  <ChevronDown className={styles.chevron} size={20} />
                </summary>
                <div
                  id={answerId}
                  className={styles.faqAnswer}
                >
                  <p>{item.answer}</p>
                  {item.actionHref && item.actionLabel && (
                    <Link className={styles.answerLink} href={item.actionHref}>
                      {item.actionLabel}
                    </Link>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </PageFrame>
  );
}
