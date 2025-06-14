import EkycSDK from "./EkycSDK";
import '../../styles/ekyc.css';
interface EkycIdentityProps {
  onEkycResult?: (result: any) => void;
  identityData?: any;
}

export default function EkycIdentity({ onEkycResult, identityData }: EkycIdentityProps) {
  return (
    <div className="ekyc-identity-container">
      <EkycSDK 
        cccdId={identityData?.nationalId}
        onResult={onEkycResult}
      />
    </div>
  );
}