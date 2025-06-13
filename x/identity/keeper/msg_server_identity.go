package keeper

import (
    "context"
    "crypto/sha256"
    "fmt"
    "time"

    "VietChain/x/identity/types"

    errorsmod "cosmossdk.io/errors"
    sdk "github.com/cosmos/cosmos-sdk/types"
    sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

func (k msgServer) CreateIdentity(goCtx context.Context, msg *types.MsgCreateIdentity) (*types.MsgCreateIdentityResponse, error) {
    ctx := sdk.UnwrapSDKContext(goCtx)

    // Kiểm tra xem address đã có identity chưa (1 địa chỉ = 1 định danh)
    _, found := k.GetIdentity(ctx, msg.Creator)
    if found {
        return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "address already has an identity")
    }

    // Hash CCCD ID để bảo mật
    hash := sha256.Sum256([]byte(msg.CccdId))
    idHash := fmt.Sprintf("%x", hash)

    var identity = types.Identity{
        Address:   msg.Creator,
        IdHash:    idHash,
        CreatedAt: time.Now().Unix(),
    }

    k.SetIdentity(ctx, identity)

    return &types.MsgCreateIdentityResponse{}, nil
}
