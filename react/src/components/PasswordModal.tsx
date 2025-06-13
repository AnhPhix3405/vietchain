import React, { useState } from 'react';
import '../styles/PasswordModal.css';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  title?: string;
  isLoading?: boolean;
  error?: string;
}

export function PasswordModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Enter Spending Password",
  isLoading = false,
  error 
}: PasswordModalProps) {
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onConfirm(password);
    }
  };

  return (
    <div className="password-modal-overlay">
      <div className="password-modal">
        <h3>{title}</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your spending password"
            disabled={isLoading}
            autoFocus
          />
          {error && <div className="error-message">{error}</div>}
          <div className="password-modal-buttons">
            <button 
              type="button" 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isLoading || !password.trim()}
            >
              {isLoading ? 'Unlocking...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}