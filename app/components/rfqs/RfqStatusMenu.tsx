import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useFetcher } from 'react-router';
import { createPortal } from 'react-dom';
import { rfqStatuses, type RfqStatus } from '~/types/rfq';
import { getRfqStatusBadgeClassName, rfqStatusLabels } from './RfqStatusBadge';

type RfqStatusMenuProps = {
  rfqId: string;
  status: RfqStatus;
};

export const RfqStatusMenu = ({ rfqId, status }: RfqStatusMenuProps) => {
  const fetcher = useFetcher();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (
        !containerRef.current?.contains(event.target as Node) &&
        !menuRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    const closeOnScroll = () => setIsOpen(false);
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('scroll', closeOnScroll, true);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('scroll', closeOnScroll, true);
    };
  }, [isOpen]);

  const toggleMenu = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuHeight = 216;
      setMenuPosition({
        top:
          rect.bottom + menuHeight > window.innerHeight
            ? Math.max(8, rect.top - menuHeight - 8)
            : rect.bottom + 8,
        left: Math.min(rect.left, window.innerWidth - 168),
      });
    }
    setIsOpen((open) => !open);
  };

  const selectStatus = (nextStatus: RfqStatus) => {
    setIsOpen(false);
    if (nextStatus === status) {
      return;
    }
    fetcher.submit(
      { id: rfqId, status: nextStatus, intent: 'updateStatus' },
      { method: 'patch', action: '/api/rfqs', encType: 'application/json' },
    );
  };

  return (
    <div ref={containerRef} className='relative inline-flex'>
      <button
        ref={buttonRef}
        type='button'
        onClick={toggleMenu}
        disabled={fetcher.state !== 'idle'}
        aria-haspopup='menu'
        aria-expanded={isOpen}
        className={`${getRfqStatusBadgeClassName(status)} items-center gap-1 transition hover:brightness-95 disabled:opacity-60`}
      >
        {rfqStatusLabels[status]}
        <ChevronDown size={12} />
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role='menu'
            style={menuPosition}
            className='fixed z-[120] min-w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl'
          >
            {rfqStatuses.map((value) => (
              <button
                key={value}
                type='button'
                role='menuitem'
                onClick={() => selectStatus(value)}
                className='flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50'
              >
                {rfqStatusLabels[value]}
                {value === status && (
                  <Check size={14} className='text-emerald-600' />
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};
