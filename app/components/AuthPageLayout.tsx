import { Check, FileCheck2, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Logo } from './Logo';

type AuthPageLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

const workflowBenefits = [
  'Capture every incoming RFQ',
  'Coordinate quotations in one place',
  'Turn pricing history into an advantage',
];

export const AuthPageLayout = ({
  eyebrow,
  title,
  description,
  children,
}: AuthPageLayoutProps) => {
  return (
    <main className='relative min-h-screen overflow-hidden bg-[#f7f8f4] px-4 py-6 font-sans text-slate-950 sm:px-6 sm:py-10'>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(217,249,157,0.3),transparent_30%),radial-gradient(circle_at_90%_85%,rgba(16,185,129,0.14),transparent_34%)]' />
      <div className='relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_30px_100px_-45px_rgba(15,23,42,0.35)] sm:min-h-[calc(100vh-5rem)] lg:grid-cols-[0.92fr_1.08fr]'>
        <motion.section
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className='flex items-center px-6 py-10 sm:px-10 lg:px-14'
        >
          <div className='mx-auto w-full max-w-md'>
            <Logo className='mb-10' />
            <p className='text-xs font-bold tracking-[0.2em] text-emerald-700 uppercase'>
              {eyebrow}
            </p>
            <h1 className='mt-4 font-serif text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl'>
              {title}
            </h1>
            <p className='mt-4 text-sm leading-6 text-slate-600 sm:text-base'>
              {description}
            </p>
            <div className='mt-8'>{children}</div>
            <p className='mt-8 text-center text-xs text-slate-500'>
              <Link
                to='/terms'
                className='underline underline-offset-4 hover:text-emerald-700'
              >
                Terms and Conditions
              </Link>
            </p>
          </div>
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, delay: 0.08, ease: 'easeOut' }}
          className='relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between'
        >
          <div className='absolute -top-24 -right-20 h-72 w-72 rounded-full border-[48px] border-white/[0.03]' />
          <div className='absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl' />

          <div className='relative'>
            <span className='inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-200'>
              <span className='h-2 w-2 rounded-full bg-emerald-400' />
              RFQ operations, finally in flow
            </span>
            <h2 className='mt-8 max-w-lg font-serif text-5xl leading-[1.02] font-semibold tracking-tight'>
              Quote faster. Work smarter. Win more.
            </h2>
            <p className='mt-5 max-w-md leading-7 text-slate-300'>
              Bring requests, pricing intelligence, team progress, and customer
              communication into one dependable workspace.
            </p>
          </div>

          <div className='relative mt-12'>
            <div className='mb-8 space-y-4'>
              {workflowBenefits.map((benefit) => (
                <div key={benefit} className='flex items-center gap-3'>
                  <span className='flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300'>
                    <Check className='h-3.5 w-3.5' aria-hidden='true' />
                  </span>
                  <span className='text-sm text-slate-200'>{benefit}</span>
                </div>
              ))}
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div className='rounded-2xl border border-white/10 bg-white/[0.06] p-4'>
                <FileCheck2
                  className='h-5 w-5 text-emerald-300'
                  aria-hidden='true'
                />
                <p className='mt-4 text-2xl font-bold'>24</p>
                <p className='mt-1 text-xs text-slate-400'>
                  RFQs captured today
                </p>
              </div>
              <div className='rounded-2xl border border-white/10 bg-white/[0.06] p-4'>
                <TrendingUp
                  className='h-5 w-5 text-emerald-300'
                  aria-hidden='true'
                />
                <p className='mt-4 text-2xl font-bold'>18</p>
                <p className='mt-1 text-xs text-slate-400'>
                  Quotes moved forward
                </p>
              </div>
            </div>
          </div>
        </motion.aside>
      </div>
    </main>
  );
};
