import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  Database,
  FileCheck2,
  Inbox,
  MailCheck,
  Menu,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { motion, MotionConfig } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Logo } from '~/components/Logo';

import type { Route } from './+types/home';

export const meta: Route.MetaFunction = () => [
  { title: 'SupplyFlow | Turn every RFQ into an opportunity' },
  {
    name: 'description',
    content:
      'SupplyFlow automates RFQ intake, quotation tracking, pricing history, and reporting so your team can quote faster and win more business.',
  },
];

type Feature = {
  title: string;
  description: string;
  icon: typeof Inbox;
};

const problems = [
  'RFQs wait in one person’s inbox',
  'Customers receive no acknowledgment',
  'Product and pricing research is repeated',
  'Spreadsheet records become incomplete',
  'Quotation performance stays invisible',
];

const features: Feature[] = [
  {
    title: 'RFQ detection',
    description:
      'Identify requests from incoming emails, extract the details, and assign a unique reference automatically.',
    icon: Inbox,
  },
  {
    title: 'Instant acknowledgment',
    description:
      'Confirm receipt immediately, give customers a reference number, and create confidence from the first touch.',
    icon: MailCheck,
  },
  {
    title: 'One source of truth',
    description:
      'Keep every request, customer, product, status, and conversation in an accurate centralized record.',
    icon: Database,
  },
  {
    title: 'Live quotation tracking',
    description:
      'See what is new, pending, overdue, submitted, or converted—without chasing updates across the team.',
    icon: FileCheck2,
  },
  {
    title: 'Pricing intelligence',
    description:
      'Reuse approved OEM, part number, and pricing history instead of researching the same products repeatedly.',
    icon: Search,
  },
  {
    title: 'Performance reporting',
    description:
      'Track volume, turnaround, conversion, top customers, and requested products with reliable live data.',
    icon: BarChart3,
  },
];

const benefits = [
  { value: 'Faster', label: 'quotation turnaround', icon: Zap },
  { value: 'Fewer', label: 'manual admin tasks', icon: Clock3 },
  { value: 'Clearer', label: 'conversion visibility', icon: TrendingUp },
  { value: 'Better', label: 'customer experience', icon: Users },
];

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  centered?: boolean;
  inverted?: boolean;
};

const SectionHeading = ({
  eyebrow,
  title,
  description,
  centered = false,
  inverted = false,
}: SectionHeadingProps) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.4 }}
    transition={{ duration: 0.55, ease: 'easeOut' }}
    className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}
  >
    <p
      className={`mb-4 text-xs font-bold uppercase tracking-[0.2em] ${
        inverted ? 'text-emerald-300' : 'text-emerald-700'
      }`}
    >
      {eyebrow}
    </p>
    <h2
      className={`font-serif text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl ${
        inverted ? 'text-white' : 'text-slate-950'
      }`}
    >
      {title}
    </h2>
    <p
      className={`mt-5 text-base leading-7 sm:text-lg ${
        inverted ? 'text-slate-300' : 'text-slate-600'
      }`}
    >
      {description}
    </p>
  </motion.div>
);

type CtaLinkProps = {
  to: string;
  children: ReactNode;
  inverted?: boolean;
};

const CtaLink = ({ to, children, inverted = false }: CtaLinkProps) => (
  <Link
    to={to}
    className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-all hover:-translate-y-0.5 ${
      inverted
        ? 'bg-white text-slate-950 shadow-lg shadow-black/10 hover:bg-emerald-50'
        : 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/15 hover:bg-emerald-500'
    }`}
  >
    {children}
    <ArrowRight className='h-4 w-4' aria-hidden='true' />
  </Link>
);

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <MotionConfig reducedMotion='user'>
      <main className='min-h-screen overflow-hidden bg-[#f7f8f4] font-sans text-slate-950'>
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className='relative z-50 border-b border-slate-900/5 bg-[#f7f8f4]/90 backdrop-blur-xl'
        >
          <div className='mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10'>
            <Logo>SupplyFlow</Logo>

            <nav
              className='hidden items-center gap-8 md:flex'
              aria-label='Main navigation'
            >
              <a
                className='text-sm font-medium text-slate-600 hover:text-slate-950'
                href='#problem'
              >
                Why SupplyFlow
              </a>
              <a
                className='text-sm font-medium text-slate-600 hover:text-slate-950'
                href='#solution'
              >
                Solutions
              </a>
              <a
                className='text-sm font-medium text-slate-600 hover:text-slate-950'
                href='#results'
              >
                Results
              </a>
            </nav>

            <div className='hidden items-center gap-3 md:flex'>
              <Link
                to='/auth/login'
                className='rounded-full px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white'
              >
                Sign in
              </Link>
              <CtaLink to='/auth/register'>Get started</CtaLink>
            </div>

            <button
              type='button'
              className='rounded-xl p-2 text-slate-700 md:hidden'
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-expanded={mobileMenuOpen}
              aria-label='Toggle navigation'
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>

          {mobileMenuOpen && (
            <nav
              className='border-t border-slate-900/5 bg-white px-5 py-5 md:hidden'
              aria-label='Mobile navigation'
            >
              <div className='mx-auto flex max-w-7xl flex-col gap-2'>
                {[
                  ['Why SupplyFlow', '#problem'],
                  ['Solutions', '#solution'],
                  ['Results', '#results'],
                ].map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className='rounded-xl px-4 py-3 text-sm font-medium hover:bg-slate-50'
                  >
                    {label}
                  </a>
                ))}
                <Link
                  to='/auth/register'
                  className='mt-2 rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white'
                >
                  Get started
                </Link>
              </div>
            </nav>
          )}
        </motion.header>

        <section className='relative'>
          <div className='absolute inset-x-0 top-0 -z-0 h-[650px] bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.15),transparent_38%),radial-gradient(circle_at_10%_50%,rgba(217,249,157,0.25),transparent_34%)]' />
          <div className='relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-32'>
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1, ease: 'easeOut' }}
            >
              <div className='mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm'>
                <span className='h-2 w-2 rounded-full bg-emerald-500' />
                RFQ operations, finally in flow
              </div>
              <h1 className='max-w-3xl font-serif text-5xl font-semibold leading-[0.98] tracking-[-0.035em] text-slate-950 sm:text-6xl lg:text-7xl'>
                Turn every RFQ into an{' '}
                <span className='text-emerald-600'>opportunity.</span>
              </h1>
              <p className='mt-7 max-w-xl text-lg leading-8 text-slate-600'>
                SupplyFlow captures quotation requests, coordinates your team,
                reuses pricing intelligence, and reveals what converts—all in
                one dependable workspace.
              </p>
              <div className='mt-9 flex flex-col gap-3 sm:flex-row'>
                <CtaLink to='/auth/register'>
                  Start improving your process
                </CtaLink>
                <a
                  href='#solution'
                  className='inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50'
                >
                  See how it works
                  <ChevronRight className='h-4 w-4' aria-hidden='true' />
                </a>
              </div>
              <div className='mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500'>
                {[
                  'No RFQ left behind',
                  'Built for quotation teams',
                  'Fast to adopt',
                ].map((item) => (
                  <span key={item} className='flex items-center gap-2'>
                    <CircleCheckBig
                      className='h-4 w-4 text-emerald-600'
                      aria-hidden='true'
                    />
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 36, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.75, delay: 0.2, ease: 'easeOut' }}
              className='relative mx-auto w-full max-w-xl'
            >
              <div className='absolute -inset-8 rounded-full bg-emerald-300/20 blur-3xl' />
              <div className='relative rounded-[2rem] border border-white/80 bg-white/85 p-4 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] backdrop-blur sm:p-6'>
                <div className='mb-5 flex items-center justify-between'>
                  <div>
                    <p className='text-xs font-medium text-slate-400'>
                      Quotation desk
                    </p>
                    <p className='mt-1 font-semibold'>Today’s RFQ flow</p>
                  </div>
                  <span className='rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700'>
                    Live
                  </span>
                </div>
                <div className='grid grid-cols-3 gap-2 sm:gap-3'>
                  {[
                    ['24', 'Received'],
                    ['18', 'Quoted'],
                    ['6', 'Pending'],
                  ].map(([value, label]) => (
                    <div
                      key={label}
                      className='rounded-2xl bg-slate-50 p-3 sm:p-4'
                    >
                      <p className='text-2xl font-bold tracking-tight sm:text-3xl'>
                        {value}
                      </p>
                      <p className='mt-1 text-[10px] font-medium text-slate-500 sm:text-xs'>
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
                <div className='mt-4 rounded-2xl border border-slate-100 p-4'>
                  <div className='mb-5 flex items-center justify-between'>
                    <p className='text-sm font-semibold'>Recent requests</p>
                    <p className='text-xs text-slate-400'>Updated now</p>
                  </div>
                  <div className='space-y-3'>
                    {[
                      [
                        'RFQ-1048',
                        'Atlas Industrial',
                        'New',
                        'bg-blue-50 text-blue-700',
                      ],
                      [
                        'RFQ-1047',
                        'Meridian Energy',
                        'Pricing',
                        'bg-amber-50 text-amber-700',
                      ],
                      [
                        'RFQ-1046',
                        'Northstar Systems',
                        'Quoted',
                        'bg-emerald-50 text-emerald-700',
                      ],
                    ].map(([reference, customer, status, styles]) => (
                      <div
                        key={reference}
                        className='flex items-center gap-3 rounded-xl bg-slate-50/70 p-3'
                      >
                        <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm'>
                          <FileCheck2 className='h-4 w-4' aria-hidden='true' />
                        </span>
                        <div className='min-w-0 flex-1'>
                          <p className='text-xs font-semibold text-slate-800'>
                            {reference}
                          </p>
                          <p className='truncate text-[11px] text-slate-500'>
                            {customer}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles}`}
                        >
                          {status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className='absolute -bottom-5 -right-3 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-3 shadow-xl sm:-right-8 sm:p-4'
                >
                  <span className='flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700'>
                    <Check className='h-4 w-4' aria-hidden='true' />
                  </span>
                  <div>
                    <p className='text-xs font-semibold'>Customer notified</p>
                    <p className='text-[10px] text-slate-400'>
                      Acknowledgment sent instantly
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        <section
          id='problem'
          className='bg-slate-950 py-20 text-white sm:py-28'
        >
          <div className='mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:px-10'>
            <SectionHeading
              inverted
              eyebrow='The hidden cost of manual work'
              title='Your next order should not depend on who checked their inbox.'
              description='Disconnected email, spreadsheets, and manual handoffs create delays your team feels—and your customers notice.'
            />
            <div className='grid gap-3'>
              {problems.map((problem, index) => (
                <motion.div
                  key={problem}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.4, delay: index * 0.07 }}
                  className='flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5'
                >
                  <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-xs font-semibold text-emerald-300'>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <p className='text-sm text-slate-200 sm:text-base'>
                    {problem}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id='solution' className='py-20 sm:py-28'>
          <div className='mx-auto max-w-7xl px-5 sm:px-8 lg:px-10'>
            <SectionHeading
              centered
              eyebrow='One connected quotation process'
              title='From inbox to insight—automatically.'
              description='Give your quotation team a faster, clearer way to work, while customers get the responsiveness they expect.'
            />
            <div className='mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3'>
              {features.map(({ title, description, icon: Icon }, index) => (
                <motion.article
                  key={title}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.45, delay: index * 0.07 }}
                  className='group rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/5 sm:p-7'
                >
                  <div className='flex items-start justify-between'>
                    <span className='flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white'>
                      <Icon className='h-5 w-5' aria-hidden='true' />
                    </span>
                    <span className='text-xs font-semibold text-slate-300'>
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className='mt-7 text-lg font-bold tracking-tight'>
                    {title}
                  </h3>
                  <p className='mt-3 text-sm leading-6 text-slate-600'>
                    {description}
                  </p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id='results' className='px-5 pb-20 sm:px-8 sm:pb-28 lg:px-10'>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className='mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#dff7e8] px-6 py-12 sm:px-10 lg:px-14 lg:py-16'
          >
            <div className='grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end'>
              <div>
                <p className='mb-4 text-xs font-bold uppercase tracking-[0.2em] text-emerald-800'>
                  Built for better outcomes
                </p>
                <h2 className='font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl'>
                  Move faster. Know more. Win smarter.
                </h2>
                <p className='mt-5 max-w-lg text-base leading-7 text-slate-600'>
                  Create a dependable operating rhythm that reduces key-person
                  risk and turns every quotation into useful business
                  intelligence.
                </p>
              </div>
              <div className='grid grid-cols-2 gap-3 sm:gap-4'>
                {benefits.map(({ value, label, icon: Icon }, index) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, scale: 0.94 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.4, delay: 0.15 + index * 0.07 }}
                    className='rounded-2xl bg-white/75 p-4 sm:p-5'
                  >
                    <Icon
                      className='h-5 w-5 text-emerald-700'
                      aria-hidden='true'
                    />
                    <p className='mt-5 text-xl font-bold tracking-tight sm:text-2xl'>
                      {value}
                    </p>
                    <p className='mt-1 text-xs text-slate-600 sm:text-sm'>
                      {label}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <section className='px-5 pb-20 sm:px-8 sm:pb-28 lg:px-10'>
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className='relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-emerald-700 px-6 py-14 text-center text-white sm:px-10 sm:py-20'
          >
            <div className='absolute -left-24 -top-24 h-64 w-64 rounded-full border-[40px] border-white/5' />
            <div className='absolute -bottom-32 -right-20 h-72 w-72 rounded-full bg-emerald-500/30 blur-2xl' />
            <div className='relative mx-auto max-w-2xl'>
              <ShieldCheck
                className='mx-auto h-8 w-8 text-emerald-200'
                aria-hidden='true'
              />
              <h2 className='mt-5 font-serif text-4xl font-semibold leading-tight sm:text-5xl'>
                Ready to make every RFQ count?
              </h2>
              <p className='mx-auto mt-5 max-w-xl text-base leading-7 text-emerald-50/80'>
                Replace inbox bottlenecks and scattered spreadsheets with one
                intelligent quotation workflow your whole team can rely on.
              </p>
              <div className='mt-8'>
                <CtaLink to='/auth/register' inverted>
                  Start with SupplyFlow
                </CtaLink>
              </div>
            </div>
          </motion.div>
        </section>

        <footer className='border-t border-slate-200 bg-white'>
          <div className='mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10'>
            <Logo size='sm'>SupplyFlow</Logo>
            <p>Quotation intelligence for modern supply teams.</p>
            <div className='flex gap-5'>
              <Link to='/privacy' className='hover:text-slate-900'>
                Privacy
              </Link>
              <Link to='/terms' className='hover:text-slate-900'>
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </MotionConfig>
  );
};

export default LandingPage;
