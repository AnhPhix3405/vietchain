package ante

import (
    "fmt"
    "reflect"

    identitykeeper "VietChain/x/identity/keeper"

    sdk "github.com/cosmos/cosmos-sdk/types"
    "github.com/cosmos/cosmos-sdk/x/auth/ante"
    banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
)

// HandlerOptions are the options required for constructing a default SDK AnteHandler.
type HandlerOptions struct {
    ante.HandlerOptions
    IdentityKeeper identitykeeper.Keeper
}

// NewAnteHandler returns an AnteHandler that checks and increments sequence
// numbers, checks signatures & account numbers, and deducts fees from the first
// signer.
func NewAnteHandler(options HandlerOptions) (sdk.AnteHandler, error) {
    if options.AccountKeeper == nil {
        return nil, fmt.Errorf("account keeper is required for ante builder")
    }

    if options.BankKeeper == nil {
        return nil, fmt.Errorf("bank keeper is required for ante builder")
    }

    if options.SignModeHandler == nil {
        return nil, fmt.Errorf("sign mode handler is required for ante builder")
    }

    anteDecorators := []sdk.AnteDecorator{
        ante.NewSetUpContextDecorator(),
        ante.NewExtensionOptionsDecorator(options.ExtensionOptionChecker),
        ante.NewValidateBasicDecorator(),
        ante.NewTxTimeoutHeightDecorator(),
        ante.NewValidateMemoDecorator(options.AccountKeeper),
        ante.NewConsumeGasForTxSizeDecorator(options.AccountKeeper),
        ante.NewDeductFeeDecorator(options.AccountKeeper, options.BankKeeper, options.FeegrantKeeper, options.TxFeeChecker),
        ante.NewSetPubKeyDecorator(options.AccountKeeper),
        ante.NewValidateSigCountDecorator(options.AccountKeeper),
        ante.NewSigGasConsumeDecorator(options.AccountKeeper, options.SigGasConsumer),
        ante.NewSigVerificationDecorator(options.AccountKeeper, options.SignModeHandler),
        ante.NewIncrementSequenceDecorator(options.AccountKeeper),
        NewIdentityVerificationDecorator(options.IdentityKeeper), // Custom decorator
    }

    return sdk.ChainAnteDecorators(anteDecorators...), nil
}

// IdentityVerificationDecorator is an ante decorator that verifies if the
// transaction signer has registered their identity.
type IdentityVerificationDecorator struct {
    IdentityKeeper identitykeeper.Keeper
}

// NewIdentityVerificationDecorator creates a new IdentityVerificationDecorator
func NewIdentityVerificationDecorator(keeper identitykeeper.Keeper) IdentityVerificationDecorator {
    return IdentityVerificationDecorator{
        IdentityKeeper: keeper,
    }
}

// AnteHandle handles the identity verification logic for transactions.
func (d IdentityVerificationDecorator) AnteHandle(ctx sdk.Context, tx sdk.Tx, simulate bool, next sdk.AnteHandler) (newCtx sdk.Context, err error) {
    // ALWAYS LOG TO CONFIRM ANTE HANDLER IS CALLED
    ctx.Logger().Info("🔥 ANTE HANDLER CALLED", "simulate", simulate, "block_height", ctx.BlockHeight())

    // Allow ALL transactions during genesis (block height 0)
    if ctx.BlockHeight() == 0 {
        ctx.Logger().Info("✅ ALLOWING GENESIS TRANSACTIONS", "height", ctx.BlockHeight())
        return next(ctx, tx, simulate)
    }

    // Skip check during simulation
    if simulate {
        ctx.Logger().Info("✅ Skipping simulation")
        return next(ctx, tx, simulate)
    }

    // Get messages from transaction
    msgs := tx.GetMsgs()
    ctx.Logger().Info("📦 PROCESSING TRANSACTION", "num_msgs", len(msgs), "height", ctx.BlockHeight())

    if len(msgs) == 0 {
        ctx.Logger().Info("⚠️ No messages in transaction")
        return next(ctx, tx, simulate)
    }

    // Process each message individually
    for i, msg := range msgs {
        msgType := sdk.MsgTypeURL(msg)
        ctx.Logger().Info("🔍 PROCESSING MESSAGE", "index", i, "type", msgType)

        // Check if this is an identity module message
        if isIdentityModuleMsg(msgType) {
            ctx.Logger().Info("✅ ALLOWING IDENTITY MODULE MESSAGE", "type", msgType)
            continue
        }

        // Get signers from this specific message
        var signers []sdk.AccAddress

        // Most Cosmos SDK messages implement GetSigners() method
        if signerMsg, ok := msg.(interface{ GetSigners() []sdk.AccAddress }); ok {
            signers = signerMsg.GetSigners()
            ctx.Logger().Info("👥 GENERIC SIGNERS EXTRACTED", "count", len(signers), "type", msgType)
        } else {
            // Fallback for specific message types that don't implement GetSigners() properly
            switch m := msg.(type) {
            case *banktypes.MsgSend:
                signers = []sdk.AccAddress{sdk.MustAccAddressFromBech32(m.FromAddress)}
                ctx.Logger().Info("👥 BANK SEND SIGNERS", "count", len(signers), "from", m.FromAddress)
            case *banktypes.MsgMultiSend:
                for _, input := range m.Inputs {
                    signers = append(signers, sdk.MustAccAddressFromBech32(input.Address))
                }
                ctx.Logger().Info("👥 BANK MULTI-SEND SIGNERS", "count", len(signers))
            default:
                // GENERIC FALLBACK: Tự động extract Creator field từ bất kỳ message nào
                if creatorAddr := extractCreatorFromMessage(msg); creatorAddr != "" {
                    signers = []sdk.AccAddress{sdk.MustAccAddressFromBech32(creatorAddr)}
                    ctx.Logger().Info("👥 GENERIC CREATOR EXTRACTED", "count", len(signers), "creator", creatorAddr, "type", msgType)
                } else {
                    ctx.Logger().Info("❌ NO SIGNERS FOUND", "type", msgType)
                }
            }
        }

        // BẮT BUỘC: Nếu không extract được signers, reject transaction
        if len(signers) == 0 {
            ctx.Logger().Info("❌ REJECTING TRANSACTION - NO SIGNERS FOUND", "type", msgType)
            return ctx, fmt.Errorf("NGƯỜI GỬI CHƯA ĐĂNG KÝ DANH TÍNH: %s", "address_not_found")
        }

        // Check each signer
        for j, signer := range signers {
            ctx.Logger().Info("🔍 CHECKING SIGNER", "msgIndex", i, "signerIndex", j, "address", signer.String())

            // Check if user has registered identity (đơn giản hóa - chỉ kiểm tra có identity hay không)
            _, found := d.IdentityKeeper.GetIdentity(ctx, signer.String())

            if !found {
                ctx.Logger().Info("❌ REJECTING TRANSACTION - NO IDENTITY",
                    "address", signer.String(),
                    "msgType", msgType,
                    "msgIndex", i,
                    "signerIndex", j)
                return ctx, fmt.Errorf("NGƯỜI GỬI CHƯA ĐĂNG KÝ DANH TÍNH: %s", signer.String())
            }

            // Log identity found
            ctx.Logger().Info("✅ IDENTITY FOUND",
                "address", signer.String(),
                "msgType", msgType)
        }

        // THÊM: Kiểm tra TẤT CẢ người nhận trong mọi loại giao dịch
        recipients := d.extractRecipients(ctx, msg, msgType)
        for r, recipientAddr := range recipients {
            ctx.Logger().Info("🔍 CHECKING RECIPIENT", "index", r, "address", recipientAddr, "msgType", msgType)

            // Check if recipient has registered identity
            _, found := d.IdentityKeeper.GetIdentity(ctx, recipientAddr)

            if !found {
                ctx.Logger().Info("❌ REJECTING TRANSACTION - RECIPIENT NO IDENTITY",
                    "recipient", recipientAddr,
                    "msgType", msgType,
                    "index", r)
                return ctx, fmt.Errorf("NGƯỜI NHẬN CHƯA ĐĂNG KÝ DANH TÍNH: %s", recipientAddr)
            }

            ctx.Logger().Info("✅ RECIPIENT IDENTITY FOUND",
                "recipient", recipientAddr,
                "msgType", msgType)
        }
    }

    ctx.Logger().Info("🎉 ALL IDENTITY CHECKS PASSED - PROCEEDING TO NEXT HANDLER")
    return next(ctx, tx, simulate)
}

// extractRecipients extracts all recipient addresses from any message type
func (d IdentityVerificationDecorator) extractRecipients(ctx sdk.Context, msg sdk.Msg, msgType string) []string {
    var recipients []string

    switch m := msg.(type) {
    case *banktypes.MsgSend:
        recipients = append(recipients, m.ToAddress)
    case *banktypes.MsgMultiSend:
        for _, output := range m.Outputs {
            recipients = append(recipients, output.Address)
        }
    default:
        // Có thể thêm logic để extract recipients từ các module khác
        // Ví dụ: staking delegation, governance, etc.
        ctx.Logger().Info("ℹ️ NO RECIPIENTS TO CHECK", "msgType", msgType)
    }

    return recipients
}

// isIdentityModuleMsg checks if the message type belongs to identity module
func isIdentityModuleMsg(msgType string) bool {
    identityMsgTypes := map[string]bool{
        "/vietchain.identity.MsgCreateIdentity": true,
        "/vietchain.identity.MsgUpdateParams":   true,
    }
    return identityMsgTypes[msgType]
}

// extractCreatorFromMessage extracts Creator field from any message using reflection
func extractCreatorFromMessage(msg sdk.Msg) string {
    msgValue := reflect.ValueOf(msg)
    if msgValue.Kind() == reflect.Ptr {
        msgValue = msgValue.Elem()
    }

    if msgValue.Kind() == reflect.Struct {
        // Tìm field "Creator"
        creatorField := msgValue.FieldByName("Creator")
        if creatorField.IsValid() && creatorField.Kind() == reflect.String {
            return creatorField.String()
        }

        // Backup: Tìm field "Signer" hoặc "From"
        signerField := msgValue.FieldByName("Signer")
        if signerField.IsValid() && signerField.Kind() == reflect.String {
            return signerField.String()
        }

        fromField := msgValue.FieldByName("FromAddress")
        if fromField.IsValid() && fromField.Kind() == reflect.String {
            return fromField.String()
        }
    }
    return ""
}
