import { Link, useNavigate } from 'react-router';
import {
  PipelineBoard,
  type PipelineStatusStyle,
} from '~/components/pipeline/PipelineBoard';
import {
  PipelineCardContent,
  PipelineDragPreview,
} from '~/components/pipeline/PipelineCardContent';
import {
  purchaseOrderStatuses,
  type PurchaseOrderRecord,
  type PurchaseOrderStatus,
} from '~/types/purchaseOrder';
import { formatPurchaseOrderMoney } from '~/utils/purchaseOrder';
import { PurchaseOrderStatusMenu } from './PurchaseOrderStatusMenu';
import { purchaseOrderStatusLabels } from './PurchaseOrderStatusBadge';

type PurchaseOrderPipelineProps = {
  purchaseOrders: PurchaseOrderRecord[];
  onStatusChange: (id: string, status: PurchaseOrderStatus) => void;
};

const statusStyles: Record<PurchaseOrderStatus, PipelineStatusStyle> = {
  draft: { column: 'border-slate-200 bg-slate-50/70', dot: 'bg-slate-500' },
  sent: { column: 'border-sky-200 bg-sky-50/60', dot: 'bg-sky-500' },
  validated: {
    column: 'border-emerald-200 bg-emerald-50/60',
    dot: 'bg-emerald-500',
  },
  exception: { column: 'border-rose-200 bg-rose-50/60', dot: 'bg-rose-500' },
  review_email: {
    column: 'border-amber-200 bg-amber-50/60',
    dot: 'bg-amber-500',
  },
  awaiting_payment: {
    column: 'border-violet-200 bg-violet-50/60',
    dot: 'bg-violet-500',
  },
  partial_payment: {
    column: 'border-amber-200 bg-amber-50/60',
    dot: 'bg-amber-500',
  },
  payment_confirmed: {
    column: 'border-emerald-200 bg-emerald-50/60',
    dot: 'bg-emerald-500',
  },
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

export const PurchaseOrderPipeline = ({
  purchaseOrders,
  onStatusChange,
}: PurchaseOrderPipelineProps) => {
  const navigate = useNavigate();
  return (
    <PipelineBoard
      items={purchaseOrders}
      statuses={purchaseOrderStatuses}
      statusLabels={purchaseOrderStatusLabels}
      statusStyles={statusStyles}
      getId={(purchaseOrder) => purchaseOrder.id}
      getStatus={(purchaseOrder) => purchaseOrder.status}
      getDragLabel={(purchaseOrder) => purchaseOrder.reference}
      onItemClick={(purchaseOrder) =>
        navigate(`?po=${encodeURIComponent(purchaseOrder.id)}`)
      }
      onStatusChange={onStatusChange}
      emptyLabel='No POs in this stage'
      renderCard={(purchaseOrder) => (
        <PipelineCardContent
          reference={purchaseOrder.reference}
          title={purchaseOrder.supplierName}
          description={purchaseOrder.items[0]?.description ?? ''}
          itemCount={purchaseOrder.items.length}
          date={purchaseOrder.expectedDate}
          value={formatPurchaseOrderMoney(
            purchaseOrder.totalValue,
            purchaseOrder.currency,
          )}
          referenceControl={
            <Link
              to={`?po=${encodeURIComponent(purchaseOrder.id)}`}
              className='block truncate hover:text-emerald-700'
            >
              {purchaseOrder.reference}
            </Link>
          }
          statusControl={
            <PurchaseOrderStatusMenu
              purchaseOrderId={purchaseOrder.id}
              status={purchaseOrder.status}
            />
          }
        />
      )}
      renderDragPreview={(purchaseOrder, status) => (
        <PipelineDragPreview
          reference={purchaseOrder.reference}
          title={purchaseOrder.supplierName}
          value={formatPurchaseOrderMoney(
            purchaseOrder.totalValue,
            purchaseOrder.currency,
          )}
          statusLabel={purchaseOrderStatusLabels[status]}
        />
      )}
    />
  );
};
