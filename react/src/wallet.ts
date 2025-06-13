import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { BLOCKCHAIN_CONFIG } from "./config/blockchain";
import CryptoJS from "crypto-js";

export async function createNewWallet() {
  // Tạo wallet với 24 từ thay vì 12 từ
  const wallet = await DirectSecp256k1HdWallet.generate(24, { // 🆕 Thay đổi từ 12 thành 24
    prefix: BLOCKCHAIN_CONFIG.addressPrefix, // "myphi" thay vì "cosmos"
  });
  
  const accounts = await wallet.getAccounts();
  return {
    mnemonic: wallet.mnemonic,
    address: accounts[0].address,
    wallet, // Return wallet object để sử dụng tiếp
  };
}

export async function importWalletFromMnemonic(mnemonic: string) {
  try {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: BLOCKCHAIN_CONFIG.addressPrefix,
    });
    
    const accounts = await wallet.getAccounts();
    return {
      mnemonic: wallet.mnemonic,
      address: accounts[0].address,
      wallet,
    };
  } catch (error) {
    throw new Error("Invalid mnemonic phrase");
  }
}

export function validateMnemonic(mnemonic: string): boolean {
  // 🆕 Thêm check cho undefined/null
  if (!mnemonic || typeof mnemonic !== 'string') {
    throw new Error('Mnemonic is required and must be a string');
  }

  const trimmedMnemonic = mnemonic.trim();
  
  if (!trimmedMnemonic) {
    throw new Error('Mnemonic cannot be empty');
  }

  const words = trimmedMnemonic.split(/\s+/);
  
  if (words.length !== 12 && words.length !== 24) {
    throw new Error('Mnemonic must be 12 or 24 words');
  }

  return true;
}

// Helper function to format mnemonic for display
export function formatMnemonicForDisplay(mnemonic: string): string[] {
  return mnemonic.trim().split(/\s+/);
}

// Helper function to generate a secure random mnemonic
export async function generateSecureMnemonic(): Promise<string> {
  const wallet = await DirectSecp256k1HdWallet.generate(24, { // 🆕 Thay đổi từ 12 thành 24
    prefix: BLOCKCHAIN_CONFIG.addressPrefix,
  });
  return wallet.mnemonic;
}

// Hàm mã hóa mnemonic với spending password
export function encryptMnemonic(mnemonic: string, password: string): string {
  return CryptoJS.AES.encrypt(mnemonic, password).toString();
}

// Hàm giải mã mnemonic từ spending password
export function decryptMnemonic(encryptedMnemonic: string, password: string): string | null {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedMnemonic, password);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      throw new Error('Decryption failed');
    }
    
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt mnemonic:', error);
    return null;
  }
}

// Hàm tạo wallet và mã hóa ngay
export async function createWalletWithPassword(password: string) {
  const walletData = await createNewWallet();
  const encryptedMnemonic = encryptMnemonic(walletData.mnemonic, password);
  
  return {
    ...walletData,
    encryptedMnemonic,
    // 🆕 Trả về mnemonic để hiển thị cho user backup
    mnemonic: walletData.mnemonic, // ✅ Giữ lại để hiển thị
  };
}

// Hàm import wallet và mã hóa
export async function importWalletWithPassword(mnemonic: string, password: string) {
  const walletData = await importWalletFromMnemonic(mnemonic);
  const encryptedMnemonic = encryptMnemonic(mnemonic, password);
  
  return {
    ...walletData,
    encryptedMnemonic,
    mnemonic: undefined, // Không trả về plain text
  };
}

// Hàm khôi phục wallet từ encrypted mnemonic
export async function restoreWalletFromPassword(encryptedMnemonic: string, password: string) {
  const mnemonic = decryptMnemonic(encryptedMnemonic, password);
  
  if (!mnemonic) {
    throw new Error('Incorrect password or corrupted data');
  }
  
  return await importWalletFromMnemonic(mnemonic);
}