'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import classNames from 'classnames';
import PageFrame, { PageHeader } from '@/components/layout/PageFrame';
import styles from './page.module.scss';

interface FaqItem {
  question: string;
  answer: string;
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
  /** 현재 열려있는 FAQ 항목의 인덱스 (null이면 모두 닫힘) */
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  /** FAQ 항목 토글 핸들러 */
  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <PageFrame size="narrow">
      <PageHeader title={title} description={subtitle} />
      <div className={styles.container}>
        {/* FAQ 아코디언 목록 */}
        <div className={styles.faqList}>
          {items.map((item, index) => (
            <div
              key={index}
              className={classNames(styles.faqItem, {
                [styles.open]: openIndex === index,
              })}
            >
              <button
                className={styles.faqQuestion}
                onClick={() => toggleItem(index)}
                aria-expanded={openIndex === index}
              >
                <span>{item.question}</span>
                <ChevronDown
                  className={classNames(styles.chevron, {
                    [styles.rotated]: openIndex === index,
                  })}
                  size={20}
                />
              </button>
              <div
                className={classNames(styles.faqAnswer, {
                  [styles.expanded]: openIndex === index,
                })}
              >
                <p>{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageFrame>
  );
}
