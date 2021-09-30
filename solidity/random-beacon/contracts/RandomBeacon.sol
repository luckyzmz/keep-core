// SPDX-License-Identifier: MIT
/*
▓▓▌ ▓▓ ▐▓▓ ▓▓▓▓▓▓▓▓▓▓▌▐▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▄
▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓▓▓▓▌▐▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
  ▓▓▓▓▓▓    ▓▓▓▓▓▓▓▀    ▐▓▓▓▓▓▓    ▐▓▓▓▓▓   ▓▓▓▓▓▓     ▓▓▓▓▓   ▐▓▓▓▓▓▌   ▐▓▓▓▓▓▓
  ▓▓▓▓▓▓▄▄▓▓▓▓▓▓▓▀      ▐▓▓▓▓▓▓▄▄▄▄         ▓▓▓▓▓▓▄▄▄▄         ▐▓▓▓▓▓▌   ▐▓▓▓▓▓▓
  ▓▓▓▓▓▓▓▓▓▓▓▓▓▀        ▐▓▓▓▓▓▓▓▓▓▓         ▓▓▓▓▓▓▓▓▓▓▌        ▐▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
  ▓▓▓▓▓▓▀▀▓▓▓▓▓▓▄       ▐▓▓▓▓▓▓▀▀▀▀         ▓▓▓▓▓▓▀▀▀▀         ▐▓▓▓▓▓▓▓▓▓▓▓▓▓▓▀
  ▓▓▓▓▓▓   ▀▓▓▓▓▓▓▄     ▐▓▓▓▓▓▓     ▓▓▓▓▓   ▓▓▓▓▓▓     ▓▓▓▓▓   ▐▓▓▓▓▓▌
▓▓▓▓▓▓▓▓▓▓ █▓▓▓▓▓▓▓▓▓ ▐▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓▓▓▓
▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓▓▓▓ ▐▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ▓▓▓▓▓▓▓▓▓▓

                           Trust math, not hardware.
*/
pragma solidity ^0.8.6;

import "./libraries/DKG.sol";

contract RandomBeacon {
    using DKG for DKG.Data;

    // FIXME: These parameters will be delivered from other contract.
    uint256 public GROUP_SIZE = 66;
    uint256 public DKG_TIMEOUT = 7 days;
    uint256 public GROUP_FREQUENCY = 14;

    // TODO: Can we really make it public along with the library functions?
    DKG.Data public dkg;

    error NotAwaitingGenesis(uint256 groupCount);

    // Events copied from library to workaround issue https://github.com/ethereum/solidity/issues/9765
    event DkgStarted(uint256 seed, uint256 groupSize, uint256 timeoutDuration);
    event DkgTimedOut(uint256 seed);
    event DkgCompleted(uint256 seed);

    uint256 internal currentRelayEntry = 420;

    /// @dev Seed value used for the genesis group selection.
    /// https://www.wolframalpha.com/input/?i=pi+to+78+digits
    uint256 public constant GENESIS_SEED =
        31415926535897932384626433832795028841971693993751058209749445923078164062862;

    function createGroup(uint256 seed) internal {
        // Sortition performed off-chain

        dkg.start(seed, GROUP_SIZE, DKG_TIMEOUT);
    }

    function genesis() external {
        // if (groups.groupCount > 0)
        //     revert NotAwaitingGenesis(dkg.groupCount, dkg.currentState);

        createGroup(GENESIS_SEED);
    }

    function completeGroupCreation() internal {
        dkg.finish();

        // New groups should be created with a fixed frequency of relay requests
        // TODO: Consider each group a separate contract instance deployed with proxy?
    }

    function notifyDkgTimeout() external {
        dkg.notifyTimeout();
    }

    function isDkgInProgress() external view returns (bool) {
        return dkg.isInProgress();
    }

    // params:
    // - dkg result
    // - group members (for verification)
    function submitDkgResult() external {
        // TODO: Consider adding nonReentrant?

        // validate DKG result
        // dkgResultVerification.verify(
        //     submitterMemberIndex,
        //     groupPubKey,
        //     misbehaved,
        //     signatures,
        //     signingMembersIndexes,
        //     members,
        //     groupSelection.ticketSubmissionStartBlock +
        //         groupSelection.ticketSubmissionTimeout
        // );

        // check member eligibility to submit result to submit result, w odpowiednim przedziale blokow gosc z tym ID

        // if enough results
        completeGroupCreation();
    }

    // function requestRelayEntry() external {
    //     if RELAY_ENTRY_COUNT >= GROUP_FREQUENCY {
    //         createGroup();
    //     }
    // }
}
