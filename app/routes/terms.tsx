import { Link } from 'react-router';
import { motion } from 'motion/react';
import { FileText, GraduationCap } from 'lucide-react';

const termsSections = [
  {
    title: 'Using the app',
    content:
      'CourseXQuiz is a free learning platform designed to help learners create, study, and share educational content. You agree to use the app lawfully and respectfully, and not to interfere with the experience of other users or the operation of the service.',
  },
  {
    title: 'Accounts',
    content:
      'You are responsible for keeping your account credentials secure and for activity that happens under your account. If you believe your account has been compromised, you should notify us as soon as possible.',
  },
  {
    title: 'Uploaded content',
    content:
      'You keep ownership of the materials you upload, but you confirm that you have the right to upload, process, and, when applicable, publish that content. You must not upload unlawful, infringing, harmful, or confidential material that you are not authorized to share.',
  },
  {
    title: 'Published courses',
    content:
      'You understand published course may become visible to other users of the platform. If material should not be publicly available, do not share it and remove it before processing or publication begins.',
  },
  {
    title: 'Availability and changes',
    content:
      'We may update, improve, suspend, or discontinue features of the app at any time. Because the app is offered for free, we do not guarantee uninterrupted availability or that all generated learning content will always be accurate or fit for a specific purpose.',
  },
  {
    title: 'Acceptable behavior',
    content:
      'You may not use the app to abuse automated systems, scrape protected data, violate intellectual property rights, harass others, or attempt unauthorized access to accounts, content, or infrastructure.',
  },
];

export default function TermsPage() {
  return (
    <div className='min-h-screen bg-[#f5f5f0] px-4 py-16'>
      <div className='mx-auto max-w-4xl'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className='mb-10 rounded-[40px] border border-black/5 bg-white p-8 shadow-sm md:p-12'
        >
          <div className='mb-6 flex items-center gap-3'>
            <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-[#5A5A40] text-white'>
              <FileText size={24} />
            </div>
            <div>
              <p className='text-[11px] font-bold tracking-[0.25em] text-[#5A5A40] uppercase'>
                Terms of Use
              </p>
              <h1 className='font-serif text-4xl text-[#1a1a1a] md:text-5xl'>
                Terms and Conditions
              </h1>
            </div>
          </div>
          <p className='max-w-3xl font-serif text-lg leading-relaxed text-black/60 italic'>
            These terms explain the basic rules for using CourseXQuiz and
            sharing content through the platform.
          </p>
        </motion.div>

        <div className='space-y-6'>
          {termsSections.map((section, index) => (
            <motion.section
              key={section.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className='rounded-[32px] border border-black/5 bg-white p-8 shadow-sm'
            >
              <h2 className='mb-3 font-serif text-2xl text-[#1a1a1a]'>
                {section.title}
              </h2>
              <p className='leading-7 text-black/65'>{section.content}</p>
            </motion.section>
          ))}
        </div>

        <div className='mt-10 flex flex-col items-center justify-between gap-4 rounded-[32px] border border-black/5 bg-[#1a1a1a] p-8 text-white md:flex-row'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-white/10'>
              <GraduationCap size={20} />
            </div>
            <p className='text-sm text-white/70'>
              Using CourseXQuiz means agreeing to these terms.
            </p>
          </div>
          <Link
            to='/'
            className='rounded-2xl bg-white px-5 py-3 font-bold text-[#1a1a1a] transition-colors hover:bg-[#f5f5f0]'
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
