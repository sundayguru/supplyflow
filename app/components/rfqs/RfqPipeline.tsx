import { Link, useNavigate } from 'react-router';
import {
  PipelineBoard,
  type PipelineStatusStyle,
} from '~/components/pipeline/PipelineBoard';
import {
  PipelineCardContent,
  PipelineDragPreview,
} from '~/components/pipeline/PipelineCardContent';
import type { RfqRecord, RfqStatus } from '~/types/rfq';
import { rfqStatuses } from '~/types/rfq';
import { formatRfqMoney } from '~/utils/rfq';
import { RfqStatusMenu } from './RfqStatusMenu';
import { rfqStatusLabels } from './RfqStatusBadge';

type RfqPipelineProps = {
  rfqs: RfqRecord[];
  onStatusChange: (rfqId: string, status: RfqStatus) => void;
};

const statusStyles: Record<RfqStatus, PipelineStatusStyle> = {
  new: { column: 'border-sky-200 bg-sky-50/60', dot: 'bg-sky-500' },
  pricing: { column: 'border-amber-200 bg-amber-50/60', dot: 'bg-amber-500' },
  review: {
    column: 'border-indigo-200 bg-indigo-50/60',
    dot: 'bg-indigo-500',
  },
  quoted: {
    column: 'border-violet-200 bg-violet-50/60',
    dot: 'bg-violet-500',
  },
  sent: { column: 'border-blue-200 bg-blue-50/60', dot: 'bg-blue-500' },
  won: {
    column: 'border-emerald-200 bg-emerald-50/60',
    dot: 'bg-emerald-500',
  },
  lost: { column: 'border-rose-200 bg-rose-50/60', dot: 'bg-rose-500' },
};

export const RfqPipeline = ({ rfqs, onStatusChange }: RfqPipelineProps) => {
  const navigate = useNavigate();
  return (
    <PipelineBoard
      items={rfqs}
      statuses={rfqStatuses}
      statusLabels={rfqStatusLabels}
      statusStyles={statusStyles}
      getId={(rfq) => rfq.id}
      getStatus={(rfq) => rfq.status}
      getDragLabel={(rfq) => rfq.reference}
      onItemClick={(rfq) => navigate(`?rfq=${encodeURIComponent(rfq.id)}`)}
      onStatusChange={onStatusChange}
      emptyLabel='No RFQs in this stage'
      renderCard={(rfq) => (
        <PipelineCardContent
          reference={rfq.reference}
          title={rfq.customerName}
          description={rfq.items[0]?.description ?? ''}
          itemCount={rfq.items.length}
          date={rfq.dueDate}
          value={formatRfqMoney(rfq.totalValue, rfq.currency)}
          referenceControl={
            <Link
              to={`?rfq=${encodeURIComponent(rfq.id)}`}
              className='block truncate hover:text-emerald-700'
            >
              {rfq.reference}
            </Link>
          }
          statusControl={<RfqStatusMenu rfqId={rfq.id} status={rfq.status} />}
        />
      )}
      renderDragPreview={(rfq, overStatus) => (
        <PipelineDragPreview
          reference={rfq.reference}
          title={rfq.customerName}
          value={formatRfqMoney(rfq.totalValue, rfq.currency)}
          statusLabel={rfqStatusLabels[overStatus]}
        />
      )}
    />
  );
};
