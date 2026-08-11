import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { GripVertical } from 'lucide-react';

export type PipelineStatusStyle = {
  column: string;
  dot: string;
};

type PipelineCardRenderProps = {
  isDragging: boolean;
};

type PipelineBoardProps<Item, Status extends string> = {
  items: Item[];
  statuses: readonly Status[];
  statusLabels: Record<Status, string>;
  statusStyles: Record<Status, PipelineStatusStyle>;
  getId: (item: Item) => string;
  getStatus: (item: Item) => Status;
  getDragLabel: (item: Item) => string;
  renderCard: (item: Item, props: PipelineCardRenderProps) => ReactNode;
  renderDragPreview: (item: Item, overStatus: Status) => ReactNode;
  onItemClick: (item: Item) => void;
  onStatusChange: (itemId: string, status: Status) => void;
  emptyLabel?: string;
};

type DragState<Status> = {
  itemId: string;
  sourceStatus: Status;
  overStatus: Status;
  pointerX: number;
  pointerY: number;
};

const getStatusAtPoint = <Status extends string>(x: number, y: number) => {
  const column = document
    .elementsFromPoint(x, y)
    .find((element) => element.hasAttribute('data-pipeline-status'));
  return column?.getAttribute('data-pipeline-status') as Status | null;
};

export const PipelineBoard = <Item, Status extends string>({
  items,
  statuses,
  statusLabels,
  statusStyles,
  getId,
  getStatus,
  getDragLabel,
  renderCard,
  renderDragPreview,
  onItemClick,
  onStatusChange,
  emptyLabel = 'No records in this stage',
}: PipelineBoardProps<Item, Status>) => {
  const [drag, setDrag] = useState<DragState<Status> | null>(null);
  const itemsByStatus = useMemo(
    () =>
      Object.fromEntries(
        statuses.map((status) => [
          status,
          items.filter((item) => getStatus(item) === status),
        ]),
      ) as Record<Status, Item[]>,
    [getStatus, items, statuses],
  );

  useEffect(() => {
    if (!drag) {
      return;
    }
    const finishDrag = (event: PointerEvent) => {
      const status = getStatusAtPoint<Status>(event.clientX, event.clientY);
      if (status && status !== drag.sourceStatus) {
        onStatusChange(drag.itemId, status);
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
    const overStatus = getStatusAtPoint<Status>(event.clientX, event.clientY);
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

  const draggedItem = drag
    ? items.find((item) => getId(item) === drag.itemId)
    : null;

  return (
    <div>
      <p className='border-b border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-5'>
        Drag a card by its handle to update its status. Swipe sideways to see
        the full pipeline.
      </p>
      <div className='flex snap-x snap-mandatory gap-3 overflow-x-auto p-3 sm:gap-4 sm:p-5'>
        {statuses.map((status) => {
          const columnItems = itemsByStatus[status];
          const isDropTarget = drag?.overStatus === status;
          return (
            <section
              key={status}
              data-pipeline-status={status}
              className={`flex min-h-[22rem] w-[82vw] max-w-[19rem] shrink-0 snap-start flex-col rounded-2xl border p-3 transition sm:w-72 ${statusStyles[status].column} ${isDropTarget ? 'scale-[1.01] border-emerald-400 bg-emerald-50 ring-2 ring-emerald-500 ring-offset-2' : ''}`}
              aria-label={`${statusLabels[status]} records`}
            >
              <header className='mb-3 flex items-center justify-between px-1'>
                <div className='flex min-w-0 items-center gap-2'>
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusStyles[status].dot}`}
                  />
                  <h2 className='truncate text-sm font-bold text-slate-800'>
                    {statusLabels[status]}
                  </h2>
                </div>
                <span className='ml-2 rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-slate-500 ring-1 ring-slate-900/5'>
                  {columnItems.length}
                </span>
              </header>

              {isDropTarget && drag.sourceStatus !== status && (
                <div className='mb-3 rounded-xl border border-dashed border-emerald-400 bg-white/90 px-3 py-2 text-center text-xs font-bold text-emerald-700'>
                  Drop in {statusLabels[status]}
                </div>
              )}

              <div className='flex flex-1 flex-col gap-3'>
                {columnItems.map((item) => {
                  const itemId = getId(item);
                  const isDragging = drag?.itemId === itemId;
                  return (
                    <article
                      key={itemId}
                      onClick={(event) => {
                        if (
                          !event.defaultPrevented &&
                          !(event.target as HTMLElement).closest(
                            'a, button, [role="menu"]',
                          )
                        ) {
                          onItemClick(item);
                        }
                      }}
                      className={`cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition ${isDragging ? 'scale-[0.98] opacity-40 ring-2 ring-emerald-500' : 'hover:-translate-y-0.5 hover:shadow-md'}`}
                    >
                      <div className='flex items-start gap-2'>
                        <div className='min-w-0 flex-1'>
                          {renderCard(item, { isDragging })}
                        </div>
                        <button
                          type='button'
                          className='cursor-grab touch-none rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing'
                          aria-label={`Drag ${getDragLabel(item)} to another status`}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.currentTarget.setPointerCapture(
                              event.pointerId,
                            );
                            const itemStatus = getStatus(item);
                            setDrag({
                              itemId,
                              sourceStatus: itemStatus,
                              overStatus: itemStatus,
                              pointerX: event.clientX,
                              pointerY: event.clientY,
                            });
                          }}
                          onPointerMove={moveDrag}
                        >
                          <GripVertical size={18} />
                        </button>
                      </div>
                    </article>
                  );
                })}
                {columnItems.length === 0 && (
                  <div className='flex min-h-28 flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300/80 px-4 text-center text-xs text-slate-400'>
                    {isDropTarget ? 'Drop here' : emptyLabel}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
      {draggedItem && drag && (
        <div
          className='pointer-events-none fixed z-[150] w-64 -translate-x-1/2 -translate-y-1/2 rotate-2 rounded-xl border border-emerald-300 bg-white p-3.5 shadow-2xl ring-2 ring-emerald-500/30'
          style={{ left: drag.pointerX, top: drag.pointerY }}
          aria-hidden='true'
        >
          {renderDragPreview(draggedItem, drag.overStatus)}
        </div>
      )}
    </div>
  );
};
