import {
  ManagementTable,
  type ManagementTableColumn,
} from '~/components/table/ManagementTable';
import { ManagementRowActions } from '~/components/table/ManagementRowActions';
import type { VendorPurchaseOrderRecord } from '~/types/vendorPurchaseOrder';
import { formatPurchaseOrderMoney } from '~/utils/purchaseOrder';
import { VendorPurchaseOrderStatusBadge } from './VendorPurchaseOrderStatusBadge';

type VendorPurchaseOrderTableProps = {
  vendorPurchaseOrders: VendorPurchaseOrderRecord[];
  onOpen: (record: VendorPurchaseOrderRecord) => void;
  onOpenPurchaseOrder: (id: string) => void;
  onEdit: (record: VendorPurchaseOrderRecord) => void;
  onDelete: (record: VendorPurchaseOrderRecord) => void;
};

export const VendorPurchaseOrderTable = ({
  vendorPurchaseOrders,
  onOpen,
  onOpenPurchaseOrder,
  onEdit,
  onDelete,
}: VendorPurchaseOrderTableProps) => {
  const actions = (record: VendorPurchaseOrderRecord) => (
    <ManagementRowActions
      label={record.reference}
      onView={() => onOpen(record)}
      onEdit={() => onEdit(record)}
      onDelete={() => onDelete(record)}
    />
  );
  const columns: ManagementTableColumn<VendorPurchaseOrderRecord>[] = [
    {
      id: 'reference',
      header: 'Reference',
      className: 'font-semibold',
      cell: (record) => (
        <button
          type='button'
          onClick={() => onOpen(record)}
          className='hover:text-emerald-700'
        >
          {record.reference}
        </button>
      ),
    },
    {
      id: 'vendor',
      header: 'Vendor',
      cell: (record) => (
        <>
          <p className='font-medium text-slate-800'>{record.vendorName}</p>
          <p className='mt-0.5 text-xs text-slate-400'>
            {record.vendorEmail ?? 'No email'}
          </p>
        </>
      ),
    },
    {
      id: 'po',
      header: 'Linked PO',
      cell: (record) => (
        <button
          type='button'
          onClick={() => onOpenPurchaseOrder(record.linkedPurchaseOrder.id)}
          className='font-semibold text-emerald-700 hover:underline'
        >
          {record.linkedPurchaseOrder.reference}
        </button>
      ),
    },
    {
      id: 'items',
      header: 'Items',
      className: 'max-w-[260px]',
      cell: (record) => (
        <>
          <p className='truncate text-slate-600'>
            {record.items[0]?.description}
          </p>
          <p className='mt-0.5 text-xs text-slate-400'>
            {record.items.length} {record.items.length === 1 ? 'item' : 'items'}
          </p>
        </>
      ),
    },
    {
      id: 'value',
      header: 'Value',
      className: 'font-medium',
      cell: (record) =>
        formatPurchaseOrderMoney(record.totalValue, record.currency),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (record) => (
        <VendorPurchaseOrderStatusBadge status={record.status} />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      cell: (record) => (
        <div className='flex justify-end gap-1'>{actions(record)}</div>
      ),
    },
  ];

  return (
    <ManagementTable
      items={vendorPurchaseOrders}
      columns={columns}
      getId={(record) => record.id}
      renderMobileCard={(record) => ({
        primary: (
          <button type='button' onClick={() => onOpen(record)}>
            {record.reference}
          </button>
        ),
        secondary: record.vendorName,
        status: <VendorPurchaseOrderStatusBadge status={record.status} />,
        description: record.items[0]?.description ?? 'No item description',
        value: formatPurchaseOrderMoney(record.totalValue, record.currency),
        meta: `${record.items.length} ${record.items.length === 1 ? 'item' : 'items'} · ${record.linkedPurchaseOrder.reference}`,
        actions: actions(record),
      })}
    />
  );
};
