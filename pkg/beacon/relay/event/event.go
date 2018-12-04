// Package event contains data structures that are attached to events in the
// relay. Though many of these events are triggered on-chain, that is not an
// inherent requirement of structures in this package.
package event

import (
	"math/big"
	"time"
)

// Entry represents one entry in the threshold relay.
type Entry struct {
	RequestID     *big.Int
	Value         *big.Int
	GroupID       *big.Int
	PreviousEntry *big.Int
	Timestamp     time.Time
}

// Request represents a request for an entry in the threshold relay.
type Request struct {
	RequestID   *big.Int
	Payment     *big.Int
	BlockReward *big.Int
	Seed        *big.Int

	PreviousValue *big.Int
}

// GroupRegistration represents a registered group in the threshold relay with a
// public key, that is considered active at ActivationBlockHeight, and was
// spawned by the relay request with id, RequestID.
type GroupRegistration struct {
	GroupPublicKey        []byte
	RequestID             *big.Int
	ActivationBlockHeight *big.Int
}

// StakerRegistration is the data for the OnStakerAdded event.  This type may
// only be needed in Milestone 1 - it may change at Milestone 2.
type StakerRegistration struct {
	Index         int
	GroupMemberID string
}

// PublishedDKGResult represents a result published to the chain.
type PublishedDKGResult struct {
	RequestID *big.Int
	// Result type of the DKG protocol execution.
	Success bool
	// Group public key generated by DKG protocol execution.
	GroupPublicKey *big.Int
	// Disqualified members array. The length of the slice matches the group size.
	// True value for a given index means that a group member matching the index
	// was disqualified.
	Disqualified []bool
	// Inactive members array. The length of the slice matches the group size.
	// True value for a given index means that a group member matching the index
	// was inactive.
	Inactive []bool
}

// Equals checks if two published results are equal.
func (pr *PublishedDKGResult) Equals(pr2 *PublishedDKGResult) bool {
	if pr == nil || pr2 == nil {
		return pr == pr2
	}
	if pr.Success != pr2.Success {
		return false
	}
	if pr.GroupPublicKey != nil && pr2.GroupPublicKey != nil {
		if pr.GroupPublicKey.Cmp(pr2.GroupPublicKey) != 0 {
			return false
		}
	} else {
		if (pr.GroupPublicKey == nil && pr2.GroupPublicKey != nil) ||
			(pr.GroupPublicKey != nil && pr2.GroupPublicKey == nil) {
			return false
		}
	}
	if !boolSlicesEqual(pr.Disqualified, pr2.Disqualified) {
		return false
	}
	if !boolSlicesEqual(pr.Inactive, pr2.Inactive) {
		return false
	}
	return true
}

// MemberIDSlicesEqual checks if two slices of MemberIDs are equal. Slices need
// to have the same length and have the same order of entries.
func boolSlicesEqual(expectedSlice []bool, actualSlice []bool) bool {
	if len(expectedSlice) != len(actualSlice) {
		return false
	}
	for i := range expectedSlice {
		if expectedSlice[i] != actualSlice[i] {
			return false
		}
	}
	return true
}
