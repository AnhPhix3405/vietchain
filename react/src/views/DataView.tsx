import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import IgntCrud from "../components/IgntCrud";
import EkycSDK from "../components/EkycSDK";

export default function DataView() {
  const [searchParams] = useSearchParams();
  const [cccdId, setCccdId] = useState<string | null>(null);

  useEffect(() => {
    // 🆕 Lấy cccdId từ URL params
    const cccdIdFromUrl = searchParams.get('cccdId');
    if (cccdIdFromUrl) {
      setCccdId(cccdIdFromUrl);
      console.log('📋 Received cccdId:', cccdIdFromUrl);
    }
  }, [searchParams]);

  return (
    <div>
      {/* 🆕 Hiển thị thông tin identity được tạo */}
      
      <EkycSDK cccdId={cccdId}/>
      {/* Uncomment the following component to add a form for a `modelName` -*/}
      {/* (<IgntCrud storeName="OrgRepoModule" itemName="modelName" />) */}
    </div>
  );
}
