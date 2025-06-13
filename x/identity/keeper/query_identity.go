package keeper

import (
	"context"

	"VietChain/x/identity/types"

	"cosmossdk.io/store/prefix"
	"github.com/cosmos/cosmos-sdk/runtime"
	"github.com/cosmos/cosmos-sdk/types/query"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (k Keeper) IdentityAll(ctx context.Context, req *types.QueryAllIdentityRequest) (*types.QueryAllIdentityResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	var identitys []types.Identity

	store := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	identityStore := prefix.NewStore(store, types.KeyPrefix(types.IdentityKeyPrefix))

	pageRes, err := query.Paginate(identityStore, req.Pagination, func(key []byte, value []byte) error {
		var identity types.Identity
		if err := k.cdc.Unmarshal(value, &identity); err != nil {
			return err
		}

		identitys = append(identitys, identity)
		return nil
	})

	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &types.QueryAllIdentityResponse{Identity: identitys, Pagination: pageRes}, nil
}

func (k Keeper) Identity(ctx context.Context, req *types.QueryGetIdentityRequest) (*types.QueryGetIdentityResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	val, found := k.GetIdentity(
		ctx,
		req.Address,
	)
	if !found {
		return nil, status.Error(codes.NotFound, "not found")
	}

	return &types.QueryGetIdentityResponse{Identity: val}, nil
}
