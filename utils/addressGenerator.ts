// Generate valid-format addresses for different blockchain networks
// Note: These are mock addresses for demo purposes only
// In production, use proper cryptographic libraries to generate real addresses

/**
 * Generate a valid-format Bitcoin address (Native SegWit - Bech32)
 */
export function generateBTCAddress(): string {
  // Native SegWit addresses start with bc1 and are lowercase
  const chars = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'; // Bech32 charset
  let address = 'bc1q';
  // Bech32 addresses are typically 42 or 62 characters total
  const length = 39; // bc1q + 39 more characters = 42 total
  
  for (let i = 0; i < length; i++) {
    address += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return address;
}

/**
 * Generate a valid-format Ethereum address
 */
export function generateETHAddress(): string {
  // Ethereum addresses start with 0x and are 42 characters long (including 0x)
  const chars = '0123456789abcdef';
  let address = '0x';
  
  for (let i = 0; i < 40; i++) {
    address += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return address;
}

/**
 * Generate a valid-format BNB Smart Chain address (same format as Ethereum)
 */
export function generateBNBAddress(): string {
  return generateETHAddress(); // BNB uses same format as ETH
}

/**
 * Generate a valid-format Solana address
 */
export function generateSOLAddress(): string {
  // Solana addresses are base58 encoded, typically 32-44 characters
  const base58chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'; // No 0, O, I, l
  let address = '';
  const length = 44; // Standard Solana address length
  
  for (let i = 0; i < length; i++) {
    address += base58chars.charAt(Math.floor(Math.random() * base58chars.length));
  }
  
  return address;
}

/**
 * Generate a valid-format TRON address
 */
export function generateTRONAddress(): string {
  // TRON addresses start with T and are 34 characters total (base58)
  const base58chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let address = 'T';
  
  for (let i = 0; i < 33; i++) {
    address += base58chars.charAt(Math.floor(Math.random() * base58chars.length));
  }
  
  return address;
}

/**
 * Generate addresses for all supported networks
 */
export function generateAllAddresses(): {
  BTC: string;
  ETH: string;
  SOL: string;
  BNB: string;
  USDT: string;
  USDT_TRC20: string;
} {
  return {
    BTC: generateBTCAddress(),
    ETH: generateETHAddress(),
    SOL: generateSOLAddress(),
    BNB: generateBNBAddress(),
    USDT: generateETHAddress(), // USDT on Ethereum uses ETH address format
    USDT_TRC20: generateTRONAddress() // USDT on TRON uses TRC20
  };
}

/**
 * Generate address for a specific coin
 */
export function generateAddressForCoin(coinSymbol: string): string {
  const symbol = coinSymbol.toUpperCase();
  
  switch (symbol) {
    case 'BTC':
      return generateBTCAddress();
    
    case 'ETH':
    case 'USDT': // USDT on Ethereum
      return generateETHAddress();
    
    case 'BNB':
      return generateBNBAddress();
    
    case 'SOL':
      return generateSOLAddress();
    
    case 'TRN':
    case 'TRX':
    case 'USDT_TRC20':
      return generateTRONAddress();
    
    default:
      // For unknown coins, generate an ETH-style address as default
      return generateETHAddress();
  }
}
