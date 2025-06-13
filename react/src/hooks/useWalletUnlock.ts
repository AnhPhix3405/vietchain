import { useState } from 'react';
import { restoreWalletFromPassword } from '../wallet';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';

export function useWalletUnlock() {
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockedWallet, setUnlockedWallet] = useState<DirectSecp256k1HdWallet | null>(null);

  const unlockWallet = async (encryptedMnemonic: string, password: string) => {
    setIsUnlocking(true);
    
    try {
      const walletData = await restoreWalletFromPassword(encryptedMnemonic, password);
      setUnlockedWallet(walletData.wallet);
      return walletData.wallet;
    } catch (error) {
      throw new Error('Incorrect spending password');
    } finally {
      setIsUnlocking(false);
    }
  };

  const lockWallet = () => {
    setUnlockedWallet(null);
  };

  return {
    unlockWallet,
    lockWallet,
    unlockedWallet,
    isUnlocking,
  };
}