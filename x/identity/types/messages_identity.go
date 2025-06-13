package types

import (
    errorsmod "cosmossdk.io/errors"
    sdk "github.com/cosmos/cosmos-sdk/types"
    sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

var _ sdk.Msg = &MsgCreateIdentity{}

func NewMsgCreateIdentity(creator string, cccdId string) *MsgCreateIdentity {
    return &MsgCreateIdentity{
        Creator: creator,
        CccdId:  cccdId,
    }
}

func (msg *MsgCreateIdentity) ValidateBasic() error {
    _, err := sdk.AccAddressFromBech32(msg.Creator)
    if err != nil {
        return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address (%s)", err)
    }
    
    if msg.CccdId == "" {
        return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "CCCD ID cannot be empty")
    }
    
    return nil
}
