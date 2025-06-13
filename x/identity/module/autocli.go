package identity

import (
    autocliv1 "cosmossdk.io/api/cosmos/autocli/v1"

    modulev1 "VietChain/api/vietchain/identity"
)

// AutoCLIOptions implements the autocli.HasAutoCLIConfig interface.
func (am AppModule) AutoCLIOptions() *autocliv1.ModuleOptions {
    return &autocliv1.ModuleOptions{
        Query: &autocliv1.ServiceCommandDescriptor{
            Service: modulev1.Query_ServiceDesc.ServiceName,
            RpcCommandOptions: []*autocliv1.RpcCommandOptions{
                {
                    RpcMethod: "Params",
                    Use:       "params",
                    Short:     "Shows the parameters of the module",
                },
                {
                    RpcMethod: "IdentityAll",
                    Use:       "list-identity",
                    Short:     "List all identity",
                },
                {
                    RpcMethod:      "Identity",
                    Use:            "show-identity [address]",
                    Short:          "Shows a identity by address",
                    PositionalArgs: []*autocliv1.PositionalArgDescriptor{{ProtoField: "address"}},
                },
                {
                    RpcMethod:      "IdentityByCccdId",
                    Use:            "identity-by-cccd [id-hash]",
                    Short:          "Query identity by CCCD ID hash",
                    PositionalArgs: []*autocliv1.PositionalArgDescriptor{{ProtoField: "idHash"}},
                },
            },
        },
        Tx: &autocliv1.ServiceCommandDescriptor{
            Service:              modulev1.Msg_ServiceDesc.ServiceName,
            EnhanceCustomCommand: true,
            RpcCommandOptions: []*autocliv1.RpcCommandOptions{
                {
                    RpcMethod: "UpdateParams",
                    Skip:      true, // skipped because authority gated
                },
                {
                    RpcMethod:      "CreateIdentity",
                    Use:            "create-identity [cccd-id]",
                    Short:          "Create identity with CCCD ID",
                    PositionalArgs: []*autocliv1.PositionalArgDescriptor{{ProtoField: "cccdId"}},
                },
            },
        },
    }
}
