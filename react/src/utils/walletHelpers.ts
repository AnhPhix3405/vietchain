import { Wallet } from '../def-hooks/walletContext';

// ❌ Xóa interface WalletData duplicate
// export interface WalletData {
//   id: string;
//   name: string;
//   mnemonic?: string;
//   encryptedMnemonic?: string;
//   accounts: Array<{ address: string }>;
//   isActive: boolean;
//   createdAt: string;
// }

// 🆕 Sử dụng Wallet type từ walletContext
export function isEncryptedWallet(wallet: Wallet): boolean {
  return !!(wallet.encryptedMnemonic && !wallet.mnemonic);
}

export function isLegacyWallet(wallet: Wallet): boolean {
  return !!(wallet.mnemonic && !wallet.encryptedMnemonic);
}

export function requiresPassword(wallet: Wallet): boolean {
  return isEncryptedWallet(wallet);
}

export const getWalletType = (wallet: any): 'phiwallet-encrypted' | 'phiwallet-legacy' | 'keyring' | 'unknown' => {
  if (!wallet) return 'unknown';
  
  // PhiWallet encrypted - có encryptedMnemonic, không có mnemonic plaintext
  if (wallet.encryptedMnemonic && !wallet.mnemonic) {
    return 'phiwallet-encrypted';
  }
  
  // PhiWallet legacy - có mnemonic plaintext và name
  if (wallet.mnemonic && wallet.name) {
    return 'phiwallet-legacy';
  }
  
  // Keyring wallet - có accounts nhưng không có mnemonic data
  if (wallet.accounts && wallet.accounts.length > 0 && !wallet.mnemonic && !wallet.encryptedMnemonic) {
    return 'keyring';
  }
  
  return 'unknown';
};

export const canBackupWallet = (wallet: any): boolean => {
  const type = getWalletType(wallet);
  return type === 'phiwallet-encrypted' || type === 'phiwallet-legacy';
};

export const getWalletTypeDisplay = (wallet: any): string => {
  const type = getWalletType(wallet);
  
  switch (type) {
    case 'phiwallet-encrypted':
      return 'PhiWallet (Encrypted)';
    case 'phiwallet-legacy':
      return 'PhiWallet (Legacy)';
    case 'keyring':
      return 'Keyring Wallet';
    default:
      return 'Unknown Wallet';
  }
};