/**
 * A script that runs while the HTML is parsed, before first paint (see the Next.js
 * guide "Preventing flash before hydration"). Only for small, trusted, static code.
 */
export function InlineScript({ html, nonce }: { html: string; nonce?: string }) {
  return (
    <script
      nonce={nonce}
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** Applies the "auto" theme from the device setting before anything is drawn. */
export const THEME_SCRIPT = `(function(){try{var d=document.documentElement;if(d.dataset.theme==='auto'){var m=window.matchMedia('(prefers-color-scheme: dark)');d.dataset.mode=m.matches?'dark':'light';m.addEventListener('change',function(e){if(d.dataset.theme==='auto')d.dataset.mode=e.matches?'dark':'light';});}}catch(e){}})();`;
