import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router';

type ManagementRowActionsProps = {
  label: string;
  viewHref?: string;
  onView?: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const actionClassName =
  'rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700';

export const ManagementRowActions = ({
  label,
  viewHref,
  onView,
  onEdit,
  onDelete,
}: ManagementRowActionsProps) => (
  <>
    {viewHref ? (
      <Link
        to={viewHref}
        className={actionClassName}
        aria-label={`View ${label}`}
      >
        <Eye size={16} />
      </Link>
    ) : (
      <button
        type='button'
        onClick={onView}
        className={actionClassName}
        aria-label={`View ${label}`}
      >
        <Eye size={16} />
      </button>
    )}
    <button
      type='button'
      onClick={onEdit}
      className={actionClassName}
      aria-label={`Edit ${label}`}
    >
      <Pencil size={16} />
    </button>
    <button
      type='button'
      onClick={onDelete}
      className={`${actionClassName} hover:bg-rose-50 hover:text-rose-700`}
      aria-label={`Delete ${label}`}
    >
      <Trash2 size={16} />
    </button>
  </>
);
