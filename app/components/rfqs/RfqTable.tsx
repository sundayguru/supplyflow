import { CalendarDays } from 'lucide-react';
import { Link } from 'react-router';
import {
  ManagementTable,
  type ManagementTableColumn,
} from '~/components/table/ManagementTable';
import { ManagementRowActions } from '~/components/table/ManagementRowActions';
import type { RfqRecord } from '~/types/rfq';
import { formatRfqMoney } from '~/utils/rfq';
import { RfqStatusMenu } from './RfqStatusMenu';

type RfqTableProps = {
  rfqs: RfqRecord[];
  onEdit: (rfq: RfqRecord) => void;
  onDelete: (rfq: RfqRecord) => void;
};

const detailHref = (rfq: RfqRecord) => `?rfq=${encodeURIComponent(rfq.id)}`;

export const RfqTable = ({ rfqs, onEdit, onDelete }: RfqTableProps) => {
  const actions = (rfq: RfqRecord) => (
    <ManagementRowActions
      label={rfq.reference}
      viewHref={detailHref(rfq)}
      onEdit={() => onEdit(rfq)}
      onDelete={() => onDelete(rfq)}
    />
  );
  const columns: ManagementTableColumn<RfqRecord>[] = [
    {
      id: 'reference',
      header: 'Reference',
      className: 'font-semibold',
      cell: (rfq) => (
        <Link to={detailHref(rfq)} className='hover:text-emerald-700'>
          {rfq.reference}
        </Link>
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: (rfq) => (
        <>
          <p className='font-medium text-slate-800'>{rfq.customerName}</p>
          <p className='mt-0.5 text-xs text-slate-400'>
            {rfq.customerEmail ?? 'No email'}
          </p>
        </>
      ),
    },
    {
      id: 'request',
      header: 'Request',
      className: 'max-w-[280px]',
      cell: (rfq) => (
        <>
          <p className='truncate text-slate-600'>{rfq.items[0]?.description}</p>
          <p className='mt-0.5 text-xs text-slate-400'>
            {rfq.items.length} {rfq.items.length === 1 ? 'item' : 'items'}
          </p>
        </>
      ),
    },
    {
      id: 'dueDate',
      header: 'Due date',
      className: 'text-slate-600',
      cell: (rfq) =>
        rfq.dueDate ? (
          <span className='flex items-center gap-1.5'>
            <CalendarDays size={14} />
            {new Date(`${rfq.dueDate}T00:00:00`).toLocaleDateString()}
          </span>
        ) : (
          '—'
        ),
    },
    {
      id: 'value',
      header: 'Value',
      className: 'font-medium',
      cell: (rfq) => formatRfqMoney(rfq.totalValue, rfq.currency),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (rfq) => <RfqStatusMenu rfqId={rfq.id} status={rfq.status} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      cell: (rfq) => (
        <div className='flex justify-end gap-1'>{actions(rfq)}</div>
      ),
    },
  ];

  return (
    <ManagementTable
      items={rfqs}
      columns={columns}
      getId={(rfq) => rfq.id}
      minWidthClassName='min-w-[860px]'
      renderMobileCard={(rfq) => ({
        primary: <Link to={detailHref(rfq)}>{rfq.reference}</Link>,
        secondary: rfq.customerName,
        status: <RfqStatusMenu rfqId={rfq.id} status={rfq.status} />,
        description: rfq.items[0]?.description ?? 'No item description',
        value: formatRfqMoney(rfq.totalValue, rfq.currency),
        meta: rfq.dueDate ? (
          <>
            <CalendarDays size={13} /> Due{' '}
            {new Date(`${rfq.dueDate}T00:00:00`).toLocaleDateString()}
          </>
        ) : (
          `${rfq.items.length} ${rfq.items.length === 1 ? 'item' : 'items'}`
        ),
        actions: actions(rfq),
      })}
    />
  );
};
