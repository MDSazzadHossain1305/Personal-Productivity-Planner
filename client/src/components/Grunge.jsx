// React versions of the building blocks of the "Grunge" Astro template (MIT, Jess Gaspar):
// Heading, Text, Container, ImageContainer, ContainerBottom, Dropdown and Link.
import { useState } from 'react';
import { Link } from 'react-router-dom';

const headingSize = {
  h1: 'lg:text-216 md:text-128 text-80',
  h2: 'lg:text-128 md:text-80 text-64',
  h3: 'lg:text-80 md:text-48 text-40',
  h4: 'lg:text-48 md:text-40 text-32',
  h5: 'lg:text-32 md:text-24 text-20',
};

export function Heading({ as: Tag = 'h2', size = 'h2', className = '', children }) {
  return (
    <Tag className={`font-grunge uppercase leading-none tracking-tight text-paper ${headingSize[size]} ${className}`}>
      {children}
    </Tag>
  );
}

const textStyle = {
  xsm: 'text-12 font-mono',
  sm: 'text-16/8 font-mono',
  md: 'text-20 font-mono font-semibold uppercase text-muted',
  lg: 'text-32/8 font-grunge',
  xl: 'text-40/10 font-grunge',
};

export function Text({ variant = 'sm', className = '', children }) {
  return <p className={`${textStyle[variant]} ${className}`}>{children}</p>;
}

const containerWidth = {
  full: '',
  xl: 'xl:max-w-8/10 lg:gap-32 gap-20',
  lg: 'md:max-w-2/3 lg:gap-32 gap-20',
  md: 'lg:max-w-1/2 lg:gap-32 gap-20',
};

export function Container({ variant = 'full', className = '', children, id }) {
  return (
    <section id={id} className={`m-auto flex w-full flex-col ${containerWidth[variant]} ${className}`}>
      {children}
    </section>
  );
}

export function Barcode({ className = '' }) {
  return <img src="/ui/barcode.svg" alt="" width="137" height="44" className={className} />;
}

export function Symbol({ dark = false, className = '' }) {
  return <img src={dark ? '/ui/symbol.svg' : '/ui/symbol-white.svg'} alt="" width="36" height="20" className={className} />;
}

// photo in a white frame with a barcode above it
export function ImageFrame({ src, alt, className = '' }) {
  return (
    <div className={`flex h-full w-full flex-col items-end gap-2 ${className}`}>
      <Barcode />
      <div className="h-full min-h-0 w-full border-2 border-paper p-4">
        <img src={src} alt={alt} className="photo" />
      </div>
    </div>
  );
}

// the symbol + barcode row that closes a bordered box
export function FrameBottom() {
  return (
    <div className="flex items-start justify-between">
      <Symbol />
      <Barcode />
    </div>
  );
}

// one row that opens and closes (used for the feature list and the FAQ)
export function Dropdown({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-center justify-between gap-4 text-left text-paper hover:text-muted"
      >
        <span className="font-grunge text-32/8 md:text-40/10">{title}</span>
        <svg className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} width="24" height="24" viewBox="0 0 8 8" aria-hidden="true">
          <path fill="currentColor" d="M1.5 1L0 2.5l4 4l4-4L6.5 1L4 3.5L1.5 1z" />
        </svg>
      </button>
      {open && <div className="font-mono text-16/8 text-paper">{children}</div>}
    </div>
  );
}

const linkStyle = {
  inline: 'font-mono font-semibold underline underline-offset-3 hover:text-muted',
  button: 'inline-block border-2 border-paper px-6 py-2 font-grunge text-24 uppercase tracking-wide hover:bg-paper hover:text-night',
  nav: 'font-grunge text-24 uppercase tracking-wide underline decoration-2 underline-offset-4 hover:text-muted',
};

export function GLink({ to, variant = 'inline', className = '', children, ...rest }) {
  const cls = `text-paper ${linkStyle[variant]} ${className}`;
  if (to.startsWith('#') || to.startsWith('http')) {
    return <a href={to} className={cls} {...rest}>{children}</a>;
  }
  return <Link to={to} className={cls} {...rest}>{children}</Link>;
}
