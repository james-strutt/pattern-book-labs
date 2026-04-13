import { type ReactElement, type ChangeEvent } from 'react';
import { AlertCircle, ChevronDown, Layers } from 'lucide-react';
import logger from '@/lib/logger';
import type { ShortlistLayer } from '@/types/domain/shortlist';

interface ShortlistSelectorProps {
  readonly id?: string;
  readonly shortlists: ShortlistLayer[];
  readonly selectedShortlist: ShortlistLayer | null;
  readonly isOpen?: boolean;
  readonly onToggle?: () => void;
  readonly onSelect: (shortlist: ShortlistLayer) => void | Promise<void>;
  readonly loading?: boolean;
  readonly error?: string | null;
  readonly placeholder?: string;
  readonly emptyMessage?: string;
}

export function ShortlistSelector({
  id,
  shortlists,
  selectedShortlist,
  isOpen: _isOpen,
  onToggle: _onToggle,
  onSelect,
  loading = false,
  error = null,
  placeholder = 'Select a shortlist',
  emptyMessage = 'No shortlists found.',
}: Readonly<ShortlistSelectorProps>): ReactElement {
  async function onChangeSelect(event: ChangeEvent<HTMLSelectElement>): Promise<void> {
    const selectedId = event.target.value;
    if (!selectedId) {
      return;
    }
    const shortlist = shortlists.find((s) => s.id === selectedId);
    if (!shortlist) {
      return;
    }
    try {
      await onSelect(shortlist);
    } catch (err) {
      logger.error(
        'Error selecting shortlist',
        { error: err, shortlistId: shortlist.id },
        'ShortlistSelector'
      );
    }
  }

  return (
    <div className="relative">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 shrink-0 mt-0.5" aria-hidden />
            <p className="text-left">{error}</p>
          </div>
        </div>
      )}

      <div className="relative">
        <Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-sky-600 pointer-events-none z-10" aria-hidden />
        <select
          id={id}
          value={selectedShortlist?.id ?? ''}
          onChange={onChangeSelect}
          disabled={loading}
          aria-label={selectedShortlist?.name ?? placeholder}
          className="w-full min-w-0 pl-10 pr-10 py-2 text-left text-gray-900 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm border border-gray-200 bg-linear-to-br from-white/90 to-white/60 hover:from-white hover:to-white backdrop-blur transition-colors rounded-lg appearance-none cursor-pointer"
        >
          {loading && <option value="">Loading shortlists...</option>}
          {!loading && shortlists.length === 0 && (
            <option value="" disabled>
              {emptyMessage}
            </option>
          )}
          {!loading && shortlists.length > 0 && (
            <>
              <option value="" disabled>
                {placeholder}
              </option>
              {shortlists.map((shortlist) => (
                <option key={shortlist.id} value={shortlist.id}>
                  {shortlist.name}
                </option>
              ))}
            </>
          )}
        </select>
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden />
        </div>
      </div>
    </div>
  );
}

export default ShortlistSelector;
