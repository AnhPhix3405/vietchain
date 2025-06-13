import { useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';

interface WalletData {
  address: string;
  mnemonic: string;
  encrypted?: boolean;
}

export const useWalletSecurity = () => {
  const [isLocked, setIsLocked] = useState(true);
  const [hasPassword, setHasPassword] = useState(false);

  useEffect(() => {
    // Check if wallet has password protection
    const encrypted = localStorage.getItem('phi_wallet_encrypted');
    setHasPassword(!!encrypted);
    setIsLocked(!!encrypted);
  }, []);

  const encryptWallet = (walletData: WalletData, password: string): string => {
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(walletData), 
      password
    ).toString();
    
    localStorage.setItem('phi_wallet_encrypted', encrypted);
    localStorage.removeItem('phi_wallet_plain'); // Remove unencrypted version
    setHasPassword(true);
    setIsLocked(false);
    
    return encrypted;
  };

  const decryptWallet = (password: string): WalletData | null => {
    try {
      const encrypted = localStorage.getItem('phi_wallet_encrypted');
      if (!encrypted) return null;

      const decrypted = CryptoJS.AES.decrypt(encrypted, password);
      const walletData = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
      
      setIsLocked(false);
      return walletData;
    } catch (error) {
      console.error('Failed to decrypt wallet:', error);
      return null;
    }
  };

  const lockWallet = () => {
    setIsLocked(true);
  };

  const unlockWallet = (password: string): boolean => {
    const walletData = decryptWallet(password);
    if (walletData) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const removePassword = (currentPassword: string): boolean => {
    const walletData = decryptWallet(currentPassword);
    if (walletData) {
      localStorage.setItem('phi_wallet_plain', JSON.stringify(walletData));
      localStorage.removeItem('phi_wallet_encrypted');
      setHasPassword(false);
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const changePassword = (oldPassword: string, newPassword: string): boolean => {
    const walletData = decryptWallet(oldPassword);
    if (walletData) {
      encryptWallet(walletData, newPassword);
      return true;
    }
    return false;
  };

  return {
    isLocked,
    hasPassword,
    encryptWallet,
    decryptWallet,
    lockWallet,
    unlockWallet,
    removePassword,
    changePassword,
  };
};