import { Link } from 'react-router';
import { motion } from 'motion/react';
import { GraduationCap, ShieldCheck } from 'lucide-react';

const privacySections = [
  {
    title: 'What we collect',
    content:
      'We collect the information you provide when you create an account, upload learning materials, bookmark units, or interact with quizzes and courses. This may include your name, email address, profile details, course content you upload, and learning activity within the app.',
  },
  {
    title: 'How we use your information',
    content:
      'We use your information to operate the platform, personalize your learning experience, generate courses and quizzes, show your progress, and keep the app secure and reliable. We may also use aggregated usage information to improve the product.',
  },
  {
    title: 'Course materials and uploads',
    content:
      'Materials you upload are used to generate learning content and, when the course is published, the course is available to other learners. Please only upload content you have the right to use and share.',
  },
  {
    title: 'Sharing and visibility',
    content:
      'Your private account information is not displayed publicly by default. Public profile details, published courses, community activity, and other content you intentionally share may be visible to other users. We do not sell your personal information.',
  },
  {
    title: 'Data retention',
    content:
      'We keep your information for as long as your account is active or as needed to provide the service, comply with legal obligations, resolve disputes, and enforce our policies. You can contact us if you want your account information removed.',
  },
  {
    title: 'Your choices',
    content:
      'You can manage much of your information from your account, including updating profile details and removing courses where available. If you believe content or personal data should be removed, contact us and we will review the request.',
  },
];

export default function PrivacyPage() {
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
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className='text-[11px] font-bold tracking-[0.25em] text-[#5A5A40] uppercase'>
                Privacy Policy
              </p>
              <h1 className='font-serif text-4xl text-[#1a1a1a] md:text-5xl'>
                Your learning data, handled with care
              </h1>
            </div>
          </div>
          <p className='max-w-3xl font-serif text-lg leading-relaxed text-black/60 italic'>
            This privacy policy explains how CourseXQuiz collects, uses, and
            protects information in this free learning app.
          </p>
        </motion.div>

        <div className='space-y-6'>
          {privacySections.map((section, index) => (
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
              Questions about privacy or your data? info@coursexquiz.com
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
