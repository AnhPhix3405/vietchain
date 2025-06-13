import React, { createContext, useContext, useState, useReducer, ReactNode } from 'react';

// Types
interface Wallet {  // 🔄 Bỏ "export" ở đây
  id: string;
  name: string;
  mnemonic?: string; // Legacy wallets (optional)
  encryptedMnemonic?: string; // 🆕 New encrypted wallets
  accounts: Array<{ address: string }>;
  isActive: boolean;
  createdAt: string;
  spendingPassword?: string; // Should not be stored, but for type safety
}

// 🆕 Add dispatch actions
type WalletAction = 
  | { type: 'SET_ACTIVE_WALLET'; payload: Wallet | null }
  | { type: 'ADD_WALLET'; payload: Wallet }
  | { type: 'REMOVE_WALLET'; payload: string }
  | { type: 'UPDATE_WALLET'; payload: { id: string; updates: Partial<Wallet> } }
  | { type: 'DISCONNECT_WALLET' }; // 🆕 Add disconnect action

// Reducer function
const walletReducer = (state: { wallets: Wallet[]; activeWallet: Wallet | null }, action: WalletAction) => {
  switch (action.type) {
    case 'SET_ACTIVE_WALLET':
      return { ...state, activeWallet: action.payload };
    case 'ADD_WALLET':
      return { 
        ...state, 
        wallets: [...state.wallets, action.payload],
        activeWallet: state.wallets.length === 0 ? action.payload : state.activeWallet
      };
    case 'REMOVE_WALLET':
      const filteredWallets = state.wallets.filter(w => w.id !== action.payload);
      return {
        ...state,
        wallets: filteredWallets,
        activeWallet: state.activeWallet?.id === action.payload ? null : state.activeWallet
      };
    case 'UPDATE_WALLET':
      return {
        ...state,
        wallets: state.wallets.map(w => 
          w.id === action.payload.id ? { ...w, ...action.payload.updates } : w
        ),
        activeWallet: state.activeWallet?.id === action.payload.id 
          ? { ...state.activeWallet, ...action.payload.updates }
          : state.activeWallet
      };
    // 🆕 Add disconnect case
    case 'DISCONNECT_WALLET':
      return {
        ...state,
        activeWallet: null
      };
    default:
      return state;
  }
};

interface WalletContextType {
  wallets: Wallet[];
  activeWallet: Wallet | null;
  setActiveWallet: (wallet: Wallet | null) => void;
  addWallet: (wallet: Wallet) => void;
  removeWallet: (walletId: string) => void;
  updateWallet: (walletId: string, updates: Partial<Wallet>) => void;
}

// 🆕 Enhanced Dispatch Context Type
interface WalletDispatchContextType {
  dispatch: React.Dispatch<WalletAction>;
  // 🆕 Add convenience methods
  disconnect: () => void;
  signOut: () => void; // Alias for disconnect
  importPhiWallet: (mnemonic: string) => Promise<void>;
  connectWithPhiWallet: (walletData: any) => Promise<void>;
}

// Create Contexts
const WalletContext = createContext<WalletContextType | undefined>(undefined);
const WalletDispatchContext = createContext<WalletDispatchContextType | undefined>(undefined);

// Provider Component
export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(walletReducer, {
    wallets: [],
    activeWallet: null
  });

  // Helper functions
  const setActiveWallet = (wallet: Wallet | null) => {
    dispatch({ type: 'SET_ACTIVE_WALLET', payload: wallet });
    
    if (wallet) {
      localStorage.setItem('activeWallet', JSON.stringify(wallet));
    } else {
      localStorage.removeItem('activeWallet');
    }
  };

  const addWallet = (wallet: Wallet) => {
    dispatch({ type: 'ADD_WALLET', payload: wallet });
    
    // Update localStorage
    const updatedWallets = [...state.wallets, wallet];
    localStorage.setItem('allWallets', JSON.stringify(updatedWallets));
  };

  const removeWallet = (walletId: string) => {
    dispatch({ type: 'REMOVE_WALLET', payload: walletId });
    
    // Update localStorage
    const updatedWallets = state.wallets.filter(w => w.id !== walletId);
    localStorage.setItem('allWallets', JSON.stringify(updatedWallets));
  };

  const updateWallet = (walletId: string, updates: Partial<Wallet>) => {
    dispatch({ type: 'UPDATE_WALLET', payload: { id: walletId, updates } });
    
    // Update localStorage
    const updatedWallets = state.wallets.map(w => 
      w.id === walletId ? { ...w, ...updates } : w
    );
    localStorage.setItem('allWallets', JSON.stringify(updatedWallets));
    
    // Update active wallet in localStorage if it's the one being updated
    if (state.activeWallet?.id === walletId) {
      const updatedActiveWallet = { ...state.activeWallet, ...updates };
      localStorage.setItem('activeWallet', JSON.stringify(updatedActiveWallet));
    }
  };

  // 🆕 Disconnect/SignOut function
  const disconnect = () => {
    dispatch({ type: 'DISCONNECT_WALLET' });
    localStorage.removeItem('activeWallet');
    localStorage.removeItem('allWallets');
    console.log('✅ Wallet disconnected');
  };

  // 🆕 SignOut alias
  const signOut = disconnect;

  // 🆕 Import wallet function
  const importPhiWallet = async (mnemonic: string) => {
    try {
      // Import wallet logic here
      // This should be implemented based on your usePhiWallet hook
      console.log('Importing wallet with mnemonic...');
      
      // For now, create a mock wallet
      const importedWallet: Wallet = {
        id: Date.now().toString(),
        name: `Imported Wallet ${new Date().toLocaleDateString()}`,
        mnemonic: mnemonic,
        accounts: [{ address: 'imported-address-placeholder' }],
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      
      addWallet(importedWallet);
      setActiveWallet(importedWallet);
      
    } catch (error) {
      console.error('Failed to import wallet:', error);
      throw error;
    }
  };

  // 🆕 Connect with phi wallet function
  const connectWithPhiWallet = async (walletData: any) => {
    try {
      const newWallet: Wallet = {
        id: Date.now().toString(),
        name: walletData.name || 'Phi Wallet',
        mnemonic: walletData.mnemonic,
        spendingPassword: walletData.spendingPassword,
        accounts: [{ address: walletData.address }],
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      
      addWallet(newWallet);
      setActiveWallet(newWallet);
      
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  };

  // Load from localStorage on mount
  React.useEffect(() => {
    try {
      const savedActiveWallet = localStorage.getItem('activeWallet');
      if (savedActiveWallet) {
        const wallet = JSON.parse(savedActiveWallet);
        dispatch({ type: 'SET_ACTIVE_WALLET', payload: wallet });
      }

      const savedWallets = localStorage.getItem('allWallets');
      if (savedWallets) {
        const allWallets = JSON.parse(savedWallets);
        allWallets.forEach((wallet: Wallet) => {
          dispatch({ type: 'ADD_WALLET', payload: wallet });
        });
      }
    } catch (error) {
      console.error('Failed to load wallets from localStorage:', error);
    }
  }, []);

  const contextValue: WalletContextType = {
    wallets: state.wallets,
    activeWallet: state.activeWallet,
    setActiveWallet,
    addWallet,
    removeWallet,
    updateWallet,
  };

  const dispatchContextValue: WalletDispatchContextType = {
    dispatch,
    disconnect, // 🆕 Add disconnect
    signOut,    // 🆕 Add signOut alias
    importPhiWallet, // 🆕 Add import function
    connectWithPhiWallet, // 🆕 Add connect function
  };

  return (
    <WalletContext.Provider value={contextValue}>
      <WalletDispatchContext.Provider value={dispatchContextValue}>
        {children}
      </WalletDispatchContext.Provider>
    </WalletContext.Provider>
  );
};

// Hooks
export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
};

export const useDispatchWalletContext = () => {
  const context = useContext(WalletDispatchContext);
  if (!context) {
    throw new Error('useDispatchWalletContext must be used within a WalletProvider');
  }
  return context;
};

// 🆕 Chỉ export type một lần duy nhất ở cuối file
export type { 
  WalletContextType, 
  WalletAction,
  WalletDispatchContextType 
};

// 🆕 Export Wallet interface ở đây
export type { Wallet };

// Default export
export default WalletProvider;