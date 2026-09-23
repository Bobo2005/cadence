// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAToken} from "../../src/interfaces/IAToken.sol";

/// @title MockAToken
/// @notice High-fidelity mock of an Aave v3 aToken with ray-based liquidity index interest accrual.
contract MockAToken is ERC20, IAToken {
    uint256 public constant RAY = 1e27;

    address public immutable override UNDERLYING_ASSET_ADDRESS;
    address public pool;

    /// @notice Aave v3 liquidity index in ray (starts at 1.0 = 1e27)
    uint256 public liquidityIndex = RAY;

    /// @notice Scaled balances per Aave v3 design
    mapping(address => uint256) private _scaledBalances;
    uint256 private _totalScaledSupply;

    modifier onlyPool() {
        require(msg.sender == pool, "MockAToken: Only pool");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        address underlyingAsset,
        address _pool
    ) ERC20(name, symbol) {
        UNDERLYING_ASSET_ADDRESS = underlyingAsset;
        pool = _pool;
    }

    function setPool(address _pool) external {
        if (pool == address(0)) {
            pool = _pool;
        } else {
            require(msg.sender == pool, "Only pool can update pool");
            pool = _pool;
        }
    }

    /// @notice Simulates interest accrual by increasing the liquidity index.
    /// @param increaseBps Basis points increase (e.g. 500 = 5% interest accrued)
    function simulateYieldAccrual(uint256 increaseBps) external {
        liquidityIndex = (liquidityIndex * (10000 + increaseBps)) / 10000;
    }

    /// @notice Direct setter for liquidityIndex.
    function setLiquidityIndex(uint256 newIndex) external {
        require(newIndex >= liquidityIndex, "Index can only increase");
        liquidityIndex = newIndex;
    }

    /// @notice Mints aTokens to `user` by scaling amount against current liquidityIndex.
    function mint(address user, uint256 amount) external onlyPool returns (bool) {
        uint256 amountScaled = (amount * RAY) / liquidityIndex;
        _scaledBalances[user] += amountScaled;
        _totalScaledSupply += amountScaled;
        emit Transfer(address(0), user, amount);
        return true;
    }

    /// @notice Burns aTokens from `user` by scaling amount against current liquidityIndex.
    function burn(address user, uint256 amount) external onlyPool {
        uint256 amountScaled = (amount * RAY) / liquidityIndex;
        if (amountScaled > _scaledBalances[user]) {
            amountScaled = _scaledBalances[user];
        }
        _scaledBalances[user] -= amountScaled;
        _totalScaledSupply -= amountScaled;
        emit Transfer(user, address(0), amount);
    }

    /// @notice Returns user's dynamic balance: scaled balance * current liquidityIndex.
    function balanceOf(address user) public view override(ERC20, IERC20) returns (uint256) {
        return (_scaledBalances[user] * liquidityIndex) / RAY;
    }

    /// @notice Returns scaled balance of user.
    function scaledBalanceOf(address user) external view returns (uint256) {
        return _scaledBalances[user];
    }

    /// @notice Total supply dynamically scales with liquidity index.
    function totalSupply() public view override(ERC20, IERC20) returns (uint256) {
        return (_totalScaledSupply * liquidityIndex) / RAY;
    }
}
