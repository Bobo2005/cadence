// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {BalanceCommitment} from "../src/BalanceCommitment.sol";

/// @title BalanceCommitmentTest
/// @notice Tests for the de-scoped transparent balance accounting module.
/// @dev Reflects the Day 13 de-scope path from docs/PROJECT-PLAN.md Feature Spotlight B:
///      Transparent accounting (mapping(address => uint256) public balances) replaces
///      Pedersen commitment storage, eliminating cryptographic reveal-and-verify overhead.
contract BalanceCommitmentTest is Test {
    BalanceCommitment public balanceCommitment;

    address public mockVault1 = address(0x1001);
    address public mockVault2 = address(0x1002);
    address public mockVault3 = address(0x1003);

    function setUp() public {
        balanceCommitment = new BalanceCommitment();
    }

    // =========================================================================
    // Transparent Balance Accounting Tests
    // =========================================================================

    function test_recordDeposit_updatesBalance() public {
        balanceCommitment.recordDeposit(mockVault1, 2.5 ether);
        assertEq(balanceCommitment.balances(mockVault1), 2.5 ether);
        assertEq(balanceCommitment.getBalance(mockVault1), 2.5 ether);

        // Cumulative deposit
        balanceCommitment.recordDeposit(mockVault1, 1.5 ether);
        assertEq(balanceCommitment.balances(mockVault1), 4.0 ether);
        assertEq(balanceCommitment.getBalance(mockVault1), 4.0 ether);
    }

    function test_recordDeposit_zeroAddress_reverts() public {
        vm.expectRevert(BalanceCommitment.ZeroAddress.selector);
        balanceCommitment.recordDeposit(address(0), 1 ether);
    }

    function test_commitTransparentBalance_compatibility() public {
        balanceCommitment.commitTransparentBalance(mockVault2, 10 ether);
        assertEq(balanceCommitment.balances(mockVault2), 10 ether);
        assertEq(balanceCommitment.getBalance(mockVault2), 10 ether);
    }

    function test_commitTransparentBalance_zeroAddress_reverts() public {
        vm.expectRevert(BalanceCommitment.ZeroAddress.selector);
        balanceCommitment.commitTransparentBalance(address(0), 10 ether);
    }

    function test_calculateProRataPayout_exactShare() public {
        balanceCommitment.commitTransparentBalance(mockVault1, 10 ether);

        // Alice: 40% (4,000 bps)
        uint256 payoutAlice = balanceCommitment.calculateProRataPayout(mockVault1, 4000);
        assertEq(payoutAlice, 4 ether);

        // Bob: 60% (6,000 bps)
        uint256 payoutBob = balanceCommitment.calculateProRataPayout(mockVault1, 6000);
        assertEq(payoutBob, 6 ether);

        // Total equals 10 ether
        assertEq(payoutAlice + payoutBob, 10 ether);
    }

    function test_calculateProRataPayout_unevenShares() public {
        balanceCommitment.commitTransparentBalance(mockVault1, 1 ether); // 10^18 wei

        // 33.33% = 3333 bps
        uint256 shareA = balanceCommitment.calculateProRataPayout(mockVault1, 3333);
        uint256 shareB = balanceCommitment.calculateProRataPayout(mockVault1, 3333);
        uint256 shareC = balanceCommitment.calculateProRataPayout(mockVault1, 3334);

        assertEq(shareA, 0.3333 ether);
        assertEq(shareB, 0.3333 ether);
        assertEq(shareC, 0.3334 ether);
        assertEq(shareA + shareB + shareC, 1 ether);
    }

    function test_deductPayout_reducesBalance() public {
        balanceCommitment.recordDeposit(mockVault1, 5 ether);
        balanceCommitment.deductPayout(mockVault1, 2 ether);

        assertEq(balanceCommitment.getBalance(mockVault1), 3 ether);
    }

    function test_deductPayout_exceedsBalance_reverts() public {
        balanceCommitment.recordDeposit(mockVault1, 1 ether);

        vm.expectRevert(
            abi.encodeWithSelector(
                BalanceCommitment.InsufficientBalance.selector,
                2 ether,
                1 ether
            )
        );
        balanceCommitment.deductPayout(mockVault1, 2 ether);
    }

    function test_deductPayout_zeroAddress_reverts() public {
        vm.expectRevert(BalanceCommitment.ZeroAddress.selector);
        balanceCommitment.deductPayout(address(0), 1 ether);
    }

    function test_multipleVaults_isolatedBalances() public {
        balanceCommitment.recordDeposit(mockVault1, 1 ether);
        balanceCommitment.recordDeposit(mockVault2, 2 ether);
        balanceCommitment.recordDeposit(mockVault3, 3 ether);

        assertEq(balanceCommitment.getBalance(mockVault1), 1 ether);
        assertEq(balanceCommitment.getBalance(mockVault2), 2 ether);
        assertEq(balanceCommitment.getBalance(mockVault3), 3 ether);

        balanceCommitment.deductPayout(mockVault2, 1.5 ether);
        assertEq(balanceCommitment.getBalance(mockVault1), 1 ether);
        assertEq(balanceCommitment.getBalance(mockVault2), 0.5 ether);
        assertEq(balanceCommitment.getBalance(mockVault3), 3 ether);
    }
}
