import {
  PipelineBoard,
  type PipelineStatusStyle,
} from '~/components/pipeline/PipelineBoard';
import {
  PipelineCardContent,
  PipelineDragPreview,
} from '~/components/pipeline/PipelineCardContent';
import {
  vendorPurchaseOrderStatuses,
  type VendorPurchaseOrderRecord,
  type VendorPurchaseOrderStatus,
} from '~/types/vendorPurchaseOrder';
import { formatPurchaseOrderMoney } from '~/utils/purchaseOrder';
import {
  vendorPurchaseOrderStatusLabels,
  VendorPurchaseOrderStatusBadge,
} from './VendorPurchaseOrderStatusBadge';

type VendorPurchaseOrderPipelineProps = {
  vendorPurchaseOrders: VendorPurchaseOrderRecord[];
  onOpen: (vendorPurchaseOrder: VendorPurchaseOrderRecord) => void;
  onStatusChange: (id: string, status: VendorPurchaseOrderStatus) => void;
};

const statusStyles: Record<VendorPurchaseOrderStatus, PipelineStatusStyle> = {
  draft: { column: 'border-slate-200 bg-slate-50/70', dot: 'bg-slate-500' },
  review_email: {
    column: 'border-amber-200 bg-amber-50/60',
    dot: 'bg-amber-500',
  },
  sent: { column: 'border-sky-200 bg-sky-50/60', dot: 'bg-sky-500' },
  acknowledged: {
    column: 'border-indigo-200 bg-indigo-50/60',
    dot: 'bg-indigo-500',
  },
  partially_received: {
    column: 'border-amber-200 bg-amber-50/60',
    dot: 'bg-amber-500',
  },
  received: {
    column: 'border-emerald-200 bg-emerald-50/60',
    dot: 'bg-emerald-500',
  },
  cancelled: { column: 'border-rose-200 bg-rose-50/60', dot: 'bg-rose-500' },
};

export const VendorPurchaseOrderPipeline = ({
  vendorPurchaseOrders,
  onOpen,
  onStatusChange,
}: VendorPurchaseOrderPipelineProps) => (
  <PipelineBoard
    items={vendorPurchaseOrders}
    statuses={vendorPurchaseOrderStatuses}
    statusLabels={vendorPurchaseOrderStatusLabels}
    statusStyles={statusStyles}
    getId={(vendorPurchaseOrder) => vendorPurchaseOrder.id}
    getStatus={(vendorPurchaseOrder) => vendorPurchaseOrder.status}
    getDragLabel={(vendorPurchaseOrder) => vendorPurchaseOrder.reference}
    onItemClick={onOpen}
    onStatusChange={onStatusChange}
    emptyLabel='No vendor POs in this stage'
    renderCard={(vendorPurchaseOrder) => (
      <PipelineCardContent
        reference={vendorPurchaseOrder.reference}
        title={vendorPurchaseOrder.vendorName}
        description={vendorPurchaseOrder.items[0]?.description ?? ''}
        itemCount={vendorPurchaseOrder.items.length}
        date={vendorPurchaseOrder.expectedDate}
        value={formatPurchaseOrderMoney(
          vendorPurchaseOrder.totalValue,
          vendorPurchaseOrder.currency,
        )}
        statusControl={
          <VendorPurchaseOrderStatusBadge status={vendorPurchaseOrder.status} />
        }
      />
    )}
    renderDragPreview={(vendorPurchaseOrder, status) => (
      <PipelineDragPreview
        reference={vendorPurchaseOrder.reference}
        title={vendorPurchaseOrder.vendorName}
        value={formatPurchaseOrderMoney(
          vendorPurchaseOrder.totalValue,
          vendorPurchaseOrder.currency,
        )}
        statusLabel={vendorPurchaseOrderStatusLabels[status]}
      />
    )}
  />
);
