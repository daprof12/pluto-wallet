/**
 * Format a number to 2 decimal places, or show exact decimals if rounding would lose precision
 * @param value - The number or string to format
 * @returns Formatted string with 2 decimal places or exact decimals for very small numbers
 */
export function formatDecimal(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.00';
  
  // If the number rounds to 0.00 but is actually greater than 0, show exact decimals
  if (num > 0 && num < 0.005) {
    return num.toString();
  }
  
  // If the number rounds to 0.00 but is actually less than 0, show exact decimals
  if (num < 0 && num > -0.005) {
    return num.toString();
  }
  
  // Otherwise, round to 2 decimal places
  return num.toFixed(2);
}

/**
 * Format a balance to show full precision (up to 8 decimal places, removing trailing zeros)
 * @param value - The balance value to format
 * @returns Formatted string with up to 8 decimal places
 */
export function formatBalance(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  
  // Show up to 8 decimal places (standard crypto precision)
  // Remove trailing zeros and unnecessary decimal point
  return num.toFixed(8).replace(/\.?0+$/, '') || '0';
}

/**
 * Format a crypto amount to 2 decimal places
 * @param amount - The amount to format
 * @param symbol - Optional crypto symbol to append
 * @returns Formatted string
 */
export function formatCryptoAmount(amount: number | string, symbol?: string): string {
  const formatted = formatDecimal(amount);
  return symbol ? `${formatted} ${symbol}` : formatted;
}

/**
 * Format a percentage to 1 decimal place
 * @param value - The percentage value
 * @param includeSign - Whether to include + sign for positive values
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, includeSign: boolean = true): string {
  const formatted = value.toFixed(1);
  if (includeSign && value > 0) {
    return `+${formatted}%`;
  }
  return `${formatted}%`;
}
