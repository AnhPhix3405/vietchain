import React, { useState, useEffect } from 'react';
import { useWalletContext } from '../../def-hooks/walletContext';
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { isEncryptedWallet } from '../../utils/walletHelpers';
import { decryptMnemonic } from '../../wallet';

interface VerifyIdentityProps {
  ekycResult?: any;
  identityData?: any;
  onVerificationComplete?: (result: any) => void;
  onNavigateAway?: () => void; // 🆕 Thêm callback để handle navigation
}

export default function VerifyIdentity({ 
  ekycResult, 
  identityData, 
  onVerificationComplete,
  onNavigateAway // 🆕 Thêm prop
}: VerifyIdentityProps) {
  const { activeWallet } = useWalletContext();
  
  // States
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');
  const [verificationDetails, setVerificationDetails] = useState<any>(null);
  const [isCreatingIdentity, setIsCreatingIdentity] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [spendingPassword, setSpendingPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [hasStartedVerification, setHasStartedVerification] = useState(false);

  useEffect(() => {
    if (ekycResult && identityData) {
      setHasStartedVerification(true);
      analyzeEkycResult(ekycResult, identityData);
    }
  }, [ekycResult, identityData]);

  // Cleanup effect - alert khi đã bắt đầu quá trình verify
  useEffect(() => {
    return () => {
      if (hasStartedVerification) {
        // Show alert
        alert("Bạn đã rời khỏi trang xác thực danh tính");
        
        // 🆕 Trigger navigation away callback
        if (onNavigateAway) {
          onNavigateAway();
        }
        
        // 🆕 Reload page và clear data
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    };
  }, [hasStartedVerification, onNavigateAway]);

  // 🔧 Tạo identity với proto đúng
  const createIdentityOnBlockchain = async (password?: string) => {
    try {
      setIsCreatingIdentity(true);

      // 🔧 Helper functions for protobuf encoding
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

      const encodeString = (str: string): Uint8Array => {
        return new TextEncoder().encode(str);
      };

      // 🔧 1. Get wallet mnemonic
      let mnemonic: string;
      
      if (isEncryptedWallet(activeWallet)) {
        if (!password) {
          throw new Error('Password required for encrypted wallet');
        }
        
        const decrypted = decryptMnemonic(activeWallet.encryptedMnemonic!, password);
        if (!decrypted) {
          throw new Error('Invalid password');
        }
        mnemonic = decrypted;
      } else if (activeWallet?.mnemonic) {
        mnemonic = activeWallet.mnemonic;
      } else {
        throw new Error('No mnemonic available in wallet');
      }

      // 🔧 2. Create wallet and get account
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "cosmos" });
      const [account] = await wallet.getAccounts();

      console.log("📋 Wallet account:", account.address);

      // 🔧 3. Create message - CHỈ SỬ DỤNG 2 FIELDS
      const msg = {
        typeUrl: "/vietchain.identity.MsgCreateIdentity",
        value: {
          creator: account.address,
          cccdId: identityData?.nationalId || identityData?.cccdId,
        },
      };

      console.log("🔧 Message created:", msg);

      // 🔧 4. Manual protobuf encoding for MsgCreateIdentity
      const creatorBytes = encodeString(msg.value.creator);
      const cccdIdBytes = encodeString(msg.value.cccdId);

      // Tag 1 for creator, Tag 2 for cccdId (based on proto definition)
      const creatorEncoded = encodeLengthDelimited(0x0A, creatorBytes); // tag 1, wire type 2
      const cccdIdEncoded = encodeLengthDelimited(0x12, cccdIdBytes);   // tag 2, wire type 2

      // Combine all fields
      const msgBytes = new Uint8Array([
        ...creatorEncoded,
        ...cccdIdEncoded
      ]);

      console.log("🔧 Encoded message bytes:", msgBytes);

      // 🔧 5. Create transaction with proper structure
      const txBody = {
        messages: [{
          type_url: "/vietchain.identity.MsgCreateIdentity",
          value: Array.from(msgBytes) // Convert to regular array
        }],
        memo: "",
        timeout_height: "0",
        extension_options: [],
        non_critical_extension_options: []
      };

      const authInfo = {
        signer_infos: [{
          public_key: {
            type_url: "/cosmos.crypto.secp256k1.PubKey",
            value: Array.from(account.pubkey)
          },
          mode_info: {
            single: {
              mode: "SIGN_MODE_DIRECT"
            }
          },
          sequence: "0"
        }],
        fee: {
          amount: [{ denom: "token", amount: "1000" }],
          gas_limit: "200000",
          payer: "",
          granter: ""
        }
      };

      const txRaw = {
        body_bytes: Array.from(new TextEncoder().encode(JSON.stringify(txBody))),
        auth_info_bytes: Array.from(new TextEncoder().encode(JSON.stringify(authInfo))),
        signatures: [Array.from(new Uint8Array(64))] // Dummy signature for now
      };

      // 🔧 6. Convert to base64 for broadcast
      const txBytesBase64 = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(txRaw))));

      console.log("🔧 Final tx bytes (base64):", txBytesBase64);

      // 🔧 7. Broadcast transaction
      const response = await fetch("http://localhost:1317/cosmos/tx/v1beta1/txs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tx_bytes: txBytesBase64,
          mode: "BROADCAST_MODE_SYNC",
        }),
      });

      const result = await response.json();
      
      if (result.tx_response?.code === 0) {
        console.log("✅ Identity created successfully!");
        alert(`🎉 Identity đã được tạo thành công trên blockchain!\n\nTX Hash: ${result.tx_response.txhash}\n\nBạn có thể xem giao dịch tại: http://localhost:26657/tx?hash=${result.tx_response.txhash}`);
        
        return {
          success: true,
          txHash: result.tx_response.txhash,
          height: result.tx_response.height
        };
      } else {
        throw new Error(result.tx_response?.raw_log || "Transaction failed");
      }

    } catch (error: any) {
      console.error("❌ Error creating identity:", error);
      
      if (error.message.includes('Invalid password')) {
        setPasswordError('Mật khẩu không đúng');
        return { success: false, error: error.message };
      }
      
      alert("❌ Lỗi khi tạo identity: " + error.message);
      throw error;
    } finally {
      setIsCreatingIdentity(false);
    }
  };

  const handleCreateIdentity = async () => {
    if (!activeWallet) {
      alert('Vui lòng kết nối wallet trước');
      return;
    }

    // Kiểm tra verification đã passed chưa
    if (verificationStatus !== 'success') {
      alert('Vui lòng hoàn thành xác thực eKYC trước khi tạo identity');
      return;
    }

    if (isEncryptedWallet(activeWallet)) {
      setShowPasswordModal(true);
    } else {
      await createIdentityOnBlockchain();
    }
  };

  const handlePasswordConfirm = async (password: string) => {
    setPasswordError(null);
    
    try {
      const result = await createIdentityOnBlockchain(password);
      if (result.success) {
        setShowPasswordModal(false);
        setSpendingPassword('');
      }
    } catch (error) {
      // Error đã được handle trong createIdentityOnBlockchain
    }
  };

  const analyzeEkycResult = (result: any, identity: any) => {
    setVerificationStatus('processing');
    
    console.log('🔬 === eKYC VERIFICATION ANALYSIS ===');

    // 📋 1. Kiểm tra thông tin giấy tờ (OCR)
    const ocrData = result.ocr?.object;
    console.log('📋 OCR Information:', ocrData);

    // 🆔 2. Kiểm tra liveness giấy tờ
    const cardFrontLiveness = result.liveness_card_front?.object;
    const cardBackLiveness = result.liveness_card_back?.object;
    console.log('🆔 Document Liveness - Front:', cardFrontLiveness);
    console.log('🆔 Document Liveness - Back:', cardBackLiveness);

    // 👤 3. Kiểm tra liveness khuôn mặt
    const faceLiveness = result.liveness_face?.object;
    console.log('👤 Face Liveness:', faceLiveness);

    // 🔄 4. Kiểm tra so khớp khuôn mặt
    const comparison = result.compare?.object;
    console.log('🔄 Face Comparison:', comparison);

    // 🔍 5. So sánh với identity data
    const nationalIdMatch = ocrData?.id === (identity?.nationalId || identity?.cccdId);
    console.log('🔍 ID Match Check:');
    console.log('  - Identity CCCD:', identity?.nationalId || identity?.cccdId);
    console.log('  - eKYC CCCD:', ocrData?.id);
    console.log('  - Match Result:', nationalIdMatch);

    // 📊 6. Đánh giá với ngưỡng 97%
    const checks = {
      document_authentic: cardFrontLiveness?.liveness === 'success' && cardFrontLiveness?.fake_liveness === false,
      face_liveness: faceLiveness?.liveness === 'success',
      // 🎯 Kiểm tra face match với ngưỡng 97%
      face_match: comparison?.result === 'Khuôn mặt khớp' && parseFloat(comparison?.prob || '0') >= 0.97,
      id_match: nationalIdMatch
    };

    console.log('📊 Verification Checks:');
    console.log('  - Document Authentic:', checks.document_authentic);
    console.log('  - Face Liveness:', checks.face_liveness);
    console.log('  - Face Match (≥97%):', checks.face_match, 'Prob:', comparison?.prob);
    console.log('  - ID Match:', checks.id_match);

    // 🎯 7. Kết luận cuối cùng - tất cả phải pass
    const overallPass = checks.document_authentic && checks.face_liveness && checks.face_match && checks.id_match;
    
    const finalResult = {
      overall_status: overallPass ? 'PASSED' : 'FAILED',
      details: checks
    };

    console.log('🎯 FINAL VERIFICATION RESULT:', finalResult);
    
    setVerificationDetails(finalResult);
    setVerificationStatus(finalResult.overall_status === 'PASSED' ? 'success' : 'failed');
    
    if (onVerificationComplete) {
      onVerificationComplete(finalResult);
    }
  };

  const getStatusColor = () => {
    switch (verificationStatus) {
      case 'success': return '#28a745';
      case 'failed': return '#dc3545';
      case 'processing': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'success': return '✅';
      case 'failed': return '❌';
      case 'processing': return '⏳';
      default: return '⏸️';
    }
  };

  return (
    <div className="verify-identity-container">
      <h2>🔍 Xác thực danh tính</h2>
      
      <div className="verification-status" style={{
        padding: '15px',
        borderRadius: '8px',
        backgroundColor: getStatusColor() + '20',
        border: `2px solid ${getStatusColor()}`,
        marginBottom: '20px'
      }}>
        <h3 style={{ color: getStatusColor(), margin: '0' }}>
          {getStatusIcon()} Trạng thái: {verificationStatus === 'pending' ? 'ĐANG CHỜ' : 
                                         verificationStatus === 'processing' ? 'ĐANG XỬ LÝ' :
                                         verificationStatus === 'success' ? 'THÀNH CÔNG' : 'THẤT BẠI'}
        </h3>
      </div>

      {verificationDetails && (
        <div className="verification-details">
          <h3>📊 Chi tiết xác thực</h3>
          
          <div className="checks-breakdown" style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
            <div className="check-item" style={{
              padding: '10px',
              borderRadius: '5px',
              backgroundColor: verificationDetails.details.document_authentic ? '#d4edda' : '#f8d7da',
              border: `1px solid ${verificationDetails.details.document_authentic ? '#c3e6cb' : '#f5c6cb'}`
            }}>
              📄 Tính xác thực giấy tờ: {verificationDetails.details.document_authentic ? '✅ HỢP LỆ' : '❌ KHÔNG HỢP LỆ'}
            </div>
            <div className="check-item" style={{
              padding: '10px',
              borderRadius: '5px',
              backgroundColor: verificationDetails.details.face_liveness ? '#d4edda' : '#f8d7da',
              border: `1px solid ${verificationDetails.details.face_liveness ? '#c3e6cb' : '#f5c6cb'}`
            }}>
              👤 Nhận diện khuôn mặt thật: {verificationDetails.details.face_liveness ? '✅ HỢP LỆ' : '❌ KHÔNG HỢP LỆ'}
            </div>
            <div className="check-item" style={{
              padding: '10px',
              borderRadius: '5px',
              backgroundColor: verificationDetails.details.face_match ? '#d4edda' : '#f8d7da',
              border: `1px solid ${verificationDetails.details.face_match ? '#c3e6cb' : '#f5c6cb'}`
            }}>
              🔄 Khớp khuôn mặt: {verificationDetails.details.face_match ? '✅ KHỚP' : '❌ KHÔNG KHỚP'}
            </div>
            <div className="check-item" style={{
              padding: '10px',
              borderRadius: '5px',
              backgroundColor: verificationDetails.details.id_match ? '#d4edda' : '#f8d7da',
              border: `1px solid ${verificationDetails.details.id_match ? '#c3e6cb' : '#f5c6cb'}`
            }}>
              🆔 Khớp số CCCD: {verificationDetails.details.id_match ? '✅ KHỚP' : '❌ KHÔNG KHỚP'}
            </div>
          </div>

          {verificationStatus === 'failed' && (
            <div className="recommendations" style={{
              padding: '15px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '5px'
            }}>
              <h4>💡 Đề xuất cải thiện:</h4>
              <ul>
                {!verificationDetails.details.document_authentic && (
                  <li>Đảm bảo giấy tờ rõ ràng và không bị hư hỏng</li>
                )}
                {!verificationDetails.details.face_liveness && (
                  <li>Chụp lại ảnh với ánh sáng tốt hơn và khuôn mặt rõ ràng</li>
                )}
                {!verificationDetails.details.face_match && (
                  <li>Đảm bảo người trong ảnh khớp với ảnh trên giấy tờ và chụp trong điều kiện ánh sáng tốt</li>
                )}
                {!verificationDetails.details.id_match && (
                  <li>Kiểm tra lại số CCCD đã nhập có khớp với giấy tờ không</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {!ekycResult && !identityData && (
        <div className="no-data" style={{ textAlign: 'center', color: '#6c757d' }}>
          <p>Không có dữ liệu xác thực. Vui lòng hoàn thành quy trình eKYC trước.</p>
        </div>
      )}

      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <button 
          className="create-identity-btn"
          style={{
            background: verificationStatus === 'success' 
              ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
              : 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
            color: 'white',
            border: 'none',
            padding: '15px 30px',
            fontSize: '16px',
            fontWeight: 'bold',
            borderRadius: '25px',
            cursor: verificationStatus === 'success' ? 'pointer' : 'not-allowed',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
            transition: 'all 0.3s ease',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            opacity: verificationStatus === 'success' ? 1 : 0.6
          }}
          disabled={verificationStatus !== 'success' || isCreatingIdentity}
          onClick={handleCreateIdentity}
        >
          {isCreatingIdentity ? '⏳ Đang tạo...' : '🚀 Tạo định danh'}
        </button>
        
        {verificationStatus !== 'success' && (
          <p style={{ marginTop: '10px', color: '#6c757d', fontSize: '14px' }}>
            Hoàn thành xác thực eKYC để kích hoạt tạo identity
          </p>
        )}
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="password-modal" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3>🔐 Nhập mật khẩu ví</h3>
            <p>Nhập mật khẩu để tạo identity trên blockchain:</p>
            
            <input
              type="password"
              value={spendingPassword}
              onChange={(e) => setSpendingPassword(e.target.value)}
              placeholder="Mật khẩu ví"
              disabled={isCreatingIdentity}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
            />
            
            {passwordError && (
              <div style={{ color: '#dc3545', marginBottom: '10px' }}>
                ❌ {passwordError}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setSpendingPassword('');
                  setPasswordError(null);
                }}
                disabled={isCreatingIdentity}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                onClick={() => handlePasswordConfirm(spendingPassword)}
                disabled={!spendingPassword || isCreatingIdentity}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '5px',
                  background: '#007bff',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                {isCreatingIdentity ? '⏳ Đang tạo...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}