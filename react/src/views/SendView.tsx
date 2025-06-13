import { useWalletContext } from "../def-hooks/walletContext";
import { IgntCard } from "@ignt/react-library";
import SendTokens from "../components/SendTokens";

export default function SendView() {
  const { activeWallet } = useWalletContext();

  if (!activeWallet) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">No Wallet Connected</h1>
          <p className="text-gray-600 mb-8">Please connect your Phi Wallet to send tokens.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Send Tokens</h1>
        
        <IgntCard>
          <div className="p-6">
            <SendTokens
              currentAddress={activeWallet.accounts[0]?.address}
              onTransactionComplete={(txHash) => {
                console.log("Transaction completed:", txHash);
                alert(`Transaction sent! Hash: ${txHash}`);
              }}
            />
          </div>
        </IgntCard>
      </div>
    </div>
  );
}