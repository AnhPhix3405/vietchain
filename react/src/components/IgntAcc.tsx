/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import { useEffect, useState } from "react";
import useKeplr from "../def-hooks/useKeplr";
import { useDispatchWalletContext, useWalletContext } from "../def-hooks/walletContext";
import { useClient } from "../hooks/useClient";

import useCosmosBaseTendermintV1Beta1 from "../hooks/useCosmosBaseTendermintV1Beta1";
import { Wallet } from "../utils/interfaces";
import {
  IgntProfileIcon,
  IgntWarningIcon,
  IgntKeplrIcon,
  IgntButton,
  IgntModal,
  IgntExternalArrowIcon,
  IgntSpinner,
} from "@ignt/react-library";
import IgntAccDropdown from "./IgntAccDropdown";
import PhiWalletConnect from "./PhiWalletConnect";
export interface State {
  modalPage: string;
  connectWalletModal: boolean;
  accountDropdown: boolean;
  keplrParams: { name: string; bech32Address: string };
}

export default function IgntAcc() {
  const { connectToKeplr, isKeplrAvailable, getKeplrAccParams } = useKeplr();

  const client = useClient();
  const walletStore = useWalletContext();
  const walletActions = useDispatchWalletContext();
  // methods
  const wallet = walletStore.activeWallet;
  const query = useCosmosBaseTendermintV1Beta1();
  const nodeInfo = query.ServiceGetNodeInfo({});
  const chainId = nodeInfo.data?.default_node_info?.network ?? "";

  const initialState: State = {
    modalPage: "connect",
    connectWalletModal: false,
    accountDropdown: false,
    keplrParams: { name: "", bech32Address: "" },
  };

  const [state, setState] = useState(initialState);
  useEffect(() => {
    const getKeplrData = async () => {
      const { name, bech32Address } = await getKeplrAccParams(chainId);
      const keplrParams = { name, bech32Address };

      setState((oldState) => ({ ...oldState, keplrParams }));
    };
    if (chainId != "") {
      getKeplrData().catch(console.error);
    }
  }, [chainId]);
  const tryToConnectToKeplr = (): void => {
    setState((oldState) => ({ ...oldState, modalPage: "connect" }));

    const onKeplrConnect = (): void => {
      setState((oldState) => ({ ...oldState, connectWalletModal: false, modalPage: "connect" }));
    };

    const onKeplrError = (): void => {
      setState((oldState) => ({ ...oldState, modalPage: "error" }));
    };

    connectToKeplr(onKeplrConnect, onKeplrError);
  };

  const getAccName = (): string => {
    if (client.signer) {
      return state.keplrParams.name;
    } else {
      return "";
    }
  };
  const disconnect = (): void => {
    setState((oldState) => ({ ...oldState, accountDropdown: false }));
    walletActions.signOut();
  };

  return (
    <div className="sp-acc">
      {wallet ? (
        // Existing wallet display logic
        <div
          onClick={() => {
            setState((oldState) => ({
              ...oldState,
              accountDropdown: !oldState.accountDropdown,
            }));
          }}
          className="sp-acc-wallet"
        >
          <IgntProfileIcon address={""} />
          <span>{getAccName()}</span>
        </div>
      ) : (
        // 🆕 NEW: Phi Wallet as primary option
        <div className="wallet-connection-options">
          <PhiWalletConnect />
          
          {/* 🔄 UPDATED: Keplr as secondary/legacy option */}
          <div className="mt-3">
            <details className="group">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 list-none">
                <span className="flex items-center justify-center">
                  <span>Other wallet options</span>
                  <svg 
                    className="w-4 h-4 ml-1 group-open:rotate-180 transition-transform" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              
              <div className="mt-2 pt-2 border-t border-gray-200">
                <IgntButton
                  aria-label="Connect Keplr wallet"
                  type="secondary"
                  onClick={() => {
                    setState((oldState) => ({ ...oldState, connectWalletModal: true }));
                  }}
                  className="w-full"
                >
                  Connect Keplr (Legacy)
                </IgntButton>
                <p className="text-xs text-gray-400 mt-1 text-center">
                  ⚠️ Limited support for Test Chain
                </p>
              </div>
            </details>
          </div>
        </div>
      )}
      {/* Existing account dropdown */}
      {state.accountDropdown && wallet && (
        <IgntAccDropdown
          wallet={wallet as Wallet}
          accName={getAccName()}
          disconnect={disconnect}
          close={() => {
            setState((oldState) => ({ ...oldState, accountDropdown: false }));
          }}
        />
      )}
      {/* 🔄 UPDATED: Legacy Keplr modal with warning */}
      <IgntModal
        visible={state.connectWalletModal}
        closeIcon={false}
        cancelButton={false}
        submitButton={false}
        className="text-center"
        close={() => {
          setState((oldState) => ({ ...oldState, connectWalletModal: false }));
        }}
        submit={() => {}}
        header={
          state.modalPage === "connect" ? (
            <div className="sp-modal-header">
              <div className="sp-logo">
                <IgntKeplrIcon />
              </div>
            </div>
          ) : state.modalPage === "connecting" ? (
            <div className="sp-modal-header">
              <IgntSpinner size={32} />
            </div>
          ) : (
            state.modalPage === "error" && (
              <div className="sp-modal-header">
                <IgntWarningIcon />
              </div>
            )
          )
        }
body={
          state.modalPage === "connect" ? (
            <div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Legacy Wallet Warning</h3>
                <p className="text-sm text-yellow-700">
                  Keplr has limited support for Test Chain. We recommend using Phi Wallet for the best experience.
                </p>
              </div>
              <h1>Connect your wallet</h1>
              <p>Start exploring blockchain apps in seconds.</p>
            </div>
          ) : (
            state.modalPage === "error" && (
              <div>
                <h1>Wallet connection failed</h1>
                <p>Please check if Keplr extension is installed and try again.</p>
                <div className="mt-4">
                  <IgntButton
                    type="primary"
                    onClick={() => setState(prev => ({ ...prev, connectWalletModal: false }))}
                  >
                    Use Phi Wallet Instead
                  </IgntButton>
                </div>
              </div>
            )
          )
        }
        footer={
          state.modalPage === "connect" ? (
            <IgntButton onClick={tryToConnectToKeplr}>
              <IgntExternalArrowIcon />
              Connect Keplr
            </IgntButton>
          ) : (
            state.modalPage === "error" && (
              <IgntButton onClick={tryToConnectToKeplr}>
                <IgntExternalArrowIcon />
                Try again
              </IgntButton>
            )
          )
        }
      />
    </div>
  );
}
