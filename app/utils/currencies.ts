export const supportedCurrencies = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US dollar' },
  { code: 'GBP', symbol: '£', name: 'British pound' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss franc' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese yuan' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore dollar' },
  { code: 'INR', symbol: '₹', name: 'Indian rupee' },
  { code: 'KRW', symbol: '₩', name: 'South Korean won' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish krone' },
  { code: 'PLN', symbol: 'zł', name: 'Polish złoty' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech koruna' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian forint' },
  { code: 'RON', symbol: 'lei', name: 'Romanian leu' },
  { code: 'BGN', symbol: 'лв', name: 'Bulgarian lev' },
  { code: 'TRY', symbol: '₺', name: 'Turkish lira' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi riyal' },
  { code: 'ZAR', symbol: 'R', name: 'South African rand' },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican peso' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian real' },
] as const;

export type SupportedCurrencyCode =
  (typeof supportedCurrencies)[number]['code'];

export const isSupportedCurrencyCode = (
  value: string,
): value is SupportedCurrencyCode =>
  supportedCurrencies.some((currency) => currency.code === value);

export const currencyOptionLabel = ({
  code,
  symbol,
  name,
}: (typeof supportedCurrencies)[number]) => `${symbol} ${code} · ${name}`;
