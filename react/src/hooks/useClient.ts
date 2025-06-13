import { useState, useCallback } from 'react';
import { SigningStargateClient, StargateClient } from '@cosmjs/stargate';
import { DirectSecp256k1HdWallet, OfflineDirectSigner } from '@cosmjs/proto-signing';
import { GasPrice } from '@cosmjs/stargate';
import { BLOCKCHAIN_CONFIG } from '../config/blockchain';
import { customRegistry } from "../types/registry";

export const useClient = () => {
  const [client, setClient] = useState<SigningStargateClient | null>(null);
  const [signer, setSigner] = useState<OfflineDirectSigner | null>(null);
  const [readOnlyClient, setReadOnlyClient] = useState<StargateClient | null>(null);
  const [isConnected, setIsConnected] = useState(false); // 🆕 Add isConnected state

  const connectWithWallet = useCallback(async (wallet: DirectSecp256k1HdWallet) => {
    try {
      console.log("🔌 Connecting with wallet to VietChain...");
      
      const signingClient = await SigningStargateClient.connectWithSigner(
        BLOCKCHAIN_CONFIG.rpcEndpoint,  
        wallet,
        {
          registry: customRegistry,
          gasPrice: GasPrice.fromString(BLOCKCHAIN_CONFIG.gasPrice),
        }
      );

      setClient(signingClient);
      setSigner(wallet);
      setIsConnected(true); // 🆕 Set connected to true
      
      console.log("✅ Connected with wallet to VietChain!");
      
      return signingClient;
    } catch (error: any) {
      console.error("❌ Failed to connect with wallet:", error);
      setClient(null);
      setSigner(null);
      setIsConnected(false); // 🆕 Set connected to false on error
      throw error;
    }
  }, []);

  // VietChain Identity methods
  const VietChainIdentity = {
    tx: {
      sendMsgCreateIdentity: async ({ value, fee, memo }: any) => {
        if (!client) {
          throw new Error('Signing client not available');
        }

        const msg = {
          typeUrl: '/vietchain.identity.MsgCreateIdentity',
          value: {
            creator: value.creator,
            fullName: value.fullName,
            dateOfBirth: value.dateOfBirth,
            nationalId: value.nationalId  // Will be hashed on blockchain
          }
        };

        console.log('📤 Sending identity transaction:', msg);
        
        const result = await client.signAndBroadcast(
          value.creator,
          [msg],
          fee,
          memo || ''
        );

        return result;
      }
    },
    
    query: {
      listIdentity: async () => {
        if (!readOnlyClient) {
          throw new Error('Read-only client not available');
        }
        
        // Query identities using REST API
        try {
          const response = await fetch(`${BLOCKCHAIN_CONFIG.restEndpoint}/vietchain/identity/identity`);
          return await response.json();
        } catch (error) {
          console.error('Failed to query identities:', error);
          throw error;
        }
      }
    }
  };

  const removeSigner = useCallback(() => {
    console.log("🔌 Removing signer...");
    setClient(null);
    setSigner(null);
    setIsConnected(false); // 🆕 Set connected to false when removing
  }, []);

  const connectReadOnly = useCallback(async () => {
    try {
      console.log("🔌 Connecting read-only client...");
      const readClient = await StargateClient.connect(BLOCKCHAIN_CONFIG.rpcEndpoint);
      setReadOnlyClient(readClient);
      console.log("✅ Read-only client connected!");
      return readClient;
    } catch (error: any) {
      console.error("❌ Failed to connect read-only client:", error);
      setReadOnlyClient(null);
      throw error;
    }
  }, []);

  return {
    client,
    signer,
    readOnlyClient,
    isConnected, // 🆕 Return isConnected
    connectWithWallet,
    removeSigner,
    connectReadOnly,
    setClient,
    VietChainIdentity,  // 🆕 Export VietChain methods
    createSigningClient: connectWithWallet  // Alias for compatibility
  };
};