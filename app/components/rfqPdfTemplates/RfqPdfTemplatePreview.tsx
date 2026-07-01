import { createMockRfqForTemplate } from '~/utils/rfqPdfMock';
import { formatRfqMoney } from '~/utils/rfq';
import { sanitizeRichText } from '~/utils/richText';

type RfqPdfTemplatePreviewProps = {
  organizationName: string;
  vat: number;
  priceMarkup: number;
  headerUrl: string | null;
  footerUrl: string | null;
  termsHtml: string;
};

const Banner = ({
  url,
  fallback,
  position,
}: {
  url: string | null;
  fallback: string;
  position: 'header' | 'footer';
}) =>
  url ? (
    <img
      src={url}
      alt={`${position} banner preview`}
      className={`w-full object-fill ${position === 'header' ? 'h-12' : 'h-8'}`}
    />
  ) : (
    <div
      className={`flex items-center px-5 text-[8px] font-semibold text-slate-500 ${position === 'header' ? 'h-12 border-b border-slate-200 text-emerald-800' : 'h-8 border-t border-slate-200'}`}
    >
      {fallback}
    </div>
  );

export const RfqPdfTemplatePreview = ({
  organizationName,
  vat,
  priceMarkup,
  headerUrl,
  footerUrl,
  termsHtml,
}: RfqPdfTemplatePreviewProps) => {
  const rfq = createMockRfqForTemplate({ vat, priceMarkup });
  const pageClass =
    'flex aspect-[210/297] w-full flex-col overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-slate-200';

  return (
    <div className='space-y-4 rounded-2xl bg-slate-100 p-4'>
      <p className='text-xs font-bold tracking-wider text-slate-500 uppercase'>
        Live PDF preview
      </p>
      <div className='grid gap-4 xl:grid-cols-2'>
        <div className={pageClass}>
          <Banner
            url={headerUrl}
            fallback={organizationName}
            position='header'
          />
          <div className='flex-1 p-5 text-[7px] text-slate-700'>
            <div className='flex items-start justify-between'>
              <div>
                <p className='text-sm font-bold text-slate-950'>
                  REQUEST FOR QUOTATION
                </p>
                <p className='mt-1 font-semibold'>{rfq.reference}</p>
              </div>
              <p>Due {rfq.dueDate}</p>
            </div>
            <div className='mt-3 rounded bg-slate-50 p-2'>
              <b>{rfq.customerName}</b>
              <br />
              {rfq.customerEmail}
            </div>
            <table className='mt-4 w-full table-fixed text-left'>
              <thead className='bg-emerald-50 text-emerald-900'>
                <tr>
                  <th className='w-5 p-1'>#</th>
                  <th className='p-1'>Description</th>
                  <th className='w-10 p-1'>Qty</th>
                  <th className='w-16 p-1'>Total</th>
                </tr>
              </thead>
              <tbody>
                {rfq.items.slice(0, 5).map((item, index) => {
                  const base = item.price * item.quantity;
                  const total = base + (base * item.priceMarkup) / 100;
                  return (
                    <tr
                      key={item.description}
                      className='border-b border-slate-100'
                    >
                      <td className='p-1'>{index + 1}</td>
                      <td className='truncate p-1'>{item.description}</td>
                      <td className='p-1'>{item.quantity}</td>
                      <td className='p-1'>{formatRfqMoney(total, 'EUR')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <dl className='mt-4 ml-auto w-36 space-y-1'>
              <div className='flex justify-between'>
                <dt>Subtotal</dt>
                <dd>{formatRfqMoney(rfq.subtotal, 'EUR')}</dd>
              </div>
              <div className='flex justify-between'>
                <dt>Markup</dt>
                <dd>{formatRfqMoney(rfq.markupValue, 'EUR')}</dd>
              </div>
              <div className='flex justify-between'>
                <dt>VAT ({vat}%)</dt>
                <dd>{formatRfqMoney(rfq.vatValue, 'EUR')}</dd>
              </div>
              <div className='flex justify-between border-t pt-1 font-bold'>
                <dt>Total</dt>
                <dd>{formatRfqMoney(rfq.totalValue, 'EUR')}</dd>
              </div>
            </dl>
          </div>
          <Banner
            url={footerUrl}
            fallback='SupplyFlow quotation sample - Page 1'
            position='footer'
          />
        </div>

        <div className={pageClass}>
          <Banner
            url={headerUrl}
            fallback={organizationName}
            position='header'
          />
          <div className='flex-1 p-5 text-[7px] leading-3 text-slate-700'>
            <p className='text-sm font-bold text-slate-950'>
              TERMS AND CONDITIONS
            </p>
            <div
              className='mt-4 space-y-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4'
              dangerouslySetInnerHTML={{
                __html:
                  sanitizeRichText(termsHtml) ||
                  '<p>No terms and conditions added.</p>',
              }}
            />
          </div>
          <Banner
            url={footerUrl}
            fallback='SupplyFlow quotation sample - Last page'
            position='footer'
          />
        </div>
      </div>
    </div>
  );
};
