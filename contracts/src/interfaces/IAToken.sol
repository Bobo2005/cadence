// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title IAToken
/// @notice Minimal interface for Aave v3 aTokens exposing standard ERC-20 balanceOf and underlying asset address.
interface IAToken is IERC20 {
    /// @notice Returns the address of the underlying reserve asset.
    function UNDERLYING_ASSET_ADDRESS() external view returns (address);
}
