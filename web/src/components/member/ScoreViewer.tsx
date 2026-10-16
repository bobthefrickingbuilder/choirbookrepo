'use client';

import { Button, IconButton, Spinner } from '@choirbook/ui';
import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

export interface ScoreStrings {
  title: string;
  prev: string;
  next: string;
  zoomIn: string;
  zoomOut: string;
  page: string;
  open: string;
  loading: string;
  failed: string;
}

/** Shows a PDF score page by page, with zoom. pdf.js loads only when this opens. */
export function ScoreViewer({ url, s }: { url: string; s: ScoreStrings }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // The "legacy" build also works on older iPhones and Android phones.
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
        const loaded = await pdfjs.getDocument({ url }).promise;
        if (!cancelled) setDoc(loaded);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    if (!doc || !canvasRef.current || !boxRef.current) return;
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    (async () => {
      const p = await doc.getPage(page);
      if (cancelled || !canvasRef.current || !boxRef.current) return;
      // Fit the page to the box width, then apply the zoom, at the screen's pixel density.
      const base = p.getViewport({ scale: 1 });
      const scale = (boxRef.current.clientWidth / base.width) * zoom;
      const viewport = p.getViewport({ scale: scale * (window.devicePixelRatio || 1) });
      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / (window.devicePixelRatio || 1)}px`;
      task = p.render({ canvas, viewport });
      await task.promise.catch(() => undefined);
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, page, zoom]);

  if (error) return <p className="cb-errmsg">{s.failed}</p>;
  const pages = doc?.numPages ?? 0;

  return (
    <section className="score" aria-label={s.title}>
      <div className="score__bar">
        <IconButton icon="chevron-left" label={s.prev} onClick={() => setPage((n) => Math.max(1, n - 1))} disabled={page <= 1} />
        <span className="cb-tabular" aria-live="polite">
          {s.page.replace('{n}', String(page)).replace('{total}', String(pages || '–'))}
        </span>
        <IconButton icon="chevron-right" label={s.next} onClick={() => setPage((n) => Math.min(pages, n + 1))} disabled={page >= pages} />
        <span style={{ flex: 1 }} />
        <IconButton icon="minus" label={s.zoomOut} onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} />
        <span className="cb-tabular">{Math.round(zoom * 100)}%</span>
        <IconButton icon="plus" label={s.zoomIn} onClick={() => setZoom((z) => Math.min(3, z + 0.25))} />
        <Button size="sm" variant="ghost" iconStart="external-link" href={url} target="_blank" rel="noopener noreferrer">
          {s.open}
        </Button>
      </div>
      <div ref={boxRef} className="score__page">
        {!doc ? <Spinner label={s.loading} block /> : null}
        <canvas ref={canvasRef} role="img" aria-label={s.page.replace('{n}', String(page)).replace('{total}', String(pages))} />
      </div>
    </section>
  );
}
