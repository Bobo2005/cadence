// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAavePool
/// @notice Minimal interface for Aave v3 Pool exposing supply, withdraw, and reserve queries.
interface IAavePool {
    /// @notice Supplies an amount of underlying asset into the reserve, receiving in return overlying aTokens.
    /// @param asset The address of the underlying asset to supply
    /// @param amount The amount to be supplied
    /// @param onBehalfOf The address that will receive the aTokens, same as msg.sender if the beneficiary
    /// @param referralCode Code used to register the integrator if any, else 0
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    /// @notice Withdraws an amount of underlying asset from the reserve, burning the equivalent aTokens.
    /// @param asset The address of the underlying asset to withdraw
    /// @param amount The underlying amount to be withdrawn
    /// @param to The address that will receive the underlying
    /// @return The final amount withdrawn
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);

    /// @notice Returns the aToken address for the given underlying asset.
    /// @param asset The address of the underlying reserve asset
    /// @return The corresponding aToken address
    function getReserveAToken(address asset) external view returns (address);
}
