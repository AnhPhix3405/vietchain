package keeper_test

import (
	"context"
	"strconv"
	"testing"

	keepertest "VietChain/testutil/keeper"
	"VietChain/testutil/nullify"
	"VietChain/x/identity/keeper"
	"VietChain/x/identity/types"

	"github.com/stretchr/testify/require"
)

// Prevent strconv unused error
var _ = strconv.IntSize

func createNIdentity(keeper keeper.Keeper, ctx context.Context, n int) []types.Identity {
	items := make([]types.Identity, n)
	for i := range items {
		items[i].Address = strconv.Itoa(i)

		keeper.SetIdentity(ctx, items[i])
	}
	return items
}

func TestIdentityGet(t *testing.T) {
	keeper, ctx := keepertest.IdentityKeeper(t)
	items := createNIdentity(keeper, ctx, 10)
	for _, item := range items {
		rst, found := keeper.GetIdentity(ctx,
			item.Address,
		)
		require.True(t, found)
		require.Equal(t,
			nullify.Fill(&item),
			nullify.Fill(&rst),
		)
	}
}
func TestIdentityRemove(t *testing.T) {
	keeper, ctx := keepertest.IdentityKeeper(t)
	items := createNIdentity(keeper, ctx, 10)
	for _, item := range items {
		keeper.RemoveIdentity(ctx,
			item.Address,
		)
		_, found := keeper.GetIdentity(ctx,
			item.Address,
		)
		require.False(t, found)
	}
}

func TestIdentityGetAll(t *testing.T) {
	keeper, ctx := keepertest.IdentityKeeper(t)
	items := createNIdentity(keeper, ctx, 10)
	require.ElementsMatch(t,
		nullify.Fill(items),
		nullify.Fill(keeper.GetAllIdentity(ctx)),
	)
}
