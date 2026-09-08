// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title BalanceCommitment
/// @notice Standard transparent balance accounting module for Cadence inheritance vaults.
/// @dev DE-SCOPED from Pedersen commitment per Day 13 Go/No-Go protocol in docs/PROJECT-PLAN.md Feature Spotlight B:
///      - Criterion 1 (Gas < 300k) PASSED (95,656 gas).
///      - Criterion 2 (Client latency < 3s) PASSED (35.78 ms).
///      - Criterion 3 (Claim flow consistency & no scalar field / rounding mismatches) FAILED:
///        1. BN254 scalar field order q (~2^253.5) truncates standard 256-bit uint256 EVM balances.
///        2. Homomorphic modular inverse pro-rata division produces modular residue, failing integer wei equality.
///        3. Lacks ZK range proofs (which require >2M gas, violating Criterion 1), allowing negative underflow attacks.
///        4. Plaintext balance is permanently exposed upon the very first claim reveal.
///      Per protocol rules, Pedersen commitments were de-scoped immediately to standard transparent
///      balance accounting (mapping(address => uint256) public balances) without cryptographic reveal-and-verify steps.
contract BalanceCommitment {
    // --- Storage ---
    // Vault Address => Plaintext Balance in wei
    mapping(address => uint256) public balances;

    // --- Events ---
    event DepositRecorded(address indexed vault, uint256 amount, uint256 newTotal);
    event TransparentBalanceCommitted(address indexed vault, uint256 balance);
    event PayoutDeducted(address indexed vault, uint256 amount, uint256 remainingBalance);

    // --- Custom Errors ---
    error InsufficientBalance(uint256 requested, uint256 available);
    error ZeroAddress();

    // =========================================================================
    // Transparent Balance Accounting
    // =========================================================================

    /// @notice Records an incoming deposit to a vault's balance.
    /// @param vault Address of the vault contract.
    /// @param amount Amount in wei deposited.
    function recordDeposit(address vault, uint256 amount) external {
        if (vault == address(0)) revert ZeroAddress();
        balances[vault] += amount;
        emit DepositRecorded(vault, amount, balances[vault]);
    }

    /// @notice Commits a vault's transparent balance directly.
    /// @dev Provides compatibility for transparent fallback initialization.
    /// @param vault Address of the vault contract.
    /// @param balance Plaintext balance in wei.
    function commitTransparentBalance(address vault, uint256 balance) external {
        if (vault == address(0)) revert ZeroAddress();
        balances[vault] = balance;
        emit TransparentBalanceCommitted(vault, balance);
    }

    /// @notice Deducts a claimed payout from the vault's transparent balance.
    /// @param vault Address of the vault contract.
    /// @param amount Amount in wei to deduct.
    function deductPayout(address vault, uint256 amount) external {
        if (vault == address(0)) revert ZeroAddress();
        uint256 current = balances[vault];
        if (amount > current) {
            revert InsufficientBalance(amount, current);
        }
        balances[vault] = current - amount;
        emit PayoutDeducted(vault, amount, balances[vault]);
    }

    // =========================================================================
    // View Helpers
    // =========================================================================

    /// @notice Returns the live transparent balance of a vault.
    /// @param vault Address of the vault contract.
    /// @return balance Amount in wei.
    function getBalance(address vault) external view returns (uint256) {
        return balances[vault];
    }

    /// @notice Calculates a beneficiary's exact pro-rata share in wei.
    /// @dev Uses standard EVM integer division with zero reveal-and-verify overhead.
    /// @param vault Address of the vault contract.
    /// @param shareBps Basis points share of the beneficiary (e.g. 4000 = 40%).
    /// @return payout Amount in wei.
    function calculateProRataPayout(
        address vault,
        uint256 shareBps
    ) external view returns (uint256 payout) {
        uint256 total = balances[vault];
        payout = (total * shareBps) / 10000;
    }
}
