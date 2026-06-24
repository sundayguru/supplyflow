import { useState } from 'react';
import { Download, FilePlus2, FileText, Pencil, Trash2 } from 'lucide-react';
import { data, redirect, useFetcher } from 'react-router';
import type { Route } from './+types/rfq-pdf-templates';
import { Button } from '~/components/Button';
import { ConfirmModal } from '~/components/ConfirmModal';
import { RfqPdfTemplateFormModal } from '~/components/rfqPdfTemplates/RfqPdfTemplateFormModal';
import { getOrganizationForUser } from '~/db/organizations';
import {
  createRfqPdfTemplate,
  deleteRfqPdfTemplate,
  getRfqPdfTemplate,
  listRfqPdfTemplates,
  updateRfqPdfTemplate,
} from '~/db/rfqPdfTemplates';
import type { RfqPdfTemplate } from '~/types';
import { deleteFromR2, uploadToR2 } from '~/utils/r2.server';
import { sanitizeRichText } from '~/utils/richText';
import { getUserFromRequest } from '~/utils/session.server';

const MAX_BANNER_SIZE = 3 * 1024 * 1024;
const BANNER_TYPES = ['image/png', 'image/jpeg'];

const uploadBanner = async (
  file: FormDataEntryValue | null,
  organizationId: string,
  position: 'header' | 'footer',
) => {
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }
  if (!BANNER_TYPES.includes(file.type)) {
    throw new Error('Banners must be PNG or JPEG images');
  }
  if (file.size > MAX_BANNER_SIZE) {
    throw new Error('Each banner must be smaller than 3 MB');
  }
  const extension = file.type === 'image/png' ? 'png' : 'jpg';
  const key = `rfq-pdf-templates/${organizationId}/${crypto.randomUUID()}-${position}.${extension}`;
  const uploaded = await uploadToR2(key, await file.arrayBuffer(), file.type);
  if (!uploaded) {
    throw new Error(`Unable to upload ${position} banner`);
  }
  return key;
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return redirect('/auth/login');
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    return redirect('/organization');
  }
  return {
    organization,
    templates: await listRfqPdfTemplates(organization.id),
  };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return data({ error: 'Unauthorized' }, { status: 401 });
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    return data({ error: 'Organization required' }, { status: 403 });
  }
  const formData = await request.formData();
  const intent = String(formData.get('intent') ?? '');
  const id = String(formData.get('id') ?? '');

  try {
    if (intent === 'delete') {
      const deleted = await deleteRfqPdfTemplate(id, organization.id);
      if (!deleted) {
        return data({ error: 'Template not found' }, { status: 404 });
      }
      await Promise.all(
        [deleted.headerBannerKey, deleted.footerBannerKey]
          .filter((key): key is string => Boolean(key))
          .map(deleteFromR2),
      );
      return data({ success: true as const });
    }

    const name = String(formData.get('name') ?? '').trim();
    if (!name) {
      return data({ error: 'Template name is required' }, { status: 400 });
    }
    const termsHtml = sanitizeRichText(String(formData.get('termsHtml') ?? ''));
    const existing =
      intent === 'update' ? await getRfqPdfTemplate(id, organization.id) : null;
    if (intent === 'update' && !existing) {
      return data({ error: 'Template not found' }, { status: 404 });
    }

    const [newHeaderKey, newFooterKey] = await Promise.all([
      uploadBanner(formData.get('headerBanner'), organization.id, 'header'),
      uploadBanner(formData.get('footerBanner'), organization.id, 'footer'),
    ]);
    const removeHeader = formData.get('removeHeader') === 'true';
    const removeFooter = formData.get('removeFooter') === 'true';
    const headerBannerKey =
      newHeaderKey ??
      (removeHeader ? null : (existing?.headerBannerKey ?? null));
    const footerBannerKey =
      newFooterKey ??
      (removeFooter ? null : (existing?.footerBannerKey ?? null));

    if (existing) {
      await updateRfqPdfTemplate(existing.id, organization.id, {
        name,
        termsHtml,
        headerBannerKey,
        footerBannerKey,
      });
      await Promise.all(
        [
          existing.headerBannerKey &&
          existing.headerBannerKey !== headerBannerKey
            ? existing.headerBannerKey
            : null,
          existing.footerBannerKey &&
          existing.footerBannerKey !== footerBannerKey
            ? existing.footerBannerKey
            : null,
        ]
          .filter((key): key is string => Boolean(key))
          .map(deleteFromR2),
      );
    } else if (intent === 'create') {
      await createRfqPdfTemplate({
        organizationId: organization.id,
        createdBy: user.id,
        name,
        termsHtml,
        headerBannerKey,
        footerBannerKey,
      });
    } else {
      return data({ error: 'Invalid action' }, { status: 400 });
    }
    return data({ success: true as const });
  } catch (error) {
    return data(
      {
        error:
          error instanceof Error ? error.message : 'Unable to save template',
      },
      { status: 400 },
    );
  }
};

export default function RfqPdfTemplatesPage({
  loaderData,
}: Route.ComponentProps) {
  const { organization, templates } = loaderData;
  const deleteFetcher = useFetcher();
  const [editingTemplate, setEditingTemplate] = useState<
    RfqPdfTemplate | 'new' | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<RfqPdfTemplate | null>(null);

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }
    deleteFetcher.submit(
      { intent: 'delete', id: deleteTarget.id },
      { method: 'post' },
    );
    setDeleteTarget(null);
  };

  return (
    <div className='mx-auto max-w-6xl space-y-7'>
      <div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-end'>
        <div>
          <p className='text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase'>
            Document design
          </p>
          <h1 className='mt-2 font-serif text-4xl font-semibold text-slate-950'>
            RFQ PDF templates
          </h1>
          <p className='mt-2 text-sm text-slate-500'>
            Design reusable quotation documents with branded banners and terms.
          </p>
        </div>
        <Button onClick={() => setEditingTemplate('new')}>
          <FilePlus2 size={17} /> New template
        </Button>
      </div>

      {templates.length ? (
        <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
          {templates.map((template) => (
            <article
              key={template.id}
              className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'
            >
              <span className='flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700'>
                <FileText size={21} />
              </span>
              <h2 className='mt-5 text-lg font-semibold text-slate-950'>
                {template.name}
              </h2>
              <p className='mt-1 text-xs text-slate-500'>
                Updated {new Date(template.updatedAt).toLocaleDateString()}
              </p>
              <div className='mt-6 flex flex-wrap gap-2'>
                <button
                  type='button'
                  onClick={() => setEditingTemplate(template)}
                  className='inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200'
                >
                  <Pencil size={15} /> Edit and preview
                </button>
                <a
                  href={`/api/rfq-pdf-templates/${template.id}/sample`}
                  className='inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50'
                >
                  <Download size={15} /> Sample
                </a>
                <button
                  type='button'
                  onClick={() => setDeleteTarget(template)}
                  className='rounded-xl p-2 text-red-600 hover:bg-red-50'
                  aria-label={`Delete ${template.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className='rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center'>
          <FileText className='mx-auto text-slate-300' size={36} />
          <h2 className='mt-4 text-lg font-semibold text-slate-900'>
            No PDF templates yet
          </h2>
          <p className='mt-1 text-sm text-slate-500'>
            Create a template to brand your first quotation PDF.
          </p>
        </div>
      )}

      {editingTemplate && (
        <RfqPdfTemplateFormModal
          key={editingTemplate === 'new' ? 'new' : editingTemplate.id}
          isOpen
          template={editingTemplate === 'new' ? null : editingTemplate}
          organizationName={organization.name}
          vat={organization.vat}
          priceMarkup={organization.priceMarkup}
          onClose={() => setEditingTemplate(null)}
        />
      )}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title='Delete PDF template?'
        description={`${deleteTarget?.name ?? 'This template'} will be removed. RFQs using it will keep their data but no longer have a selected template.`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        isLoading={deleteFetcher.state !== 'idle'}
        confirmVariant='danger'
      />
    </div>
  );
}
