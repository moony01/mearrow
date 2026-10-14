import Link from 'next/link';
import { getAllAuditions } from '@/lib/auditions';
import { AUDITIONS_ARCHIVE_PAGE_SIZE } from '@/lib/content-archive';
import AuditionsGridClient from './AuditionsGridClient';
import studioStyles from '../page.module.scss';

export default function AuditionsArchiveContent({ pageNumber = 1 }: { pageNumber?: number }) {
  const posts = getAllAuditions('en')
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const pageCount = Math.max(1, Math.ceil(posts.length / AUDITIONS_ARCHIVE_PAGE_SIZE));

  return (
    <main className={studioStyles.page}>
      <section className={studioStyles.section} aria-labelledby="auditions-archive-title">
        <div className={studioStyles.sectionHeading}>
          <div>
            <p className={studioStyles.sectionEyebrow}>FIND YOUR NEXT OPPORTUNITY</p>
            <h1 className={studioStyles.archiveTitle} id="auditions-archive-title">Auditions</h1>
            <p>Official-source audition notices, including application status and eligibility.</p>
          </div>
          <Link className={studioStyles.primaryLink} href="/studio#auditions">
            Back to Studio
          </Link>
        </div>
        <AuditionsGridClient
          posts={posts}
          locale="en"
          basePath="/studio/auditions"
          paginationBasePath="/studio/auditions"
          initialPage={pageNumber}
        />
        <p className={studioStyles.archivePageStatus} aria-live="polite">
          Page {pageNumber} of {pageCount}
        </p>
      </section>
    </main>
  );
}
