import { useMemo, useRef, useState } from "react";
import { COUNTRY_CODES } from "@/data/countryCodes.full";

interface CountryDialCodeSelectProps {
  value: string;
  disabled?: boolean;
  onChange: (dialCode: string) => void;
}

export default function CountryDialCodeSelect({
  value,
  disabled = false,
  onChange,
}: CountryDialCodeSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const blurTimeoutRef = useRef<number | undefined>(undefined);

  const visibleCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return COUNTRY_CODES;

    return COUNTRY_CODES.filter(
      (country) =>
        country.name.toLowerCase().includes(normalizedQuery) ||
        country.iso2.toLowerCase().includes(normalizedQuery) ||
        country.dial_code.includes(normalizedQuery),
    );
  }, [query]);

  const selectCountry = (dialCode: string) => {
    onChange(dialCode);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative mt-1">
      <input
        type="text"
        value={open ? query : value}
        disabled={disabled}
        role="combobox"
        aria-label="Country dial code"
        aria-expanded={open}
        aria-controls="walk-in-country-code-options"
        aria-autocomplete="list"
        placeholder="+91"
        onFocus={() => {
          window.clearTimeout(blurTimeoutRef.current);
          setQuery("");
          setOpen(true);
        }}
        onBlur={() => {
          blurTimeoutRef.current = window.setTimeout(() => {
            setQuery("");
            setOpen(false);
          }, 150);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
      />

      {open && !disabled && (
        <ul
          id="walk-in-country-code-options"
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg"
        >
          {visibleCountries.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">No countries found</li>
          ) : (
            visibleCountries.map((country) => (
              <li key={country.iso2} role="option" aria-selected={country.dial_code === value}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm text-slate-800 hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectCountry(country.dial_code)}
                >
                  <span className="font-medium">{country.dial_code}</span>
                  <span>{country.name}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
