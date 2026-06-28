package config

// BrokerFeeType describes how a broker charges transfer fees.
type BrokerFeeType string

const (
	BrokerFeeTypePercentage BrokerFeeType = "percentage"
	BrokerFeeTypeFlat       BrokerFeeType = "flat"
	BrokerFeeTypeNone       BrokerFeeType = "none"
)

// BrokerFee is the fee configuration for a single transfer direction.
type BrokerFee struct {
	Type  BrokerFeeType `json:"type"`
	Value string        `json:"value"`
}

// BrokerPreset is a built-in broker configuration for a specific country.
type BrokerPreset struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	Country         string    `json:"country"`
	BaseCurrency    string    `json:"base_currency"`
	LocalCurrency   string    `json:"local_currency"`
	DepositFee      BrokerFee `json:"deposit_fee"`
	WithdrawalFee   BrokerFee `json:"withdrawal_fee"`
}

// BuiltInBrokerPresets mirrors the frontend BROKER_PRESETS so the backend can
// seed user brokers and compute fees without duplicating values in the DB.
var BuiltInBrokerPresets = []BrokerPreset{
	{
		ID:            "hapi-colombia",
		Name:          "Hapi",
		Country:       "co",
		BaseCurrency:  "USD",
		LocalCurrency: "COP",
		DepositFee:    BrokerFee{Type: BrokerFeeTypePercentage, Value: "0.009"},
		WithdrawalFee: BrokerFee{Type: BrokerFeeTypeNone, Value: "0"},
	},
	{
		ID:            "trii-colombia",
		Name:          "Trii",
		Country:       "co",
		BaseCurrency:  "USD",
		LocalCurrency: "COP",
		DepositFee:    BrokerFee{Type: BrokerFeeTypePercentage, Value: "0"},
		WithdrawalFee: BrokerFee{Type: BrokerFeeTypeNone, Value: "0"},
	},
	{
		ID:            "gbm-mexico",
		Name:          "GBM",
		Country:       "mx",
		BaseCurrency:  "USD",
		LocalCurrency: "MXN",
		DepositFee:    BrokerFee{Type: BrokerFeeTypeNone, Value: "0"},
		WithdrawalFee: BrokerFee{Type: BrokerFeeTypeNone, Value: "0"},
	},
	{
		ID:            "xtb",
		Name:          "XTB",
		Country:       "co",
		BaseCurrency:  "USD",
		LocalCurrency: "COP",
		DepositFee:    BrokerFee{Type: BrokerFeeTypeNone, Value: "0"},
		WithdrawalFee: BrokerFee{Type: BrokerFeeTypeNone, Value: "0"},
	},
	{
		ID:            "etoro",
		Name:          "eToro",
		Country:       "co",
		BaseCurrency:  "USD",
		LocalCurrency: "COP",
		DepositFee:    BrokerFee{Type: BrokerFeeTypeNone, Value: "0"},
		WithdrawalFee: BrokerFee{Type: BrokerFeeTypeFlat, Value: "5"},
	},
	{
		ID:            "manual",
		Name:          "Other / Manual",
		Country:       "co",
		BaseCurrency:  "USD",
		LocalCurrency: "COP",
		DepositFee:    BrokerFee{Type: BrokerFeeTypeNone, Value: "0"},
		WithdrawalFee: BrokerFee{Type: BrokerFeeTypeNone, Value: "0"},
	},
}

// GetBrokerPreset returns a built-in preset by id, or nil if unknown.
func GetBrokerPreset(id string) *BrokerPreset {
	for i := range BuiltInBrokerPresets {
		if BuiltInBrokerPresets[i].ID == id {
			return &BuiltInBrokerPresets[i]
		}
	}
	return nil
}
