import React, { useState } from 'react';
import { usePhiWallet } from '../hooks/usePhiWallet';

interface TransactionData {
  recipient: string;
  amount: string;
  memo?: string;
  fee?: string;
}

interface TransactionSigningProps {
  transaction: TransactionData;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  fromAddress?: string; // Add this prop
}

export const TransactionSigning: React.FC<TransactionSigningProps> = ({
  transaction,
  onConfirm,
  onCancel,
  isLoading = false,
  fromAddress
}) => {
  const { config } = usePhiWallet();
  const [showDetails, setShowDetails] = useState(false);

  const formatAmount = (amount: string) => {
    const numAmount = parseFloat(amount);
    return `${numAmount.toFixed(6)} ${config.currency.coinDenom}`;
  };

  const estimatedFee = "0.005000"; // This would be calculated based on gas

  return (
    <div className="transaction-signing-modal">
      <div 
        className="modal-overlay" 
        onClick={onCancel}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onCancel();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />
      <div className="modal-content">
        <h3>✍️ Sign Transaction</h3>
        
        <div className="transaction-summary">
          {fromAddress && (
            <div className="summary-item">
              <span className="label">From:</span>
              <span className="value address">{fromAddress}</span>
            </div>
          )}
          
          <div className="summary-item">
            <span className="label">To:</span>
            <span className="value address">{transaction.recipient}</span>
          </div>
          
          <div className="summary-item">
            <span className="label">Amount:</span>
            <span className="value amount">{formatAmount(transaction.amount)}</span>
          </div>
          
          {transaction.memo && (
            <div className="summary-item">
              <span className="label">Memo:</span>
              <span className="value memo">{transaction.memo}</span>
            </div>
          )}
          
          <div className="summary-item fee-item">
            <span className="label">Estimated Fee:</span>
            <span className="value fee">{formatAmount(estimatedFee)}</span>
          </div>
          
          <div className="summary-item total-item">
            <span className="label">Total Amount:</span>
            <span className="value total">
              {formatAmount((parseFloat(transaction.amount) + parseFloat(estimatedFee)).toString())}
            </span>
          </div>
        </div>

        <button 
          className="details-toggle"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? '▼' : '▶'} Transaction Details
        </button>

        {showDetails && (
          <div className="transaction-details">
            <pre>
{JSON.stringify({
  type: "cosmos-sdk/MsgSend",
  value: {
    from_address: fromAddress || "cosmos1...",
    to_address: transaction.recipient,
    amount: [{
      denom: config.currency.coinMinimalDenom,
      amount: (parseFloat(transaction.amount) * Math.pow(10, config.currency.coinDecimals)).toString()
    }]
  },
  fee: {
    amount: [{
      denom: config.currency.coinMinimalDenom,
      amount: (parseFloat(estimatedFee) * Math.pow(10, config.currency.coinDecimals)).toString()
    }],
    gas: "200000"
  }
}, null, 2)}
            </pre>
          </div>
        )}

        <div className="modal-actions">
          <button 
            className="cancel-button"
            onClick={onCancel}
            disabled={isLoading}
          >
            ❌ Cancel
          </button>
          
          <button 
            className="confirm-button"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? '🔄 Signing...' : '✍️ Sign & Send'}
          </button>
        </div>
      </div>
    </div>
  );
};