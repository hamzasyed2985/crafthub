export type CountryOption = {
  code: string;
  name: string;
};

/** Curated countries for checkout / maker location (ISO 3166-1 alpha-2). */
export const COUNTRIES: CountryOption[] = [
  { code: 'PK', name: 'Pakistan' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'IN', name: 'India' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'SA', name: 'Saudi Arabia' },
];

/** Major cities keyed by country code — enough for demo / local marketplace. */
export const CITIES_BY_COUNTRY: Record<string, string[]> = {
  PK: [
    'Islamabad',
    'Rawalpindi',
    'Lahore',
    'Karachi',
    'Peshawar',
    'Quetta',
    'Faisalabad',
    'Multan',
    'Hyderabad',
    'Sialkot',
    'Gujranwala',
    'Abbottabad',
  ],
  US: [
    'New York',
    'Los Angeles',
    'Chicago',
    'Houston',
    'Phoenix',
    'Philadelphia',
    'San Antonio',
    'San Diego',
    'Dallas',
    'San Francisco',
    'Seattle',
    'Austin',
    'Denver',
    'Boston',
    'Portland',
  ],
  GB: ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow', 'Bristol', 'Leeds', 'Liverpool'],
  AE: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah'],
  IN: [
    'Mumbai',
    'Delhi',
    'Bengaluru',
    'Hyderabad',
    'Chennai',
    'Kolkata',
    'Pune',
    'Jaipur',
    'Ahmedabad',
  ],
  CA: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton'],
  AU: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
  DE: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'],
  FR: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Bordeaux'],
  SA: ['Riyadh', 'Jeddah', 'Dammam', 'Mecca', 'Medina'],
};

export function citiesForCountry(countryCode: string): string[] {
  return CITIES_BY_COUNTRY[countryCode] ?? [];
}

/** Infer country from a known city name (for shop settings load). */
export function countryForCity(city: string | null | undefined): string {
  if (!city) return 'PK';
  const needle = city.trim().toLowerCase();
  for (const [code, cities] of Object.entries(CITIES_BY_COUNTRY)) {
    if (cities.some((c) => c.toLowerCase() === needle)) return code;
  }
  return 'PK';
}
