import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import PublicLayout from '../../components/PublicLayout';

/** Text page frame for Terms, Privacy and the other public info pages. */
export default function InfoPage({
  title,
  updated,
  draft = false,
  children,
}: {
  title: string;
  /** "Last updated" date shown under the title. */
  updated?: string;
  /** Shows a short notice while company details are still being finalized. */
  draft?: boolean;
  children: ReactNode;
}) {
  // Links like /terms#allowances land on that section.
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <PublicLayout>
      <article className="container-narrow info-page">
        <h1>{title}</h1>
        {updated && <p className="text-faint">Last updated {updated}</p>}
        {draft && (
          <div className="info-draft-note">
            We're finalizing these details. They'll be complete before launch.
          </div>
        )}
        {children}
      </article>
    </PublicLayout>
  );
}
