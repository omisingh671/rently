import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";

// type-only imports
import type { Control, FieldValues, Path, PathValue } from "react-hook-form";
import { useController } from "react-hook-form";

import useOptionalFormContext from "@/hooks/useOptionalFormContext";
import type { CountryCode } from "@/data/countryCodes.small";
import { COUNTRY_CODES_SMALL } from "@/data/countryCodes.small";

interface CountryCodeInputProps<
  TFormValues extends FieldValues,
  TName extends Path<TFormValues> = Path<TFormValues>,
> {
  name: TName;
  control?: Control<TFormValues>;

  wrapperClass?: string; // applied to outer wrapper (div)
  selectClass?: string; // applied to the native <select>
  searchInputClass?: string; // applied to internal combobox search <input>
  listClass?: string; // applied to dropdown <ul>
  itemClass?: string; // applied to each dropdown <li>

  // Behavior
  defaultDialCode?: string;
  onCountryChange?: (
    dialCode: string,
    iso2?: string,
    userInitiated?: boolean,
  ) => void;
  includeCountryName?: boolean;
  disabled?: boolean;
  useNativeSelectOnMobile?: boolean;
  maxVisible?: number;

  renderSelectOnly?: boolean;
}

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(
    navigator.userAgent,
  );
}

function isCountryCode(obj: unknown): obj is CountryCode {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.iso2 === "string" &&
    typeof o.name === "string" &&
    typeof o.dial_code === "string"
  );
}

function parseCountryArray(value: unknown): CountryCode[] | null {
  if (!Array.isArray(value)) return null;
  const filtered = value.filter(isCountryCode);
  return filtered.length ? (filtered as CountryCode[]) : null;
}

export default function CountryDialCodeInput<
  TFormValues extends FieldValues,
  TName extends Path<TFormValues> = Path<TFormValues>,
>({
  name,
  control,
  wrapperClass,
  selectClass = "w-full h-full appearance-none bg-transparent border-0",
  searchInputClass = "w-[60px] border-0 bg-transparent text-sm outline-none",
  listClass = "absolute top-full mt-1 left-0 z-50 min-w-full sm:min-w-0 sm:w-max max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg px-1 py-1 box-border divide-y divide-slate-200",
  itemClass = "text-sm py-2 px-2 rounded text-slate-800 whitespace-nowrap cursor-pointer flex-none hover:bg-indigo-50",
  defaultDialCode = "+91",
  onCountryChange,
  includeCountryName = true,
  disabled = false,
  useNativeSelectOnMobile = true,
  maxVisible = 120,
  renderSelectOnly = false,
}: CountryCodeInputProps<TFormValues, TName>) {
  const formContext = useOptionalFormContext<TFormValues>();
  const usedControl = control ?? formContext?.control;

  if (!usedControl) {
    throw new Error(
      "Country Code dropdown requires a react-hook-form control (pass `control` or wrap in FormProvider).",
    );
  }

  const { field } = useController<TFormValues, TName>({
    name,
    control: usedControl,
    defaultValue: undefined as unknown as PathValue<TFormValues, TName>,
  });

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loadedFull, setLoadedFull] = useState(false);
  const [fullList, setFullList] = useState<CountryCode[] | null>(null);
  const [showAll, setShowAll] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const highlightedIndexRef = useRef<number>(-1);

  const countryList = useMemo(
    () => fullList ?? COUNTRY_CODES_SMALL,
    [fullList],
  );

  const dialToIso = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of countryList) map.set(c.dial_code, c.iso2);
    return map;
  }, [countryList]);

  const loadFullList = useCallback(async () => {
    if (loadedFull) return;
    try {
      const modUnknown = await import("@/data/countryCodes.full");
      const mod = modUnknown as Record<string, unknown>;
      const candidates = [
        mod["COUNTRY_CODES"],
        mod["COUNTRY_CODES_FULL"],
        mod["default"],
      ];
      let parsed: CountryCode[] | null = null;
      for (const c of candidates) {
        parsed = parseCountryArray(c);
        if (parsed) break;
      }
      if (parsed) setFullList(parsed);
    } catch {
      // keep small list if full not available
    } finally {
      setLoadedFull(true);
    }
  }, [loadedFull]);

  useEffect(() => {
    const current = field.value as string | undefined;
    if (current?.trim()) {
      onCountryChange?.(current, dialToIso.get(current), false);
      return;
    }

    const existsSmall = COUNTRY_CODES_SMALL.some(
      (c) => c.dial_code === defaultDialCode,
    );
    if (existsSmall) {
      field.onChange(defaultDialCode as PathValue<TFormValues, TName>);
      onCountryChange?.(defaultDialCode, dialToIso.get(defaultDialCode), false);
      return;
    }

    const fallback = COUNTRY_CODES_SMALL[0]?.dial_code ?? "";
    if (fallback) {
      field.onChange(fallback as PathValue<TFormValues, TName>);
      onCountryChange?.(fallback, dialToIso.get(fallback), false);
    }

    void loadFullList();
  }, [defaultDialCode, field, dialToIso, loadFullList, onCountryChange]);

  useEffect(() => {
    if (!loadedFull || !fullList) return;
    const current = field.value as string | undefined;
    if (!current?.trim()) return;
    if (!dialToIso.has(current)) {
      const iso = fullList.find((c) => c.dial_code === current)?.iso2;
      onCountryChange?.(current, iso, false);
    }
  }, [loadedFull, fullList, field.value, dialToIso, onCountryChange]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countryList;
    return countryList.filter(
      (c) =>
        c.dial_code.toLowerCase().includes(q) ||
        c.iso2.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q),
    );
  }, [countryList, query]);

  const visibleItems = useMemo(
    () => (showAll ? filtered : filtered.slice(0, maxVisible)),
    [filtered, showAll, maxVisible],
  );

  const openDropdown = useCallback(() => {
    if (!loadedFull) void loadFullList();
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [loadedFull, loadFullList]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setQuery("");
    highlightedIndexRef.current = -1;
  }, []);

  const selectItem = useCallback(
    (dial: string, userInitiated = true) => {
      field.onChange(dial as unknown as PathValue<TFormValues, TName>);
      onCountryChange?.(dial, dialToIso.get(dial), userInitiated);
      closeDropdown();
    },
    [field, onCountryChange, dialToIso, closeDropdown],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === "ArrowDown" || e.key === "Enter") {
          e.preventDefault();
          openDropdown();
        }
        return;
      }

      const max = visibleItems.length;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        highlightedIndexRef.current = Math.min(
          highlightedIndexRef.current + 1,
          max - 1,
        );
        const el = listRef.current?.children[highlightedIndexRef.current] as
          | HTMLElement
          | undefined;
        el?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        highlightedIndexRef.current = Math.max(
          highlightedIndexRef.current - 1,
          0,
        );
        const el = listRef.current?.children[highlightedIndexRef.current] as
          | HTMLElement
          | undefined;
        el?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        e.preventDefault();
        const idx = highlightedIndexRef.current;
        if (idx >= 0 && idx < visibleItems.length) {
          selectItem(visibleItems[idx].dial_code, true);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeDropdown();
      }
    },
    [open, visibleItems, openDropdown, closeDropdown, selectItem],
  );

  const onNativeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dial = e.target.value;
    field.onChange(dial as unknown as PathValue<TFormValues, TName>);
    onCountryChange?.(dial, dialToIso.get(dial), true);
  };

  const useNative = useNativeSelectOnMobile && isMobileDevice();

  // If parent explicitly wants just the native <select>, render it directly
  if (renderSelectOnly || useNative) {
    return (
      <select
        id={`${String(name)}-select`}
        value={(field.value ?? "") as string}
        onChange={onNativeChange}
        className={selectClass || wrapperClass}
        disabled={disabled}
        aria-label="Country dial code"
      >
        {countryList.map((c) => (
          <option key={c.iso2} value={c.dial_code}>
            {c.dial_code} {includeCountryName ? `(${c.name})` : ""}
          </option>
        ))}
      </select>
    );
  }

  // Combobox/search mode (unstyled — parent controls styles via classes)
  return (
    <div className={wrapperClass} onKeyDown={onKeyDown} aria-haspopup="listbox">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`country-codes-list-${String(name)}`}
        aria-autocomplete="list"
        placeholder="Search country or dial code"
        value={query || (field.value ?? "")}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) openDropdown();
        }}
        onFocus={() => openDropdown()}
        onBlur={() => {
          setTimeout(() => {
            const active = document.activeElement;
            const isInside = active && listRef.current?.contains(active);
            if (!isInside) closeDropdown();
          }, 150);
        }}
        disabled={disabled}
        className={searchInputClass}
      />

      {open && (
        <ul
          id={`country-codes-list-${String(name)}`}
          role="listbox"
          ref={listRef}
          className={listClass}
        >
          {visibleItems.length === 0 && (
            <li className={itemClass} aria-disabled>
              No results
            </li>
          )}

          {visibleItems.map((c, idx) => {
            const isHighlighted = highlightedIndexRef.current === idx;
            return (
              <li
                key={c.iso2}
                role="option"
                aria-selected={isHighlighted}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectItem(c.dial_code, true)}
                onMouseEnter={() => (highlightedIndexRef.current = idx)}
                className={itemClass}
                data-highlighted={isHighlighted ? "true" : undefined}
              >
                <span className="mr-2">{c.dial_code}</span>
                {includeCountryName && <span>{c.name}</span>}
              </li>
            );
          })}

          {!showAll && filtered.length > maxVisible && (
            <li
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowAll(true)}
              className={itemClass}
              role="button"
            >
              Show more ({filtered.length - maxVisible} more)
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
