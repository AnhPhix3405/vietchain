// Định nghĩa message types cho Identity module
export interface MsgRegisterIdentity {
  creator: string;
  fullName: string;
  dateOfBirth: string;
  nationalId: string;
}

export interface MsgUpdateIdentity {
  creator: string;
  id: number;
  fullName: string;
  dateOfBirth: string;
  isVerified: boolean;
  verifiedBy: string;
}

export interface MsgVerifyIdentity {
  creator: string;
  identityId: number;
  approve: boolean;
  message: string;
}