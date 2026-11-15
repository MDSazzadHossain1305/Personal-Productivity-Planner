// Bangla name, written as codes so it survives copy and paste: kaajkormo
export const BANGLA_NAME = '\u0995\u09BE\u099C\u0995\u09B0\u09CD\u09AE';

// the wordmark: brush lettering with the template's "globe" symbol
export default function Logo({ size = 'md' }) {
  const big = size === 'lg';
  return (
    <div className="flex items-center gap-3">
      <img src="/ui/symbol-white.svg" alt="" className={big ? 'h-7 w-auto' : 'h-5 w-auto'} />
      <div className="leading-none">
        <p className={`font-grunge uppercase tracking-wide text-paper ${big ? 'text-64' : 'text-40'}`}>Kaajkormo</p>
        <p className="mt-0.5 font-sans text-xs text-muted">{BANGLA_NAME} / planner</p>
      </div>
    </div>
  );
}
