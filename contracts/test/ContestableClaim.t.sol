// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ProofOfLifeConsensus} from "../src/ProofOfLifeConsensus.sol";
import {IProofOfLifeConsensus} from "../src/interfaces/IProofOfLifeConsensus.sol";
import {GuardianRegistry} from "../src/GuardianRegistry.sol";
import {InheritanceVault} from "../src/InheritanceVault.sol";
import {EIP712Lib} from "../src/libraries/EIP712Lib.sol";
import {MerkleProofLib} from "../src/libraries/MerkleProofLib.sol";
import {StealthKeyHelper} from "./helpers/StealthKeyHelper.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {Hashes} from "@openzeppelin/contracts/utils/cryptography/Hashes.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ContestableClaimTest
/// @notice Comprehensive Foundry test suite for the full Contestable Claim lifecycle:
///         (1) claim triggers correctly after timeout + guardian threshold,
///         (2) a valid cancelClaimWithSig signature from the real stealth key reverts the state to Active,
///         (3) an invalid or wrong-signer signature is rejected,
///         (4) a claim not cancelled within the window finalizes correctly.
///
/// @dev ⚠️ ARCHITECTURE CONSTRAINT #2 — CRITICAL REQUIREMENT:
///      ALL signatures in these tests are strictly generated using the actual EIP-5564 stealth
///      keypairs created in Prompt 6 (provided via StealthKeyHelper from secp256k1 pipeline),
///      NOT mock EOAs. This guarantees the tests reflect real cryptographic stealth derivations.
contract ContestableClaimTest is Test {
    ProofOfLifeConsensus internal consensus;
    GuardianRegistry internal guardianRegistry;
    InheritanceVault internal vault;

    // Actual EIP-5564 stealth keypairs generated in Prompt 6
    StealthKeyHelper.StealthKeypair internal primaryOwner;
    StealthKeyHelper.StealthKeypair internal secondaryOwner;

    // Relayer address (stranger with ETH for gas, ensuring stealth owner never pays gas)
    address internal relayer = address(0xDEADC0DE);
    address internal stranger = address(0xBADB01);

    // Guardians for M-of-N attestation
    address internal guardianA = address(0x1001);
    address internal guardianB = address(0x1002);
    bytes32 internal guardianRoot;
    bytes32[] internal proofA;
    bytes32[] internal proofB;

    uint256 internal constant CHECK_IN_INTERVAL = 90 days;
    uint256 internal constant CONTEST_WINDOW = 72 hours;
    uint256 internal constant THRESHOLD = 2;
    uint256 internal constant TOTAL_GUARDIANS = 2;

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
    event ClaimCancelled(address indexed vault, address indexed owner, uint256 timestamp);

    function setUp() public {
        vm.warp(1_700_000_000);

        // Load real EIP-5564 stealth keypairs generated in Prompt 6
        primaryOwner = StealthKeyHelper.getPrimaryStealthKeypair();
        secondaryOwner = StealthKeyHelper.getSecondaryStealthKeypair();

        // Confirm stealth keypairs are real and hold 0 ETH (Constraint #1 verification)
        assertEq(primaryOwner.stealthAddress, 0xDaa6d3b0e2329C180929df36a7c523481BBfAfB3);
        assertEq(secondaryOwner.stealthAddress, 0x77331bc49862C8eFaF6dD81f463Ab24dB7F00EAC);
        vm.deal(primaryOwner.stealthAddress, 0);
        vm.deal(secondaryOwner.stealthAddress, 0);

        // Fund relayer
        vm.deal(relayer, 10 ether);

        // Deploy standalone consensus primitive & guardian registry
        guardianRegistry = new GuardianRegistry();
        consensus = new ProofOfLifeConsensus(address(guardianRegistry));

        // Deploy InheritanceVault with primary stealth owner
        address[] memory initialTokens = new address[](0);
        vault = new InheritanceVault(
            primaryOwner.stealthAddress,
            CHECK_IN_INTERVAL,
            initialTokens,
            address(consensus)
        );

        // Authorize consensus in guardianRegistry so it can reset attestations upon cancellation
        guardianRegistry.setConsensusForVault(address(vault), address(consensus));

        // Setup 2-of-2 guardian Merkle tree
        bytes32 leafA = MerkleProofLib.computeGuardianLeaf(guardianA);
        bytes32 leafB = MerkleProofLib.computeGuardianLeaf(guardianB);
        guardianRoot = Hashes.commutativeKeccak256(leafA, leafB);

        proofA = new bytes32[](1);
        proofA[0] = leafB;

        proofB = new bytes32[](1);
        proofB[0] = leafA;

        // Commit guardian root for vault as owner
        vm.prank(primaryOwner.stealthAddress);
        guardianRegistry.commitGuardianRoot(address(vault), guardianRoot, THRESHOLD, TOTAL_GUARDIANS);
    }

    // --- Helper to advance vault into ClaimPending state ---
    function _transitionToClaimPending() internal {
        // Warp past check-in timeout
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);

        // Both guardians attest
        vm.prank(guardianA);
        guardianRegistry.attest(address(vault), proofA);
        vm.prank(guardianB);
        guardianRegistry.attest(address(vault), proofB);

        // Trigger ClaimPending
        consensus.triggerClaimPending(address(vault));

        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.ClaimPending),
            "State must be ClaimPending"
        );
    }

    // --- Helper to compute EIP-712 digest ---
    function _getCancelClaimDigest(
        address vaultAddress,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes32) {
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("ProofOfLifeConsensus")),
                keccak256(bytes("1")),
                block.chainid,
                address(consensus)
            )
        );
        bytes32 structHash = EIP712Lib.hashCancelClaim(uint256(uint160(vaultAddress)), nonce, deadline);
        return MessageHashUtils.toTypedDataHash(domainSeparator, structHash);
    }

    // --- Helper to sign CancelClaim with an actual stealth private key ---
    function _signCancelClaim(
        uint256 privateKey,
        address vaultAddress,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 digest = _getCancelClaimDigest(vaultAddress, nonce, deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    // =========================================================================
    // CORE LIFECYCLE REQUIREMENTS
    // =========================================================================

    /// @notice Requirement (1): Claim triggers correctly after timeout + guardian threshold.
    /// @dev Confirms neither signal alone can trigger ClaimPending (collusion protection).
    function test_lifecycle_1_claimTriggersAfterTimeoutAndGuardianThreshold() public {
        // 1. Initial state is Active
        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.Active),
            "Initial state must be Active"
        );

        // 2. Timeout alone (without guardian attestations) must NOT trigger ClaimPending
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);
        assertTrue(consensus.isTimeoutExpired(address(vault)), "Timeout should be expired");
        assertFalse(guardianRegistry.isThresholdMet(address(vault)), "Guardians not attested yet");

        vm.expectRevert(ProofOfLifeConsensus.GuardianThresholdNotMet.selector);
        consensus.triggerClaimPending(address(vault));
        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.Active),
            "Must remain Active when guardian threshold not met"
        );

        // 3. Below-threshold attestation (1 of 2) must still NOT trigger ClaimPending
        vm.prank(guardianA);
        guardianRegistry.attest(address(vault), proofA);
        assertFalse(guardianRegistry.isThresholdMet(address(vault)), "1 of 2 threshold not met");

        vm.expectRevert(ProofOfLifeConsensus.GuardianThresholdNotMet.selector);
        consensus.triggerClaimPending(address(vault));

        // 4. Guardian threshold alone (without timeout elapsed) must NOT trigger ClaimPending
        // Reset timestamp by recording heartbeat
        vm.prank(primaryOwner.stealthAddress);
        vault.checkIn();
        assertFalse(consensus.isTimeoutExpired(address(vault)), "Timeout refreshed by checkIn");

        // Attest second guardian (threshold now met)
        vm.prank(guardianB);
        guardianRegistry.attest(address(vault), proofB);
        assertTrue(guardianRegistry.isThresholdMet(address(vault)), "Guardians 2-of-2 met");

        // Attempting trigger must revert because timeout has not expired (collusion guard)
        vm.expectRevert();
        consensus.triggerClaimPending(address(vault));
        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.Active),
            "Must remain Active if timeout not expired (collusion guard)"
        );

        // 5. BOTH SIGNALS MET: Timeout expired AND Guardian threshold met
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);
        assertTrue(consensus.isTimeoutExpired(address(vault)), "Timeout expired");
        assertTrue(guardianRegistry.isThresholdMet(address(vault)), "Threshold met");

        uint256 expectedContestDeadline = block.timestamp + CONTEST_WINDOW;

        vm.expectEmit(true, true, true, true);
        emit StateTransition(
            address(vault),
            IProofOfLifeConsensus.ConsensusState.Active,
            IProofOfLifeConsensus.ConsensusState.ClaimPending,
            block.timestamp
        );
        vm.expectEmit(true, false, false, true);
        emit ClaimPendingTriggered(address(vault), expectedContestDeadline, block.timestamp);

        // Successfully triggers ClaimPending
        consensus.triggerClaimPending(address(vault));

        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.ClaimPending),
            "State must transition to ClaimPending"
        );
        assertEq(
            consensus.getContestDeadline(address(vault)),
            expectedContestDeadline,
            "Contest deadline must be set to block.timestamp + 72 hours"
        );
    }

    /// @notice Requirement (2): A valid cancelClaimWithSig signature from the real stealth key reverts the state to Active.
    /// @dev CONFIRMATION: The signature is generated using the actual stealth keypair from Prompt 6:
    ///      primaryOwner.stealthPrivateKey = 0x3b6b8825407feac85ad829723167788ce2f7c0a127e60592b6c2e5bc74311f89.
    ///      This proves the primary unlinkable cancel path operates without the stealth owner paying gas.
    function test_lifecycle_2_validCancelClaimWithSig_revertsToActive() public {
        _transitionToClaimPending();

        uint256 nonce = consensus.cancelNonces(address(vault));
        uint256 deadline = block.timestamp + 1 hours;

        // SIGNATURE FROM ACTUAL STEALTH KEYPAIR GENERATED IN PROMPT 6
        bytes memory sig = _signCancelClaim(
            primaryOwner.stealthPrivateKey,
            address(vault),
            nonce,
            deadline
        );

        // Verify state transitions: ClaimPending -> Contested -> Active
        vm.expectEmit(true, true, true, true);
        emit StateTransition(
            address(vault),
            IProofOfLifeConsensus.ConsensusState.ClaimPending,
            IProofOfLifeConsensus.ConsensusState.Contested,
            block.timestamp
        );
        vm.expectEmit(true, true, true, true);
        emit StateTransition(
            address(vault),
            IProofOfLifeConsensus.ConsensusState.Contested,
            IProofOfLifeConsensus.ConsensusState.Active,
            block.timestamp
        );
        vm.expectEmit(true, true, false, true);
        emit ClaimCancelled(address(vault), primaryOwner.stealthAddress, block.timestamp);

        // Relayer submits transaction on behalf of owner (stealth owner pays 0 gas)
        vm.prank(relayer);
        consensus.cancelClaimWithSig(address(vault), nonce, deadline, sig);

        // Verify state is completely restored to Active
        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.Active),
            "State must revert back to Active"
        );
        assertFalse(vault.isInactive(), "Vault must not be inactive");
        assertEq(
            consensus.getLastActiveTimestamp(address(vault)),
            block.timestamp,
            "Last active timestamp must be refreshed to cancellation block"
        );
        assertEq(consensus.cancelNonces(address(vault)), 1, "Nonce must increment to prevent replay");

        // Verify guardian attestations are wiped clean for subsequent cycles
        assertEq(
            guardianRegistry.getAttestationCount(address(vault)),
            0,
            "Attestations must be reset to 0"
        );
        assertFalse(
            guardianRegistry.isThresholdMet(address(vault)),
            "Guardian threshold must no longer be met"
        );
    }

    /// @notice Requirement (3): An invalid or wrong-signer signature is rejected.
    /// @dev CONFIRMATION: The signature is generated using the actual secondary stealth keypair from Prompt 6:
    ///      secondaryOwner.stealthPrivateKey = 0x5d1e7a516d53d1ccd9756a4df2c49790195245a8c8a123f6c4e619cb1eecd3b4.
    ///      Confirms that signatures from real, valid stealth keys are rejected if they do not match the vault owner.
    function test_lifecycle_3_invalidOrWrongSignerSignature_rejected() public {
        _transitionToClaimPending();

        uint256 nonce = consensus.cancelNonces(address(vault));
        uint256 deadline = block.timestamp + 1 hours;

        // 3a. SIGNATURE FROM WRONG STEALTH KEY (secondary stealth key on primary vault)
        bytes memory wrongSignerSig = _signCancelClaim(
            secondaryOwner.stealthPrivateKey, // actual secondary stealth keypair from Prompt 6
            address(vault),
            nonce,
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(ProofOfLifeConsensus.InvalidSignature.selector);
        consensus.cancelClaimWithSig(address(vault), nonce, deadline, wrongSignerSig);

        // Confirm state remains untouched in ClaimPending
        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.ClaimPending),
            "State must remain ClaimPending after rejected wrong-signer signature"
        );

        // 3b. MALFORMED / INVALID SIGNATURE BYTES
        // Corrupt the signature length or contents
        bytes memory malformedSig = hex"12345678";
        vm.prank(relayer);
        vm.expectRevert(
            abi.encodeWithSelector(ECDSA.ECDSAInvalidSignatureLength.selector, malformedSig.length)
        );
        consensus.cancelClaimWithSig(address(vault), nonce, deadline, malformedSig);

        // 3c. TAMPERED SIGNATURE (wrong signature hash)
        bytes memory validSig = _signCancelClaim(
            primaryOwner.stealthPrivateKey,
            address(vault),
            nonce,
            deadline
        );
        // Alter one byte of the signature
        validSig[10] = bytes1(uint8(validSig[10]) ^ 0xFF);

        vm.prank(relayer);
        vm.expectRevert(); // ECDSA recover will either return wrong address or revert
        consensus.cancelClaimWithSig(address(vault), nonce, deadline, validSig);

        // State remains ClaimPending
        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.ClaimPending)
        );
    }

    /// @notice Requirement (4): A claim not cancelled within the window finalizes correctly.
    /// @dev Confirms finalization is blocked while the window is active and succeeds once expired.
    function test_lifecycle_4_claimNotCancelledWithinWindow_finalizesCorrectly() public {
        _transitionToClaimPending();

        // 1. During contest window (e.g. at 24 hours), finalizeContest MUST revert
        vm.warp(block.timestamp + 24 hours);
        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.ClaimPending)
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                ProofOfLifeConsensus.ContestWindowActive.selector,
                CONTEST_WINDOW - 24 hours
            )
        );
        consensus.finalizeContest(address(vault));

        // 2. Exactly at deadline boundary, contest window is still active
        uint256 contestDeadline = consensus.getContestDeadline(address(vault));
        vm.warp(contestDeadline - 1);
        vm.expectRevert();
        consensus.finalizeContest(address(vault));

        // 3. Once window has fully elapsed (block.timestamp >= contestDeadline), finalization succeeds
        vm.warp(contestDeadline);

        vm.expectEmit(true, true, true, true);
        emit StateTransition(
            address(vault),
            IProofOfLifeConsensus.ConsensusState.ClaimPending,
            IProofOfLifeConsensus.ConsensusState.Finalized,
            contestDeadline
        );
        vm.expectEmit(true, false, false, true);
        emit ContestFinalized(address(vault), contestDeadline);

        consensus.finalizeContest(address(vault));

        // Verify state is Finalized
        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.Finalized),
            "State must transition to Finalized"
        );
        assertEq(consensus.timeUntilFinalized(address(vault)), 0, "Time until finalized is 0");

        // 4. Once Finalized, claim can NO LONGER be cancelled (finality guarantee)
        uint256 nonce = consensus.cancelNonces(address(vault));
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signCancelClaim(
            primaryOwner.stealthPrivateKey,
            address(vault),
            nonce,
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(
            abi.encodeWithSelector(
                ProofOfLifeConsensus.InvalidState.selector,
                IProofOfLifeConsensus.ConsensusState.Finalized
            )
        );
        consensus.cancelClaimWithSig(address(vault), nonce, deadline, sig);
    }

    // =========================================================================
    // ADDITIONAL LIFECYCLE & SECURITY SAFEGUARDS
    // =========================================================================

    /// @notice Verifies delegation through InheritanceVault contract entrypoint.
    function test_vaultDelegates_cancelClaimWithSig() public {
        _transitionToClaimPending();

        uint256 nonce = consensus.cancelNonces(address(vault));
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory sig = _signCancelClaim(
            primaryOwner.stealthPrivateKey,
            address(vault),
            nonce,
            deadline
        );

        // Relayer submits through vault entrypoint
        vm.prank(relayer);
        vault.cancelClaimWithSig(nonce, deadline, sig);

        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.Active)
        );
        assertEq(consensus.cancelNonces(address(vault)), 1);
    }

    /// @notice Verifies that an expired deadline in the signature is rejected.
    function test_cancelClaimWithSig_expiredDeadline_reverts() public {
        _transitionToClaimPending();

        uint256 nonce = consensus.cancelNonces(address(vault));
        uint256 deadline = block.timestamp - 1; // Expired

        bytes memory sig = _signCancelClaim(
            primaryOwner.stealthPrivateKey,
            address(vault),
            nonce,
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(
            abi.encodeWithSelector(
                ProofOfLifeConsensus.DeadlineExpired.selector,
                deadline,
                block.timestamp
            )
        );
        consensus.cancelClaimWithSig(address(vault), nonce, deadline, sig);
    }

    /// @notice Verifies replay protection prevents using the same signature twice across claim cycles.
    function test_cancelClaimWithSig_nonceReplay_reverts() public {
        _transitionToClaimPending();

        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 365 days;

        bytes memory sig = _signCancelClaim(
            primaryOwner.stealthPrivateKey,
            address(vault),
            nonce,
            deadline
        );

        // First cancellation succeeds
        vm.prank(relayer);
        consensus.cancelClaimWithSig(address(vault), nonce, deadline, sig);

        // Advance to a second claim cycle
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);
        vm.prank(guardianA);
        guardianRegistry.attest(address(vault), proofA);
        vm.prank(guardianB);
        guardianRegistry.attest(address(vault), proofB);
        consensus.triggerClaimPending(address(vault));

        // Replay same signature with stale nonce 0
        vm.prank(relayer);
        vm.expectRevert(
            abi.encodeWithSelector(ProofOfLifeConsensus.InvalidNonce.selector, 1, 0)
        );
        consensus.cancelClaimWithSig(address(vault), nonce, deadline, sig);
    }

    /// @notice Verifies out-of-order nonce is rejected.
    function test_cancelClaimWithSig_futureNonce_reverts() public {
        _transitionToClaimPending();

        uint256 invalidFutureNonce = 5;
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory sig = _signCancelClaim(
            primaryOwner.stealthPrivateKey,
            address(vault),
            invalidFutureNonce,
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(
            abi.encodeWithSelector(ProofOfLifeConsensus.InvalidNonce.selector, 0, invalidFutureNonce)
        );
        consensus.cancelClaimWithSig(address(vault), invalidFutureNonce, deadline, sig);
    }

    /// @notice Verifies cancellation cannot be invoked when not in ClaimPending.
    function test_cancelClaimWithSig_whenNotClaimPending_reverts() public {
        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory sig = _signCancelClaim(
            primaryOwner.stealthPrivateKey,
            address(vault),
            nonce,
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(
            abi.encodeWithSelector(
                ProofOfLifeConsensus.InvalidState.selector,
                IProofOfLifeConsensus.ConsensusState.Active
            )
        );
        consensus.cancelClaimWithSig(address(vault), nonce, deadline, sig);
    }

    /// @notice Verifies signature cancellation after contest window expired is rejected.
    function test_contestWindowExpired_cannotCancel() public {
        _transitionToClaimPending();

        // Warp past contest window duration
        vm.warp(block.timestamp + CONTEST_WINDOW + 1);

        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory sig = _signCancelClaim(
            primaryOwner.stealthPrivateKey,
            address(vault),
            nonce,
            deadline
        );

        vm.prank(relayer);
        vm.expectRevert(ProofOfLifeConsensus.ContestWindowExpired.selector);
        consensus.cancelClaimWithSig(address(vault), nonce, deadline, sig);
    }

    /// @notice Verifies direct cancellation fallback by the stealth owner.
    function test_directCancel_fallback_works() public {
        _transitionToClaimPending();

        // Stealth owner calls directly
        vm.prank(primaryOwner.stealthAddress);
        consensus.cancelClaim(address(vault));

        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.Active)
        );
    }

    /// @notice Verifies direct cancel via vault by owner.
    function test_directCancel_viaVault_byOwner_works() public {
        _transitionToClaimPending();

        vm.prank(primaryOwner.stealthAddress);
        vault.cancelClaim();

        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.Active)
        );
    }

    /// @notice Verifies direct cancel by unauthorized caller reverts.
    function test_directCancel_unauthorizedCaller_reverts() public {
        _transitionToClaimPending();

        vm.prank(stranger);
        vm.expectRevert(ProofOfLifeConsensus.Unauthorized.selector);
        consensus.cancelClaim(address(vault));
    }

    /// @notice Verifies direct cancel via vault by stranger reverts.
    function test_directCancel_viaVault_byStranger_reverts() public {
        _transitionToClaimPending();

        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(
                Ownable.OwnableUnauthorizedAccount.selector,
                stranger
            )
        );
        vault.cancelClaim();
    }

    /// @notice Verifies direct cancel reverts after contest window closes.
    function test_directCancel_contestWindowExpired_reverts() public {
        _transitionToClaimPending();

        vm.warp(block.timestamp + CONTEST_WINDOW + 1);

        vm.prank(primaryOwner.stealthAddress);
        vm.expectRevert(ProofOfLifeConsensus.ContestWindowExpired.selector);
        consensus.cancelClaim(address(vault));
    }

    /// @notice Verifies Architecture Constraint #1: Stealth address holds 0 ETH, relayer submits tx.
    function test_relayedCancel_stealthAddressZeroBalance_succeeds() public {
        _transitionToClaimPending();

        // Assert stealth address holds 0 ETH
        assertEq(primaryOwner.stealthAddress.balance, 0, "Stealth address has no gas");

        uint256 nonce = consensus.cancelNonces(address(vault));
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory sig = _signCancelClaim(
            primaryOwner.stealthPrivateKey,
            address(vault),
            nonce,
            deadline
        );

        // Relayer submits the transaction on behalf of the owner
        vm.prank(relayer);
        consensus.cancelClaimWithSig(address(vault), nonce, deadline, sig);

        // Stealth owner still has exactly 0 ETH balance, untouched (Gas Linkage avoided)
        assertEq(primaryOwner.stealthAddress.balance, 0, "Stealth balance must remain 0 ETH");
        assertNotEq(relayer, primaryOwner.stealthAddress, "Relayer must not be stealth owner");
        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.Active)
        );
    }

    /// @notice Verifies re-entry safety: fresh timeout and fresh guardian attestations required after cancel.
    function test_afterCancel_requiresFreshTimeoutAndGuardiansToReEnterPending() public {
        _transitionToClaimPending();

        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory sig = _signCancelClaim(
            primaryOwner.stealthPrivateKey,
            address(vault),
            nonce,
            deadline
        );

        vm.prank(relayer);
        consensus.cancelClaimWithSig(address(vault), nonce, deadline, sig);

        // Attempting to trigger ClaimPending immediately must revert (timeout not expired)
        vm.expectRevert();
        consensus.triggerClaimPending(address(vault));

        // Warp time past interval
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);

        // Still cannot trigger because guardian attestations were reset
        vm.expectRevert(ProofOfLifeConsensus.GuardianThresholdNotMet.selector);
        consensus.triggerClaimPending(address(vault));

        // Once both guardians attest again, triggerClaimPending succeeds
        vm.prank(guardianA);
        guardianRegistry.attest(address(vault), proofA);
        vm.prank(guardianB);
        guardianRegistry.attest(address(vault), proofB);

        consensus.triggerClaimPending(address(vault));
        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.ClaimPending)
        );
    }

    /// @notice Verifies cancellation on an independent vault owned by the secondary real stealth keypair from Prompt 6.
    function test_cancelClaimWithSig_secondaryStealthKey_success() public {
        // Deploy a new vault owned by secondary stealth keypair
        address[] memory initialTokens = new address[](0);
        InheritanceVault vault2 = new InheritanceVault(
            secondaryOwner.stealthAddress,
            CHECK_IN_INTERVAL,
            initialTokens,
            address(consensus)
        );
        guardianRegistry.setConsensusForVault(address(vault2), address(consensus));

        vm.prank(secondaryOwner.stealthAddress);
        guardianRegistry.commitGuardianRoot(address(vault2), guardianRoot, THRESHOLD, TOTAL_GUARDIANS);

        // Advance to ClaimPending
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);
        vm.prank(guardianA);
        guardianRegistry.attest(address(vault2), proofA);
        vm.prank(guardianB);
        guardianRegistry.attest(address(vault2), proofB);
        consensus.triggerClaimPending(address(vault2));

        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 1 hours;

        // SIGNATURE FROM ACTUAL SECONDARY STEALTH KEYPAIR GENERATED IN PROMPT 6
        bytes memory sig = _signCancelClaim(
            secondaryOwner.stealthPrivateKey,
            address(vault2),
            nonce,
            deadline
        );

        vm.prank(relayer);
        consensus.cancelClaimWithSig(address(vault2), nonce, deadline, sig);

        assertEq(
            uint256(consensus.getState(address(vault2))),
            uint256(IProofOfLifeConsensus.ConsensusState.Active)
        );
        assertEq(consensus.cancelNonces(address(vault2)), 1);
    }

    /// @notice Validates exact CANCEL_CLAIM_TYPEHASH against architecture specification.
    function test_typehash_matchesArchitectureSpecification() public pure {
        bytes32 expectedTypehash = keccak256("CancelClaim(uint256 vaultId,uint256 nonce,uint256 deadline)");
        assertEq(
            EIP712Lib.CANCEL_CLAIM_TYPEHASH,
            expectedTypehash,
            "Typehash must match docs/ARCHITECTURE.md specification exactly"
        );
    }
}
