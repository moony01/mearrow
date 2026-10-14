import Link from 'next/link';
import styles from './Pagination.module.scss';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  getPageHref?: (page: number) => string;
  ariaLabel: string;
  previousGroupLabel: string;
  previousLabel: string;
  nextLabel: string;
  nextGroupLabel: string;
  pageLabel: (page: number) => string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  getPageHref,
  ariaLabel,
  previousGroupLabel,
  previousLabel,
  nextLabel,
  nextGroupLabel,
  pageLabel,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const pageWindowStart = Math.floor((safeCurrentPage - 1) / 5) * 5 + 1;
  const pageWindowEnd = Math.min(pageWindowStart + 4, totalPages);
  const pages = Array.from(
    { length: pageWindowEnd - pageWindowStart + 1 },
    (_, index) => pageWindowStart + index,
  );
  const previousWindowStart = Math.max(pageWindowStart - 5, 1);
  const nextWindowStart = pageWindowStart + 5;
  const renderControl = (
    page: number,
    label: string,
    className: string,
    content: string,
    disabled = false,
    current = false,
  ) => {
    const href = !disabled && !current ? getPageHref?.(page) : undefined;
    if (href) {
      return <Link className={className} href={href} aria-label={label}>{content}</Link>;
    }

    return (
      <button
        type="button"
        className={className}
        aria-label={label}
        aria-current={current ? 'page' : undefined}
        onClick={() => onPageChange?.(page)}
        disabled={disabled || current}
      >
        {content}
      </button>
    );
  };

  return (
    <nav className={styles.pagination} aria-label={ariaLabel}>
      <ul className={styles.list}>
        <li>
          {renderControl(previousWindowStart, previousGroupLabel, styles.jumpButton, '<<', pageWindowStart === 1)}
        </li>

        <li>
          {renderControl(safeCurrentPage - 1, previousLabel, styles.directionButton, '<', safeCurrentPage === 1)}
        </li>

        {pages.map((page) => {
          const isCurrent = page === safeCurrentPage;

          return (
            <li key={page}>
              {renderControl(
                page,
                pageLabel(page),
                `${styles.pageButton} ${isCurrent ? styles.current : ''}`,
                String(page),
                false,
                isCurrent,
              )}
            </li>
          );
        })}

        <li>
          {renderControl(safeCurrentPage + 1, nextLabel, styles.directionButton, '>', safeCurrentPage === totalPages)}
        </li>

        <li>
          {renderControl(nextWindowStart, nextGroupLabel, styles.jumpButton, '>>', nextWindowStart > totalPages)}
        </li>
      </ul>
    </nav>
  );
}
