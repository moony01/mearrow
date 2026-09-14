import styles from './Pagination.module.scss';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
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

  return (
    <nav className={styles.pagination} aria-label={ariaLabel}>
      <ul className={styles.list}>
        <li>
          <button
            type="button"
            className={styles.jumpButton}
            aria-label={previousGroupLabel}
            onClick={() => onPageChange(previousWindowStart)}
            disabled={pageWindowStart === 1}
          >
            <span aria-hidden="true">{'<<'}</span>
          </button>
        </li>

        <li>
          <button
            type="button"
            className={styles.directionButton}
            aria-label={previousLabel}
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage === 1}
          >
            <span aria-hidden="true">{'<'}</span>
          </button>
        </li>

        {pages.map((page) => {
          const isCurrent = page === safeCurrentPage;

          return (
            <li key={page}>
              <button
                type="button"
                className={`${styles.pageButton} ${isCurrent ? styles.current : ''}`}
                onClick={() => onPageChange(page)}
                aria-label={pageLabel(page)}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {page}
              </button>
            </li>
          );
        })}

        <li>
          <button
            type="button"
            className={styles.directionButton}
            aria-label={nextLabel}
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage === totalPages}
          >
            <span aria-hidden="true">{'>'}</span>
          </button>
        </li>

        <li>
          <button
            type="button"
            className={styles.jumpButton}
            aria-label={nextGroupLabel}
            onClick={() => onPageChange(nextWindowStart)}
            disabled={nextWindowStart > totalPages}
          >
            <span aria-hidden="true">{'>>'}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
