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
  ) => void;
};

const statusStyles: Record<
  VendorPurchaseOrderAcknowledgementStatus,
  PipelineStatusStyle
> = {
  received: { column: 'border-sky-200 bg-sky-50/60', dot: 'bg-sky-500' },
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
