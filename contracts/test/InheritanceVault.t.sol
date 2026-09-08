// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {InheritanceVault} from "../src/InheritanceVault.sol";
import {ProofOfLifeConsensus} from "../src/ProofOfLifeConsensus.sol";
import {IProofOfLifeConsensus} from "../src/interfaces/IProofOfLifeConsensus.sol";
import {GuardianRegistry} from "../src/GuardianRegistry.sol";
import {MerkleProofLib} from "../src/libraries/MerkleProofLib.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Minimal Mock ERC-20 token for testing deposits with custom decimals.
contract MockERC20 is ERC20 {
    uint8 private immutable _decimals;

    constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @title InheritanceVaultTest
/// @notice Comprehensive unit tests for InheritanceVault deposits, check-in heartbeat, allocations,
///         and delegation to ProofOfLifeConsensus.
contract InheritanceVaultTest is Test {
    InheritanceVault internal vault;
    ProofOfLifeConsensus internal consensus;
    GuardianRegistry internal guardianRegistry;

    MockERC20 internal usdc;
    MockERC20 internal usdt;
    MockERC20 internal wbtc;
    MockERC20 internal unwhitelistedToken;

    address internal owner = address(0xA11CE);
    address internal depositor = address(0xB0B);
    address internal beneficiary = address(0xCAFE);
    address internal guardian = address(0x9001);

    bytes32 internal guardianRoot;
    bytes32[] internal proof;

    uint256 internal constant INITIAL_INTERVAL = 90 days;

    event Deposit(address indexed sender, address indexed token, uint256 amount);
    event OwnerCheckedIn(address indexed owner, uint256 timestamp);
    event CheckInIntervalUpdated(uint256 newInterval);
    event TokenWhitelistUpdated(address indexed token, bool status);
    event AllocationRootCommitted(bytes32 indexed root, uint256 timestamp);
    event UpkeepPerformed(uint256 timestamp, bytes performData);

    function setUp() public {
        vm.warp(1_700_000_000); // Set a deterministic starting timestamp

        // Deploy standalone GuardianRegistry & ProofOfLifeConsensus primitive
        guardianRegistry = new GuardianRegistry();
        consensus = new ProofOfLifeConsensus(address(guardianRegistry));

        // Deploy mock ERC-20 tokens per PRD asset scope
        usdc = new MockERC20("USD Coin", "USDC", 6);
        usdt = new MockERC20("Tether USD", "USDT", 6);
        wbtc = new MockERC20("Wrapped BTC", "WBTC", 8);
        unwhitelistedToken = new MockERC20("Random Token", "RND", 18);

        // Prepare whitelist array
        address[] memory initialTokens = new address[](3);
        initialTokens[0] = address(usdc);
        initialTokens[1] = address(usdt);
        initialTokens[2] = address(wbtc);

        // Deploy vault delegating consensus to ProofOfLifeConsensus
        vault = new InheritanceVault(owner, INITIAL_INTERVAL, initialTokens, address(consensus));

        // Setup 1-of-1 guardian so upkeep conditions can be satisfied when timeout elapses
        bytes32 guardianLeaf = MerkleProofLib.computeGuardianLeaf(guardian);
        guardianRoot = guardianLeaf;
        proof = new bytes32[](0);

        vm.prank(owner);
        guardianRegistry.commitGuardianRoot(address(vault), guardianRoot, 1, 1);
        vm.prank(guardian);
        guardianRegistry.attest(address(vault), proof);

        // Fund depositor with ETH and tokens
        vm.deal(depositor, 100 ether);
        usdc.mint(depositor, 100_000 * 1e6);
        usdt.mint(depositor, 100_000 * 1e6);
        wbtc.mint(depositor, 10 * 1e8);
        unwhitelistedToken.mint(depositor, 1000 * 1e18);
    }

    // =========================================================================
    // Initial State & Constructor
    // =========================================================================

    function test_initialState() public view {
        assertEq(vault.owner(), owner, "Owner should be set correctly");
        assertEq(address(vault.consensus()), address(consensus), "Consensus address should be wired");
        assertEq(vault.checkInInterval(), INITIAL_INTERVAL, "Check-in interval should match initial value");
        assertEq(vault.lastActiveTimestamp(), block.timestamp, "Last active timestamp should be current block timestamp");
        assertEq(vault.isWhitelistedToken(address(usdc)), true, "USDC should be whitelisted");
        assertEq(vault.isWhitelistedToken(address(usdt)), true, "USDT should be whitelisted");
        assertEq(vault.isWhitelistedToken(address(wbtc)), true, "WBTC should be whitelisted");
        assertEq(vault.isWhitelistedToken(address(unwhitelistedToken)), false, "Random token should not be whitelisted");
        assertFalse(vault.isInactive(), "Vault should not be inactive initially");
        assertEq(vault.timeUntilInactive(), INITIAL_INTERVAL, "Time until inactive should equal interval");
        assertEq(
            uint256(vault.getConsensusState()),
            uint256(IProofOfLifeConsensus.ConsensusState.Active),
            "State should be Active"
        );
    }

    function test_constructor_zeroInterval_reverts() public {
        address[] memory tokens = new address[](0);
        vm.expectRevert(ProofOfLifeConsensus.InvalidInterval.selector);
        new InheritanceVault(owner, 0, tokens, address(consensus));
    }

    function test_constructor_zeroConsensus_reverts() public {
        address[] memory tokens = new address[](0);
        vm.expectRevert(InheritanceVault.ZeroAddress.selector);
        new InheritanceVault(owner, INITIAL_INTERVAL, tokens, address(0));
    }

    // =========================================================================
    // Native ETH Deposits
    // =========================================================================

    function test_depositETH_success() public {
        uint256 depositAmount = 5 ether;

        vm.startPrank(depositor);
        vm.expectEmit(true, true, false, true);
        emit Deposit(depositor, address(0), depositAmount);

        vault.depositETH{value: depositAmount}();
        vm.stopPrank();

        assertEq(vault.totalDeposited(address(0)), depositAmount, "Total deposited ETH mismatch");
        assertEq(vault.getVaultBalance(address(0)), depositAmount, "Vault ETH balance mismatch");
        assertEq(address(vault).balance, depositAmount, "Address balance mismatch");
    }

    function test_depositETH_zeroAmount_reverts() public {
        vm.prank(depositor);
        vm.expectRevert(InheritanceVault.ZeroAmount.selector);
        vault.depositETH{value: 0}();
    }

    function test_receive_fallback_success() public {
        uint256 transferAmount = 2.5 ether;

        vm.prank(depositor);
        (bool sent, ) = address(vault).call{value: transferAmount}("");
        assertTrue(sent, "Direct ETH send failed");

        assertEq(vault.totalDeposited(address(0)), transferAmount);
        assertEq(address(vault).balance, transferAmount);
    }

    function test_depositETH_multipleDepositors() public {
        address depositor2 = address(0xCAFE2);
        vm.deal(depositor2, 50 ether);

        vm.prank(depositor);
        vault.depositETH{value: 3 ether}();

        vm.prank(depositor2);
        vault.depositETH{value: 7 ether}();

        assertEq(vault.totalDeposited(address(0)), 10 ether);
        assertEq(address(vault).balance, 10 ether);
    }

    // =========================================================================
    // Whitelisted ERC-20 Deposits
    // =========================================================================

    function test_depositToken_usdc_success() public {
        uint256 amount = 1000 * 1e6; // 1,000 USDC

        vm.startPrank(depositor);
        usdc.approve(address(vault), amount);

        vm.expectEmit(true, true, false, true);
        emit Deposit(depositor, address(usdc), amount);

        vault.depositToken(address(usdc), amount);
        vm.stopPrank();

        assertEq(vault.totalDeposited(address(usdc)), amount, "Total deposited USDC mismatch");
        assertEq(vault.getVaultBalance(address(usdc)), amount, "Vault USDC balance mismatch");
        assertEq(usdc.balanceOf(address(vault)), amount, "Actual token balance mismatch");
    }

    function test_depositToken_usdt_success() public {
        uint256 amount = 2500 * 1e6; // 2,500 USDT

        vm.startPrank(depositor);
        usdt.approve(address(vault), amount);
        vault.depositToken(address(usdt), amount);
        vm.stopPrank();

        assertEq(vault.totalDeposited(address(usdt)), amount);
        assertEq(vault.getVaultBalance(address(usdt)), amount);
    }

    function test_depositToken_wbtc_success() public {
        uint256 amount = 1 * 1e8; // 1 WBTC

        vm.startPrank(depositor);
        wbtc.approve(address(vault), amount);
        vault.depositToken(address(wbtc), amount);
        vm.stopPrank();

        assertEq(vault.totalDeposited(address(wbtc)), amount);
        assertEq(vault.getVaultBalance(address(wbtc)), amount);
    }

    function test_depositToken_unwhitelisted_reverts() public {
        uint256 amount = 100 * 1e18;

        vm.startPrank(depositor);
        unwhitelistedToken.approve(address(vault), amount);

        vm.expectRevert(abi.encodeWithSelector(InheritanceVault.TokenNotWhitelisted.selector, address(unwhitelistedToken)));
        vault.depositToken(address(unwhitelistedToken), amount);
        vm.stopPrank();
    }

    function test_depositToken_zeroAddress_reverts() public {
        vm.prank(depositor);
        vm.expectRevert(InheritanceVault.ZeroAddress.selector);
        vault.depositToken(address(0), 100);
    }

    function test_depositToken_zeroAmount_reverts() public {
        vm.prank(depositor);
        vm.expectRevert(InheritanceVault.ZeroAmount.selector);
        vault.depositToken(address(usdc), 0);
    }

    function test_depositToken_withoutApproval_reverts() public {
        vm.prank(depositor);
        vm.expectRevert();
        vault.depositToken(address(usdc), 500 * 1e6);
    }

    // =========================================================================
    // Check-in / Heartbeat Logic (Delegated to Consensus)
    // =========================================================================

    function test_checkIn_updatesLastActiveTimestamp() public {
        // Warp time forward by 30 days
        uint256 advanceSeconds = 30 days;
        vm.warp(block.timestamp + advanceSeconds);

        uint256 checkInTime = block.timestamp;

        vm.startPrank(owner);
        vm.expectEmit(true, false, false, true);
        emit OwnerCheckedIn(owner, checkInTime);

        vault.checkIn();
        vm.stopPrank();

        assertEq(vault.lastActiveTimestamp(), checkInTime, "lastActiveTimestamp should be updated");
        assertEq(vault.timeUntilInactive(), INITIAL_INTERVAL, "Timer should reset to full interval");
        assertFalse(vault.isInactive(), "Vault should remain active");
    }

    function test_checkIn_nonOwner_reverts() public {
        vm.prank(depositor);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, depositor));
        vault.checkIn();
    }

    function test_isInactive_lifecycle() public {
        assertFalse(vault.isInactive(), "Should be active at start");

        // Warp exactly to deadline
        vm.warp(block.timestamp + INITIAL_INTERVAL);
        assertFalse(vault.isInactive(), "Should not be inactive exactly at interval deadline");
        assertEq(vault.timeUntilInactive(), 0, "timeUntilInactive should be 0 at deadline");

        // Warp 1 second past deadline
        vm.warp(block.timestamp + 1);
        assertTrue(vault.isInactive(), "Should be inactive after deadline passes");
        assertEq(vault.timeUntilInactive(), 0, "timeUntilInactive should be 0 after deadline");

        // Owner check-in restores active state
        vm.prank(owner);
        vault.checkIn();

        assertFalse(vault.isInactive(), "Check-in should reactivate vault");
        assertEq(vault.timeUntilInactive(), INITIAL_INTERVAL, "Timer should reset to full interval");
    }

    function test_setCheckInInterval_byOwner() public {
        uint256 newInterval = 30 days;

        vm.startPrank(owner);
        vm.expectEmit(false, false, false, true);
        emit CheckInIntervalUpdated(newInterval);

        vault.setCheckInInterval(newInterval);
        vm.stopPrank();

        assertEq(vault.checkInInterval(), newInterval, "Check-in interval was not updated");
    }

    function test_setCheckInInterval_zero_reverts() public {
        vm.prank(owner);
        vm.expectRevert(ProofOfLifeConsensus.InvalidInterval.selector);
        vault.setCheckInInterval(0);
    }

    function test_setCheckInInterval_nonOwner_reverts() public {
        vm.prank(depositor);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, depositor));
        vault.setCheckInInterval(10 days);
    }

    // =========================================================================
    // Whitelist Management
    // =========================================================================

    function test_setTokenWhitelist_byOwner() public {
        assertFalse(vault.isWhitelistedToken(address(unwhitelistedToken)), "Initially unwhitelisted");

        // Whitelist by owner
        vm.startPrank(owner);
        vm.expectEmit(true, false, false, true);
        emit TokenWhitelistUpdated(address(unwhitelistedToken), true);

        vault.setTokenWhitelist(address(unwhitelistedToken), true);
        vm.stopPrank();

        assertTrue(vault.isWhitelistedToken(address(unwhitelistedToken)), "Token should now be whitelisted");

        // Depositor can now deposit unwhitelistedToken
        vm.startPrank(depositor);
        unwhitelistedToken.approve(address(vault), 50 * 1e18);
        vault.depositToken(address(unwhitelistedToken), 50 * 1e18);
        vm.stopPrank();

        assertEq(vault.totalDeposited(address(unwhitelistedToken)), 50 * 1e18);

        // Owner delists token
        vm.prank(owner);
        vault.setTokenWhitelist(address(unwhitelistedToken), false);
        assertFalse(vault.isWhitelistedToken(address(unwhitelistedToken)), "Token should now be delisted");
    }

    function test_setTokenWhitelist_zeroAddress_reverts() public {
        vm.prank(owner);
        vm.expectRevert(InheritanceVault.ZeroAddress.selector);
        vault.setTokenWhitelist(address(0), true);
    }

    function test_setTokenWhitelist_nonOwner_reverts() public {
        vm.prank(depositor);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, depositor));
        vault.setTokenWhitelist(address(unwhitelistedToken), true);
    }

    // =========================================================================
    // Beneficiary Allocation Commitment (AllocationRoot)
    // =========================================================================

    function test_setAllocationRoot_byOwner() public {
        bytes32 root = keccak256("test_root");

        vm.startPrank(owner);
        vm.expectEmit(true, false, false, true);
        emit AllocationRootCommitted(root, block.timestamp);

        vault.setAllocationRoot(root);
        vm.stopPrank();

        assertEq(vault.allocationRoot(), root, "Allocation root mismatch");
    }

    function test_setAllocationRoot_zeroRoot_reverts() public {
        vm.prank(owner);
        vm.expectRevert(InheritanceVault.InvalidRoot.selector);
        vault.setAllocationRoot(bytes32(0));
    }

    function test_setAllocationRoot_nonOwner_reverts() public {
        bytes32 root = keccak256("test_root");
        vm.prank(depositor);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, depositor));
        vault.setAllocationRoot(root);
    }

    // =========================================================================
    // Chainlink Automation Delegation (checkUpkeep & performUpkeep)
    // =========================================================================

    function test_checkUpkeep_active_returnsFalse() public view {
        (bool upkeepNeeded, ) = vault.checkUpkeep("");
        assertFalse(upkeepNeeded, "Upkeep should not be needed while vault is active");
    }

    function test_checkUpkeep_exactBoundary_returnsFalse() public {
        // At exactly lastActiveTimestamp + INITIAL_INTERVAL, isInactive() is false
        vm.warp(block.timestamp + INITIAL_INTERVAL);
        (bool upkeepNeeded, ) = vault.checkUpkeep("");
        assertFalse(upkeepNeeded, "Upkeep should not be needed at exact boundary");
    }

    function test_checkUpkeep_pastBoundary_returnsTrue() public {
        // Warp 1 second past deadline (guardian already attested in setUp)
        vm.warp(block.timestamp + INITIAL_INTERVAL + 1);
        (bool upkeepNeeded, bytes memory performData) = vault.checkUpkeep("");
        assertTrue(upkeepNeeded, "Upkeep should be needed after boundary has passed");

        (address targetVault, uint8 action) = abi.decode(performData, (address, uint8));
        assertEq(targetVault, address(vault), "performData should contain target vault");
        assertEq(action, 0, "Action 0 is triggerClaimPending");
    }

    function test_performUpkeep_pastBoundary_success() public {
        vm.warp(block.timestamp + INITIAL_INTERVAL + 1);
        (, bytes memory performData) = vault.checkUpkeep("");

        vm.expectEmit(false, false, false, true);
        emit UpkeepPerformed(block.timestamp, performData);

        vault.performUpkeep(performData);

        assertEq(
            uint256(vault.getConsensusState()),
            uint256(IProofOfLifeConsensus.ConsensusState.ClaimPending),
            "State should transition to ClaimPending via delegated upkeep"
        );
    }

    function test_checkUpkeep_inContestWindow_returnsFalse() public {
        vm.warp(block.timestamp + INITIAL_INTERVAL + 1);
        (, bytes memory performData) = vault.checkUpkeep("");
        vault.performUpkeep(performData);

        // During 72-hour contest window, upkeep is not needed yet
        (bool upkeepNeeded, ) = vault.checkUpkeep("");
        assertFalse(upkeepNeeded, "checkUpkeep should return false during contest window");
    }

    function test_performUpkeep_duplicate_reverts() public {
        vm.warp(block.timestamp + INITIAL_INTERVAL + 1);
        (, bytes memory performData) = vault.checkUpkeep("");
        vault.performUpkeep(performData);

        // Attempting duplicate performUpkeep reverts in consensus
        vm.expectRevert(
            abi.encodeWithSelector(
                ProofOfLifeConsensus.InvalidState.selector,
                IProofOfLifeConsensus.ConsensusState.ClaimPending
            )
        );
        vault.performUpkeep(performData);
    }
}
