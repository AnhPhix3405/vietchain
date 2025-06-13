package simulation

import (
    "math/rand"
    "strconv"

    "VietChain/x/identity/keeper"
    "VietChain/x/identity/types"

    "github.com/cosmos/cosmos-sdk/baseapp"
    sdk "github.com/cosmos/cosmos-sdk/types"
    moduletestutil "github.com/cosmos/cosmos-sdk/types/module/testutil"
    simtypes "github.com/cosmos/cosmos-sdk/types/simulation"
    "github.com/cosmos/cosmos-sdk/x/simulation"
)

// Prevent strconv unused error
var _ = strconv.IntSize

func SimulateMsgCreateIdentity(
    ak types.AccountKeeper,
    bk types.BankKeeper,
    k keeper.Keeper,
) simtypes.Operation {
    return func(r *rand.Rand, app *baseapp.BaseApp, ctx sdk.Context, accs []simtypes.Account, chainID string,
    ) (simtypes.OperationMsg, []simtypes.FutureOperation, error) {
        simAccount, _ := simtypes.RandomAcc(r, accs)

        msg := &types.MsgCreateIdentity{
            Creator: simAccount.Address.String(),
            CccdId:  strconv.Itoa(r.Intn(999999999) + 100000000), // Random 9-digit CCCD ID
        }

        // Check if account already has an identity
        _, found := k.GetIdentity(ctx, msg.Creator)
        if found {
            return simtypes.NoOpMsg(types.ModuleName, sdk.MsgTypeURL(msg), "account already has identity"), nil, nil
        }

        txCtx := simulation.OperationInput{
            R:               r,
            App:             app,
            TxGen:           moduletestutil.MakeTestEncodingConfig().TxConfig,
            Cdc:             nil,
            Msg:             msg,
            Context:         ctx,
            SimAccount:      simAccount,
            AccountKeeper:   ak,
            Bankkeeper:      bk,
            ModuleName:      types.ModuleName,
            CoinsSpentInMsg: sdk.NewCoins(),
        }
        return simulation.GenAndDeliverTxWithRandFees(txCtx)
    }
}
