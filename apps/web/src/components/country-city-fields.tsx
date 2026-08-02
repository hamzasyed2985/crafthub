'use client';

import { COUNTRIES, citiesForCountry } from '@/lib/locations';

const selectClass =
  'min-h-11 w-full rounded-sm border border-border-strong bg-elevated px-3 text-foreground';

type CountrySelectProps = {
  id?: string;
  label?: string;
  value: string;
  required?: boolean;
  onChange: (countryCode: string) => void;
};

export function CountrySelect({
  id = 'country',
  label = 'Country',
  value,
  required,
  onChange,
}: CountrySelectProps) {
  return (
    <label className="flex flex-col gap-1.5" htmlFor={id}>
      <span className="text-sm font-semibold">{label}</span>
      <select
        id={id}
        className={selectClass}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          Select country
        </option>
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}

type CitySelectProps = {
  id?: string;
  label?: string;
  countryCode: string;
  value: string;
  required?: boolean;
  /** Keep a value that is not in the curated list (e.g. loaded from DB). */
  extraOptions?: string[];
  onChange: (city: string) => void;
};

export function CitySelect({
  id = 'city',
  label = 'City',
  countryCode,
  value,
  required,
  extraOptions = [],
  onChange,
}: CitySelectProps) {
  const curated = citiesForCountry(countryCode);
  const extras = extraOptions.filter(
    (c) => c && !curated.some((x) => x.toLowerCase() === c.toLowerCase()),
  );
  const options = [...extras, ...curated];
  const disabled = !countryCode;

  return (
    <label className="flex flex-col gap-1.5" htmlFor={id}>
      <span className="text-sm font-semibold">{label}</span>
      <select
        id={id}
        className={selectClass}
        value={value}
        required={required}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{disabled ? 'Select country first' : 'Select city'}</option>
        {options.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>
    </label>
  );
}
