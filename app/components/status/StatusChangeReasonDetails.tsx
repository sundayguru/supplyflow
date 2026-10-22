import { ChevronDown } from 'lucide-react';
import { parseStatusHistory } from '~/utils/statusHistory';

type StatusChangeReasonDetailsProps = {
  reason: string | null | undefined;
  label?: string;
  className?: string;
};

export const StatusChangeReasonDetails = ({
  reason,
  label = 'Status change history',
  className = '',
}: StatusChangeReasonDetailsProps) => {
  const changes = parseStatusHistory(reason);
  if (!changes.length) {
    return null;
  }
  const formatStatus = (status: string) =>
    status
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  return (
    <details
      className={`rounded-xl border border-slate-200 bg-slate-50 ${className}`}
    >
      <summary className='flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium text-slate-700'>
        {label}
        <ChevronDown
          size={16}
          className='shrink-0 transition-transform [&[open]>*]:rotate-180'
        />
      </summary>
      <ol className='space-y-3 border-t border-slate-200 px-3 py-3'>
        {changes.map((change, index) => (
          <li key={`${change.changedAt}-${index}`} className='text-sm'>
            <div className='flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500'>
              <span>
                {change.fromStatus
                  ? `${formatStatus(change.fromStatus)} → ${formatStatus(change.toStatus)}`
                  : change.toStatus
                    ? formatStatus(change.toStatus)
                    : 'Status changed'}
              </span>
              {change.changedAt && (
                <time dateTime={change.changedAt}>
                  {new Date(change.changedAt).toLocaleString()}
                </time>
              )}
            </div>
            <p className='mt-1 leading-5 whitespace-pre-wrap text-slate-700'>
              {change.reason}
            </p>
          </li>
        ))}
      </ol>
    </details>
  );
};
