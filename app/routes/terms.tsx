import { Link } from 'react-router';
import { motion } from 'motion/react';
import { FileText } from 'lucide-react';
import { Logo } from '~/components/Logo';

const termsSections = [
  {
    title: 'Using the app',
    content:
      'SupplyFlow helps organizations manage requests for quotation (RFQs), quotations, customer and vendor purchase orders, pricing records, and related communications. You agree to use the service only for lawful business purposes and in a way that respects other users and third parties.',
  },
  {
    title: 'Accounts and workspaces',
    content:
      'You are responsible for the accuracy of your account information, keeping your credentials secure, and activity under your account. Organization owners are responsible for managing access to their workspace and the people they invite. If you suspect unauthorized access, notify us promptly.',
  },
  {
    title: 'Business information',
    content:
      'You retain your rights to the RFQs, purchase orders, quotations, files, pricing data, and other information you provide. You must have the rights and permissions needed to enter that information, connect an inbox, and allow SupplyFlow to process it to provide the service. Do not add information you are not authorized to use or share.',
  },
  {
    title: 'Connected email and generated drafts',
    content:
      'If you connect an email account, SupplyFlow may monitor the selected inbox or folder, identify business requests, and create records or draft replies. Review extracted details, generated text, attachments, recipients, and prices before using or sending them. You are responsible for communications sent from your accounts.',
  },
  {
    title: 'Quotations and purchase orders',
    content:
      'SupplyFlow is a workflow tool. Your organization remains responsible for checking product details, quantities, prices, taxes, delivery terms, and approvals before issuing a quotation, purchase order, or other business document. Creating or tracking a record in SupplyFlow does not itself establish acceptance by a customer or vendor.',
  },
  {
    title: 'Acceptable behavior',
    content:
      'Do not use the service to send unlawful or misleading communications, infringe another person’s rights, access data without authorization, interfere with the service, or abuse automated features.',
  },
  {
    title: 'Availability and changes',
    content:
      'We may improve, change, or discontinue features and may need to interrupt access for maintenance or security. Automated extraction, reports, and generated content can contain errors, so you should verify important business information against the original records.',
  },
];

export default function TermsPage() {
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
              <FileText size={24} />
            </div>
            <div>
              <p className='text-[11px] font-bold tracking-[0.25em] text-emerald-700 uppercase'>
                Terms of Use
              </p>
              <h1 className='font-serif text-4xl text-[#1a1a1a] md:text-5xl'>
                Terms and Conditions
              </h1>
            </div>
          </div>
          <p className='max-w-3xl font-serif text-lg leading-relaxed text-black/60 italic'>
            These terms explain how to use SupplyFlow for RFQs, quotations,
            purchase orders, and related business workflows.
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

        <div className='mt-10 flex flex-col items-center justify-between gap-4 rounded-[32px] border border-black/5 bg-black/10 p-8 text-black md:flex-row'>
          <div className='flex items-center gap-3'>
            <Logo />
            <p className='text-sm'>
              Use SupplyFlow responsibly and review your business documents.
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
