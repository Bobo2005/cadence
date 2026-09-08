// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ProofOfLifeConsensus} from "../src/ProofOfLifeConsensus.sol";
import {IProofOfLifeConsensus} from "../src/interfaces/IProofOfLifeConsensus.sol";
import {GuardianRegistry} from "../src/GuardianRegistry.sol";
import {InheritanceVault} from "../src/InheritanceVault.sol";
import {MerkleProofLib} from "../src/libraries/MerkleProofLib.sol";
import {Hashes} from "@openzeppelin/contracts/utils/cryptography/Hashes.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ProofOfLifeConsensusTest
/// @notice Comprehensive unit tests for ProofOfLifeConsensus state machine and vault delegation.
/// @dev Implements tests for Feature Spotlight C (docs/ARCHITECTURE.md and docs/PROJECT-PLAN.md).
contract ProofOfLifeConsensusTest is Test {
    ProofOfLifeConsensus internal consensus;
    GuardianRegistry internal guardianRegistry;
    InheritanceVault internal vault;

    address internal owner = address(0xA11CE);
    address internal stranger = address(0xDEAD);

    address internal guardianA = address(0x1001);
    address internal guardianB = address(0x1002);

    bytes32 internal guardianRoot;
    bytes32[] internal proofA;
    bytes32[] internal proofB;

    uint256 internal constant CHECK_IN_INTERVAL = 90 days;
    uint256 internal constant CONTEST_WINDOW = 72 hours;
    uint256 internal constant THRESHOLD = 2;
    uint256 internal constant TOTAL_GUARDIANS = 2;

    event ConsensusConfigured(
        address indexed vault,
        address indexed owner,
        uint256 checkInInterval,
        uint256 contestWindowDuration
    );
    event HeartbeatRecorded(address indexed vault, uint256 timestamp);
    event CheckInIntervalUpdated(address indexed vault, uint256 newInterval);
    event ContestWindowUpdated(address indexed vault, uint256 newDuration);
    event StateTransition(
        address indexed vault,
        IProofOfLifeConsensus.ConsensusState indexed previousState,
        IProofOfLifeConsensus.ConsensusState indexed newState,
        uint256 timestamp
    );
    event ClaimPendingTriggered(
        address indexed vault,
        uint256 contestDeadline,
        uint256 timestamp
    );
    event ContestFinalized(address indexed vault, uint256 timestamp);

    function setUp() public {
        vm.warp(1_700_000_000);

        // Deploy standalone GuardianRegistry
        guardianRegistry = new GuardianRegistry();

        // Deploy standalone ProofOfLifeConsensus
        consensus = new ProofOfLifeConsensus(address(guardianRegistry));

        // Deploy InheritanceVault wired to consensus primitive
        address[] memory initialTokens = new address[](0);
        vault = new InheritanceVault(owner, CHECK_IN_INTERVAL, initialTokens, address(consensus));

        // Setup 2-of-2 Merkle tree for guardians
        bytes32 leafA = MerkleProofLib.computeGuardianLeaf(guardianA);
        bytes32 leafB = MerkleProofLib.computeGuardianLeaf(guardianB);
        guardianRoot = Hashes.commutativeKeccak256(leafA, leafB);

        proofA = new bytes32[](1);
        proofA[0] = leafB;

        proofB = new bytes32[](1);
        proofB[0] = leafA;

        // Commit guardian root for the vault
        vm.prank(owner);
        guardianRegistry.commitGuardianRoot(address(vault), guardianRoot, THRESHOLD, TOTAL_GUARDIANS);
    }

    // =========================================================================
    // 1. Initial State & Configuration
    // =========================================================================

    function test_initialState_isActive() public view {
        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.Active),
            "Initial state should be Active"
        );
        assertFalse(consensus.isTimeoutExpired(address(vault)), "Timeout should not be expired initially");
        assertEq(consensus.timeUntilTimeout(address(vault)), CHECK_IN_INTERVAL, "Remaining time should equal interval");
        assertEq(consensus.getLastActiveTimestamp(address(vault)), block.timestamp, "Last active should be block timestamp");
        assertEq(consensus.getCheckInInterval(address(vault)), CHECK_IN_INTERVAL, "Interval should match configuration");
        assertEq(consensus.vaultOwners(address(vault)), owner, "Vault owner should be correctly set");
    }

    function test_configureVault_zeroAddress_reverts() public {
        vm.expectRevert(ProofOfLifeConsensus.ZeroAddress.selector);
        consensus.configureVault(address(0), owner, CHECK_IN_INTERVAL, CONTEST_WINDOW);

        vm.expectRevert(ProofOfLifeConsensus.ZeroAddress.selector);
        consensus.configureVault(address(0x123), address(0), CHECK_IN_INTERVAL, CONTEST_WINDOW);
    }

    function test_configureVault_zeroInterval_reverts() public {
        vm.expectRevert(ProofOfLifeConsensus.InvalidInterval.selector);
        consensus.configureVault(address(0x123), owner, 0, CONTEST_WINDOW);
    }

    function test_configureVault_unauthorizedReconfigure_reverts() public {
        vm.prank(stranger);
        vm.expectRevert(ProofOfLifeConsensus.Unauthorized.selector);
        consensus.configureVault(address(vault), stranger, 30 days, 24 hours);
    }

    function test_setCheckInInterval_byOwner() public {
        uint256 newInterval = 30 days;
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit CheckInIntervalUpdated(address(vault), newInterval);

        consensus.setCheckInInterval(address(vault), newInterval);
        assertEq(consensus.getCheckInInterval(address(vault)), newInterval);
    }

    function test_setCheckInInterval_unauthorized_reverts() public {
        vm.prank(stranger);
        vm.expectRevert(ProofOfLifeConsensus.Unauthorized.selector);
        consensus.setCheckInInterval(address(vault), 30 days);
    }

    function test_setCheckInInterval_zero_reverts() public {
        vm.prank(owner);
        vm.expectRevert(ProofOfLifeConsensus.InvalidInterval.selector);
        consensus.setCheckInInterval(address(vault), 0);
    }

    function test_setContestWindow_byOwner() public {
        uint256 newWindow = 48 hours;
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit ContestWindowUpdated(address(vault), newWindow);

        consensus.setContestWindow(address(vault), newWindow);
        IProofOfLifeConsensus.ConsensusConfig memory config = consensus.getConsensusConfig(address(vault));
        assertEq(config.contestWindowDuration, newWindow);
    }

    function test_setContestWindow_unauthorized_reverts() public {
        vm.prank(stranger);
        vm.expectRevert(ProofOfLifeConsensus.Unauthorized.selector);
        consensus.setContestWindow(address(vault), 48 hours);
    }

    // =========================================================================
    // 2. Heartbeat & Inactivity Tracking
    // =========================================================================

    function test_recordHeartbeat_resetsTimeout() public {
        vm.warp(block.timestamp + 30 days);
        assertEq(consensus.timeUntilTimeout(address(vault)), 60 days);

        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit HeartbeatRecorded(address(vault), block.timestamp);

        consensus.recordHeartbeat(address(vault));

        assertEq(consensus.getLastActiveTimestamp(address(vault)), block.timestamp);
        assertEq(consensus.timeUntilTimeout(address(vault)), CHECK_IN_INTERVAL);
        assertFalse(consensus.isTimeoutExpired(address(vault)));
    }

    function test_recordHeartbeat_unauthorized_reverts() public {
        vm.prank(stranger);
        vm.expectRevert(ProofOfLifeConsensus.Unauthorized.selector);
        consensus.recordHeartbeat(address(vault));
    }

    function test_isTimeoutExpired_exactBoundary_returnsFalse() public {
        vm.warp(block.timestamp + CHECK_IN_INTERVAL);
        assertFalse(consensus.isTimeoutExpired(address(vault)), "Boundary must not be expired yet");
        assertEq(consensus.timeUntilTimeout(address(vault)), 0);
    }

    function test_isTimeoutExpired_pastBoundary_returnsTrue() public {
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);
        assertTrue(consensus.isTimeoutExpired(address(vault)), "1s past boundary must be expired");
    }

    // =========================================================================
    // 3. State Transitions: Active -> ClaimPending (Two-Signal Requirement)
    // =========================================================================

    function test_timeoutExpired_guardianNotMet_staysActive() public {
        // Warp past timeout
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);
        assertTrue(consensus.isTimeoutExpired(address(vault)));
        assertFalse(guardianRegistry.isThresholdMet(address(vault)));

        // Attempt to trigger claim pending
        vm.expectRevert(ProofOfLifeConsensus.GuardianThresholdNotMet.selector);
        consensus.triggerClaimPending(address(vault));

        // State remains Active
        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.Active)
        );
    }

    function test_guardianThresholdMet_timeoutNotExpired_staysActive_collusionGuard() public {
        // Both guardians attest while owner is actively checking in
        vm.prank(guardianA);
        guardianRegistry.attest(address(vault), proofA);
        vm.prank(guardianB);
        guardianRegistry.attest(address(vault), proofB);

        assertTrue(guardianRegistry.isThresholdMet(address(vault)), "Guardian threshold is met");
        assertFalse(consensus.isTimeoutExpired(address(vault)), "Timeout is NOT expired");

        // Attempt to trigger claim pending must fail
        vm.expectRevert(
            abi.encodeWithSelector(
                ProofOfLifeConsensus.TimeoutNotExpired.selector,
                consensus.timeUntilTimeout(address(vault))
            )
        );
        consensus.triggerClaimPending(address(vault));

        // State remains Active (rogue guardians cannot hijack the vault)
        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.Active)
        );
    }

    function test_bothSignalsMet_transitionsToClaimPending() public {
        // Signal 1: Guardians attest
        vm.prank(guardianA);
        guardianRegistry.attest(address(vault), proofA);
        vm.prank(guardianB);
        guardianRegistry.attest(address(vault), proofB);

        // Signal 2: Timeout elapses
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);

        uint256 expectedDeadline = block.timestamp + CONTEST_WINDOW;

        vm.expectEmit(true, true, true, true);
        emit StateTransition(
            address(vault),
            IProofOfLifeConsensus.ConsensusState.Active,
            IProofOfLifeConsensus.ConsensusState.ClaimPending,
            block.timestamp
        );

        vm.expectEmit(true, false, false, true);
        emit ClaimPendingTriggered(address(vault), expectedDeadline, block.timestamp);

        consensus.triggerClaimPending(address(vault));

        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.ClaimPending),
            "State should transition to ClaimPending"
        );
        assertEq(consensus.getContestDeadline(address(vault)), expectedDeadline);
        assertEq(consensus.timeUntilFinalized(address(vault)), CONTEST_WINDOW);
    }

    function test_triggerClaimPending_whenNotActive_reverts() public {
        // Advance to ClaimPending
        vm.prank(guardianA);
        guardianRegistry.attest(address(vault), proofA);
        vm.prank(guardianB);
        guardianRegistry.attest(address(vault), proofB);
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);
        consensus.triggerClaimPending(address(vault));

        // Calling trigger again while in ClaimPending reverts
        vm.expectRevert(
            abi.encodeWithSelector(
                ProofOfLifeConsensus.InvalidState.selector,
                IProofOfLifeConsensus.ConsensusState.ClaimPending
            )
        );
        consensus.triggerClaimPending(address(vault));
    }

    // =========================================================================
    // 4. Contest Window & Transition to Finalized
    // =========================================================================

    function test_duringContestWindow_finalizeReverts() public {
        // Move to ClaimPending
        vm.prank(guardianA);
        guardianRegistry.attest(address(vault), proofA);
        vm.prank(guardianB);
        guardianRegistry.attest(address(vault), proofB);
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);
        consensus.triggerClaimPending(address(vault));

        // Warp 24 hours into the 72 hour contest window
        vm.warp(block.timestamp + 24 hours);
        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.ClaimPending)
        );
        assertEq(consensus.timeUntilFinalized(address(vault)), 48 hours);

        // Finalize must revert
        vm.expectRevert(
            abi.encodeWithSelector(ProofOfLifeConsensus.ContestWindowActive.selector, 48 hours)
        );
        consensus.finalizeContest(address(vault));
    }

    function test_duringClaimPending_heartbeatReverts() public {
        // Move to ClaimPending
        vm.prank(guardianA);
        guardianRegistry.attest(address(vault), proofA);
        vm.prank(guardianB);
        guardianRegistry.attest(address(vault), proofB);
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);
        consensus.triggerClaimPending(address(vault));

        // Owner direct heartbeat during ClaimPending reverts (cancelClaimWithSig deferred to Prompt 7)
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                ProofOfLifeConsensus.InvalidState.selector,
                IProofOfLifeConsensus.ConsensusState.ClaimPending
            )
        );
        consensus.recordHeartbeat(address(vault));
    }

    function test_afterContestDeadline_transitionsToFinalized() public {
        // Move to ClaimPending
        vm.prank(guardianA);
        guardianRegistry.attest(address(vault), proofA);
        vm.prank(guardianB);
        guardianRegistry.attest(address(vault), proofB);
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);
        consensus.triggerClaimPending(address(vault));

        // Warp past contest window (72 hours + 1 second)
        vm.warp(block.timestamp + CONTEST_WINDOW + 1);
        assertEq(consensus.timeUntilFinalized(address(vault)), 0);

        vm.expectEmit(true, true, true, true);
        emit StateTransition(
            address(vault),
            IProofOfLifeConsensus.ConsensusState.ClaimPending,
            IProofOfLifeConsensus.ConsensusState.Finalized,
            block.timestamp
        );

        vm.expectEmit(true, false, false, true);
        emit ContestFinalized(address(vault), block.timestamp);

        consensus.finalizeContest(address(vault));

        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.Finalized),
            "State should now be Finalized"
        );
    }

    function test_finalizeContest_whenNotClaimPending_reverts() public {
        // In Active state
        vm.expectRevert(
            abi.encodeWithSelector(
                ProofOfLifeConsensus.InvalidState.selector,
                IProofOfLifeConsensus.ConsensusState.Active
            )
        );
        consensus.finalizeContest(address(vault));
    }

    // =========================================================================
    // 5. Chainlink Automation Upkeep Integration
    // =========================================================================

    function test_checkVaultUpkeep_fullLifecycle() public {
        // 1. Initially Active, no upkeep needed
        (bool needed1, ) = consensus.checkVaultUpkeep(address(vault));
        assertFalse(needed1);

        // 2. Timeout expired, but no guardians -> false
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);
        (bool needed2, ) = consensus.checkVaultUpkeep(address(vault));
        assertFalse(needed2);

        // 3. Guardians attest -> upkeep needed for Action 0 (triggerClaimPending)
        vm.prank(guardianA);
        guardianRegistry.attest(address(vault), proofA);
        vm.prank(guardianB);
        guardianRegistry.attest(address(vault), proofB);

        (bool needed3, bytes memory performData3) = consensus.checkVaultUpkeep(address(vault));
        assertTrue(needed3);

        (address targetVault, uint8 action) = abi.decode(performData3, (address, uint8));
        assertEq(targetVault, address(vault));
        assertEq(action, 0);

        // Perform upkeep -> moves to ClaimPending
        consensus.performVaultUpkeep(address(vault), performData3);
        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.ClaimPending)
        );

        // 4. During contest window -> upkeep not needed
        (bool needed4, ) = consensus.checkVaultUpkeep(address(vault));
        assertFalse(needed4);

        // 5. Warp past contest deadline -> upkeep needed for Action 1 (finalizeContest)
        vm.warp(block.timestamp + CONTEST_WINDOW + 1);
        (bool needed5, bytes memory performData5) = consensus.checkVaultUpkeep(address(vault));
        assertTrue(needed5);

        (, uint8 action5) = abi.decode(performData5, (address, uint8));
        assertEq(action5, 1);

        // Perform upkeep -> moves to Finalized
        consensus.performVaultUpkeep(address(vault), performData5);
        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.Finalized)
        );

        // 6. Once finalized -> upkeep not needed
        (bool needed6, ) = consensus.checkVaultUpkeep(address(vault));
        assertFalse(needed6);
    }

    // =========================================================================
    // 6. Vault Delegation Verification (Architecture Requirement)
    // =========================================================================

    function test_vaultDelegatesHeartbeatToConsensus() public {
        assertEq(address(vault.consensus()), address(consensus));
        assertEq(vault.lastActiveTimestamp(), block.timestamp);

        vm.warp(block.timestamp + 10 days);

        // Calling checkIn on the vault delegates to consensus.recordHeartbeat
        vm.prank(owner);
        vault.checkIn();

        assertEq(vault.lastActiveTimestamp(), block.timestamp);
        assertEq(consensus.getLastActiveTimestamp(address(vault)), block.timestamp);
        assertEq(vault.timeUntilInactive(), CHECK_IN_INTERVAL);
        assertFalse(vault.isInactive());
    }

    function test_vaultDelegatesInactivityQueries() public {
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);

        assertTrue(vault.isInactive(), "vault.isInactive() must match consensus");
        assertTrue(consensus.isTimeoutExpired(address(vault)));
        assertEq(vault.timeUntilInactive(), 0);
        assertEq(consensus.timeUntilTimeout(address(vault)), 0);
    }

    function test_vaultDelegatesStateQueries() public {
        assertEq(
            uint256(vault.getConsensusState()),
            uint256(IProofOfLifeConsensus.ConsensusState.Active)
        );

        // Trigger ClaimPending on consensus
        vm.prank(guardianA);
        guardianRegistry.attest(address(vault), proofA);
        vm.prank(guardianB);
        guardianRegistry.attest(address(vault), proofB);
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);
        consensus.triggerClaimPending(address(vault));

        // Vault immediately reflects ClaimPending
        assertEq(
            uint256(vault.getConsensusState()),
            uint256(IProofOfLifeConsensus.ConsensusState.ClaimPending)
        );

        // Warp past contest window and finalize on consensus
        vm.warp(block.timestamp + CONTEST_WINDOW + 1);
        consensus.finalizeContest(address(vault));

        // Vault immediately reflects Finalized
        assertEq(
            uint256(vault.getConsensusState()),
            uint256(IProofOfLifeConsensus.ConsensusState.Finalized)
        );
    }

    function test_vaultDelegatesIntervalUpdate() public {
        uint256 newInterval = 45 days;
        vm.prank(owner);
        vault.setCheckInInterval(newInterval);

        assertEq(vault.checkInInterval(), newInterval);
        assertEq(consensus.getCheckInInterval(address(vault)), newInterval);
    }

    function test_vaultCheckIn_unauthorized_reverts() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        vault.checkIn();
    }
}
