import React, { useEffect, useRef } from 'react';

// Declare global SDK types
declare global {
  interface Window {
    SDK: {
      launch: (config: any) => void;
    };
  }
}

interface EkycConfig {
  BACKEND_URL?: string;
  TOKEN_ID: string;
  TOKEN_KEY: string;
  ACCESS_TOKEN: string;
  CALL_BACK_END_FLOW: (result: any) => Promise<void>;
  HAS_BACKGROUND_IMAGE: boolean;
  LIST_TYPE_DOCUMENT: number[];
}

// 🔧 Sửa lại interface duy nhất với tất cả props cần thiết
interface EkycSDKProps {
  config?: Partial<EkycConfig>;
  onResult?: (result: any) => void;
  cccdId?: string | null; // 🆕 Thêm cccdId vào interface chính
}

// 🔧 Sửa lại destructuring để nhận cccdId
const EkycSDK: React.FC<EkycSDKProps> = ({ config, onResult, cccdId }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load SDK scripts
    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const loadSDK = async () => {
      try {
        await loadScript('/web-sdk-version-3.1.0.0.js');
        await loadScript('/lib/VNPTQRBrowserApp.js');
        await loadScript('/lib/VNPTBrowserSDKAppV4.0.0.js');

        // Default config
        const defaultConfig: EkycConfig = {
          BACKEND_URL: 'https://api.idg.vnpt.vn',
          TOKEN_ID: '374d67fb-5e29-77f1-e063-62199f0adbd1',
          TOKEN_KEY: 'MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAM3pGtsjqdbbsWOLMMO8u15PxoP8QPzqLvCbv0+ogkRG/fQV13ejKLmkeifE1+Ex5KYlJlGPKVZ6sl3dH+v8+tMCAwEAAQ==',
          ACCESS_TOKEN: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0cmFuc2FjdGlvbl9pZCI6IjcxYzk4YzdlLWI0MjctNDQyZC04Mjc2LTlhMzQwN2RjYzVhYSIsInN1YiI6IjIyNjUwYjUzLTQ2Y2UtMTFmMC1hMjczLWY1MzA4ZDBiNzg4NiIsImF1ZCI6WyJyZXN0c2VydmljZSJdLCJ1c2VyX25hbWUiOiJwaGFtcGhpMzAwNDIwMDUxMDJAZ21haWwuY29tIiwic2NvcGUiOlsicmVhZCJdLCJpc3MiOiJodHRwczovL2xvY2FsaG9zdCIsIm5hbWUiOiJwaGFtcGhpMzAwNDIwMDUxMDJAZ21haWwuY29tIiwiZXhwIjoxNzQ5OTExNTA1LCJ1dWlkX2FjY291bnQiOiIyMjY1MGI1My00NmNlLTExZjAtYTI3My1mNTMwOGQwYjc4ODYiLCJhdXRob3JpdGllcyI6WyJVU0VSIl0sImp0aSI6ImFiYzcxZDlkLWM1ZTYtNGRmNy05YTM3LTRiMTMyNmQ1Nzg3NiIsImNsaWVudF9pZCI6ImNsaWVudGFwcCJ9.IxR_fvQyF_o3nAky3tggA-kH1OY-zOMhfMymr6aX6owyiIxRHSBIYnX_HvMH7vf_8uv0kkzkImHspNIMlAGSyiRZoV7uG64_aC3IOzjUBTAZN7joEAszifkuDPyLmFAfNDKei5yw7-YFUxgo5mHbdwQShVYu1rdY5zhQ32ReRxdLEfrSyvt0vSgiZfRJlq2bGw6Q7FDLuv8kadWmgzmxWRy03mmJEZwm7v9f4JadtST8EQNDfwB2snIYJoF884oFjYzXbJqQSa7MpKDAz8ASMwC_iI1S_jqm8rPyKamaF1BU_GOxKnqpQgfL1A20qAVNWc-rzagmm8sWuV8yYGbdbQ',
          CALL_BACK_END_FLOW: async (result: any) => {
            console.log('result ==>', result);
            console.log('cccdId from props ==>', cccdId); // 🔧 Log để kiểm tra
            
            // Tạo file JSON và download
            
            // Tạo file download ngay lập tức
            // createAndDownloadJson();
            
            // Vẫn trả về filtered result cho component
            // const filteredResult = {
            //   check_result: {
            //     cccd: result.ocr.object.id || null,
            //   }
            // };
            
            // console.log('Filtered Result:', filteredResult);
            
            if (onResult) {
              onResult(result);
            }
          },
          HAS_BACKGROUND_IMAGE: true,
          LIST_TYPE_DOCUMENT: [-1, 4, 5, 6, 7],
        };

        const finalConfig = { ...defaultConfig, ...config };

        // Launch SDK
        if (window.SDK) {
          window.SDK.launch(finalConfig);
        }
      } catch (error) {
        console.error('Error loading eKYC SDK:', error);
      }
    };

    loadSDK();
  }, [config, onResult, cccdId]); // 🔧 Thêm cccdId vào dependency array

  return (
    <div>
      {/* 🆕 Hiển thị thông tin cccdId nếu có */}
      <div id="ekyc_sdk_intergrated" ref={containerRef}></div>
    </div>
  );
};

export default EkycSDK;