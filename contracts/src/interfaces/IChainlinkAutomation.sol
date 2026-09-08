// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AutomationCompatibleInterface} from "@chainlink/contracts/src/v0.8/automation/interfaces/AutomationCompatibleInterface.sol";

/// @title IChainlinkAutomation
/// @notice Interface for Chainlink Automation, inheriting AutomationCompatibleInterface.
/// @dev Implements checkUpkeep / performUpkeep so Chainlink Automation
///      monitors the check-in timeout on-chain without a centralized server or cron.
///      See docs/ARCHITECTURE.md and docs/PROJECT-PLAN.md Days 3–4.
interface IChainlinkAutomation is AutomationCompatibleInterface {}
