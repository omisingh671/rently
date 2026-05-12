export type CountryCode = {
  iso2: string;
  name: string;
  dial_code: string;
};

export const COUNTRY_CODES_SMALL: CountryCode[] = [
  { iso2: "IN", name: "India", dial_code: "+91" },
  { iso2: "US", name: "United States", dial_code: "+1" },
  { iso2: "GB", name: "United Kingdom", dial_code: "+44" },
  { iso2: "CA", name: "Canada", dial_code: "+1" },
  { iso2: "AU", name: "Australia", dial_code: "+61" },
  { iso2: "SG", name: "Singapore", dial_code: "+65" },
  { iso2: "AE", name: "United Arab Emirates", dial_code: "+971" },
  { iso2: "ZA", name: "South Africa", dial_code: "+27" },
  { iso2: "DE", name: "Germany", dial_code: "+49" },
  { iso2: "FR", name: "France", dial_code: "+33" },
];

export default COUNTRY_CODES_SMALL;
