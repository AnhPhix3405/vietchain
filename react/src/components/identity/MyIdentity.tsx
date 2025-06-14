import React, { useState, useEffect } from 'react';
import { useWalletContext } from '../../def-hooks/walletContext';
import { usePhiWallet } from '../../hooks/usePhiWallet';

interface MyIdentityProps {
  onRefresh?: () => void;
}

export default function MyIdentity({ onRefresh }: MyIdentityProps) {
  const { activeWallet } = useWalletContext();
  const phiWallet = usePhiWallet();
  
  const [identity, setIdentity] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🆕 Use the provided getAllIdentities function
  async function getAllIdentities(limit?: number, offset?: number): Promise<any[]> {
    let url = "http://localhost:1317/VietChain/identity/identity";
    const params: string[] = [];
    if (limit !== undefined) params.push(`pagination.limit=${limit}`);
    if (offset !== undefined) params.push(`pagination.offset=${offset}`);
    if (params.length > 0) url += "?" + params.join("&");

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch identities: ${response.statusText}`);
    }
    const data = await response.json();
    return data.identity || [];
  }

  // 🔧 Simplified fetchIdentity using only getAllIdentities
  const fetchIdentity = async () => {
    if (!activeWallet?.accounts?.[0]?.address) {
      console.log("❌ No active wallet address");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const address = activeWallet.accounts[0].address;
      console.log("🔍 Fetching identity for address:", address);

      // Get all identities and filter by creator address
      const allIdentities = await getAllIdentities();
      console.log("📋 All identities:", allIdentities);
      
      // Find identity for this creator
      const userIdentity = allIdentities.find((id: any) => id.creator === address);
      
      if (userIdentity) {
        console.log("✅ Found user identity:", userIdentity);
        setIdentity({
          ...userIdentity,
          address: address,
          createdAt: userIdentity.createdAt || userIdentity.dateOfBirth || new Date().toISOString(),
          name: userIdentity.fullName,
          verifications: [],
        });
      } else {
        console.log("ℹ️ No identity found for this address");
        setIdentity(null);
        setError(null);
      }

    } catch (err: any) {
      console.error("❌ Failed to fetch identity:", err);
      setError(err.message);
      setIdentity(null);
    } finally {
      setLoading(false);
    }
  };

  // Load identity on component mount and wallet change
  useEffect(() => {
    fetchIdentity();
  }, [activeWallet?.accounts?.[0]?.address]);

  // Handle refresh
  const handleRefresh = () => {
    fetchIdentity();
    onRefresh?.();
  };

  if (loading) {
    return (
      <div className="my-identity loading">
        <h2>👤 My Identity</h2>
        <div className="loading-message">⏳ Loading your identity...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-identity error">
        <h2>👤 My Identity</h2>
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={handleRefresh} className="retry-button">
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!identity) {
    return (
      <div className="my-identity no-identity">
        <h2>👤 My Identity</h2>
        <div className="no-identity-message">
          <p>🆔 You don't have an identity yet.</p>
          <p>Create your digital identity to get started!</p>
          <p className="address-info">
            📍 Wallet Address: <code>{activeWallet?.accounts?.[0]?.address}</code>
          </p>
        </div>
        <button onClick={handleRefresh} className="refresh-button">
          🔄 Check Again
        </button>
      </div>
    );
  }

  // 🆕 Mock verification data (since verification system isn't implemented yet)
  const validVerifications = identity.verifications?.filter((v: any) => v.isValid) || [];
  const invalidVerifications = identity.verifications?.filter((v: any) => !v.isValid) || [];

  return (
    <div className="my-identity">
      <div className="identity-header">
        <h2>👤 My Identity</h2>
        <button onClick={handleRefresh} className="refresh-button">
          🔄 Refresh
        </button>
      </div>

      <div className="identity-card">
        <div className="identity-main">
          <div className="identity-details">
            <h3>{identity.name || identity.fullName}</h3>
            <p className="identity-address">📍 {identity.address}</p>
            {identity.dateOfBirth && (
              <p className="birth-date">🎂 Born: {new Date(identity.dateOfBirth).toLocaleDateString()}</p>
            )}
            <p className="created-date">
              📅 Created: {new Date(identity.createdAt).toLocaleDateString()}
            </p>
            <p className="verification-status">
              {identity.isVerified ? '✅ Verified' : '⏳ Pending Verification'}
            </p>
          </div>
        </div>

        {identity.transactionHash && (
          <div className="blockchain-info">
            <h4>🔗 Blockchain Info:</h4>
            <p>
              Transaction: <a 
                href={`${phiWallet.config?.explorerUrl}/tx/${identity.transactionHash}`}
                target="_blank" 
                rel="noopener noreferrer"
              >
                {identity.transactionHash.slice(0, 12)}...
              </a>
            </p>
          </div>
        )}

        <div className="verification-summary">
          <h4>Verification Status:</h4>
          <div className="verification-stats">
            <div className="stat-item positive">
              <span className="stat-number">{validVerifications.length}</span>
              <span className="stat-label">✅ Valid</span>
            </div>
            <div className="stat-item negative">
              <span className="stat-number">{invalidVerifications.length}</span>
              <span className="stat-label">❌ Flagged</span>
            </div>
            <div className="stat-item total">
              <span className="stat-number">{identity.verifications?.length || 0}</span>
              <span className="stat-label">📊 Total</span>
            </div>
          </div>
        </div>

        {/* 🆕 Note about verification system */}
        <div className="verification-note">
          <p>ℹ️ Verification system coming soon. Your identity is secured on the blockchain.</p>
        </div>
      </div>
    </div>
  );
}