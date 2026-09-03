import { useEffect, useMemo, useState } from 'react';
import {
  data,
  Link,
  redirect,
  useFetcher,
  useSearchParams,
} from 'react-router';
import {
  CalendarDays,
  Eye,
  FileText,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Route } from './+types/rfqs';
import { ConfirmModal } from '~/components/ConfirmModal';
import { RfqDetailDrawer } from '~/components/rfqs/RfqDetailDrawer';
import {
  RfqFormModal,
  type RfqFormValue,
} from '~/components/rfqs/RfqFormModal';
import { rfqStatusLabels } from '~/components/rfqs/RfqStatusBadge';
import { RfqStatusMenu } from '~/components/rfqs/RfqStatusMenu';
import { RfqPipeline } from '~/components/rfqs/RfqPipeline';
import { RfqTable } from '~/components/rfqs/RfqTable';
import { PipelineViewToggle } from '~/components/pipeline/PipelineViewToggle';
import { logCreatedActivity } from '~/db/activityLogs';
import { createRfq, getRfqs } from '~/db/rfqs';
import { listProductPrices } from '~/db/productPrices';
import { listManufacturers } from '~/db/manufacturers';
import { listEmailSourcesForRfqs } from '~/db/emailIngestion';
import { getUserFromRequest } from '~/utils/session.server';
import type { RfqRecord, RfqStatus } from '~/types/rfq';
import { formatRfqMoney } from '~/utils/rfq';
import { getOrganizationForUser } from '~/db/organizations';
import { listRfqPdfTemplates } from '~/db/rfqPdfTemplates';
import { cloudflareContext } from '~/contexts.server/cloudflareContext.server';
import { organizationAiModels } from '~/types/organization';
import { createRfqExtractor } from '~/services/rfq-extraction/index.server';
import { getProviderApiKey } from '~/utils/organization-ai.server';
import { extractRfqPdfText } from '~/utils/rfqPdfExtraction.server';
import { uploadRfqSourcePdf } from '~/utils/rfqSourcePdf.server';
import type { EmailMessage } from '~/services/email/types';
import { syncRfqItemsWithProductPrices } from '~/utils/rfqProductPrices.server';
import { findManufacturerName } from '~/utils/manufacturers';

type ApiResponse =
  | { success: true; rfq?: RfqRecord; id?: string }
  | { error: string };

const pendingStatuses: RfqStatus[] = [
  'new',
  'pricing',
  'review_email',
  'quoted',
  'sent',
];

const requireSetting = (name: string, value: string | undefined) => {
  if (!value) {
    throw new Error(`Missing required AI setting: ${name}`);
  }
  return value;
};

const formatCombinedValue = (records: RfqRecord[]) => {
  const totals = records.reduce<Record<string, number>>((byCurrency, rfq) => {
    byCurrency[rfq.currency] = (byCurrency[rfq.currency] ?? 0) + rfq.totalValue;
    return byCurrency;
  }, {});
  const values = Object.entries(totals).map(([currency, value]) =>
    formatRfqMoney(value, currency),
  );
  return values.length ? values.join(' · ') : formatRfqMoney(0, 'EUR');
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

  try {
    const templates = await listRfqPdfTemplates(organization.id);
    const productPrices = await listProductPrices(organization.id);
    const manufacturers = await listManufacturers(organization.id);
    const rfqs = await getRfqs(organization.id, organization.vat);
    const emailSources = await listEmailSourcesForRfqs(
      organization.id,
      rfqs.map((rfq) => rfq.id),
    );
    return data({
      rfqs: rfqs.map((rfq) => ({
        ...rfq,
        sourceEmail: emailSources.get(rfq.id) ?? null,
      })),
      defaultPriceMarkup: organization.priceMarkup,
      vatRate: organization.vat,
      templates: templates.map(({ id, name }) => ({ id, name })),
      productPrices,
      manufacturers,
      loadError: null,
    });
  } catch (error) {
    console.error('Unable to load RFQs', error);
    return data({
      rfqs: [],
      defaultPriceMarkup: organization.priceMarkup,
      vatRate: organization.vat,
      templates: [],
      productPrices: [],
      manufacturers: [],
      loadError: 'Unable to load RFQs',
    });
  }
};

export const action = async ({ request, context }: Route.ActionArgs) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return data({ error: 'Unauthorized' }, { status: 401 });
  }
  const organization = await getOrganizationForUser(user.id);
  if (!organization) {
    return data({ error: 'Organization required' }, { status: 409 });
  }

  try {
    const formData = await request.formData();
    if (formData.get('intent') !== 'uploadPdf') {
      return data({ error: 'Unknown RFQ action' }, { status: 400 });
    }

    const pdf = formData.get('rfqPdf');
    if (!(pdf instanceof File) || !pdf.size) {
      return data({ error: 'Choose an RFQ PDF to upload' }, { status: 400 });
    }

    const { env } = context.get(cloudflareContext);
    if (!('DB' in env)) {
      return data(
        { error: 'Cloudflare environment is unavailable' },
        { status: 503 },
      );
    }

    const model = organizationAiModels.find(
      (candidate) => candidate.value === organization.preferredModel,
    );
    if (!model) {
      return data(
        { error: 'Organization AI model is not supported' },
        { status: 400 },
      );
    }

    const bytes = await pdf.arrayBuffer();
    const text = await extractRfqPdfText(pdf, bytes);
    const providerApiKey = getProviderApiKey(model.provider, env as Env);
    const extractor = createRfqExtractor({
      provider: model.provider,
      apiKey: requireSetting(providerApiKey.name, providerApiKey.value),
      model: model.value,
      defaultPriceMarkup: organization.priceMarkup,
      usage: {
        organizationId: organization.id,
        userId: user.id,
        feature: 'rfq-extraction',
      },
    });
    const extracted = await extractor.extract({
      id: crypto.randomUUID(),
      threadId: null,
      subject: `Uploaded RFQ PDF: ${pdf.name}`,
      from: { name: null, address: '' },
      to: [],
      receivedAt: new Date(),
      text,
      attachments: [],
    } satisfies EmailMessage);

    if (!extracted.isRfq) {
      return data(
        {
          error: `The uploaded PDF was not recognized as an RFQ. ${extracted.reason}`,
        },
        { status: 422 },
      );
    }

    const rfq = await createRfq(
      organization.id,
      user.id,
      {
        ...extracted.rfq,
        items: await syncRfqItemsWithProductPrices(
          organization.id,
          user.id,
          extracted.rfq.currency,
          extracted.rfq.items,
        ),
        sourcePdfKey: await uploadRfqSourcePdf(
          organization.id,
          bytes,
          pdf.name,
        ),
      },
      organization.vat,
      organization.priceMarkup,
    );
    if (!rfq) {
      throw new Error('RFQ could not be created');
    }
    await logCreatedActivity(
      {
        organizationId: organization.id,
        actorUserId: user.id,
        sourceType: 'rfq',
        sourceId: rfq.id,
        sourceReference: rfq.reference,
      },
      rfq,
    );

    return data({ success: true, rfq }, { status: 201 });
  } catch (error) {
    console.error('RFQ PDF upload failed', error);
    return data(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to extract RFQ details from this PDF',
      },
      { status: 500 },
    );
  }
};

const RfqsPage = ({ loaderData }: Route.ComponentProps) => {
  const { rfqs } = loaderData;
  const mutation = useFetcher<ApiResponse>();
  const pdfUpload = useFetcher<ApiResponse>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | RfqStatus>('all');
  const [view, setView] = useState<'table' | 'pipeline'>('table');
  const [formRfq, setFormRfq] = useState<RfqRecord | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RfqRecord | null>(null);
  const selectedRfq = rfqs.find((rfq) => rfq.id === searchParams.get('rfq'));
  const isUploadingPdf = pdfUpload.state !== 'idle';

  useEffect(() => {
    if (pdfUpload.data && 'success' in pdfUpload.data && pdfUpload.data.rfq) {
      setSearchParams(
        { rfq: pdfUpload.data.rfq.id },
        {
          replace: true,
        },
      );
    }
  }, [pdfUpload.data, setSearchParams]);

  const closeDetails = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('rfq');
    setSearchParams(next, { replace: true });
  };

  const editFromDetails = () => {
    if (!selectedRfq) {
      return;
    }
    setFormRfq(selectedRfq);
    closeDetails();
  };

  const filteredRfqs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rfqs.filter(
      (rfq) =>
        (status === 'all' || rfq.status === status) &&
        (!query ||
          rfq.reference.toLowerCase().includes(query) ||
          rfq.customerName.toLowerCase().includes(query) ||
          rfq.items.some((item) => {
            const manufacturerName = findManufacturerName(
              loaderData.manufacturers,
              item.manufacturerId,
            );
            return (
              item.description.toLowerCase().includes(query) ||
              manufacturerName?.toLowerCase().includes(query) ||
              item.manufacturerPartNumber?.toLowerCase().includes(query)
            );
          })),
    );
  }, [loaderData.manufacturers, rfqs, search, status]);

  const submitRfq = (value: RfqFormValue) => {
    const method = value.id ? 'patch' : 'post';
    mutation.submit(value, {
      method,
      action: '/api/rfqs',
      encType: 'application/json',
    });
    setFormRfq(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }
    mutation.submit(
      { id: deleteTarget.id },
      { method: 'delete', action: '/api/rfqs', encType: 'application/json' },
    );
    setDeleteTarget(null);
  };

  const updateStatus = (rfqId: string, nextStatus: RfqStatus) => {
    mutation.submit(
      { id: rfqId, status: nextStatus, intent: 'updateStatus' },
      { method: 'patch', action: '/api/rfqs', encType: 'application/json' },
    );
  };

  const wonRfqs = rfqs.filter((rfq) => rfq.status === 'won');
  const pendingRfqs = rfqs.filter((rfq) =>
    pendingStatuses.includes(rfq.status),
  );
  const activeCount = rfqs.filter(
    (rfq) => !['won', 'lost'].includes(rfq.status),
  ).length;

  return (
    <div className='mx-auto max-w-[1440px] font-sans text-slate-950'>
      <div className='flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase'>
            Quotation workspace
          </p>
          <h1 className='mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl'>
            RFQ management
          </h1>
          <p className='mt-2 text-sm text-slate-500'>
            Create, track, and update every customer request in one place.
          </p>
        </div>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
          <pdfUpload.Form method='post' encType='multipart/form-data'>
            <input type='hidden' name='intent' value='uploadPdf' />
            <label className='inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700'>
              {isUploadingPdf ? (
                <LoaderCircle size={18} className='animate-spin' />
              ) : (
                <Upload size={18} />
              )}
              Upload PDF
              <input
                type='file'
                name='rfqPdf'
                accept='application/pdf'
                className='sr-only'
                disabled={isUploadingPdf}
                onChange={(event) => {
                  event.currentTarget.form?.requestSubmit();
                }}
              />
            </label>
          </pdfUpload.Form>
          <button
            type='button'
            onClick={() => setFormRfq('new')}
            className='inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-emerald-500'
          >
            <Plus size={18} /> New RFQ
          </button>
        </div>
      </div>

      <section
        className='mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'
        aria-label='RFQ summary'
      >
        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <p className='text-sm text-slate-500'>Total requests</p>
          <p className='mt-2 text-3xl font-bold'>{rfqs.length}</p>
        </div>
        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <p className='text-sm text-slate-500'>Active pipeline</p>
          <p className='mt-2 text-3xl font-bold'>{activeCount}</p>
        </div>
        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <p className='text-sm text-slate-500'>Pending value</p>
          <p className='mt-2 text-2xl font-bold'>
            {formatCombinedValue(pendingRfqs)}
          </p>
        </div>
        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <p className='text-sm text-slate-500'>Won value</p>
          <p className='mt-2 text-2xl font-bold'>
            {formatCombinedValue(wonRfqs)}
          </p>
        </div>
      </section>

      {loaderData.loadError && (
        <p className='mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {loaderData.loadError}. Apply the latest database migration and retry.
        </p>
      )}
      {mutation.data && 'error' in mutation.data && (
        <p className='mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {mutation.data.error}
        </p>
      )}
      {pdfUpload.data && 'error' in pdfUpload.data && (
        <p className='mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {pdfUpload.data.error}
        </p>
      )}

      <section className='mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between'>
          <label className='relative block w-full sm:max-w-sm'>
            <Search
              className='absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400'
              size={17}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className='w-full rounded-xl border border-slate-200 py-2.5 pr-3 pl-10 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
              placeholder='Search RFQs or customers'
            />
          </label>
          <div className='flex gap-2'>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as 'all' | RfqStatus)
              }
              className='min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-emerald-500 sm:flex-none'
              aria-label='Filter by status'
            >
              <option value='all'>All statuses</option>
              {Object.entries(rfqStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <PipelineViewToggle value={view} onChange={setView} />
          </div>
        </div>

        {filteredRfqs.length === 0 ? (
          <div className='px-6 py-16 text-center'>
            <span className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700'>
              <FileText size={24} />
            </span>
            <h2 className='mt-4 text-lg font-bold'>No RFQs found</h2>
            <p className='mt-1 text-sm text-slate-500'>
              {rfqs.length === 0
                ? 'Create your first request to start the pipeline.'
                : 'Try a different search or status.'}
            </p>
          </div>
        ) : view === 'pipeline' ? (
          <RfqPipeline rfqs={filteredRfqs} onStatusChange={updateStatus} />
        ) : (
          <div>
            <div className='divide-y divide-slate-100 md:hidden'>
              {filteredRfqs.map((rfq) => (
                <article key={rfq.id} className='p-4'>
                  <div className='flex items-start justify-between gap-3'>
                    <Link
                      to={`?rfq=${encodeURIComponent(rfq.id)}`}
                      className='min-w-0 font-semibold text-slate-900 hover:text-emerald-700'
                    >
                      <span className='block'>{rfq.reference}</span>
                      <span className='mt-1 block truncate text-sm font-medium text-slate-600'>
                        {rfq.customerName}
                      </span>
                    </Link>
                    <RfqStatusMenu rfqId={rfq.id} status={rfq.status} />
                  </div>
                  <p className='mt-3 line-clamp-2 text-sm text-slate-500'>
                    {rfq.items[0]?.description || 'No item description'}
                  </p>
                  <div className='mt-3 flex items-end justify-between gap-3'>
                    <div>
                      <p className='font-semibold text-slate-900'>
                        {formatRfqMoney(rfq.totalValue, rfq.currency)}
                      </p>
                      <p className='mt-1 flex items-center gap-1.5 text-xs text-slate-400'>
                        {rfq.dueDate ? (
                          <>
                            <CalendarDays size={13} />
                            Due{' '}
                            {new Date(
                              `${rfq.dueDate}T00:00:00`,
                            ).toLocaleDateString()}
                          </>
                        ) : (
                          `${rfq.items.length} ${rfq.items.length === 1 ? 'item' : 'items'}`
                        )}
                      </p>
                    </div>
                    <div className='flex gap-1'>
                      <Link
                        to={`?rfq=${encodeURIComponent(rfq.id)}`}
                        className='rounded-lg p-2 text-slate-400 hover:bg-sky-50 hover:text-sky-700'
                        aria-label={`View ${rfq.reference}`}
                      >
                        <Eye size={17} />
                      </Link>
                      <button
                        type='button'
                        onClick={() => setFormRfq(rfq)}
                        className='rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700'
                        aria-label={`Edit ${rfq.reference}`}
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        type='button'
                        onClick={() => setDeleteTarget(rfq)}
                        className='rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700'
                        aria-label={`Delete ${rfq.reference}`}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <RfqTable
              rfqs={filteredRfqs}
              onEdit={setFormRfq}
              onDelete={setDeleteTarget}
            />
          </div>
        )}
      </section>

      {selectedRfq && (
        <RfqDetailDrawer
          rfq={selectedRfq}
          vatRate={loaderData.vatRate}
          productPrices={loaderData.productPrices}
          manufacturers={loaderData.manufacturers}
          onClose={closeDetails}
          onEdit={editFromDetails}
        />
      )}

      {formRfq && (
        <RfqFormModal
          key={formRfq === 'new' ? 'new' : formRfq.id}
          initialValue={formRfq === 'new' ? undefined : formRfq}
          defaultPriceMarkup={loaderData.defaultPriceMarkup}
          templates={loaderData.templates}
          productPrices={loaderData.productPrices}
          manufacturers={loaderData.manufacturers}
          onClose={() => setFormRfq(null)}
          onSubmit={submitRfq}
        />
      )}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title='Delete this RFQ?'
        description={`${deleteTarget?.reference ?? 'This RFQ'} will be permanently removed from your quotation workspace.`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        isLoading={mutation.state !== 'idle'}
        confirmVariant='danger'
      />
    </div>
  );
};

export default RfqsPage;
