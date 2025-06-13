package types

const (
	// ModuleName defines the module name
	ModuleName = "identity"

	// StoreKey defines the primary module store key
	StoreKey = ModuleName

	// MemStoreKey defines the in-memory store key
	MemStoreKey = "mem_identity"
)

var (
	ParamsKey = []byte("p_identity")
)

func KeyPrefix(p string) []byte {
	return []byte(p)
}
