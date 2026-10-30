import {
  PipelineBoard,
  type PipelineStatusStyle,
} from '~/components/pipeline/PipelineBoard';
import {
  PipelineCardContent,
  PipelineDragPreview,
} from '~/components/pipeline/PipelineCardContent';
import {
  vendorPurchaseOrderAcknowledgementStatuses,
  type VendorPurchaseOrderAcknowledgementRecord,
  type VendorPurchaseOrderAcknowledgementStatus,
} from '~/types/vendorPurchaseOrderAcknowledgement';
import {
  vendorPurchaseOrderAcknowledgementStatusLabels,
  VendorPurchaseOrderAcknowledgementStatusBadge,
} from './VendorPurchaseOrderAcknowledgementStatusBadge';

type AcknowledgementPipelineProps = {
  acknowledgements: VendorPurchaseOrderAcknowledgementRecord[];
  onOpen: (acknowledgement: VendorPurchaseOrderAcknowledgementRecord) => void;
  onStatusChange: (
    id: string,
    status: VendorPurchaseOrderAcknowledgementStatus,
    reason: string,
  ) => void;
};

const statusStyles: Record<
  VendorPurchaseOrderAcknowledgementStatus,
  PipelineStatusStyle
> = {
  new: { column: 'border-slate-200 bg-slate-50/70', dot: 'bg-slate-500' },
  received: { column: 'border-sky-200 bg-sky-50/60', dot: 'bg-sky-500' },
  partial_payment: {
    column: 'border-amber-200 bg-amber-50/60',
    dot: 'bg-amber-500',
  },
  payment_confirmed: {
    column: 'border-teal-200 bg-teal-50/60',
    dot: 'bg-teal-500',
  },
  partially_shipped: {
    column: 'border-violet-200 bg-violet-50/60',
    dot: 'bg-violet-500',
  },
  shipped: {
    column: 'border-indigo-200 bg-indigo-50/60',
    dot: 'bg-indigo-500',
  },
  partially_received: {
    column: 'border-cyan-200 bg-cyan-50/60',
    dot: 'bg-cyan-500',
  },
  accepted: {
    column: 'border-emerald-200 bg-emerald-50/60',
    dot: 'bg-emerald-500',
  },
  exception: { column: 'border-rose-200 bg-rose-50/60', dot: 'bg-rose-500' },
};

export const VendorPurchaseOrderAcknowledgementPipeline = ({
  acknowledgements,
  onOpen,
  onStatusChange,
}: AcknowledgementPipelineProps) => (
  <PipelineBoard
    items={acknowledgements}
    statuses={vendorPurchaseOrderAcknowledgementStatuses}
    statusLabels={vendorPurchaseOrderAcknowledgementStatusLabels}
    statusStyles={statusStyles}
    getId={(acknowledgement) => acknowledgement.id}
    getStatus={(acknowledgement) => acknowledgement.status}
    getDragLabel={(acknowledgement) => acknowledgement.reference}
    onItemClick={onOpen}
    onStatusChange={onStatusChange}
    emptyLabel='No acknowledgements in this stage'
    renderCard={(acknowledgement) => (
      <PipelineCardContent
        reference={acknowledgement.reference}
        title={acknowledgement.linkedVendorPurchaseOrder.vendorName}
        description={acknowledgement.items[0]?.description ?? ''}
        itemCount={acknowledgement.items.length}
        date={acknowledgement.acknowledgedAt}
        statusControl={
          <VendorPurchaseOrderAcknowledgementStatusBadge
            status={acknowledgement.status}
          />
        }
      />
    )}
    renderDragPreview={(acknowledgement, status) => (
      <PipelineDragPreview
        reference={acknowledgement.reference}
        title={acknowledgement.linkedVendorPurchaseOrder.vendorName}
        statusLabel={vendorPurchaseOrderAcknowledgementStatusLabels[status]}
      />
    )}
  />
);
