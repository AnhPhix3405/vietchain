package keeper

import (
	"context"

	"VietChain/x/identity/types"

	"cosmossdk.io/store/prefix"
	storetypes "cosmossdk.io/store/types"
	"github.com/cosmos/cosmos-sdk/runtime"
)

// SetIdentity set a specific identity in the store from its index
func (k Keeper) SetIdentity(ctx context.Context, identity types.Identity) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.IdentityKeyPrefix))
	b := k.cdc.MustMarshal(&identity)
	store.Set(types.IdentityKey(
		identity.Address,
	), b)
}

// GetIdentity returns a identity from its index
func (k Keeper) GetIdentity(
	ctx context.Context,
	address string,

) (val types.Identity, found bool) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.IdentityKeyPrefix))

	b := store.Get(types.IdentityKey(
		address,
	))
	if b == nil {
		return val, false
	}

	k.cdc.MustUnmarshal(b, &val)
	return val, true
}

// RemoveIdentity removes a identity from the store
func (k Keeper) RemoveIdentity(
	ctx context.Context,
	address string,

) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.IdentityKeyPrefix))
	store.Delete(types.IdentityKey(
		address,
	))
}

// GetAllIdentity returns all identity
func (k Keeper) GetAllIdentity(ctx context.Context) (list []types.Identity) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.IdentityKeyPrefix))
	iterator := storetypes.KVStorePrefixIterator(store, []byte{})

	defer iterator.Close()

	for ; iterator.Valid(); iterator.Next() {
		var val types.Identity
		k.cdc.MustUnmarshal(iterator.Value(), &val)
		list = append(list, val)
	}

	return
}
