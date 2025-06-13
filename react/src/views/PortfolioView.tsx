/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { useState } from "react";
import IgntAssets from "../components/IgntAssets";
import IgntTransactions from "../components/IgntTransactions";
import IgntTransfer from "../components/IgntTransfer";
import { useClient } from "../hooks/useClient";
import { useAddressContext } from "../def-hooks/addressContext";

interface IdentityData {
  fullName: string;
  dateOfBirth: string;
  nationalId: string;
}

export default function PortfolioView() {
  const [isCreating, setIsCreating] = useState(false);
  const { VietChainIdentity, createSigningClient } = useClient();
  const { address, wallet, connectWallet, isConnected } = useAddressContext();

  const createTestIdentity = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    if (!wallet) {
      alert("Wallet not available");
      return;
    }

    setIsCreating(true);
    try {
      // Create signing client
      await createSigningClient(wallet);

      const identityData: IdentityData = {
        fullName: "Nguyen Van A",
        dateOfBirth: "1990-01-15",
        nationalId: "123456789"
      };

      const result = await VietChainIdentity.tx.sendMsgCreateIdentity({
        value: {
          creator: address,
          fullName: identityData.fullName,
          dateOfBirth: identityData.dateOfBirth,
          nationalId: identityData.nationalId
        },
        fee: { 
          amount: [{ denom: "token", amount: "1000" }], 
          gas: "200000" 
        },
        memo: "Create test identity"
      });

      if (result.code === 0) {
        alert("Identity created successfully!");
        console.log("Transaction result:", result);
      } else {
        alert(`Transaction failed with code: ${result.code}`);
      }
    } catch (error) {
      console.error("Failed to create identity:", error);
      alert("Failed to create identity. Check console for details.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div>
      <div className="container mx-auto">
        {/* Wallet Connection & Test Section */}
        <div className="mb-4 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Identity Test</h3>
          
          {!isConnected ? (
            <button 
              onClick={connectWallet}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Connect Wallet
            </button>
          ) : (
            <div>
              <p className="text-sm text-green-600 mb-2">
                Connected: {address?.slice(0, 20)}...
              </p>
              <button 
                onClick={createTestIdentity}
                disabled={isCreating}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
              >
                {isCreating ? "Creating..." : "Create Test Identity"}
              </button>
              <p className="text-sm text-gray-600 mt-1">
                Will create identity for "Nguyen Van A" with ID "123456789"
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2">
          <div>
            <IgntAssets className="px-2.5 mb-10" displayLimit={3} />
            <IgntTransactions className="px-2.5" />
          </div>
          <IgntTransfer className="px-2.5 w-4/6 mx-auto" />
        </div>
      </div>
    </div>
  );
}
