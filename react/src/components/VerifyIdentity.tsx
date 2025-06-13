import React, { useState, useEffect } from 'react';
import { SigningStargateClient, StdFee } from "@cosmjs/stargate";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { toBase64 } from "@cosmjs/encoding";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { Registry } from "@cosmjs/proto-signing";
import { decryptMnemonic } from '../wallet';
import { useWalletContext } from '../def-hooks/walletContext';
import { isEncryptedWallet } from '../utils/walletHelpers';
import '../styles/ekyc.css';

interface VerifyIdentityProps {
  ekycResult?: any;
  identityData?: any;
  onVerificationComplete?: (result: any) => void;
}

export default function VerifyIdentity({ 
  ekycResult, 
  identityData, 
  onVerificationComplete 
}: VerifyIdentityProps) {
  const { activeWallet } = useWalletContext();
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');
  const [verificationDetails, setVerificationDetails] = useState<any>(null);
  const [isCreatingIdentity, setIsCreatingIdentity] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [spendingPassword, setSpendingPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (ekycResult && identityData) {
      console.log('🔍 === eKYC VERIFICATION ANALYSIS ===');
      console.log('📄 Identity Data:', identityData);
      console.log('🎯 eKYC Result:', ekycResult);
      
      analyzeEkycResult(ekycResult, identityData);
    }
  }, [ekycResult, identityData]);

  // 🔧 Tạo identity với proto đúng
  const createIdentityOnBlockchain = async (password?: string) => {
    try {
      setIsCreatingIdentity(true);

      // 🔧 1. Create custom registry for MsgCreateIdentity
      const registry = new Registry();
      
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

      // 🔧 Create MsgCreateIdentity type object - ĐÚNG THEO PROTO
      const msgCreateIdentityType = {
        create: (properties?: any) => ({
          creator: properties?.creator || "",
          cccdId: properties?.cccdId || "",  // ✅ Chỉ có 2 fields
          ...properties
        }),
        
        encode: (message: any) => {
          const fields = [];
          
          // Field 1: creator (string) - tag 1, wire type 2
          if (message.creator) {
            const creatorBytes = new TextEncoder().encode(message.creator);
            fields.push(encodeLengthDelimited(0x0A, creatorBytes));
          }
          
          // Field 2: cccdId (string) - tag 2, wire type 2
          if (message.cccdId) {
            const cccdBytes = new TextEncoder().encode(message.cccdId);
            fields.push(encodeLengthDelimited(0x12, cccdBytes));
          }
          
          const totalLength = fields.reduce((sum, field) => sum + field.length, 0);
          const result = new Uint8Array(totalLength);
          
          let offset = 0;
          for (const field of fields) {
            result.set(field, offset);
            offset += field.length;
          }
          
          return { finish: () => result };
        },
        
        decode: () => ({ creator: "", cccdId: "" }),
        fromJSON: (object: any) => ({
          creator: object.creator || "",
          cccdId: object.cccdId || ""
        }),
        toJSON: (message: any) => ({
          creator: message.creator,
          cccdId: message.cccdId
        }),
        fromPartial: (object: any) => ({
          creator: object.creator || "",
          cccdId: object.cccdId || ""
        })
      };
      
      registry.register("/vietchain.identity.MsgCreateIdentity", msgCreateIdentityType);

      // 🔧 2. Get mnemonic from wallet
      let mnemonic: string;
      
      if (!activeWallet) {
        throw new Error('No active wallet found');
      }

      if (isEncryptedWallet(activeWallet)) {
        if (!password) {
          throw new Error('Password required for encrypted wallet');
        }
        
        const decryptedMnemonic = decryptMnemonic(activeWallet.encryptedMnemonic!, password);
        if (!decryptedMnemonic) {
          throw new Error('Invalid password or corrupted wallet data');
        }
        
        mnemonic = decryptedMnemonic;
      } else if (activeWallet.mnemonic) {
        mnemonic = activeWallet.mnemonic;
      } else {
        throw new Error('No mnemonic available in wallet');
      }

      // 🔧 3. Create wallet and get account
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: "cosmos" });
      const [account] = await wallet.getAccounts();

      console.log("📋 Wallet account:", account.address);

      // 🔧 4. Create message - CHỈ SỬ DỤNG 2 FIELDS
      const msg = {
        typeUrl: "/vietchain.identity.MsgCreateIdentity",
        value: {
          creator: account.address,
          cccdId: identityData?.nationalId || identityData?.cccdId, // ✅ Chỉ cccdId
        },
      };

      console.log("🔧 Message created:", msg);

      const fee: StdFee = {
        amount: [{ denom: "token", amount: "1000" }],
        gas: "200000",
      };

      const rpcEndpoint = "http://localhost:26657";
      const client = await SigningStargateClient.connectWithSigner(
        rpcEndpoint, 
        wallet, 
        { registry }
      );

      console.log("✍️ Signing transaction...");
      
      const { bodyBytes, authInfoBytes, signatures } = await client.sign(
        account.address,
        [msg],
        fee,
        "Create identity after eKYC verification"
      );

      const txRaw = TxRaw.fromPartial({
        bodyBytes,
        authInfoBytes,
        signatures,
      });
      
      const txBytes = TxRaw.encode(txRaw).finish();
      const txBytesBase64 = toBase64(txBytes);

      // 🔧 5. Broadcast transaction
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
    
    console.log('🔬 === DETAILED eKYC ANALYSIS ===');
    
    // 📋 1. Kiểm tra thông tin giấy tờ (OCR)
    const ocrData = result.ocr?.object;
    if (ocrData) {
      console.log('📋 OCR Information:');
      console.log('  - Name:', ocrData.name, '(Probability:', ocrData.name_prob, ')');
      console.log('  - ID:', ocrData.id, '(Probability:', ocrData.id_probs, ')');
      console.log('  - Birth Date:', ocrData.birth_day, '(Probability:', ocrData.birth_day_prob, ')');
      console.log('  - Issue Date:', ocrData.issue_date);
      console.log('  - Valid Date:', ocrData.valid_date);
      
      console.log('🚨 Fake Detection:');
      console.log('  - ID Fake Warning:', ocrData.id_fake_warning);
      console.log('  - Name Fake Warning:', ocrData.name_fake_warning);
    }

    // 🆔 2. Kiểm tra liveness giấy tờ
    const cardFrontLiveness = result.liveness_card_front?.object;
    const cardBackLiveness = result.liveness_card_back?.object;
    
    console.log('🆔 Document Liveness:');
    if (cardFrontLiveness) {
      console.log('  - Front Card Liveness:', cardFrontLiveness.liveness);
      console.log('  - Front Fake Liveness:', cardFrontLiveness.fake_liveness);
      console.log('  - Front Fake Probability:', cardFrontLiveness.fake_liveness_prob);
    }
    if (cardBackLiveness) {
      console.log('  - Back Card Liveness:', cardBackLiveness.liveness);
      console.log('  - Back Fake Liveness:', cardBackLiveness.fake_liveness);
    }

    // 👤 3. Kiểm tra liveness khuôn mặt
    const faceLiveness = result.liveness_face?.object;
    console.log('👤 Face Liveness:');
    if (faceLiveness) {
      console.log('  - Face Liveness Status:', faceLiveness.liveness);
      console.log('  - Face Liveness Probability:', faceLiveness.liveness_prob);
      console.log('  - Face Liveness Message:', faceLiveness.liveness_msg);
    }

    // 🔄 4. Kiểm tra so khớp khuôn mặt
    const comparison = result.compare?.object;
    console.log('🔄 Face Comparison:');
    if (comparison) {
      console.log('  - Match Result:', comparison.result);
      console.log('  - Match Probability:', comparison.prob);
      console.log('  - Match Warning:', comparison.match_warning);
    }

    // 🔍 5. So sánh với identity data
    console.log('🔍 Identity Verification:');
    const nationalIdMatch = ocrData?.id === (identity?.nationalId || identity?.cccdId);
    console.log('  - Identity CCCD:', identity?.nationalId || identity?.cccdId);
    console.log('  - eKYC CCCD:', ocrData?.id);
    console.log('  - CCCD Match:', nationalIdMatch ? '✅ MATCH' : '❌ NO MATCH');

    // 📊 6. Tính toán điểm verification
    const verificationScore = calculateVerificationScore(result, identity);
    console.log('📊 Verification Score:', verificationScore);

    // 🎯 7. Kết luận cuối cùng
    const finalResult = {
      overall_status: verificationScore.overall >= 80 ? 'PASSED' : 'FAILED',
      score: verificationScore,
      details: {
        document_authentic: cardFrontLiveness?.liveness === 'success' && cardFrontLiveness?.fake_liveness === false,
        face_liveness: faceLiveness?.liveness === 'success',
        face_match: comparison?.result === 'Khuôn mặt khớp' || comparison?.prob > 80,
        id_match: nationalIdMatch,
        ocr_quality: ocrData?.name_prob > 0.9 && ocrData?.id_probs > 0.9
      }
    };

    console.log('🎯 FINAL VERIFICATION RESULT:', finalResult);
    
    setVerificationDetails(finalResult);
    setVerificationStatus(finalResult.overall_status === 'PASSED' ? 'success' : 'failed');
    
    if (onVerificationComplete) {
      onVerificationComplete(finalResult);
    }
  };

  const calculateVerificationScore = (result: any, identity: any) => {
    let score = {
      document_liveness: 0,
      face_liveness: 0,
      face_match: 0,
      id_match: 0,
      ocr_quality: 0,
      overall: 0
    };

    // Document liveness (20 points)
    const cardLiveness = result.liveness_card_front?.object;
    if (cardLiveness?.liveness === 'success' && cardLiveness?.fake_liveness === false) {
      score.document_liveness = 20;
    }

    // Face liveness (20 points)
    const faceLiveness = result.liveness_face?.object;
    if (faceLiveness?.liveness === 'success') {
      score.face_liveness = 20;
    }

    // Face match (25 points)
    const comparison = result.compare?.object;
    if (comparison?.result === 'Khuôn mặt khớp' || (comparison?.prob && comparison.prob > 80)) {
      score.face_match = 25;
    }

    // ID match (25 points)
    const ocrData = result.ocr?.object;
    if (ocrData?.id === (identity?.nationalId || identity?.cccdId)) {
      score.id_match = 25;
    }

    // OCR quality (10 points)
    if (ocrData?.name_prob > 0.9 && ocrData?.id_probs > 0.9) {
      score.ocr_quality = 10;
    }

    score.overall = score.document_liveness + score.face_liveness + score.face_match + score.id_match + score.ocr_quality;

    return score;
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
        {verificationDetails && (
          <div style={{ marginTop: '10px' }}>
            <strong>Điểm tổng: {verificationDetails.score?.overall}/100</strong>
          </div>
        )}
      </div>

      {verificationDetails && (
        <div className="verification-details">
          <h3>📊 Chi tiết xác thực</h3>
          
          <div className="score-breakdown" style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
            <div className="score-item">
              📄 Tính xác thực giấy tờ: {verificationDetails.details.document_authentic ? '✅' : '❌'} 
              ({verificationDetails.score.document_liveness}/20 điểm)
            </div>
            <div className="score-item">
              👤 Nhận diện khuôn mặt thật: {verificationDetails.details.face_liveness ? '✅' : '❌'} 
              ({verificationDetails.score.face_liveness}/20 điểm)
            </div>
            <div className="score-item">
              🔄 Khớp khuôn mặt: {verificationDetails.details.face_match ? '✅' : '❌'} 
              ({verificationDetails.score.face_match}/25 điểm)
            </div>
            <div className="score-item">
              🆔 Khớp số CCCD: {verificationDetails.details.id_match ? '✅' : '❌'} 
              ({verificationDetails.score.id_match}/25 điểm)
            </div>
            <div className="score-item">
              📋 Chất lượng OCR: {verificationDetails.details.ocr_quality ? '✅' : '❌'} 
              ({verificationDetails.score.ocr_quality}/10 điểm)
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
                  <li>Đảm bảo người trong ảnh khớp với ảnh trên giấy tờ</li>
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