import { Columns3, List } from 'lucide-react';

export type ManagementView = 'table' | 'pipeline';

type PipelineViewToggleProps = {
  value: ManagementView;
  onChange: (view: ManagementView) => void;
  showLabels?: boolean;
};

export const PipelineViewToggle = ({
  value,
  onChange,
  showLabels = true,
}: PipelineViewToggleProps) => (
  <div
    className='flex rounded-xl bg-slate-100 p-1'
    role='group'
    aria-label='Management view'
  >
    <button
      type='button'
      onClick={() => onChange('table')}
      aria-pressed={value === 'table'}
      aria-label='Table view'
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${value === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
    >
      <List size={16} />
      {showLabels && <span className='hidden sm:inline'>Table</span>}
    </button>
    <button
      type='button'
      onClick={() => onChange('pipeline')}
      aria-pressed={value === 'pipeline'}
      aria-label='Pipeline view'
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${value === 'pipeline' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
    >
      <Columns3 size={16} />
      {showLabels && <span className='hidden sm:inline'>Pipeline</span>}
    </button>
  </div>
);
