// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAavePool} from "../../src/interfaces/IAavePool.sol";
import {MockAToken} from "./MockAToken.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title MockAavePool
/// @notice High-fidelity mock of Aave v3 Pool implementing IAavePool.
contract MockAavePool is IAavePool {
    using SafeERC20 for IERC20;

    mapping(address => address) public reserveATokens;

    event Supplied(address indexed asset, uint256 amount, address indexed onBehalfOf, uint16 referralCode);
    event Withdrawn(address indexed asset, uint256 amount, address indexed to);

    function initReserve(address asset, address aToken) external {
        reserveATokens[asset] = aToken;
    }

    function getReserveAToken(address asset) external view override returns (address) {
        return reserveATokens[asset];
    }

    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external override {
        require(amount > 0, "Amount must be > 0");
        address aTokenAddress = reserveATokens[asset];
        require(aTokenAddress != address(0), "Reserve not initialized");

        // Transfer underlying asset to pool
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        // Mint overlying aTokens to onBehalfOf
        MockAToken(aTokenAddress).mint(onBehalfOf, amount);

        emit Supplied(asset, amount, onBehalfOf, referralCode);
    }

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external override returns (uint256) {
        require(amount > 0, "Amount must be > 0");
        address aTokenAddress = reserveATokens[asset];
        require(aTokenAddress != address(0), "Reserve not initialized");

        MockAToken aToken = MockAToken(aTokenAddress);
        uint256 userBal = aToken.balanceOf(msg.sender);
        uint256 amountToWithdraw = amount;
        if (amount == type(uint256).max || amountToWithdraw > userBal) {
            amountToWithdraw = userBal;
        }

        // Burn aTokens from caller
        aToken.burn(msg.sender, amountToWithdraw);

        // Send underlying asset directly to `to` address
        IERC20(asset).safeTransfer(to, amountToWithdraw);

        emit Withdrawn(asset, amountToWithdraw, to);
        return amountToWithdraw;
    }
}
