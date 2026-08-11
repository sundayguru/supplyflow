import {
  ManagementTable,
  type ManagementTableColumn,
} from '~/components/table/ManagementTable';
import { ManagementRowActions } from '~/components/table/ManagementRowActions';
import type { VendorPurchaseOrderAcknowledgementRecord } from '~/types/vendorPurchaseOrderAcknowledgement';
import { VendorPurchaseOrderAcknowledgementStatusBadge } from './VendorPurchaseOrderAcknowledgementStatusBadge';

type AcknowledgementTableProps = {
  acknowledgements: VendorPurchaseOrderAcknowledgementRecord[];
  onOpen: (record: VendorPurchaseOrderAcknowledgementRecord) => void;
  onEdit: (record: VendorPurchaseOrderAcknowledgementRecord) => void;
  onDelete: (record: VendorPurchaseOrderAcknowledgementRecord) => void;
};

const formatDate = (value: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString() : 'Not set';

export const VendorPurchaseOrderAcknowledgementTable = ({
  acknowledgements,
  onOpen,
  onEdit,
  onDelete,
}: AcknowledgementTableProps) => {
  const actions = (record: VendorPurchaseOrderAcknowledgementRecord) => (
    <ManagementRowActions
      label={record.reference}
      onView={() => onOpen(record)}
      onEdit={() => onEdit(record)}
      onDelete={() => onDelete(record)}
    />
  );
  const columns: ManagementTableColumn<VendorPurchaseOrderAcknowledgementRecord>[] =
    [
      {
        id: 'reference',
        header: 'Reference',
        className: 'font-semibold text-slate-900',
        cell: (record) => (
          <>
            {record.reference}
            {record.acknowledgementReference && (
              <p className='mt-0.5 text-xs font-normal text-slate-400'>
                {record.acknowledgementReference}
              </p>
            )}
          </>
        ),
      },
      {
        id: 'vendor',
        header: 'Vendor',
        cell: (record) => (
          <>
            <p className='font-medium text-slate-800'>
              {record.linkedVendorPurchaseOrder.vendorName}
            </p>
            <p className='mt-0.5 text-xs text-slate-400'>
              {record.linkedVendorPurchaseOrder.vendorEmail ?? 'No email'}
            </p>
          </>
        ),
      },
      {
        id: 'vendorPo',
        header: 'Linked vendor PO',
        className: 'text-slate-600',
        cell: (record) => record.linkedVendorPurchaseOrder.reference,
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
              {record.items.length}{' '}
              {record.items.length === 1 ? 'item' : 'items'}
            </p>
          </>
        ),
      },
      {
        id: 'acknowledged',
        header: 'Acknowledged',
        className: 'text-slate-600',
        cell: (record) => formatDate(record.acknowledgedAt),
      },
      {
        id: 'status',
        header: 'Status',
        cell: (record) => (
          <VendorPurchaseOrderAcknowledgementStatusBadge
            status={record.status}
          />
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
      items={acknowledgements}
      columns={columns}
      getId={(record) => record.id}
      renderMobileCard={(record) => ({
        primary: record.reference,
        secondary: record.linkedVendorPurchaseOrder.vendorName,
        status: (
          <VendorPurchaseOrderAcknowledgementStatusBadge
            status={record.status}
          />
        ),
        description: record.items[0]?.description ?? 'No item description',
        value: record.acknowledgementReference ?? undefined,
        meta: `${formatDate(record.acknowledgedAt)} · ${record.items.length} ${record.items.length === 1 ? 'item' : 'items'}`,
        actions: actions(record),
      })}
    />
  );
};
