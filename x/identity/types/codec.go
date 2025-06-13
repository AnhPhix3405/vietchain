package types

import (
    "github.com/cosmos/cosmos-sdk/codec"
    cdctypes "github.com/cosmos/cosmos-sdk/codec/types"
    sdk "github.com/cosmos/cosmos-sdk/types"
    "github.com/cosmos/cosmos-sdk/types/msgservice"
)

func RegisterLegacyAminoCodec(cdc *codec.LegacyAmino) {
    cdc.RegisterConcrete(&MsgUpdateParams{}, "identity/UpdateParams", nil)
    cdc.RegisterConcrete(&MsgCreateIdentity{}, "identity/CreateIdentity", nil)
    // this line is used by starport scaffolding # 2
}

func RegisterInterfaces(registry cdctypes.InterfaceRegistry) {
    registry.RegisterImplementations((*sdk.Msg)(nil),
        &MsgUpdateParams{},
        &MsgCreateIdentity{},
    )
    // this line is used by starport scaffolding # 3

    msgservice.RegisterMsgServiceDesc(registry, &_Msg_serviceDesc)
}
