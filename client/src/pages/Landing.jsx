import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Container, Dropdown, FrameBottom, GLink, Heading, ImageFrame, Symbol, Text } from '../components/Grunge';

const sections = [
  { title: 'Inside', href: '#inside' },
  { title: 'Features', href: '#features' },
  { title: 'About', href: '#about' },
  { title: 'FAQ', href: '#faq' },
];

const cards = [
  { tag: 'Plan', title: 'Tasks and calendar', text: 'Deadlines, priority, events', img: '/img/plan.jpg', alt: 'Notebooks, pencils and a laptop on a wooden desk' },
  { tag: 'Focus', title: 'Pomodoro timer', text: 'Work, break, repeat', img: '/img/focus.jpg', alt: 'Hands holding a phone that shows a timer' },
  { tag: 'Goals', title: 'Goals and milestones', text: 'Big aims in small steps', img: '/img/goals.jpg', alt: 'A laptop and a tablet side by side on a desk' },
  { tag: 'Habits', title: 'Habit tracker', text: 'Streaks and consistency', img: '/img/habits.jpg', alt: 'A phone held in one hand in low light' },
];

const features = [
  ['Tasks', 'Daily and long-term tasks with a deadline, a priority and a status. Search, filter and sort them, and see what is overdue.'],
  ['Calendar', 'Events with a date and a start and end time, in a day, week or month view, each with an optional reminder.'],
  ['Notes', 'Capture a thought in one line. Tag it, pin it, search it, archive it when it is done.'],
  ['Focus timer', 'A Pomodoro timer you can start, pause, resume, stop and reset. Set your own focus and break lengths. Finished sessions are recorded.'],
  ['Goals and milestones', 'Give a goal a target date, split it into milestones and watch the progress bar fill as you tick them off.'],
  ['Habit tracker', 'Daily or weekly habits, a four-week history, the current streak and how consistent you have been.'],
  ['Reminders', 'Set a reminder for a date and time. Kaajkormo also tells you about goal deadlines and habits that are still open today.'],
  ['Dashboard and analytics', 'One page for today: tasks, events, goals, habits and a productivity score. Charts compare your days, weeks and months.'],
  ['Streaks and awards', 'Streaks for tasks, habits and focus sessions, and twenty achievements to unlock along the way.'],
];

const faq = [
  ['Does it cost anything?', 'No. Kaajkormo is a university capstone project and is free to use.'],
  ['Who can see my data?', 'Only you. Every task, note, goal and habit is stored against your account, and passwords are saved as a hash, never as plain text.'],
  ['Do I have to install anything?', 'No. It runs in the browser on a laptop or a phone.'],
  ['Will reminders reach me by email?', 'Not yet. Notifications are shown inside the website, on the Reminders page.'],
  ['Can I change the timer length?', 'Yes. Focus can be 1 to 180 minutes and a break 1 to 60 minutes. You set both in Settings.'],
];

function TopNav({ user }) {
  const [open, setOpen] = useState(false);
  const last = user ? { title: 'Open planner', to: '/' } : { title: 'Log in', to: '/login' };
  return (
    <nav className="fixed left-0 right-6 top-0 z-40 flex justify-end py-8" aria-label="Page">
      <ul className="hidden gap-8 md:flex">
        {sections.map((s, i) => (
          <li key={s.href}><GLink variant="nav" to={s.href}>{i + 1}. {s.title}</GLink></li>
        ))}
        <li><GLink variant="nav" to={last.to}>{sections.length + 1}. {last.title}</GLink></li>
      </ul>
      <button className="btn-ghost !px-3 !text-xl md:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">Menu</button>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-night md:hidden">
          <button className="btn-ghost absolute right-6 top-6 !px-3 !text-xl" onClick={() => setOpen(false)} aria-label="Close navigation">Close</button>
          {sections.map((s) => (
            <GLink key={s.href} variant="nav" to={s.href} onClick={() => setOpen(false)}>{s.title}</GLink>
          ))}
          <GLink variant="nav" to={last.to}>{last.title}</GLink>
        </div>
      )}
    </nav>
  );
}

function Card({ card }) {
  return (
    <div className="mx-auto w-full max-w-[350px]">
      <div className="relative mb-4 aspect-square w-full overflow-hidden">
        <div className="absolute left-2 top-2 z-30 flex items-center gap-2 border-2 border-night bg-paper px-4">
          <span className="font-grunge text-32/8 text-night">{card.tag}</span>
          <Symbol dark className="w-[30px]" />
        </div>
        <div className="absolute inset-0 z-20 bg-cover opacity-40" style={{ backgroundImage: 'url(/img/texture.jpg)' }} />
        <img src={card.img} alt={card.alt} loading="lazy" className="photo relative z-10" />
      </div>
      <Heading as="h3" size="h4">{card.title}</Heading>
      <Text variant="md">{card.text}</Text>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const start = user ? '/' : '/register';

  return (
    <div className="px-6 pt-24 md:px-8 md:pt-28">
      <TopNav user={user} />

      <main className="flex flex-col gap-28 lg:gap-40 xl:gap-48">
        {/* hero */}
        <Container variant="xl" className="min-h-screen !gap-8">
          <Text variant="xl" className="w-full text-paper md:max-w-1/2 lg:max-w-1/3">
            One planner for your tasks, calendar, notes, goals, habits and focus time.
          </Text>
          <div className="flex flex-col gap-8 md:flex-row">
            <div className="flex flex-col items-start gap-4 md:flex-2">
              <GLink variant="button" to={start}>{user ? 'Open your planner' : 'Start planning'}</GLink>
              <Heading as="h1" size="h1">Kaaj kormo</Heading>
            </div>
            <div className="h-[420px] flex-1 md:h-[500px]">
              <ImageFrame src="/img/hero.jpg" alt="A laptop and a coffee mug on a white desk" />
            </div>
          </div>
        </Container>

        {/* what is inside */}
        <Container variant="lg" id="inside" className="scroll-mt-24 items-center">
          <Heading className="text-center">Inside</Heading>
          <div className="grid w-full grid-cols-1 gap-16 lg:grid-cols-2">
            {cards.map((c) => <Card key={c.tag} card={c} />)}
          </div>
          <GLink variant="button" to={start}>{user ? 'Open your planner' : 'Create an account'}</GLink>
        </Container>

        {/* feature list */}
        <Container variant="md" id="features" className="scroll-mt-24">
          <Heading className="text-center">Features</Heading>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 border-3 border-paper p-6">
              {features.map(([title, text], i) => (
                <Dropdown key={title} title={`${i + 1}. ${title}`}>{text}</Dropdown>
              ))}
            </div>
            <FrameBottom />
          </div>
        </Container>

        {/* about */}
        <Container variant="xl" id="about" className="scroll-mt-24">
          <Heading className="text-center">About</Heading>
          <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
            <div className="flex flex-col items-start gap-6 text-paper lg:flex-1 lg:pt-6">
              <Text variant="xl">Kaajkormo is Bangla for the everyday work that fills a day. This planner keeps all of it in one place.</Text>
              <Text>Most people plan with four or five separate tools: a to-do app, a calendar, a notes app, a timer. Kaajkormo puts them behind one login, so today&apos;s tasks, the next event and the habit you promised yourself are on the same screen.</Text>
              <Text>It is the SE331 capstone project of Group 04: MD Sazzad Hossain, Raiba Rahman Opshori and Ajassum Rubaiya Arin. It is built with React, Express and MongoDB.</Text>
              <GLink variant="button" to={start}>{user ? 'Open your planner' : 'Start planning'}</GLink>
            </div>
            <div className="h-[380px] w-full lg:h-[500px] lg:flex-1">
              <ImageFrame src="/img/desk.jpg" alt="Hands typing on a laptop beside a notebook and a phone" />
            </div>
          </div>
        </Container>

        {/* faq */}
        <Container variant="md" id="faq" className="scroll-mt-24">
          <Heading className="text-center">FAQ</Heading>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 border-3 border-paper p-6">
              {faq.map(([title, text], i) => (
                <Dropdown key={title} title={`${i + 1}. ${title}`}>{text}</Dropdown>
              ))}
            </div>
            <FrameBottom />
          </div>
        </Container>
      </main>

      <footer className="m-auto mt-32 flex w-full flex-col gap-20 pb-8 xl:max-w-8/10">
        <div className="flex flex-col gap-10 md:flex-row">
          <div className="flex-1 text-center md:text-left">
            <Heading as="h3" size="h4" className="mb-5">Team</Heading>
            <ul className="font-mono text-16/8 text-paper">
              <li>MD Sazzad Hossain</li>
              <li>Raiba Rahman Opshori</li>
              <li>Ajassum Rubaiya Arin</li>
            </ul>
          </div>
          <div className="flex-1 text-center md:text-right">
            <Heading as="h3" size="h4" className="mb-5">Navigation</Heading>
            <ul>
              <li><GLink variant="nav" to="/login">Log in</GLink></li>
              <li><GLink variant="nav" to="/register">Register</GLink></li>
              <li><GLink variant="nav" to="#features">Features</GLink></li>
            </ul>
          </div>
        </div>
        <div className="text-center font-mono text-16/8 text-paper">
          <p>Kaajkormo &copy; {new Date().getFullYear()} SE331 Group 04</p>
          <p>
            Design based on the <GLink to="https://github.com/jessgaspardev/grunge" target="_blank" rel="noopener noreferrer">Grunge</GLink> template
            by Jess Gaspar. <Link to="/login" className="link">Log in</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
