import { useState } from "react";
import { useDispatchWalletContext, useWalletContext } from "../def-hooks/walletContext";
import { usePhiWallet } from "../hooks/usePhiWallet";
import { BLOCKCHAIN_CONFIG } from "../config/blockchain";
import {
  IgntButton,
  IgntModal,
  IgntSpinner,
} from "@ignt/react-library";

// 🆕 Import both components
import CreateWallet from "./CreateWallet";
import ImportWallet from "./ImportWallet";

interface State {
  modalPage: "connect" | "success" | "error";
  showModal: boolean;
  errorMessage: string;
  // 🆕 Add flags for both components
  showCreateWallet: boolean;
  showImportWallet: boolean;
}

export default function PhiWalletConnect() {
  const walletStore = useWalletContext();
  const walletActions = useDispatchWalletContext();
  const phiWallet = usePhiWallet();

  const [state, setState] = useState<State>({
    modalPage: "connect",
    showModal: false,
    errorMessage: "",
    showCreateWallet: false,
    showImportWallet: false, // 🆕 Add this
  });

  // 🆕 Handle showing CreateWallet component
  const handleShowCreateWallet = () => {
    setState(prev => ({ 
      ...prev, 
      showModal: false,
      showCreateWallet: true
    }));
  };

  // 🆕 Handle showing ImportWallet component
  const handleShowImportWallet = () => {
    setState(prev => ({ 
      ...prev, 
      showModal: false,
      showImportWallet: true
    }));
  };

  // 🆕 Handle wallet creation success
  const handleWalletCreated = (address: string) => {
    console.log('✅ Wallet created with address:', address);
    setState(prev => ({ 
      ...prev, 
      showCreateWallet: false
    }));
  };

  // 🆕 Handle wallet import success
  const handleWalletImported = (address: string) => {
    console.log('✅ Wallet imported with address:', address);
    setState(prev => ({ 
      ...prev, 
      showImportWallet: false
    }));
  };

  // 🆕 Handle CreateWallet close
  const handleCloseCreateWallet = () => {
    setState(prev => ({ 
      ...prev, 
      showCreateWallet: false,
      showModal: true,
      modalPage: "connect"
    }));
  };

  // 🆕 Handle ImportWallet close
  const handleCloseImportWallet = () => {
    setState(prev => ({ 
      ...prev, 
      showImportWallet: false,
      showModal: true,
      modalPage: "connect"
    }));
  };

  const renderModalContent = () => {
    switch (state.modalPage) {
      case "connect":
        return (
          <div className="text-center p-6">
            <div className="mb-4">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                Φ
              </div>
              <h2 className="text-2xl font-bold mb-2">Connect to {BLOCKCHAIN_CONFIG.chainName}</h2>
              <p className="text-gray-600 mb-6">
                Create a new wallet or import an existing one to get started with Test Chain.
              </p>
            </div>
            <div className="space-y-3">
              <IgntButton
                type="primary"
                onClick={handleShowCreateWallet}
                className="w-full"
              >
                🆕 Create New Wallet
              </IgntButton>
              <IgntButton
                type="secondary"
                onClick={handleShowImportWallet} // 🆕 Use new handler
                className="w-full"
              >
                📥 Import Existing Wallet
              </IgntButton>
            </div>
          </div>
        );

      case "error":
        return (
          <div className="text-center p-6">
            <div className="text-red-500 text-4xl mb-4">❌</div>
            <h2 className="text-2xl font-bold mb-4 text-red-600">Connection Failed</h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700">{state.errorMessage}</p>
            </div>
            <div className="space-y-2">
              <IgntButton
                type="primary"
                onClick={() => setState(prev => ({ 
                  ...prev, 
                  modalPage: "connect",
                  errorMessage: ""
                }))}
                className="w-full"
              >
                Try Again
              </IgntButton>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const wallet = walletStore.activeWallet;

  return (
    <div className="phi-wallet_connect">
      {!wallet ? (
        <IgntButton
          type="primary"
          onClick={() => setState(prev => ({ 
            ...prev, 
            showModal: true, 
            modalPage: "connect" 
          }))}
        >
          Connect Phi Wallet
        </IgntButton>
      ) : (
        <div className="wallet-info bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                Φ
              </div>
              <div>
                <div className="font-medium text-gray-900">{wallet.name || 'Phi Wallet'}</div>
                <div className="text-sm text-gray-500">
                  {wallet.accounts[0]?.address.slice(0, 12)}...
                  {wallet.accounts[0]?.address.slice(-8)}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <div className="text-xs text-gray-500">Test Chain</div>
                <div className="text-sm font-medium text-green-600">Connected</div>
              </div>
              <IgntButton
                type="secondary"
                size="small"
                onClick={() => {
                  setState(prev => ({ ...prev, showModal: false }));
                  // Add disconnect logic here
                }}
              >
                Disconnect
              </IgntButton>
            </div>
          </div>
        </div>
      )}

      {/* Main modal - simplified for just connect screen */}
      <IgntModal
        visible={state.showModal}
        closeIcon={true}
        cancelButton={false}
        submitButton={false}
        className="phi-wallet-modal"
        close={() => setState(prev => ({ 
          ...prev, 
          showModal: false, 
          modalPage: "connect",
          errorMessage: ""
        }))}
        submit={() => null}
        header=""
        body={renderModalContent()}
        footer=""
      />

      {/* 🆕 CreateWallet Component */}
      {state.showCreateWallet && (
        <CreateWallet
          onClose={handleCloseCreateWallet}
          onWalletCreated={handleWalletCreated}
        />
      )}

      {/* 🆕 ImportWallet Component */}
      {state.showImportWallet && (
        <ImportWallet
          onClose={handleCloseImportWallet}
          onWalletImported={handleWalletImported}
        />
      )}
    </div>
  );
}