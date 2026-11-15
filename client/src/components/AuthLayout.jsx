import { Link } from 'react-router-dom';
import Logo from './Logo';
import { FrameBottom, ImageFrame } from './Grunge';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-8 lg:flex-row lg:items-center lg:gap-16">
      <section className="hidden lg:block lg:h-[620px] lg:flex-1">
        <ImageFrame src="/img/auth.jpg" alt="A desk with a keyboard, a coffee and printed notes" />
      </section>

      <section className="w-full lg:flex-1">
        <Link to="/welcome" aria-label="Kaajkormo home"><Logo /></Link>
        <h1 className="heading mt-10 text-80 md:text-96">{title}</h1>
        <p className="mt-3 text-sm text-muted">{subtitle}</p>
        <div className="mt-8 border-2 border-paper bg-night/60 p-6">{children}</div>
        <div className="mt-4"><FrameBottom /></div>
      </section>
    </div>
  );
}
