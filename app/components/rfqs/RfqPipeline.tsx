import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, GripVertical, Package } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import type { RfqRecord, RfqStatus } from '~/types/rfq';
import { rfqStatuses } from '~/types/rfq';
import { formatRfqMoney } from '~/utils/rfq';
import { RfqStatusMenu } from './RfqStatusMenu';
import { rfqStatusLabels } from './RfqStatusBadge';

type RfqPipelineProps = {
  rfqs: RfqRecord[];
  onStatusChange: (rfqId: string, status: RfqStatus) => void;
};

type DragState = {
  rfqId: string;
  sourceStatus: RfqStatus;
  overStatus: RfqStatus;
  pointerX: number;
  pointerY: number;
};

const columnStyles: Record<RfqStatus, string> = {
  new: 'border-sky-200 bg-sky-50/60',
  pricing: 'border-amber-200 bg-amber-50/60',
  review: 'border-indigo-200 bg-indigo-50/60',
  quoted: 'border-violet-200 bg-violet-50/60',
  sent: 'border-blue-200 bg-blue-50/60',
  won: 'border-emerald-200 bg-emerald-50/60',
  lost: 'border-rose-200 bg-rose-50/60',
};

const dotStyles: Record<RfqStatus, string> = {
  new: 'bg-sky-500',
  pricing: 'bg-amber-500',
  review: 'bg-indigo-500',
  quoted: 'bg-violet-500',
  sent: 'bg-blue-500',
  won: 'bg-emerald-500',
  lost: 'bg-rose-500',
};

const getStatusAtPoint = (x: number, y: number) => {
  const column = document
    .elementsFromPoint(x, y)
    .find((element) => element.hasAttribute('data-rfq-status'));
  return column?.getAttribute('data-rfq-status') as RfqStatus | null;
};

export const RfqPipeline = ({ rfqs, onStatusChange }: RfqPipelineProps) => {
  const navigate = useNavigate();
  const [drag, setDrag] = useState<DragState | null>(null);
  const rfqsByStatus = useMemo(
    () =>
      Object.fromEntries(
        rfqStatuses.map((status) => [
          status,
          rfqs.filter((rfq) => rfq.status === status),
        ]),
      ) as Record<RfqStatus, RfqRecord[]>,
    [rfqs],
  );

  useEffect(() => {
    if (!drag) {
      return;
    }

    const finishDrag = (event: PointerEvent) => {
      const status = getStatusAtPoint(event.clientX, event.clientY);
      if (status && status !== drag.sourceStatus) {
        onStatusChange(drag.rfqId, status);
      }
      setDrag(null);
    };
    const cancelDrag = () => setDrag(null);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', cancelDrag);
    return () => {
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', cancelDrag);
    };
  }, [drag, onStatusChange]);

  const moveDrag = (event: React.PointerEvent) => {
    if (!drag) {
      return;
    }
    const overStatus = getStatusAtPoint(event.clientX, event.clientY);
    setDrag((current) =>
      current
        ? {
            ...current,
            overStatus: overStatus ?? current.overStatus,
            pointerX: event.clientX,
            pointerY: event.clientY,
          }
        : null,
    );
  };

  const draggedRfq = drag ? rfqs.find((rfq) => rfq.id === drag.rfqId) : null;

  return (
    <div>
      <p className='border-b border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-5'>
        Drag a card by its handle to update its status. Swipe sideways to see
        the full pipeline.
      </p>
      <div className='flex snap-x snap-mandatory gap-3 overflow-x-auto p-3 sm:gap-4 sm:p-5'>
        {rfqStatuses.map((status) => {
          const columnRfqs = rfqsByStatus[status];
          const isDropTarget = drag?.overStatus === status;
          return (
            <section
              key={status}
              data-rfq-status={status}
              className={`flex min-h-[22rem] w-[82vw] max-w-[19rem] shrink-0 snap-start flex-col rounded-2xl border p-3 transition sm:w-72 ${columnStyles[status]} ${isDropTarget ? 'scale-[1.01] border-emerald-400 bg-emerald-50 ring-2 ring-emerald-500 ring-offset-2' : ''}`}
              aria-label={`${rfqStatusLabels[status]} RFQs`}
            >
              <header className='mb-3 flex items-center justify-between px-1'>
                <div className='flex items-center gap-2'>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${dotStyles[status]}`}
                  />
                  <h2 className='text-sm font-bold text-slate-800'>
                    {rfqStatusLabels[status]}
                  </h2>
                </div>
                <span className='rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-slate-500 ring-1 ring-slate-900/5'>
                  {columnRfqs.length}
                </span>
              </header>

              {isDropTarget && drag.sourceStatus !== status && (
                <div className='mb-3 rounded-xl border border-dashed border-emerald-400 bg-white/90 px-3 py-2 text-center text-xs font-bold text-emerald-700'>
                  Drop in {rfqStatusLabels[status]}
                </div>
              )}

              <div className='flex flex-1 flex-col gap-3'>
                {columnRfqs.map((rfq) => {
                  const isDragging = drag?.rfqId === rfq.id;
                  return (
                    <article
                      key={rfq.id}
                      onClick={(event) => {
                        if (
                          !event.defaultPrevented &&
                          !(event.target as HTMLElement).closest(
                            'a, button, [role="menu"]',
                          )
                        ) {
                          navigate(`?rfq=${encodeURIComponent(rfq.id)}`);
                        }
                      }}
                      className={`cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition ${isDragging ? 'scale-[0.98] opacity-50 ring-2 ring-emerald-500' : 'hover:-translate-y-0.5 hover:shadow-md'}`}
                    >
                      <div className='flex items-start justify-between gap-2'>
                        <Link
                          to={`?rfq=${encodeURIComponent(rfq.id)}`}
                          className='min-w-0 font-semibold text-slate-900 hover:text-emerald-700'
                        >
                          <span className='block truncate'>
                            {rfq.reference}
                          </span>
                          <span className='mt-1 block truncate text-xs font-medium text-slate-500'>
                            {rfq.customerName}
                          </span>
                        </Link>
                        <button
                          type='button'
                          className='cursor-grab touch-none rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing'
                          aria-label={`Drag ${rfq.reference} to another status`}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.currentTarget.setPointerCapture(
                              event.pointerId,
                            );
                            setDrag({
                              rfqId: rfq.id,
                              sourceStatus: rfq.status,
                              overStatus: rfq.status,
                              pointerX: event.clientX,
                              pointerY: event.clientY,
                            });
                          }}
                          onPointerMove={moveDrag}
                        >
                          <GripVertical size={18} />
                        </button>
                      </div>

                      <p className='mt-3 line-clamp-2 text-sm leading-5 text-slate-600'>
                        {rfq.items[0]?.description || 'No item description'}
                      </p>
                      <div className='mt-3 flex items-center justify-between gap-2 text-xs text-slate-500'>
                        <span className='flex items-center gap-1'>
                          <Package size={13} /> {rfq.items.length}{' '}
                          {rfq.items.length === 1 ? 'item' : 'items'}
                        </span>
                        {rfq.dueDate && (
                          <span className='flex items-center gap-1'>
                            <CalendarDays size={13} />
                            {new Date(
                              `${rfq.dueDate}T00:00:00`,
                            ).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                      <div className='mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3'>
                        <span className='text-sm font-bold text-slate-900'>
                          {formatRfqMoney(rfq.totalValue, rfq.currency)}
                        </span>
                        <RfqStatusMenu rfqId={rfq.id} status={rfq.status} />
                      </div>
                    </article>
                  );
                })}
                {columnRfqs.length === 0 && (
                  <div className='flex min-h-28 flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300/80 px-4 text-center text-xs text-slate-400'>
                    {isDropTarget ? 'Drop RFQ here' : 'No RFQs in this stage'}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
      {draggedRfq && drag && (
        <div
          className='pointer-events-none fixed z-[150] w-64 -translate-x-1/2 -translate-y-1/2 rotate-2 rounded-xl border border-emerald-300 bg-white p-3.5 shadow-2xl ring-2 ring-emerald-500/30'
          style={{ left: drag.pointerX, top: drag.pointerY }}
          aria-hidden='true'
        >
          <div className='flex items-start justify-between gap-2'>
            <div className='min-w-0'>
              <p className='truncate font-semibold text-slate-900'>
                {draggedRfq.reference}
              </p>
              <p className='mt-1 truncate text-xs font-medium text-slate-500'>
                {draggedRfq.customerName}
              </p>
            </div>
            <GripVertical className='shrink-0 text-emerald-600' size={18} />
          </div>
          <div className='mt-3 flex items-center justify-between border-t border-slate-100 pt-3'>
            <span className='text-sm font-bold text-slate-900'>
              {formatRfqMoney(draggedRfq.totalValue, draggedRfq.currency)}
            </span>
            <span className='rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700'>
              {rfqStatusLabels[drag.overStatus]}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
