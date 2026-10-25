'use client';
import { useState, useRef, useId, useMemo } from 'react';
export interface Location {
  code: string;
  name: string;
}
interface Props {
  currentLocation: Location | undefined;
  locationCode: string;
  availableLocations: Location[];
  geographyLabelPlural: string;
  onLocationChange: (location: Location) => void;
}
export default function LocationSwitcher({
  currentLocation,
  locationCode,
  availableLocations,
  geographyLabelPlural,
  onLocationChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const locations = useMemo(
    () =>
      availableLocations.filter((loc) =>
        loc.name.toLowerCase().includes(search.toLowerCase().trim()),
      ),
    [availableLocations, search],
  );
  function close() {
    setOpen(false);
    button.current?.focus();
  }
  function select(loc?: Location) {
    if (!loc) return;
    close();
    if (loc.code !== locationCode) onLocationChange(loc);
  }
  function move(index: number) {
    const next = Math.max(0, Math.min(index, locations.length - 1));
    setActive(next);
    document
      .getElementById(`${id}-${next}`)
      ?.scrollIntoView({ block: 'nearest' });
  }
  return (
    <div className="relative min-w-0">
      <button
        ref={button}
        type="button"
        onClick={() => {
          setOpen(!open);
          setSearch('');
          setActive(0);
        }}
        aria-expanded={open}
        aria-controls={open ? `${id}-panel` : undefined}
        className="flex max-w-full items-center gap-2 rounded text-left text-base font-semibold text-ink focus-visible:outline-2 focus-visible:outline-hopkins-blue sm:text-lg"
      >
        <span>{currentLocation?.name || locationCode}</span>
        <span aria-hidden="true" className="text-muted">
          ⌄
        </span>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={close}
          />
          <div
            id={`${id}-panel`}
            className="absolute left-0 top-full z-50 mt-2 w-[min(280px,calc(100vw-6rem))] rounded border border-rule bg-white p-2 shadow-lg"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                close();
              }
            }}
          >
            <input
              ref={(element) => {
                element?.focus();
              }}
              role="combobox"
              aria-label={`Search ${geographyLabelPlural}`}
              aria-expanded="true"
              aria-autocomplete="list"
              aria-controls={`${id}-list`}
              aria-activedescendant={
                locations.length ? `${id}-${active}` : undefined
              }
              value={search}
              placeholder={`Search ${geographyLabelPlural}…`}
              onChange={(e) => {
                setSearch(e.target.value);
                setActive(0);
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  move(active + 1);
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  move(active - 1);
                }
                if (event.key === 'Enter') {
                  event.preventDefault();
                  select(locations[active]);
                }
              }}
              className="w-full rounded border border-rule bg-white px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-hopkins-blue"
            />
            <ul
              id={`${id}-list`}
              role="listbox"
              aria-label={geographyLabelPlural}
              className="mt-2 max-h-64 overflow-y-auto"
            >
              {locations.map((loc, index) => (
                <li
                  id={`${id}-${index}`}
                  key={loc.code}
                  role="option"
                  aria-selected={active === index}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select(loc)}
                  className={`cursor-pointer rounded px-3 py-2 text-sm text-ink ${active === index ? 'bg-paper outline outline-1 outline-rule' : 'hover:bg-paper'}`}
                >
                  {loc.name}
                  {loc.code === locationCode && (
                    <span className="ml-2" aria-label="current location">
                      ✓
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {!locations.length && (
              <p role="status" className="p-3 text-sm text-muted">
                No matching locations.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
