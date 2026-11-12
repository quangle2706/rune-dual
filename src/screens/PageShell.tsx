import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

/** Simple page layout with a back button, used by Rules and Settings. */
export function PageShell({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  return (
    <div className="app page">
      <header className="topbar">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" /> <span>Trang chủ</span>
        </button>
      </header>
      <main className="page__main panel">
        <h1 ref={headingRef} tabIndex={-1} className="page__title">
          {title}
        </h1>
        {children}
      </main>
    </div>
  );
}
