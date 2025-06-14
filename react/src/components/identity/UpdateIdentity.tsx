import React, { useState, useEffect } from 'react';
import { SigningStargateClient, StdFee } from "@cosmjs/stargate";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { toBase64 } from "@cosmjs/encoding";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { Registry } from "@cosmjs/proto-signing";
import { decryptMnemonic } from '../../wallet';
import { useWalletContext } from '../../def-hooks/walletContext';
import { isEncryptedWallet } from '../../utils/walletHelpers';

interface UpdateIdentityProps {
  onIdentityUpdated: (identity: any) => void;
}

export default function UpdateIdentity({ onIdentityUpdated }: UpdateIdentityProps) {
  const [myIdentity, setMyIdentity] = useState<any>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    nationalId: '',
  });

  // States for password handling
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [spendingPassword, setSpendingPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { activeWallet } = useWalletContext();

  // 🆕 Helper function to get all identities
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

    setIsLoading(true);

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
        setMyIdentity(userIdentity);
        
        // Pre-fill form with current identity data
        setFormData({
          fullName: userIdentity.fullName || '',
          dateOfBirth: userIdentity.dateOfBirth || '',
          nationalId: userIdentity.nationalId || '',
        });
      } else {
        console.log("ℹ️ No identity found for this address");
        setMyIdentity(null);
      }
    } catch (error) {
      console.error("❌ Error fetching identity:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔧 Fetch user identity when component mounts or wallet changes
  useEffect(() => {
    if (activeWallet) {
      fetchIdentity();
    }
  }, [activeWallet]);

  const test_function_update = async (
    updateData: {
      id: number;
      fullName?: string;
      dateOfBirth?: string;
      isVerified?: boolean;
      verifiedBy?: string;
    },
    password?: string
  ) => {
    try {
      // Registry & encode helpers
      const registry = new Registry();

      // Helper for varint encoding (for uint64, bool)
      const encodeVarint = (tag: number, value: number | boolean): Uint8Array => {
        const result = [];
        result.push(tag);
        let n = typeof value === "boolean" ? (value ? 1 : 0) : value;
        while (n > 127) {
          result.push((n & 0x7F) | 0x80);
          n >>>= 7;
        }
        result.push(n);
        return new Uint8Array(result);
      };

      // Helper for length-delimited (string)
      const encodeLengthDelimited = (tag: number, data: Uint8Array): Uint8Array => {
        const result = [];
        result.push(tag);
        let length = data.length;
        while (length >= 0x80) {
          result.push((length & 0xFF) | 0x80);
          length >>>= 7;
        }
        result.push(length & 0xFF);
        result.push(...data);
        return new Uint8Array(result);
      };

      // MsgUpdateIdentity type
      const msgUpdateIdentityType = {
        create: (properties?: any) => ({
          creator: properties?.creator || "",
          id: properties?.id || 0,
          fullName: properties?.fullName || "",
          dateOfBirth: properties?.dateOfBirth || "",
          isVerified: properties?.isVerified ?? false,
          verifiedBy: properties?.verifiedBy || "",
          ...properties,
        }),
        encode: (message: any, writer?: any) => {
          const fields = [];
          // 1: creator (string)
          if (message.creator) {
            const bytes = new TextEncoder().encode(message.creator);
            fields.push(encodeLengthDelimited(0x0A, bytes));
          }
          // 2: id (uint64, varint)
          if (message.id !== undefined) {
            fields.push(encodeVarint(0x10, message.id));
          }
          // 3: fullName (string)
          if (message.fullName) {
            const bytes = new TextEncoder().encode(message.fullName);
            fields.push(encodeLengthDelimited(0x1A, bytes));
          }
          // 4: dateOfBirth (string)
          if (message.dateOfBirth) {
            const bytes = new TextEncoder().encode(message.dateOfBirth);
            fields.push(encodeLengthDelimited(0x22, bytes));
          }
          // 5: isVerified (bool, varint)
          if (message.isVerified !== undefined) {
            fields.push(encodeVarint(0x28, message.isVerified ? 1 : 0));
          }
          // 6: verifiedBy (string)
          if (message.verifiedBy) {
            const bytes = new TextEncoder().encode(message.verifiedBy);
            fields.push(encodeLengthDelimited(0x32, bytes));
          }
          // Combine
          const totalLength = fields.reduce((sum, field) => sum + field.length, 0);
          const result = new Uint8Array(totalLength);
          let offset = 0;
          for (const field of fields) {
            result.set(field, offset);
            offset += field.length;
          }
          return { finish: () => result };
        },
        decode: () => { throw new Error("Not implemented"); },
        fromJSON: (object: any) => ({
          creator: object.creator || "",
          id: object.id || 0,
          fullName: object.fullName || "",
          dateOfBirth: object.dateOfBirth || "",
          isVerified: object.isVerified ?? false,
          verifiedBy: object.verifiedBy || "",
        }),
        toJSON: (message: any) => ({
          creator: message.creator,
          id: message.id,
          fullName: message.fullName,
          dateOfBirth: message.dateOfBirth,
          isVerified: message.isVerified,
          verifiedBy: message.verifiedBy,
        }),
        fromPartial: (object: any) => ({
          creator: object.creator || "",
          id: object.id || 0,
          fullName: object.fullName || "",
          dateOfBirth: object.dateOfBirth || "",
          isVerified: object.isVerified ?? false,
          verifiedBy: object.verifiedBy || "",
        }),
      };

      registry.register("/vietchain.identity.MsgUpdateIdentity", msgUpdateIdentityType);

      // Wallet/mnemonic logic
      let mnemonic: string;
      if (!activeWallet) throw new Error('No active wallet found');
      if (isEncryptedWallet(activeWallet)) {
        if (!password) throw new Error('Password required for encrypted wallet');
        const decryptedMnemonic = decryptMnemonic(activeWallet.encryptedMnemonic!, password);
        if (!decryptedMnemonic) throw new Error('Invalid password or corrupted wallet data');
        mnemonic = decryptedMnemonic;
      } else if (activeWallet.mnemonic) {
        mnemonic = activeWallet.mnemonic;
      } else {
        throw new Error('No mnemonic available in wallet');
      }
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "cosmos" });
      const [account] = await wallet.getAccounts();

      // Create message update
      const msg = {
        typeUrl: "/vietchain.identity.MsgUpdateIdentity",
        value: {
          creator: account.address,
          id: updateData.id,
          ...(updateData.fullName && { fullName: updateData.fullName }),
          ...(updateData.dateOfBirth && { dateOfBirth: updateData.dateOfBirth }),
          ...(updateData.isVerified !== undefined && { isVerified: updateData.isVerified }),
          ...(updateData.verifiedBy && { verifiedBy: updateData.verifiedBy }),
        },
      };

      const fee: StdFee = {
        amount: [{ denom: "token", amount: "0" }],
        gas: "200000",
      };
      const memo = "";
      const rpcEndpoint = "http://localhost:26657";
      const clientOptions = { registry };
      const client = await SigningStargateClient.connectWithSigner(rpcEndpoint, wallet, clientOptions);

      const { bodyBytes, authInfoBytes, signatures } = await client.sign(
        account.address,
        [msg],
        fee,
        memo
      );

      const txRaw = TxRaw.fromPartial({
        bodyBytes,
        authInfoBytes,
        signatures,
      });
      const txBytes = TxRaw.encode(txRaw).finish();
      const txBytesBase64 = toBase64(txBytes);

      return txBytesBase64;
    } catch (error) {
      console.error("❌ Error in test_function_update:", error);
      throw error;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordConfirm = async (password: string) => {
    setPasswordError(null);
    setIsUnlocking(true);

    try {
      // Test decryption first
      if (!activeWallet?.encryptedMnemonic) {
        throw new Error('No encrypted mnemonic found');
      }

      const decryptedMnemonic = decryptMnemonic(activeWallet.encryptedMnemonic, password);
      if (!decryptedMnemonic) {
        throw new Error('Invalid password');
      }

      // Password is correct, proceed with transaction
      setSpendingPassword(password);
      setShowPasswordModal(false);

      // Now call test_function_update with password
      await executeUpdateIdentity(password);

    } catch (error: any) {
      console.error('❌ Password verification failed:', error);
      setPasswordError(error.message);
    } finally {
      setIsUnlocking(false);
    }
  };

  const executeUpdateIdentity = async (password?: string) => {
    if (!myIdentity?.id) {
      throw new Error('No identity ID found to update');
    }

    try {
      console.log("🎯 Updating identity with ID:", myIdentity.id);
      
      const updateData = {
        id: myIdentity.id,
        fullName: formData.fullName.trim(),
        dateOfBirth: formData.dateOfBirth,
        nationalId: formData.nationalId.trim(),
      };

      const res = await test_function_update(updateData, password);
      
      if (res) {
        console.log("🔧 TX bytes generated:", res);
        
        const response = await fetch("http://localhost:1317/cosmos/tx/v1beta1/txs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tx_bytes: res,
            mode: "BROADCAST_MODE_SYNC",
          }),
        });

        const result = await response.json();
        console.log("🎉 Identity update result:", result);
        
        if (result.tx_response && result.tx_response.code === 0) {
          console.log("✅ Identity updated successfully!");
          console.log("🔗 TX Hash:", result.tx_response.txhash);
          
          // Update local state
          const updatedIdentity = {
            ...myIdentity,
            ...updateData,
            txhash: result.tx_response.txhash,
            success: true
          };
          setMyIdentity(updatedIdentity);
          
          onIdentityUpdated(updatedIdentity);
          
          alert("🎉 Identity đã được cập nhật thành công!\nTX Hash: " + result.tx_response.txhash);
        } else {
          console.error("❌ Transaction failed:", result.tx_response?.raw_log);
          alert("❌ Cập nhật identity thất bại: " + (result.tx_response?.raw_log || "Unknown error"));
        }
      }
    } catch (error: any) {
      console.error("❌ Error updating identity:", error);
      alert("❌ Lỗi khi cập nhật identity: " + error.message);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Form submitted:', formData);
    
    if (isSubmitting) {
      console.log("⏳ Already submitting, please wait...");
      return;
    }

    // Validate that we have an identity to update
    if (!myIdentity?.id) {
      alert("❌ No identity found to update. Please create an identity first.");
      return;
    }

    // Check if wallet requires password
    if (!activeWallet) {
      alert("❌ No active wallet found. Please connect a wallet first.");
      return;
    }

    if (isEncryptedWallet(activeWallet)) {
      // Encrypted wallet - show password modal
      setShowPasswordModal(true);
      return;
    }

    // Legacy wallet - proceed directly
    setIsSubmitting(true);
    
    try {
      await executeUpdateIdentity();
    } catch (error: any) {
      console.error("❌ Error updating identity:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="update-identity">
        <h2>🔄 Update Identity</h2>
        <p>⏳ Loading your identity...</p>
      </div>
    );
  }

  if (!myIdentity) {
    return (
      <div className="update-identity">
        <h2>🔄 Update Identity</h2>
        <div className="no-identity-message">
          <p>❌ No identity found for your wallet address.</p>
          <p>Please create an identity first before trying to update.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="update-identity">
      <h2>🔄 Update Identity</h2>
      <p>Update your existing digital identity on the blockchain</p>

      {/* Current Identity Info */}
      <div className="current-identity-info">
        <h4>📋 Current Identity:</h4>
        <div className="identity-summary">
          <p><strong>ID:</strong> {myIdentity.id}</p>
          <p><strong>Name:</strong> {myIdentity.fullName}</p>
          <p><strong>Date of Birth:</strong> {myIdentity.dateOfBirth}</p>
          <p><strong>National ID:</strong> ***{myIdentity.nationalId?.slice(-4)}</p>
          <p><strong>Creator:</strong> {myIdentity.creator?.slice(0, 20)}...</p>
        </div>
      </div>

      <div className="update-info-box">
        <h4>📝 Update Instructions:</h4>
        <ul>
          <li>✏️ Modify any field you want to update</li>
          <li>🔒 All changes will be recorded on blockchain</li>
          <li>💰 Update fee: 1000 token (~0.001 PHI)</li>
          <li>⚠️ Only the identity creator can update their identity</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="identity-form">
        <div className="form-group">
          <label htmlFor="fullName">Họ và tên *</label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            placeholder="Ví dụ: Nguyễn Văn An"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="dateOfBirth">Ngày sinh *</label>
          <input
            type="date"
            id="dateOfBirth"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleInputChange}
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
            min={new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().split('T')[0]}
            required
            disabled={isSubmitting}
          />
          <small className="form-help">Tuổi từ 16-100 tuổi</small>
        </div>

        <div className="form-group">
          <label htmlFor="nationalId">Số CMND/CCCD *</label>
          <input
            type="text"
            id="nationalId"
            name="nationalId"
            value={formData.nationalId}
            onChange={handleInputChange}
            placeholder="Ví dụ: 123456789 (CMND) hoặc 001234567890 (CCCD)"
            pattern="[0-9]*"
            maxLength={12}
            required
            disabled={isSubmitting}
          />
          <small className="form-help">
            CMND: 9 số | CCCD: 12 số (3 số đầu là mã tỉnh/thành phố)
          </small>
        </div>

        <button
          type="submit"
          className="update-button"
          disabled={!formData.fullName.trim() || !formData.dateOfBirth || !formData.nationalId || isSubmitting}
        >
          {isSubmitting ? "⏳ Đang cập nhật..." : "🔄 Update Identity"}
        </button>
      </form>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="password-modal">
          <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>🔐 Enter Spending Password</h3>
              <p>Enter your wallet spending password to update identity:</p>
              
              <input
                type="password"
                value={spendingPassword}
                onChange={(e) => setSpendingPassword(e.target.value)}
                placeholder="Enter spending password"
                disabled={isUnlocking}
              />
              
              {passwordError && (
                <div className="error-message">❌ {passwordError}</div>
              )}
              
              <div className="button-group">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  disabled={isUnlocking}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handlePasswordConfirm(spendingPassword)}
                  disabled={!spendingPassword || isUnlocking}
                >
                  {isUnlocking ? "⏳ Verifying..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="security-note">
        <h4>🔒 Bảo mật:</h4>
        <p>Mọi thay đổi sẽ được lưu trữ trên blockchain và có thể xác minh công khai.</p>
        <p>💰 Phí giao dịch: 1000 token (~0.001 PHI)</p>
        <p>⛽ Gas limit: 200,000 units</p>
      </div>

      {isSubmitting && (
        <div className="submission-status">
          <p>⏳ Đang cập nhật identity trên blockchain...</p>
          <p>Vui lòng chờ trong giây lát...</p>
        </div>
      )}
    </div>
  );
}