// Registry để đăng ký custom message types
import { Registry } from "@cosmjs/proto-signing";
import { defaultRegistryTypes } from "@cosmjs/stargate";

export const customRegistry = new Registry([
  ...defaultRegistryTypes,
  ["/test.identity.MsgRegisterIdentity", {} as any],
  ["/test.identity.MsgUpdateIdentity", {} as any], 
  ["/test.identity.MsgVerifyIdentity", {} as any],
]);