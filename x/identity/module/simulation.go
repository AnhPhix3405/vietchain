package identity

import (
    "math/rand"

    sdk "github.com/cosmos/cosmos-sdk/types"
    "github.com/cosmos/cosmos-sdk/types/module"
    simtypes "github.com/cosmos/cosmos-sdk/types/simulation"
    "github.com/cosmos/cosmos-sdk/x/simulation"

    "VietChain/testutil/sample"
    identitysimulation "VietChain/x/identity/simulation"
    "VietChain/x/identity/types"
)

// avoid unused import issue
var (
    _ = identitysimulation.FindAccount
    _ = rand.Rand{}
    _ = sample.AccAddress
    _ = sdk.AccAddress{}
    _ = simulation.MsgEntryKind
)

const (
    opWeightMsgCreateIdentity = "op_weight_msg_identity"
    // TODO: Determine the simulation weight value
    defaultWeightMsgCreateIdentity int = 100

    // this line is used by starport scaffolding # simapp/module/const
)

// GenerateGenesisState creates a randomized GenState of the module.
func (AppModule) GenerateGenesisState(simState *module.SimulationState) {
    accs := make([]string, len(simState.Accounts))
    for i, acc := range simState.Accounts {
        accs[i] = acc.Address.String()
    }
    identityGenesis := types.GenesisState{
        Params: types.DefaultParams(),
        IdentityList: []types.Identity{
            {
                Address:   sample.AccAddress(),
                IdHash:    "sample_hash_1",
                CreatedAt: 1640995200, // Sample timestamp
            },
            {
                Address:   sample.AccAddress(),
                IdHash:    "sample_hash_2", 
                CreatedAt: 1640995300, // Sample timestamp
            },
        },
        // this line is used by starport scaffolding # simapp/module/genesisState
    }
    simState.GenState[types.ModuleName] = simState.Cdc.MustMarshalJSON(&identityGenesis)
}

// RegisterStoreDecoder registers a decoder.
func (am AppModule) RegisterStoreDecoder(_ simtypes.StoreDecoderRegistry) {}

// ProposalContents doesn't return any content functions for governance proposals.
func (AppModule) ProposalContents(_ module.SimulationState) []simtypes.WeightedProposalContent {
    return nil
}

// WeightedOperations returns the all the gov module operations with their respective weights.
func (am AppModule) WeightedOperations(simState module.SimulationState) []simtypes.WeightedOperation {
    operations := make([]simtypes.WeightedOperation, 0)

    var weightMsgCreateIdentity int
    simState.AppParams.GetOrGenerate(opWeightMsgCreateIdentity, &weightMsgCreateIdentity, nil,
        func(_ *rand.Rand) {
            weightMsgCreateIdentity = defaultWeightMsgCreateIdentity
        },
    )
    operations = append(operations, simulation.NewWeightedOperation(
        weightMsgCreateIdentity,
        identitysimulation.SimulateMsgCreateIdentity(am.accountKeeper, am.bankKeeper, am.keeper),
    ))

    // this line is used by starport scaffolding # simapp/module/operation

    return operations
}

// ProposalMsgs returns msgs used for governance proposals for simulations.
func (am AppModule) ProposalMsgs(simState module.SimulationState) []simtypes.WeightedProposalMsg {
    return []simtypes.WeightedProposalMsg{
        simulation.NewWeightedProposalMsg(
            opWeightMsgCreateIdentity,
            defaultWeightMsgCreateIdentity,
            func(r *rand.Rand, ctx sdk.Context, accs []simtypes.Account) sdk.Msg {
                identitysimulation.SimulateMsgCreateIdentity(am.accountKeeper, am.bankKeeper, am.keeper)
                return nil
            },
        ),
        // this line is used by starport scaffolding # simapp/module/OpMsg
    }
}
