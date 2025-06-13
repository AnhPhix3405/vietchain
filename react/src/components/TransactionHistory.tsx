import { useState, useEffect } from "react";
import { useWalletContext } from "../def-hooks/walletContext";
import { usePhiWallet } from "../hooks/usePhiWallet";
import { IgntCard, IgntButton } from "@ignt/react-library";
import { BLOCKCHAIN_CONFIG } from "../config/blockchain";

interface Transaction {
  hash: string;
  height: number;
  timestamp: string;
  type: "sent" | "received" | "unknown";
  amount: string;
  readableAmount: string;
  denom: string;
  fromAddress: string;
  toAddress: string;
  fee: string;
  memo: string;
  success: boolean;
  explorerUrl: string;
}

export default function TransactionHistory() {
  const { activeWallet } = useWalletContext();
  const phiWallet = usePhiWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(10);

  const loadTransactions = async () => {
    if (!activeWallet?.accounts[0]?.address) return;
    
    setLoading(true);
    setError("");
    
    try {
      const txs = await phiWallet.getTransactionHistory(activeWallet.accounts[0].address, limit);
      const typedTxs = txs.map((tx: any) => ({
        ...tx,
        type: (tx.type === "sent" || tx.type === "received") ? tx.type : "unknown" as const
      }));
      setTransactions(typedTxs);
    } catch (err: any) {
      setError(err.message || "Failed to load transactions");
      console.error("Failed to load transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [activeWallet, limit]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "sent": return "📤";
      case "received": return "📥";
      default: return "🔄";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "sent": return "text-red-600";
      case "received": return "text-green-600";
      default: return "text-gray-600";
    }
  };

  // 🔧 Fix duplicate key issue
  const uniqueTransactions = transactions.reduce((acc, tx) => {
    const key = `${tx.hash}-${tx.timestamp || Date.now()}`;
    if (!acc.some(item => item.hash === tx.hash)) {
      acc.push({ ...tx, uniqueKey: key });
    }
    return acc;
  }, [] as Array<any>);

  if (!activeWallet) {
    return (
      <IgntCard className="p-4">
        <div className="text-center text-gray-500">
          Connect your wallet to view transaction history
        </div>
      </IgntCard>
    );
  }

  return (
    <IgntCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">📜 Transaction History</h3>
        <div className="flex items-center space-x-2">
          <select 
            value={limit} 
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="text-sm border rounded px-2 py-1"
          >
            <option value={5}>Last 5</option>
            <option value={10}>Last 10</option>
            <option value={25}>Last 25</option>
            <option value={50}>Last 50</option>
          </select>
          <IgntButton 
            type="secondary" 
            onClick={loadTransactions} 
            disabled={loading}
            className="text-sm"
          >
            {loading ? "Loading..." : "Refresh"}
          </IgntButton>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
          ❌ {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-pulse text-gray-500">Loading transactions...</div>
        </div>
      ) : uniqueTransactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📭</div>
          <div>No transactions found</div>
          <div className="text-sm mt-1">
            Start by requesting tokens from the faucet or sending some transactions
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {uniqueTransactions.map((tx, index) => (
            <div 
              key={`${tx.hash}-${index}`} 
              className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                !tx.success ? 'border-red-200 bg-red-50' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getTypeIcon(tx.type)}</span>
                  <span className={`font-medium capitalize ${getTypeColor(tx.type)}`}>
                    {tx.type}
                  </span>
                  <span className="text-sm text-gray-500">
                    Block #{tx.height}
                  </span>
                  {!tx.success && (
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
                      Failed
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className={`font-medium ${getTypeColor(tx.type)}`}>
                    {tx.type === "sent" ? "-" : "+"}{tx.readableAmount}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTimestamp(tx.timestamp)}
                  </div>
                </div>
              </div>

              <div className="text-sm space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500 w-16">From:</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1">
                    {tx.fromAddress.slice(0, 12)}...{tx.fromAddress.slice(-8)}
                  </code>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500 w-16">To:</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1">
                    {tx.toAddress.slice(0, 12)}...{tx.toAddress.slice(-8)}
                  </code>
                </div>
                {tx.memo && (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500 w-16">Memo:</span>
                    <span className="text-xs">{tx.memo}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-3 pt-2 border-t">
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>Fee: {tx.fee}</span>
                  <span>Hash: {tx.hash.slice(0, 8)}...</span>
                </div>
                <a 
                  href={tx.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs"
                >
                  View Details →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </IgntCard>
  );
}