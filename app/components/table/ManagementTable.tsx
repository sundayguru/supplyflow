import type { ReactNode } from 'react';

export type ManagementTableColumn<Item> = {
  id: string;
  header: string;
  cell: (item: Item) => ReactNode;
  className?: string;
  headerClassName?: string;
};

export type ManagementMobileCard = {
  primary: ReactNode;
  secondary: ReactNode;
  status: ReactNode;
  description?: ReactNode;
  value?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
};

type ManagementTableProps<Item> = {
  items: Item[];
  columns: ManagementTableColumn<Item>[];
  getId: (item: Item) => string;
  renderMobileCard: (item: Item) => ManagementMobileCard;
  minWidthClassName?: string;
};

export const ManagementTable = <Item,>({
  items,
  columns,
  getId,
  renderMobileCard,
  minWidthClassName = 'min-w-[900px]',
}: ManagementTableProps<Item>) => (
  <div>
    <div className='divide-y divide-slate-100 md:hidden'>
      {items.map((item) => {
        const card = renderMobileCard(item);
        return (
          <article key={getId(item)} className='p-4'>
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <div className='font-semibold text-slate-900'>
                  {card.primary}
                </div>
                <div className='mt-1 truncate text-sm font-medium text-slate-600'>
                  {card.secondary}
                </div>
              </div>
              <div className='shrink-0'>{card.status}</div>
            </div>
            {card.description && (
              <div className='mt-3 line-clamp-2 text-sm text-slate-500'>
                {card.description}
              </div>
            )}
            <div className='mt-3 flex items-end justify-between gap-3'>
              <div className='min-w-0'>
                {card.value && (
                  <div className='font-semibold text-slate-900'>
                    {card.value}
                  </div>
                )}
                {card.meta && (
                  <div className='mt-1 flex items-center gap-1.5 text-xs text-slate-400'>
                    {card.meta}
                  </div>
                )}
              </div>
              {card.actions && (
                <div className='flex shrink-0 gap-1'>{card.actions}</div>
              )}
            </div>
          </article>
        );
      })}
    </div>
    <div className='hidden overflow-x-auto md:block'>
      <table className={`w-full text-left text-sm ${minWidthClassName}`}>
        <thead className='bg-slate-50/70 text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                className={`px-5 py-3 ${column.headerClassName ?? ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className='divide-y divide-slate-100'>
          {items.map((item) => (
            <tr key={getId(item)} className='transition hover:bg-slate-50/60'>
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={`px-5 py-4 ${column.className ?? ''}`}
                >
                  {column.cell(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
