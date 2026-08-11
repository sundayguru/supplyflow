import { CalendarDays } from 'lucide-react';
import { Link } from 'react-router';
import {
  ManagementTable,
  type ManagementTableColumn,
} from '~/components/table/ManagementTable';
import { ManagementRowActions } from '~/components/table/ManagementRowActions';
import type { PurchaseOrderRecord } from '~/types/purchaseOrder';
import { formatPurchaseOrderMoney } from '~/utils/purchaseOrder';
import { PurchaseOrderStatusMenu } from './PurchaseOrderStatusMenu';

type PurchaseOrderTableProps = {
  purchaseOrders: PurchaseOrderRecord[];
  onOpenRfq: (rfqId: string) => void;
  onEdit: (purchaseOrder: PurchaseOrderRecord) => void;
  onDelete: (purchaseOrder: PurchaseOrderRecord) => void;
};

const detailHref = (purchaseOrder: PurchaseOrderRecord) =>
  `?po=${encodeURIComponent(purchaseOrder.id)}`;

export const PurchaseOrderTable = ({
  purchaseOrders,
  onOpenRfq,
  onEdit,
  onDelete,
}: PurchaseOrderTableProps) => {
  const actions = (purchaseOrder: PurchaseOrderRecord) => (
    <ManagementRowActions
      label={purchaseOrder.reference}
      viewHref={detailHref(purchaseOrder)}
      onEdit={() => onEdit(purchaseOrder)}
      onDelete={() => onDelete(purchaseOrder)}
    />
  );
  const columns: ManagementTableColumn<PurchaseOrderRecord>[] = [
    {
      id: 'reference',
      header: 'Reference',
      className: 'font-semibold',
      cell: (order) => (
        <Link to={detailHref(order)} className='hover:text-emerald-700'>
          {order.reference}
        </Link>
      ),
    },
    {
      id: 'supplier',
      header: 'Supplier',
      cell: (order) => (
        <>
          <p className='font-medium text-slate-800'>{order.supplierName}</p>
          <p className='mt-0.5 text-xs text-slate-400'>
            {order.supplierEmail ?? 'No email'}
          </p>
        </>
      ),
    },
    {
      id: 'rfq',
      header: 'Linked RFQ',
      cell: (order) =>
        order.linkedRfq ? (
          <button
            type='button'
            onClick={() => onOpenRfq(order.linkedRfq!.id)}
            className='font-semibold text-emerald-700 hover:underline'
          >
            {order.linkedRfq.reference}
          </button>
        ) : (
          '—'
        ),
    },
    {
      id: 'items',
      header: 'Items',
      className: 'max-w-[280px]',
      cell: (order) => (
        <>
          <p className='truncate text-slate-600'>
            {order.items[0]?.description}
          </p>
          <p className='mt-0.5 text-xs text-slate-400'>
            {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
          </p>
        </>
      ),
    },
    {
      id: 'expected',
      header: 'Expected',
      className: 'text-slate-600',
      cell: (order) =>
        order.expectedDate ? (
          <span className='flex items-center gap-1.5'>
            <CalendarDays size={14} />
            {new Date(`${order.expectedDate}T00:00:00`).toLocaleDateString()}
          </span>
        ) : (
          '—'
        ),
    },
    {
      id: 'value',
      header: 'Value',
      className: 'font-medium',
      cell: (order) =>
        formatPurchaseOrderMoney(order.totalValue, order.currency),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (order) => (
        <PurchaseOrderStatusMenu
          purchaseOrderId={order.id}
          status={order.status}
        />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      cell: (order) => (
        <div className='flex justify-end gap-1'>{actions(order)}</div>
      ),
    },
  ];

  return (
    <ManagementTable
      items={purchaseOrders}
      columns={columns}
      getId={(order) => order.id}
      minWidthClassName='min-w-[1020px]'
      renderMobileCard={(order) => ({
        primary: <Link to={detailHref(order)}>{order.reference}</Link>,
        secondary: order.supplierName,
        status: (
          <PurchaseOrderStatusMenu
            purchaseOrderId={order.id}
            status={order.status}
          />
        ),
        description: order.items[0]?.description ?? 'No item description',
        value: formatPurchaseOrderMoney(order.totalValue, order.currency),
        meta: order.expectedDate ? (
          <>
            <CalendarDays size={13} /> Expected{' '}
            {new Date(`${order.expectedDate}T00:00:00`).toLocaleDateString()}
          </>
        ) : (
          `${order.items.length} ${order.items.length === 1 ? 'item' : 'items'}`
        ),
        actions: actions(order),
      })}
    />
  );
};
