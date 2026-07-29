import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Save } from 'lucide-react';
import { useFetcher } from 'react-router';
import type { RfqPdfTemplate } from '~/types';
import { Button } from '../Button';
import { Input } from '../FormFields';
import { Modal } from '../Modal';
import { RichTextEditor } from '../RichTextEditor';
import { RfqPdfTemplatePreview } from './RfqPdfTemplatePreview';

type RfqPdfTemplateFormModalProps = {
  template: RfqPdfTemplate | null;
  isOpen: boolean;
  organizationName: string;
  vat: number;
  priceMarkup: number;
  onClose: () => void;
};

type TemplateActionData = { success: true } | { error: string };

const getBannerUrl = (
  template: RfqPdfTemplate | null,
  position: 'header' | 'footer',
) => {
  const key =
    position === 'header'
      ? template?.headerBannerKey
      : template?.footerBannerKey;
  return template && key
    ? `/api/rfq-pdf-templates/${template.id}/banner/${position}`
    : null;
};

export const RfqPdfTemplateFormModal = ({
  template,
  isOpen,
  organizationName,
  vat,
  priceMarkup,
  onClose,
}: RfqPdfTemplateFormModalProps) => {
  const fetcher = useFetcher<TemplateActionData>();
  const [termsHtml, setTermsHtml] = useState(template?.termsHtml ?? '');
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [footerFile, setFooterFile] = useState<File | null>(null);
  const [removeHeader, setRemoveHeader] = useState(false);
  const [removeFooter, setRemoveFooter] = useState(false);
  const headerPreview = useMemo(
    () => (headerFile ? URL.createObjectURL(headerFile) : null),
    [headerFile],
  );
  const footerPreview = useMemo(
    () => (footerFile ? URL.createObjectURL(footerFile) : null),
    [footerFile],
  );

  useEffect(
    () => () => {
      if (headerPreview) {
        URL.revokeObjectURL(headerPreview);
      }
      if (footerPreview) {
        URL.revokeObjectURL(footerPreview);
      }
    },
    [footerPreview, headerPreview],
  );

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data && 'success' in fetcher.data) {
      onClose();
    }
  }, [fetcher.data, fetcher.state, onClose]);

  const currentHeaderUrl = removeHeader
    ? null
    : (headerPreview ?? getBannerUrl(template, 'header'));
  const currentFooterUrl = removeFooter
    ? null
    : (footerPreview ?? getBannerUrl(template, 'footer'));

  return (
    <Modal
      isOpen={isOpen}
      title={template ? 'Edit PDF template' : 'Create PDF template'}
      subtitle='Design the document that accompanies your quotation.'
      icon={<FileText size={20} />}
      size='xl'
      onClose={onClose}
      isLoading={fetcher.state !== 'idle'}
      className='max-h-[94vh] overflow-y-auto'
    >
      <div className='grid gap-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]'>
        <fetcher.Form
          method='post'
          encType='multipart/form-data'
          className='space-y-5'
        >
          <input
            type='hidden'
            name='intent'
            value={template ? 'update' : 'create'}
          />
          {template && <input type='hidden' name='id' value={template.id} />}
          <input type='hidden' name='termsHtml' value={termsHtml} />
          <input
            type='hidden'
            name='removeHeader'
            value={String(removeHeader)}
          />
          <input
            type='hidden'
            name='removeFooter'
            value={String(removeFooter)}
          />
          <Input
            id='template-name'
            name='name'
            label='Template name'
            defaultValue={template?.name}
            placeholder='Standard quotation'
            maxLength={255}
            required
          />

          <div className='grid gap-4 sm:grid-cols-2'>
            <label className='text-xs font-bold tracking-widest text-black/50 uppercase'>
              Header banner
              <input
                name='headerBanner'
                type='file'
                accept='image/png,image/jpeg'
                onChange={(event) => {
                  setHeaderFile(event.target.files?.[0] ?? null);
                  setRemoveHeader(false);
                }}
                className='mt-2 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold'
              />
            </label>
            <label className='text-xs font-bold tracking-widest text-black/50 uppercase'>
              Footer banner
              <input
                name='footerBanner'
                type='file'
                accept='image/png,image/jpeg'
                onChange={(event) => {
                  setFooterFile(event.target.files?.[0] ?? null);
                  setRemoveFooter(false);
                }}
                className='mt-2 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold'
              />
            </label>
          </div>
          {template &&
            (template.headerBannerKey || template.footerBannerKey) && (
              <div className='flex flex-wrap gap-4 text-xs text-slate-600'>
                {template.headerBannerKey && (
                  <label className='flex items-center gap-2'>
                    <input
                      type='checkbox'
                      checked={removeHeader}
                      onChange={(event) =>
                        setRemoveHeader(event.target.checked)
                      }
                    />
                    Remove header banner
                  </label>
                )}
                {template.footerBannerKey && (
                  <label className='flex items-center gap-2'>
                    <input
                      type='checkbox'
                      checked={removeFooter}
                      onChange={(event) =>
                        setRemoveFooter(event.target.checked)
                      }
                    />
                    Remove footer banner
                  </label>
                )}
              </div>
            )}

          <RichTextEditor value={termsHtml} onChange={setTermsHtml} />

          {fetcher.data && 'error' in fetcher.data && (
            <p className='rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700'>
              {fetcher.data.error}
            </p>
          )}
          <div className='flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4'>
            {template && (
              <a
                href={`/api/rfq-pdf-templates/${template.id}/sample`}
                className='inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50'
              >
                <Download size={16} /> Sample PDF
              </a>
            )}
            <Button type='button' variant='secondary' onClick={onClose}>
              Cancel
            </Button>
            <Button type='submit' isLoading={fetcher.state !== 'idle'}>
              <Save size={16} /> Save template
            </Button>
          </div>
        </fetcher.Form>

        <RfqPdfTemplatePreview
          organizationName={organizationName}
          vat={vat}
          priceMarkup={priceMarkup}
          headerUrl={currentHeaderUrl}
          footerUrl={currentFooterUrl}
          termsHtml={termsHtml}
        />
      </div>
    </Modal>
  );
};
