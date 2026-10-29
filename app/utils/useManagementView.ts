import { useCallback, useSyncExternalStore } from 'react';
import type { ManagementView } from '~/components/pipeline/PipelineViewToggle';

const STORAGE_KEY = 'supplyflow.management-view';
const CHANGE_EVENT = 'supplyflow:management-view-change';

const isManagementView = (value: string | null): value is ManagementView =>
  value === 'table' || value === 'pipeline';

export const useManagementView = () => {
  const view = useSyncExternalStore(
    (onStoreChange) => {
      const syncView = (event: Event) => {
        if (
          event.type === CHANGE_EVENT ||
          (event instanceof StorageEvent && event.key === STORAGE_KEY)
        ) {
          onStoreChange();
        }
      };
      window.addEventListener('storage', syncView);
      window.addEventListener(CHANGE_EVENT, syncView);
      return () => {
        window.removeEventListener('storage', syncView);
        window.removeEventListener(CHANGE_EVENT, syncView);
      };
    },
    (): ManagementView => {
      const storedView = window.localStorage.getItem(STORAGE_KEY);
      return isManagementView(storedView) ? storedView : 'table';
    },
    (): ManagementView => 'table',
  );

  const setView = useCallback((nextView: ManagementView) => {
    window.localStorage.setItem(STORAGE_KEY, nextView);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [view, setView] as const;
};
