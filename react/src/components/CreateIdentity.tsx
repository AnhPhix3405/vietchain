import React, { useState, useEffect } from 'react';

interface CreateIdentityProps {
  onIdentityCreated: (identity: any) => void;
  initialData?: { nationalId?: string }; // 🆕 Thêm prop để nhận dữ liệu ban đầu
}

export default function CreateIdentity({ onIdentityCreated, initialData }: CreateIdentityProps) {
  const [formData, setFormData] = useState({
    cccdId: '',
  });

  // 🆕 Khôi phục dữ liệu khi component mount hoặc initialData thay đổi
  useEffect(() => {
    if (initialData?.nationalId) {
      setFormData({
        cccdId: initialData.nationalId
      });
    }
  }, [initialData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Form submitted:', formData);
    
    // 🆕 Tạo identity object tạm thời để chuyển sang tab eKYC
    const tempIdentity = {
      nationalId: formData.cccdId,
      creator: 'pending', // Sẽ được cập nhật sau khi tạo thật
      // Thêm các fields khác nếu cần
    };
    
    // 🆕 Gọi callback để chuyển sang tab eKYC
    onIdentityCreated(tempIdentity);
  };

  return (
    <div className="create-identity">
      <h2>➕ Tạo Identity</h2>
      <p>Tạo danh tính số có thể xác minh trên blockchain</p>

      <div className="identity-info-box">
        <h4>📋 Thông tin cần thiết:</h4>
        <ul>
          <li>✅ Số CCCD (12 số)</li>
        </ul>
        <p className="warning">⚠️ Mỗi địa chỉ wallet chỉ có thể tạo 1 Identity duy nhất</p>
        <p className="blockchain-note">🔗 Identity sẽ được lưu trữ trên blockchain VietChain</p>
      </div>

      <form onSubmit={handleSubmit} className="identity-form">
        <div className="form-group">
          <label htmlFor="cccdId">Số CCCD *</label>
          <input
            type="text"
            id="cccdId"
            name="cccdId"
            value={formData.cccdId}
            onChange={handleInputChange}
            placeholder="Ví dụ: 001234567890"
            pattern="[0-9]{12}"
            minLength={12}
            maxLength={12}
            required
          />
          <small className="form-help">
            CCCD: Đúng 12 số (3 số đầu là mã tỉnh/thành phố)
          </small>
        </div>

        <button
          type="submit"
          className="create-button"
          disabled={!formData.cccdId || formData.cccdId.length !== 12}
        >
          🆔 Tiếp tục
        </button>
      </form>

      <div className="security-note">
        <h4>🔒 Bảo mật:</h4>
        <p>Số CCCD sẽ được mã hóa SHA-256 trước khi lưu trữ trên blockchain để đảm bảo an toàn thông tin cá nhân.</p>
        <p>💰 Phí giao dịch: 1000 token (~0.001 PHI)</p>
        <p>⛽ Gas limit: 200,000 units</p>
      </div>
    </div>
  );
}