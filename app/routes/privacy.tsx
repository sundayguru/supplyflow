import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import { Logo } from '~/components/Logo';

const privacySections = [
  {
    title: 'What we collect',
    content:
      'SupplyFlow processes account and organization details, such as names, email addresses, and workspace settings. It also processes information entered or imported for RFQs, quotations, customer and vendor purchase orders, products, prices, contacts, files, and activity records. These records may include personal details of your customers, vendors, and colleagues.',
  },
  {
    title: 'Connected email accounts',
    content:
      'If you connect an email account, SupplyFlow uses the connection to monitor the selected inbox or folder, identify RFQs and purchase orders, and create related records. It may process message content, sender details, subjects, attachments, and processing status. Disconnecting an account stops future monitoring of that connection; records already created in the workspace may remain.',
  },
  {
    title: 'How we use information',
    content:
      'We use information to provide and secure the service, organize RFQs and purchase orders, prepare quotations and documents, track pricing and activity, and show reports to your organization. Where enabled, automated tools may analyze business records or email content and help prepare draft replies. Generated results should be checked before use.',
  },
  {
    title: 'Sharing and access',
    content:
      'People with access to your organization’s workspace may see its business records according to their role. Information may also be processed by providers that support hosting, connected email, and automated features. When you send or share a quotation, purchase order, or message, its recipients receive the information you include.',
  },
  {
    title: 'Data retention',
    content:
      'Workspace records and account information are kept while needed to provide the service and may be retained longer where required for legal, security, or dispute resolution purposes. Removing a connected email account stops access to that account but does not automatically delete RFQs, purchase orders, or other records created from it.',
  },
  {
    title: 'Your choices',
    content:
      'You can update information in your workspace and manage connected email accounts where those controls are available. For requests to access, correct, or delete personal information, contact your organization’s workspace owner or contact SupplyFlow through your service channel. We will review requests in line with applicable law.',
  },
];

export default function PrivacyPage() {
  return (
    <div className='min-h-screen bg-[#f7f8f4] px-4 py-16'>
      <div className='mx-auto max-w-4xl'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className='mb-10 rounded-[40px] border border-black/5 bg-white p-8 shadow-sm md:p-12'
        >
          <div className='mb-6 flex items-center gap-3'>
            <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white'>
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className='text-[11px] font-bold tracking-[0.25em] text-emerald-700 uppercase'>
                Privacy Policy
              </p>
              <h1 className='font-serif text-4xl text-[#1a1a1a] md:text-5xl'>
                Your business data, handled with care
              </h1>
            </div>
          </div>
          <p className='max-w-3xl font-serif text-lg leading-relaxed text-black/60 italic'>
            This policy explains how SupplyFlow handles information used in
            quotation, RFQ, purchase order, and connected email workflows.
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

        <div className='mt-10 flex flex-col items-center justify-between gap-4 rounded-[32px] border border-black/5 bg-black/10 p-8 text-black md:flex-row'>
          <div className='flex items-center gap-3'>
            <Logo />
            <p className='text-sm'>
              Questions about your data? Contact your workspace owner or
              SupplyFlow through your service channel.
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
