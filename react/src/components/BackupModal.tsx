import React, { useState } from 'react';
import '../styles/BackupModal.css'; // Ensure you have styles for the modal
interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletName: string;
  address: string;
  mnemonic: string;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  walletName,
  address,
  mnemonic
}) => {
  const [confirmationWords, setConfirmationWords] = useState<{[key: number]: string}>({});
  const [step, setStep] = useState<'display' | 'confirm'>('display');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const mnemonicWords = mnemonic.split(' ');
  const randomIndexes = [2, 6, 10]; // Words 3, 7, 11 (0-indexed)

  const handleConfirmWords = () => {
    setError(null);
    
    for (const index of randomIndexes) {
      const userWord = confirmationWords[index]?.trim().toLowerCase();
      const correctWord = mnemonicWords[index]?.toLowerCase();
      
      if (userWord !== correctWord) {
        setError(`Word ${index + 1} is incorrect. Please check and try again.`);
        return;
      }
    }
    
    // All words correct
    alert('✅ Recovery phrase confirmed successfully!');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔑 Backup Your Recovery Phrase</h2>
          <button onClick={onClose} className="close-button">✕</button>
        </div>

        <div className="wallet-info">
          <p><strong>Wallet Name:</strong> {walletName}</p>
          <p><strong>Address:</strong> {address.slice(0, 12)}...{address.slice(-12)}</p>
        </div>

        {step === 'display' && (
          <div className="backup-step">
            <div className="warning-box">
              <h3>Your 12-word Recovery Phrase:</h3>
              <p>⚠️ <strong>Write this down and store it safely!</strong> You'll need it to recover your wallet.</p>
            </div>

            <div className="mnemonic-grid">
              {mnemonicWords.map((word, index) => (
                <div key={index} className="mnemonic-word">
                  <span className="word-number">{index + 1}.</span>
                  <span className="word-text">{word}</span>
                </div>
              ))}
            </div>

            <div className="backup-actions">
              <button onClick={() => setStep('confirm')} className="primary-button">
                📝 I've Written It Down
              </button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="confirmation-step">
            <h3>Confirm your recovery phrase</h3>
            <p>Please enter the following words to confirm you've saved them:</p>

            {randomIndexes.map((index) => (
              <div key={index} className="confirmation-input">
                <label>Word #{index + 1}:</label>
                <input
                  type="text"
                  placeholder={`Enter word ${index + 1}`}
                  value={confirmationWords[index] || ''}
                  onChange={(e) => setConfirmationWords({
                    ...confirmationWords,
                    [index]: e.target.value
                  })}
                />
              </div>
            ))}

            {error && (
              <div className="error-message">❌ {error}</div>
            )}

            <div className="confirmation-actions">
              <button onClick={() => setStep('display')} className="secondary-button">
                ← Back
              </button>
              <button onClick={handleConfirmWords} className="primary-button">
                ✅ Confirm
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};