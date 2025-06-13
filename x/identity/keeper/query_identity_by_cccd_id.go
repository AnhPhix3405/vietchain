package keeper

import (
    "context"

    "VietChain/x/identity/types"
    "cosmossdk.io/store/prefix"
    "github.com/cosmos/cosmos-sdk/runtime"
    sdk "github.com/cosmos/cosmos-sdk/types"
    "github.com/cosmos/cosmos-sdk/types/query"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

func (k Keeper) IdentityByCccdId(goCtx context.Context, req *types.QueryIdentityByCccdIdRequest) (*types.QueryIdentityByCccdIdResponse, error) {
    if req == nil {
        return nil, status.Error(codes.InvalidArgument, "invalid request")
    }

    ctx := sdk.UnwrapSDKContext(goCtx)
    var identities []types.Identity

    store := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
    identityStore := prefix.NewStore(store, types.KeyPrefix(types.IdentityKeyPrefix))

    pageRes, err := query.Paginate(identityStore, req.Pagination, func(key []byte, value []byte) error {
        var identity types.Identity
        if err := k.cdc.Unmarshal(value, &identity); err != nil {
            return err
        }

        if identity.IdHash == req.IdHash {
            identities = append(identities, identity)
        }

        return nil
    })

    if err != nil {
        return nil, status.Error(codes.Internal, err.Error())
    }

    return &types.QueryIdentityByCccdIdResponse{
        Identity:   identities,
        Pagination: pageRes,
    }, nil
}
