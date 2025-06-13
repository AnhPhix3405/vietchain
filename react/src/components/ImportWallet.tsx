import React, { useState } from 'react';
import { usePhiWallet } from '../hooks/usePhiWallet';
import { useWalletContext } from '../def-hooks/walletContext';
import { validateMnemonic, formatMnemonicForDisplay, importWalletWithPassword } from '../wallet';
import '../styles/wallet.css'
import { BLOCKCHAIN_CONFIG } from '../config/blockchain';

interface ImportWalletProps {
  onClose: () => void;
  onWalletImported?: (address: string) => void;
}

const ImportWallet: React.FC<ImportWalletProps> = ({ onClose, onWalletImported }) => {
  const [step, setStep] = useState<'import' | 'setup' | 'importing' | 'success'>('import');
  const [mnemonic, setMnemonic] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 🆕 Add wallet setup fields
  const [walletName, setWalletName] = useState('');
  const [spendingPassword, setSpendingPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const phiWallet = usePhiWallet();
  const { setActiveWallet } = useWalletContext();

  // 🔧 Handle keyboard events properly
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // 🔧 Handle overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle paste from clipboard
  const handlePasteMnemonic = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setMnemonic(text.trim());
      setError(null);
    } catch (err) {
      console.warn('Could not read from clipboard');
    }
  };

  // Validate and proceed to setup step
  const handleValidateMnemonic = () => {
    setError(null);
    
    const trimmedMnemonic = mnemonic.trim();
    
    if (!trimmedMnemonic) {
      setError('Please enter your recovery phrase');
      return;
    }

    if (!validateMnemonic(trimmedMnemonic)) {
      setError('Invalid recovery phrase. Must be 12 or 24 words.');
      return;
    }

    // Pre-validate the mnemonic by trying to create wallet
    setIsLoading(true);
    
    // 🔄 Fix: walletData là string address, không phải object
    phiWallet.importWallet(trimmedMnemonic)
      .then((address) => { // 🆕 Đổi walletData thành address
        setAddress(address); // 🆕 Sử dụng trực tiếp address
        setStep('setup');
      })
      .catch((err) => {
        setError(err.message || 'Invalid recovery phrase');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Final import with wallet setup
  const handleFinalImport = async () => {
    setError(null);

    // Validate inputs
    if (!walletName.trim()) {
      setError('Wallet name is required');
      return;
    }

    if (!spendingPassword) {
      setError('Spending password is required');
      return;
    }

    if (spendingPassword.length < 6) {
      setError('Spending password must be at least 6 characters');
      return;
    }

    if (spendingPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setStep('importing');

    try {
      // Import và mã hóa wallet
      const walletData = await importWalletWithPassword(mnemonic.trim(), spendingPassword);
      
      // Lưu wallet với encrypted mnemonic
      const newWallet = {
        id: Date.now().toString(),
        name: walletName.trim(),
        encryptedMnemonic: walletData.encryptedMnemonic,
        spendingPassword: undefined, // KHÔNG lưu password
        accounts: [{ address: walletData.address }],
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      setActiveWallet(newWallet);
      setStep('success');
      onWalletImported?.(walletData.address);

    } catch (err: any) {
      setError(err.message || 'Failed to import wallet');
      setStep('setup');
    } finally {
      setIsLoading(false);
    }
  };

  const mnemonicWords = mnemonic ? formatMnemonicForDisplay(mnemonic.trim()) : [];
  const isValidMnemonicLength = mnemonicWords.length === 12 || mnemonicWords.length === 24;

  return (
    <div className="import-wallet-modal">
      {/* Modal overlay with proper event handling */}
      <div 
        className="modal-overlay" 
        onClick={handleOverlayClick}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        aria-hidden="true"
      >
    <div
    className="modal-content"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabIndex={-1}
    >


          {step === 'import' && (
            <div className="import-step">
              <h2 id="modal-title">📥 Import Existing Wallet</h2>
              
              <form onSubmit={(e) => { e.preventDefault(); handleValidateMnemonic(); }}>
                <div className="form-group">
                  <label htmlFor="mnemonic">
                    Recovery Phrase: <span className="required">*</span>
                  </label>
                  <div className="mnemonic-input-container">
                    <textarea
                      id="mnemonic"
                      value={mnemonic}
                      onChange={(e) => {
                        setMnemonic(e.target.value);
                        setError(null);
                      }}
                      placeholder="Enter your 12 or 24 word recovery phrase..."
                      rows={4}
                      required
                      className="mnemonic-textarea"
                    />
                    <button
                      type="button"
                      onClick={handlePasteMnemonic}
                      className="paste-button"
                      aria-label="Paste from clipboard"
                    >
                      📋 Paste
                    </button>
                  </div>
                  <small className="help-text">
                    Separate each word with a space
                  </small>
                  
                  {/* 🆕 Show word count and validation */}
                  {mnemonic.trim() && (
                    <div className="mnemonic-validation">
                      <span className={`word-count ${isValidMnemonicLength ? 'valid' : 'invalid'}`}>
                        {mnemonicWords.length} words
                        {isValidMnemonicLength ? ' ✅' : ' ❌ (must be 12 or 24 words)'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Security Notice */}
                <div className="security-warning">
                  <h3>🔒 Security Notice:</h3>
                  <ul>
                    <li>✅ Your phrase is processed locally and never sent to servers</li>
                    <li>⚠️ Make sure you're on the correct website</li>
                    <li>🚫 Never share your recovery phrase with anyone</li>
                    <li>💡 Double-check each word is spelled correctly</li>
                  </ul>
                </div>

                {error && (
                  <div className="error-message">❌ {error}</div>
                )}

                <div className="button-group">
                  <button
                    type="submit"
                    disabled={isLoading || !mnemonic.trim() || !isValidMnemonicLength}
                    className="primary-button"
                  >
                    {isLoading ? '🔄 Validating...' : '✅ Validate Phrase'}
                  </button>
                  <button type="button" onClick={onClose} className="secondary-button">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 'setup' && (
            <div className="setup-step">
              <h2 id="modal-title">⚙️ Set Up Imported Wallet</h2>
              
              {/* Show recovered wallet info */}
              <div className="wallet-preview">
                <h3>✅ Recovery Phrase Validated</h3>
                <div className="wallet-summary">
                  <p><strong>Address:</strong> {address.slice(0, 20)}...{address.slice(-8)}</p>
                  <p><strong>Words:</strong> {mnemonicWords.length} word recovery phrase</p>
                </div>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); handleFinalImport(); }}>
                {/* Wallet Name */}
                <div className="form-group">
                  <label htmlFor="walletName">
                    Wallet Name: <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="walletName"
                    value={walletName}
                    onChange={(e) => {
                      setWalletName(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter wallet name (e.g., My Imported Wallet)"
                    required
                  />
                </div>

                {/* Spending Password */}
                <div className="form-group">
                  <label htmlFor="spendingPassword">
                    Spending Password: <span className="required">*</span>
                  </label>
                  <div className="password-input-container">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="spendingPassword"
                      value={spendingPassword}
                      onChange={(e) => {
                        setSpendingPassword(e.target.value);
                        setError(null);
                      }}
                      placeholder="Enter spending password (min 6 characters)"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <small className="help-text">
                    This password will be required for all transactions
                  </small>
                </div>

                {/* Confirm Password */}
                <div className="form-group">
                  <label htmlFor="confirmPassword">
                    Confirm Spending Password: <span className="required">*</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="Confirm your spending password"
                    required
                    minLength={6}
                  />
                </div>

                {error && (
                  <div className="error-message">❌ {error}</div>
                )}

                <div className="button-group">
                  <button
                    type="submit"
                    disabled={isLoading || !walletName.trim() || !spendingPassword || !confirmPassword}
                    className="primary-button"
                  >
                    {isLoading ? '🔄 Importing...' : '📥 Import Wallet'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setStep('import')} 
                    className="secondary-button"
                  >
                    Back
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 'importing' && (
            <div className="loading-step">
              <div className="loading-spinner">⏳</div>
              <h2 id="modal-title">📥 Importing Wallet...</h2>
              <p>Connecting to Test Chain and setting up your wallet...</p>
              <div className="loading-progress">
                <div className="progress-bar"></div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="success-step">
              <h2 id="modal-title">🎉 Wallet Imported Successfully!</h2>
              
              <div className="wallet-info">
                <p><strong>Wallet Name:</strong> {walletName}</p>
                <p><strong>Address:</strong></p>
                <div className="address-display">{address}</div>
                <p><strong>🔐 Security:</strong> ✅ Encrypted with spending password</p>
                <p><strong>🌐 Network:</strong> {BLOCKCHAIN_CONFIG.chainName}</p>
              </div>

              <div className="success-message">
                <p>✅ Your wallet has been imported and encrypted.</p>
                <p>🔐 Spending password is required for all transactions.</p>
                <p>💰 You can now send and receive tokens securely!</p>
                <p>📊 Transaction history will load automatically.</p>
              </div>

              <button onClick={onClose} className="primary-button">
                🚀 Start Using Wallet
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportWallet;