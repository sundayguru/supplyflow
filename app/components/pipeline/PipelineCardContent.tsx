import { CalendarDays, GripVertical, Package } from 'lucide-react';
import type { ReactNode } from 'react';

type PipelineCardContentProps = {
  reference: string;
  title: string;
  description: string;
  itemCount: number;
  date?: string | null;
  value?: string;
  statusControl: ReactNode;
  referenceControl?: ReactNode;
};

export const PipelineCardContent = ({
  reference,
  title,
  description,
  itemCount,
  date,
  value,
  statusControl,
  referenceControl,
}: PipelineCardContentProps) => (
  <>
    <div className='min-w-0 font-semibold text-slate-900'>
      {referenceControl ?? <span className='block truncate'>{reference}</span>}
      <span className='mt-1 block truncate text-xs font-medium text-slate-500'>
        {title}
      </span>
    </div>
    <p className='mt-3 line-clamp-2 text-sm leading-5 text-slate-600'>
      {description || 'No item description'}
    </p>
    <div className='mt-3 flex items-center justify-between gap-2 text-xs text-slate-500'>
      <span className='flex items-center gap-1'>
        <Package size={13} /> {itemCount} {itemCount === 1 ? 'item' : 'items'}
      </span>
      {date && (
        <span className='flex items-center gap-1'>
          <CalendarDays size={13} />
          {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      )}
    </div>
    <div className='mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3'>
      <span className='text-sm font-bold text-slate-900'>{value ?? '—'}</span>
      {statusControl}
    </div>
  </>
);

type PipelineDragPreviewProps = {
  reference: string;
  title: string;
  value?: string;
  statusLabel: string;
};

export const PipelineDragPreview = ({
  reference,
  title,
  value,
  statusLabel,
}: PipelineDragPreviewProps) => (
  <>
    <div className='flex items-start justify-between gap-2'>
      <div className='min-w-0'>
        <p className='truncate font-semibold text-slate-900'>{reference}</p>
        <p className='mt-1 truncate text-xs font-medium text-slate-500'>
          {title}
        </p>
      </div>
      <GripVertical className='shrink-0 text-emerald-600' size={18} />
    </div>
    <div className='mt-3 flex items-center justify-between border-t border-slate-100 pt-3'>
      <span className='text-sm font-bold text-slate-900'>{value ?? '—'}</span>
      <span className='rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700'>
        {statusLabel}
      </span>
    </div>
  </>
);
