/**
 * contracts.ts — viem contract clients & ABI definitions
 *
 * Generated with full Foundry build artifact ABIs and Sepolia testnet addresses:
 * 1. InheritanceVault (Standard 90-day & Demo 3-min)
 * 2. ProofOfLifeConsensus
 * 3. GuardianRegistry
 * 4. StealthAddressRegistry (EIP-5564)
 * 5. BalanceCommitment (Transparent accounting fallback)
 * 6. BeneficiarySmartAccount (ERC-4337)
 * 7. BeneficiaryAccountFactory
 */

import {
  createPublicClient,
  fallback,
  getContract,
  http,
  encodeFunctionData,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { sepolia } from "viem/chains";

export const CONTRACT_ADDRESSES = {
  vault: (process.env.NEXT_PUBLIC_VAULT_ADDRESS || "0x043d02c39B86CAd83E1Bf05728D32d24f6289e74") as Address,
  demoVault: (process.env.NEXT_PUBLIC_DEMO_VAULT_ADDRESS || "0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1") as Address,
  consensus: (process.env.NEXT_PUBLIC_CONSENSUS_ADDRESS || "0x781986427A17432E2d7B4B2C8a36E51a43fe6Bc1") as Address,
  demoConsensus: (process.env.NEXT_PUBLIC_DEMO_CONSENSUS_ADDRESS || "0xebbC0241acb9AE8F52836C3BB4499152c4b5EbAf") as Address,
  guardianRegistry: (process.env.NEXT_PUBLIC_GUARDIAN_REGISTRY_ADDRESS || "0xcFD059B73ca3E2d329Ed7A7A899374968C3d4863") as Address,
  demoGuardianRegistry: (process.env.NEXT_PUBLIC_DEMO_GUARDIAN_REGISTRY_ADDRESS || "0xac0f91C7d7c3537896248C42fc880F6DFF838622") as Address,
  stealthRegistry: (process.env.NEXT_PUBLIC_STEALTH_REGISTRY_ADDRESS || "0x583eC2de840034478a61EF572cea2904bFD8671E") as Address,
  balanceCommitment: (process.env.NEXT_PUBLIC_BALANCE_COMMITMENT_ADDRESS || "0x1AeAd0c358f067E6607BAc64CD3A2581547eA1BC") as Address,
  beneficiaryFactory: (process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0x30489c0f3566AF47b71867bc992408B91E500823") as Address,
  vaultFactory: (process.env.NEXT_PUBLIC_VAULT_FACTORY_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0") as Address,
} as const;

export const CADENCE_VAULT_ADDRESS = CONTRACT_ADDRESSES.vault;
export const DEMO_VAULT_ADDRESS = CONTRACT_ADDRESSES.demoVault;

export const INHERITANCE_VAULT_ABI = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "initialOwner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "initialCheckInInterval",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "initialTokens",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "consensusAddress",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "receive",
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "allocationRoot",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "backupClaimRequests",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "vetoDeadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "active",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "beneficiaryBackups",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "backupAddress",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "vetoWindow",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cancelClaim",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelClaimWithSig",
    "inputs": [
      {
        "name": "nonce",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "deadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "sig",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "checkIn",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "checkInInterval",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "checkUpkeep",
    "inputs": [
      {
        "name": "checkData",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "upkeepNeeded",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "performData",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "claim",
    "inputs": [
      {
        "name": "shareBps",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "salt",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "proof",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claimAsBackup",
    "inputs": [
      {
        "name": "beneficiary",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "shareBps",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "salt",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "proof",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "consensus",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IProofOfLifeConsensus"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "depositETH",
    "inputs": [],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "depositToken",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "distributionSnapshot",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getBackupClaimRequest",
    "inputs": [
      {
        "name": "beneficiary",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "vetoDeadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "active",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getBackupConfig",
    "inputs": [
      {
        "name": "beneficiary",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "backupAddress",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "vetoWindow",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getConsensusState",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum IProofOfLifeConsensus.ConsensusState"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getVaultBalance",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getWhitelistedTokens",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasClaimed",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "initiateBackupClaim",
    "inputs": [
      {
        "name": "beneficiary",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isDistributionSnapshotTaken",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isInactive",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isWhitelistedToken",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "lastActiveTimestamp",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "performUpkeep",
    "inputs": [
      {
        "name": "performData",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "registerBackupClaimAddress",
    "inputs": [
      {
        "name": "backupAddress",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "vetoWindow",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "renounceOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "revokeBackupClaimAddress",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setAllocationRoot",
    "inputs": [
      {
        "name": "_allocationRoot",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setCheckInInterval",
    "inputs": [
      {
        "name": "newInterval",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setTokenWhitelist",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "status",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "timeUntilInactive",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalDeposited",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "vetoBackupClaim",
    "inputs": [
      {
        "name": "beneficiary",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "whitelistedTokens",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "AllocationRootCommitted",
    "inputs": [
      {
        "name": "root",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BackupAddressRegistered",
    "inputs": [
      {
        "name": "beneficiary",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "backupAddress",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "vetoWindow",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BackupAddressRevoked",
    "inputs": [
      {
        "name": "beneficiary",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "backupAddress",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BackupClaimExecuted",
    "inputs": [
      {
        "name": "beneficiary",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "backupAddress",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "shareBps",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "ethAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BackupClaimInitiated",
    "inputs": [
      {
        "name": "beneficiary",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "backupAddress",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "vetoDeadline",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BackupClaimVetoed",
    "inputs": [
      {
        "name": "beneficiary",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "vetoedBy",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CheckInIntervalUpdated",
    "inputs": [
      {
        "name": "newInterval",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ClaimExecuted",
    "inputs": [
      {
        "name": "beneficiary",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "shareBps",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "ethAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Deposit",
    "inputs": [
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "token",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnerCheckedIn",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TokenWhitelistUpdated",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "status",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "UpkeepPerformed",
    "inputs": [
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "performData",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyClaimed",
    "inputs": [
      {
        "name": "beneficiary",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "BackupClaimAlreadyActive",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidProof",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidRoot",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidState",
    "inputs": [
      {
        "name": "current",
        "type": "uint8",
        "internalType": "enum IProofOfLifeConsensus.ConsensusState"
      }
    ]
  },
  {
    "type": "error",
    "name": "NoActiveBackupClaim",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotBackupAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OwnableInvalidOwner",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "OwnableUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RootNotCommitted",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "SelfBackupNotAllowed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TokenNotWhitelisted",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "TransferFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Unauthorized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "VaultNotFinalized",
    "inputs": [
      {
        "name": "current",
        "type": "uint8",
        "internalType": "enum IProofOfLifeConsensus.ConsensusState"
      }
    ]
  },
  {
    "type": "error",
    "name": "VetoWindowNotElapsed",
    "inputs": [
      {
        "name": "currentTimestamp",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "vetoDeadline",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "VetoWindowZero",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAmount",
    "inputs": []
  }
] as const;

export const PROOF_OF_LIFE_CONSENSUS_ABI = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_guardianRegistry",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "DEFAULT_CONTEST_WINDOW",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cancelClaim",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelClaimWithSig",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "nonce",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "deadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "sig",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelNonces",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "checkUpkeep",
    "inputs": [
      {
        "name": "checkData",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "upkeepNeeded",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "performData",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "checkVaultUpkeep",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "upkeepNeeded",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "performData",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "configureVault",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "checkInInterval",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "contestWindowDuration",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "consensusConfigs",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "checkInInterval",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "lastActiveTimestamp",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "contestWindowDuration",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "claimPendingTimestamp",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "contestDeadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "state",
        "type": "uint8",
        "internalType": "enum IProofOfLifeConsensus.ConsensusState"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "eip712Domain",
    "inputs": [],
    "outputs": [
      {
        "name": "fields",
        "type": "bytes1",
        "internalType": "bytes1"
      },
      {
        "name": "name",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "version",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "chainId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "verifyingContract",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "salt",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "extensions",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "finalizeContest",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getCheckInInterval",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getConsensusConfig",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IProofOfLifeConsensus.ConsensusConfig",
        "components": [
          {
            "name": "checkInInterval",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lastActiveTimestamp",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "contestWindowDuration",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "claimPendingTimestamp",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "contestDeadline",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "state",
            "type": "uint8",
            "internalType": "enum IProofOfLifeConsensus.ConsensusState"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getContestDeadline",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getLastActiveTimestamp",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getState",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum IProofOfLifeConsensus.ConsensusState"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "guardianRegistry",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IGuardianRegistry"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isTimeoutExpired",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "performUpkeep",
    "inputs": [
      {
        "name": "performData",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "performVaultUpkeep",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "performData",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "recordHeartbeat",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setCheckInInterval",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "newInterval",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setContestWindow",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "newDuration",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "timeUntilFinalized",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "timeUntilTimeout",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "triggerClaimPending",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "vaultOwners",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "CheckInIntervalUpdated",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newInterval",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ClaimCancelled",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ClaimPendingTriggered",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "contestDeadline",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ConsensusConfigured",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "checkInInterval",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "contestWindowDuration",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ContestFinalized",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ContestWindowUpdated",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newDuration",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EIP712DomainChanged",
    "inputs": [],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "HeartbeatRecorded",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "StateTransition",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "previousState",
        "type": "uint8",
        "indexed": true,
        "internalType": "enum IProofOfLifeConsensus.ConsensusState"
      },
      {
        "name": "newState",
        "type": "uint8",
        "indexed": true,
        "internalType": "enum IProofOfLifeConsensus.ConsensusState"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "ContestWindowActive",
    "inputs": [
      {
        "name": "timeRemaining",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ContestWindowExpired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DeadlineExpired",
    "inputs": [
      {
        "name": "deadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "current",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignatureLength",
    "inputs": [
      {
        "name": "length",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignatureS",
    "inputs": [
      {
        "name": "s",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "GuardianThresholdNotMet",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidInterval",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidNonce",
    "inputs": [
      {
        "name": "expected",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "actual",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidShortString",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidState",
    "inputs": [
      {
        "name": "current",
        "type": "uint8",
        "internalType": "enum IProofOfLifeConsensus.ConsensusState"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotConfigured",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "StringTooLong",
    "inputs": [
      {
        "name": "str",
        "type": "string",
        "internalType": "string"
      }
    ]
  },
  {
    "type": "error",
    "name": "TimeoutNotExpired",
    "inputs": [
      {
        "name": "timeRemaining",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "Unauthorized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "UpkeepNotNeeded",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  }
] as const;

export const GUARDIAN_REGISTRY_ABI = [
  {
    "type": "function",
    "name": "attest",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "proof",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "attestWithSig",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "guardian",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "proof",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      },
      {
        "name": "signature",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "attestationCycle",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "commitGuardianRoot",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "guardianRoot",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "threshold",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalGuardians",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "consensusContracts",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAttestationCount",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getGuardianConfig",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IGuardianRegistry.GuardianConfig",
        "components": [
          {
            "name": "guardianRoot",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "threshold",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "totalGuardians",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "attestationCount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "thresholdReached",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "guardianConfigs",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "guardianRoot",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "threshold",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalGuardians",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "attestationCount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "thresholdReached",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasAttestedByCycle",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasGuardianAttested",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "guardian",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isThresholdMet",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "resetAttestations",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setConsensusForVault",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_consensus",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "vaultOwners",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "verifyGuardian",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "guardian",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "proof",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "AttestationsReset",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newCycle",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GuardianAttested",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "guardian",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "attestationCount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GuardianRootCommitted",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "guardianRoot",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "threshold",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "totalGuardians",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GuardianThresholdMet",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "attestationCount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "threshold",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "DuplicateAttestation",
    "inputs": [
      {
        "name": "guardian",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignatureLength",
    "inputs": [
      {
        "name": "length",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignatureS",
    "inputs": [
      {
        "name": "s",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidGuardianProof",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidRoot",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidThreshold",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RootNotCommitted",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "Unauthorized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  }
] as const;

export const STEALTH_ADDRESS_REGISTRY_ABI = [
  {
    "type": "function",
    "name": "SECP256K1_SCHEME_ID",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "announce",
    "inputs": [
      {
        "name": "schemeId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "stealthAddress",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "ephemeralPubKey",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "metadata",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getStealthMetaAddress",
    "inputs": [
      {
        "name": "registrant",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "schemeId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "spendingPubKey",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "viewingPubKey",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nonces",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "registerKeys",
    "inputs": [
      {
        "name": "schemeId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "spendingPubKey",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "viewingPubKey",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "registerKeysOnBehalf",
    "inputs": [
      {
        "name": "registrant",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "schemeId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "signature",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "spendingPubKey",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "viewingPubKey",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "Announcement",
    "inputs": [
      {
        "name": "schemeId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "stealthAddress",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "caller",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "ephemeralPubKey",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      },
      {
        "name": "metadata",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "StealthMetaAddressRegistered",
    "inputs": [
      {
        "name": "registrant",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "schemeId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "spendingPubKey",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      },
      {
        "name": "viewingPubKey",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignatureLength",
    "inputs": [
      {
        "name": "length",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignatureS",
    "inputs": [
      {
        "name": "s",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidKeyLength",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidSchemeId",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  }
] as const;

export const BALANCE_COMMITMENT_ABI = [
  {
    "type": "function",
    "name": "balances",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "calculateProRataPayout",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "shareBps",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "payout",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "commitTransparentBalance",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "balance",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "deductPayout",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getBalance",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "recordDeposit",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "DepositRecorded",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "newTotal",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PayoutDeducted",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "remainingBalance",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TransparentBalanceCommitted",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "balance",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "InsufficientBalance",
    "inputs": [
      {
        "name": "requested",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "available",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  }
] as const;

export const BENEFICIARY_SMART_ACCOUNT_ABI = [
  {
    "type": "receive",
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "backupAddress",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "backupVetoWindow",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cancelRecovery",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "currentRecovery",
    "inputs": [],
    "outputs": [
      {
        "name": "proposedOwner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "supportCount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "active",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "proposalNonce",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "entryPoint",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "execute",
    "inputs": [
      {
        "name": "dest",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "executeRecovery",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "finalizeBackupActivation",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getBackupActivation",
    "inputs": [],
    "outputs": [
      {
        "name": "vetoDeadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "active",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getGuardians",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "guardians",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasSupportedRecovery",
    "inputs": [
      {
        "name": "nonce",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "guardian",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "initialize",
    "inputs": [
      {
        "name": "_owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_entryPoint",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_guardians",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "_recoveryThreshold",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "initiateBackupActivation",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "initiateRecovery",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isGuardian",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "recoverWithSignatures",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "signatures",
        "type": "bytes[]",
        "internalType": "bytes[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "recoveryNonce",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "recoveryThreshold",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "revokeBackupAddress",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setBackupAddress",
    "inputs": [
      {
        "name": "_backupAddress",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_vetoWindow",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "supportRecovery",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "validateUserOp",
    "inputs": [
      {
        "name": "userOp",
        "type": "tuple",
        "internalType": "struct PackedUserOperation",
        "components": [
          {
            "name": "sender",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "nonce",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "initCode",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "callData",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "accountGasLimits",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "preVerificationGas",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "gasFees",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "paymasterAndData",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "signature",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      },
      {
        "name": "userOpHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "missingAccountFunds",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "validationData",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "vetoBackupActivation",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "AccountInitialized",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "entryPoint",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "guardians",
        "type": "address[]",
        "indexed": false,
        "internalType": "address[]"
      },
      {
        "name": "recoveryThreshold",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BackupActivationFinalized",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BackupActivationInitiated",
    "inputs": [
      {
        "name": "backupAddress",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "vetoDeadline",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BackupActivationVetoed",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BackupAddressRevoked",
    "inputs": [
      {
        "name": "previousBackup",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BackupAddressSet",
    "inputs": [
      {
        "name": "backupAddress",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "vetoWindow",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RecoveryCancelled",
    "inputs": [
      {
        "name": "cancelledBy",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "proposedOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "proposalNonce",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RecoveryExecuted",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "proposalNonce",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RecoveryInitiated",
    "inputs": [
      {
        "name": "guardian",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "proposedOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "proposalNonce",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RecoverySupported",
    "inputs": [
      {
        "name": "guardian",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "proposedOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "currentSupport",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "threshold",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TransactionExecuted",
    "inputs": [
      {
        "name": "dest",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyInitialized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AlreadySupported",
    "inputs": [
      {
        "name": "guardian",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "BackupActivationAlreadyActive",
    "inputs": []
  },
  {
    "type": "error",
    "name": "CallFailed",
    "inputs": [
      {
        "name": "returnData",
        "type": "bytes",
        "internalType": "bytes"
      }
    ]
  },
  {
    "type": "error",
    "name": "DuplicateGuardian",
    "inputs": [
      {
        "name": "guardian",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignatureLength",
    "inputs": [
      {
        "name": "length",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ECDSAInvalidSignatureS",
    "inputs": [
      {
        "name": "s",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidGuardians",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidThreshold",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoActiveBackupActivation",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotBackupAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OnlyEntryPoint",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OnlyGuardian",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OnlyOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ProposalMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RecoveryAlreadyActive",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RecoveryNotActive",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SelfBackupNotAllowed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ThresholdNotMet",
    "inputs": [
      {
        "name": "current",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "required",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "Unauthorized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "VetoWindowNotElapsed",
    "inputs": [
      {
        "name": "currentTimestamp",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "vetoDeadline",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "VetoWindowZero",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  }
] as const;

export const BENEFICIARY_ACCOUNT_FACTORY_ABI = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_entryPoint",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createAccount",
    "inputs": [
      {
        "name": "beneficiary",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "nominatedGuardians",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "recoveryThreshold",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "salt",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "entryPoint",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAccountsForBeneficiary",
    "inputs": [
      {
        "name": "beneficiary",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAddress",
    "inputs": [
      {
        "name": "beneficiary",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "salt",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isDeployedAccount",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "BeneficiaryAccountCreated",
    "inputs": [
      {
        "name": "beneficiary",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "smartAccount",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "recoveryThreshold",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "salt",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "Create2EmptyBytecode",
    "inputs": []
  },
  {
    "type": "error",
    "name": "FailedDeployment",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientBalance",
    "inputs": [
      {
        "name": "balance",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "needed",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidGuardians",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidThreshold",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  }
] as const;

export const ConsensusState = {
  Active: 0,
  ClaimPending: 1,
  Contested: 2,
  Finalized: 3,
} as const;

export type ConsensusState = (typeof ConsensusState)[keyof typeof ConsensusState];

export function formatConsensusState(state: ConsensusState | number): {
  label: string;
  color: string;
  description: string;
} {
  switch (state) {
    case ConsensusState.Active:
      return {
        label: "Active",
        color: "var(--accent-pulse)",
        description: "Owner heartbeat is active. Inactivity timeout has not elapsed.",
      };
    case ConsensusState.ClaimPending:
      return {
        label: "Claim Pending (Contest Window)",
        color: "var(--accent-warning)",
        description: "Timeout & guardian threshold met. 72-hour contest window active.",
      };
    case ConsensusState.Contested:
      return {
        label: "Contested",
        color: "var(--accent-danger)",
        description: "Claim was contested by the owner stealth key.",
      };
    case ConsensusState.Finalized:
      return {
        label: "Finalized",
        color: "var(--accent-pulse)",
        description: "Contest window passed without contest. Beneficiary claims are UNLOCKED.",
      };
    default:
      return {
        label: "Unknown",
        color: "var(--text-secondary)",
        description: "Unrecognized consensus state.",
      };
  }
}

/**
 * Encodes the calldata for the claim function on InheritanceVault.
 */
export function encodeClaimCalldata(
  shareBps: number | bigint,
  salt: Hex,
  proof: Hex[]
): Hex {
  return encodeFunctionData({
    abi: INHERITANCE_VAULT_ABI,
    functionName: "claim",
    args: [BigInt(shareBps), salt, proof],
  });
}

export function encodeTriggerClaimPendingCalldata(vault: Hex | string): Hex {
  return encodeFunctionData({
    abi: PROOF_OF_LIFE_CONSENSUS_ABI,
    functionName: "triggerClaimPending",
    args: [vault as Address],
  });
}

export function encodeFinalizeContestCalldata(vault: Hex | string): Hex {
  return encodeFunctionData({
    abi: PROOF_OF_LIFE_CONSENSUS_ABI,
    functionName: "finalizeContest",
    args: [vault as Address],
  });
}

export function encodeAttestCalldata(vault: Hex | string, proof: Hex[]): Hex {
  return encodeFunctionData({
    abi: GUARDIAN_REGISTRY_ABI,
    functionName: "attest",
    args: [vault as Address, proof],
  });
}

// -----------------------------------------------------------------------------
// Viem Client Infrastructure & Contract Factories
// -----------------------------------------------------------------------------

const primaryRpc =
  process.env.NEXT_PUBLIC_RPC_URL ||
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;

export const sepoliaRpcPool = [
  ...(primaryRpc ? [http(primaryRpc)] : []),
  http("https://ethereum-sepolia-rpc.publicnode.com"),
  http("https://rpc.sepolia.org"),
  http("https://1rpc.io/sepolia"),
  http("https://sepolia.gateway.tenderly.co"),
];

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: fallback(sepoliaRpcPool),
});

export function getInheritanceVaultContract(
  address: Address = CONTRACT_ADDRESSES.vault,
  client: PublicClient | WalletClient = publicClient
) {
  return getContract({
    address,
    abi: INHERITANCE_VAULT_ABI,
    client,
  });
}

export function getConsensusContract(
  address: Address = CONTRACT_ADDRESSES.consensus,
  client: PublicClient | WalletClient = publicClient
) {
  return getContract({
    address,
    abi: PROOF_OF_LIFE_CONSENSUS_ABI,
    client,
  });
}

export function getGuardianRegistryContract(
  address: Address = CONTRACT_ADDRESSES.guardianRegistry,
  client: PublicClient | WalletClient = publicClient
) {
  return getContract({
    address,
    abi: GUARDIAN_REGISTRY_ABI,
    client,
  });
}

export function getStealthRegistryContract(
  address: Address = CONTRACT_ADDRESSES.stealthRegistry,
  client: PublicClient | WalletClient = publicClient
) {
  return getContract({
    address,
    abi: STEALTH_ADDRESS_REGISTRY_ABI,
    client,
  });
}

export function getBalanceCommitmentContract(
  address: Address = CONTRACT_ADDRESSES.balanceCommitment,
  client: PublicClient | WalletClient = publicClient
) {
  return getContract({
    address,
    abi: BALANCE_COMMITMENT_ABI,
    client,
  });
}

export function getBeneficiarySmartAccountContract(
  address: Address,
  client: PublicClient | WalletClient = publicClient
) {
  return getContract({
    address,
    abi: BENEFICIARY_SMART_ACCOUNT_ABI,
    client,
  });
}

export function getBeneficiaryFactoryContract(
  address: Address = CONTRACT_ADDRESSES.beneficiaryFactory,
  client: PublicClient | WalletClient = publicClient
) {
  return getContract({
    address,
    abi: BENEFICIARY_ACCOUNT_FACTORY_ABI,
    client,
  });
}

// Pre-instantiated public read-only contract bundle


export const VAULT_FACTORY_ABI = [
  {
    "type": "function",
    "name": "allVaults",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "allVaultsLength",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "deployVault",
    "inputs": [
      {
        "name": "initialOwner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "initialCheckInInterval",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "initialTokens",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "consensusAddress",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "vaultAddress",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getVaultsByOwner",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isFactoryVault",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "vaultsByOwner",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "VaultDeployed",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "checkInInterval",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "consensus",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  }
] as const;

export const INHERITANCE_VAULT_BYTECODE = "0x60a060405234801562000010575f80fd5b5060405162002df538038062002df583398101604081905262000033916200029f565b836001600160a01b0381166200006257604051631e4fbdf760e01b81525f600482015260240160405180910390fd5b6200006d8162000220565b5060017f9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00556001600160a01b038116620000ba5760405163d92e233d60e01b815260040160405180910390fd5b6001600160a01b038181166080819052604051637e962c8b60e01b81523060048201529186166024830152604482018590526203f480606483015290637e962c8b906084015f604051808303815f87803b15801562000117575f80fd5b505af11580156200012a573d5f803e3d5ffd5b505050505f5b825181101562000215575f8382815181106200015057620001506200039e565b602002602001015190505f6001600160a01b0316816001600160a01b0316146200020b576001600160a01b0381165f818152600360209081526040808320805460ff1916600190811790915560048054808301825594527f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b90930180546001600160a01b03191685179055519182527f67821d5384bb02aab1ba91a477f89c9966cd30f475b02618bdc58712bca51275910160405180910390a25b5060010162000130565b5050505050620003b2565b5f80546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b80516001600160a01b038116811462000286575f80fd5b919050565b634e487b7160e01b5f52604160045260245ffd5b5f805f8060808587031215620002b3575f80fd5b620002be856200026f565b60208681015160408801519296509450906001600160401b0380821115620002e4575f80fd5b818801915088601f830112620002f8575f80fd5b8151818111156200030d576200030d6200028b565b8060051b604051601f19603f830116810181811085821117156200033557620003356200028b565b60405291825284820192508381018501918b83111562000353575f80fd5b938501935b828510156200037c576200036c856200026f565b8452938501939285019262000358565b80975050505050505062000393606086016200026f565b905092959194509250565b634e487b7160e01b5f52603260045260245ffd5b6080516129c1620004345f395f818161055d015281816108c001528181610a6701528181610b0d01528181610b5a01528181610d1a01528181610dab01528181610e3e01528181610fc301528181611409015281816115e40152818161176f015281816119f201528181611a9f01528181611c1b015261201a01526129c15ff3fe608060405260043610610220575f3560e01c806373b2e80e1161011e578063d3d7c002116100a8578063e26f79001161006d578063e26f79001461072f578063e7bfdf9914610750578063ea87627d1461076f578063f2fde38b14610790578063f6326fb3146107af575f80fd5b8063d3d7c0021461065f578063dc0e424d1461067e578063df3985431461069d578063e21ca638146106bc578063e22e4aea14610710575f80fd5b80639417ecbe116100ee5780639417ecbe146105b4578063ab37f486146105df578063b2a481781461060d578063bfd25fa51461062c578063c9bcc97e14610640575f80fd5b806373b2e80e146105025780638da5cb5b146105305780638ef3f7611461054c57806393f8565f1461057f575f80fd5b8063411063b4116101aa5780636b9aed461161016f5780636b9aed46146104795780636e04ff0d1461049857806370265c7a146104c5578063711bd04e146104d9578063715018a6146104ee575f80fd5b8063411063b4146103955780634585e33b146103f25780635305548114610411578063548bda3a1461043c5780635e829a0214610465575f80fd5b80632154bc44116101f05780632154bc44146102f55780632bd7cc0f1461032c5780632de0ea0214610340578063338b5dea1461036257806335c817cc14610381575f80fd5b806308bf49a114610233578063111c607614610252578063183ff08514610271578063187bc8f214610285575f80fd5b3661022f5761022d6107b3565b005b5f80fd5b34801561023e575f80fd5b5061022d61024d3660046123c7565b610869565b34801561025d575f80fd5b5061022d61026c3660046123f9565b610922565b34801561027c575f80fd5b5061022d610a15565b348015610290575f80fd5b506102db61029f366004612421565b6001600160a01b03165f908152600260209081526040918290208251808401909352805480845260019091015460ff1615159290910182905291565b604080519283529015156020830152015b60405180910390f35b348015610300575f80fd5b5061031461030f3660046123c7565b610ac9565b6040516001600160a01b0390911681526020016102ec565b348015610337575f80fd5b5061022d610af1565b34801561034b575f80fd5b50610354610b43565b6040519081526020016102ec565b34801561036d575f80fd5b5061022d61037c3660046123f9565b610bd1565b34801561038c575f80fd5b50610354610d03565b3480156103a0575f80fd5b506103d36103af366004612421565b600160208190525f918252604090912080549101546001600160a01b039091169082565b604080516001600160a01b0390931683526020830191909152016102ec565b3480156103fd575f80fd5b5061022d61040c366004612478565b610d51565b34801561041c575f80fd5b5061035461042b366004612421565b60056020525f908152604090205481565b348015610447575f80fd5b506009546104559060ff1681565b60405190151581526020016102ec565b348015610470575f80fd5b50610455610e27565b348015610484575f80fd5b5061022d6104933660046124f8565b610eaf565b3480156104a3575f80fd5b506104b76104b2366004612478565b6113e7565b6040516102ec92919061257d565b3480156104d0575f80fd5b5061022d611480565b3480156104e4575f80fd5b5061035460065481565b3480156104f9575f80fd5b5061022d611523565b34801561050d575f80fd5b5061045561051c366004612421565b60076020525f908152604090205460ff1681565b34801561053b575f80fd5b505f546001600160a01b0316610314565b348015610557575f80fd5b506103147f000000000000000000000000000000000000000000000000000000000000000081565b34801561058a575f80fd5b506102db610599366004612421565b60026020525f90815260409020805460019091015460ff1682565b3480156105bf575f80fd5b506103546105ce366004612421565b60086020525f908152604090205481565b3480156105ea575f80fd5b506104556105f9366004612421565b60036020525f908152604090205460ff1681565b348015610618575f80fd5b5061022d610627366004612421565b611534565b348015610637575f80fd5b50610354611758565b34801561064b575f80fd5b5061022d61065a3660046125c5565b6117a6565b34801561066a575f80fd5b50610354610679366004612421565b6118a9565b348015610689575f80fd5b5061022d610698366004612421565b61192b565b3480156106a8575f80fd5b5061022d6106b73660046125fa565b6119db565b3480156106c7575f80fd5b506103d36106d6366004612421565b6001600160a01b039081165f9081526001602081815260409283902083518085019094528054909416808452939091015491018190529091565b34801561071b575f80fd5b5061022d61072a3660046123c7565b611a62565b34801561073a575f80fd5b50610743611b7c565b6040516102ec9190612649565b34801561075b575f80fd5b5061022d61076a366004612695565b611bdc565b34801561077a575f80fd5b50610783612003565b6040516102ec91906126ec565b34801561079b575f80fd5b5061022d6107aa366004612421565b61208b565b61022d5b6107bb6120c8565b345f036107db57604051631f2a200560e01b815260040160405180910390fd5b5f80805260056020527f05b8ccbb9d4d8fb16ea74ce3c29a41f1b461fbdaff4714a0d9a8eb05499746bc8054349290610815908490612726565b90915550506040513481525f9033907f5548c837ab068cf56a2c2479df0882a4922fd203edb7517321831d95078c5f629060200160405180910390a361086760015f8051602061296c83398151915255565b565b6108716120e3565b6040518181527fb24e51923480d0477496736979b576ce3300ca713ab5fb476d69ea8f6aa304909060200160405180910390a160405163fb70e49f60e01b8152306004820152602481018290527f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03169063fb70e49f906044015f604051808303815f87803b158015610909575f80fd5b505af115801561091b573d5f803e3d5ffd5b5050505050565b6001600160a01b0382166109495760405163d92e233d60e01b815260040160405180910390fd5b336001600160a01b0383160361097257604051637196dc6960e01b815260040160405180910390fd5b805f03610992576040516337a7e3cf60e01b815260040160405180910390fd5b6040805180820182526001600160a01b038481168083526020808401868152335f818152600180855290889020965187546001600160a01b031916961695909517865590519490930193909355925184815290917f1dbe70bb26427543b5cba89620b2ece89c71b0d44248748f5192ebc0b3508f34910160405180910390a35050565b610a1d6120e3565b60405142815233907fcc93aea41d7d01f6d303934d972342daf1ba36a9aa055bd25c531b41a30007189060200160405180910390a2604051630f66f5ef60e01b81523060048201527f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031690630f66f5ef906024015b5f604051808303815f87803b158015610ab1575f80fd5b505af1158015610ac3573d5f803e3d5ffd5b50505050565b60048181548110610ad8575f80fd5b5f918252602090912001546001600160a01b0316905081565b610af96120e3565b604051621ad9ff60e21b81523060048201527f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031690626b67fc90602401610a9a565b60405163d08fa47b60e01b81523060048201525f907f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03169063d08fa47b906024015b602060405180830381865afa158015610ba8573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610bcc9190612739565b905090565b610bd96120c8565b6001600160a01b038216610c005760405163d92e233d60e01b815260040160405180910390fd5b6001600160a01b0382165f9081526003602052604090205460ff16610c485760405163751dff9760e11b81526001600160a01b03831660048201526024015b60405180910390fd5b805f03610c6857604051631f2a200560e01b815260040160405180910390fd5b610c7d6001600160a01b03831633308461210f565b6001600160a01b0382165f9081526005602052604081208054839290610ca4908490612726565b90915550506040518181526001600160a01b0383169033907f5548c837ab068cf56a2c2479df0882a4922fd203edb7517321831d95078c5f629060200160405180910390a3610cff60015f8051602061296c83398151915255565b5050565b60405163f288326960e01b81523060048201525f907f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03169063f288326990602401610b8d565b610d596120c8565b7fc79afd4406e862024726068d80f443b4b739fab4d9ee5e1c1f3cd872f1d17e3d428383604051610d8c93929190612778565b60405180910390a1604051637e93112760e01b81526001600160a01b037f00000000000000000000000000000000000000000000000000000000000000001690637e93112790610de49030908690869060040161279a565b5f604051808303815f87803b158015610dfb575f80fd5b505af1158015610e0d573d5f803e3d5ffd5b50505050610cff60015f8051602061296c83398151915255565b604051632701666760e11b81523060048201525f907f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031690634e02ccce90602401602060405180830381865afa158015610e8b573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610bcc91906127be565b610eb76120c8565b6001600160a01b038086165f9081526001602081815260409283902083518085019094528054909416808452939091015490820152903314610f0c57604051632c58d33b60e11b815260040160405180910390fd5b6001600160a01b0386165f908152600260209081526040918290208251808401909352805483526001015460ff161515908201819052610f5f576040516320e318a960e21b815260040160405180910390fd5b8051421015610f8c578051604051625b638f60e31b81524260048201526024810191909152604401610c3f565b600654610fac5760405163ea75680160e01b815260040160405180910390fd5b604051631bab58f560e01b81523060048201525f907f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031690631bab58f590602401602060405180830381865afa158015611010573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061103491906127d9565b9050600381600381111561104a5761104a6126d8565b1461106a578060405163a193be4360e01b8152600401610c3f91906126ec565b6001600160a01b0388165f9081526007602052604090205460ff16156110ae57604051632058b6db60e01b81526001600160a01b0389166004820152602401610c3f565b5f6110ba898989612145565b90506110fc8686808060200260200160405190810160405280939291908181526020018383602002808284375f920191909152505060065491508490506121a6565b611119576040516309bde33960e01b815260040160405180910390fd5b60095460ff16611221576009805460ff191660011790555f8080526008602052475f8051602061294c833981519152555b60045481101561121f575f60048281548110611168576111686127f7565b5f9182526020808320909101546001600160a01b0316808352600390915260409091205490915060ff1615611216576040516370a0823160e01b81523060048201526001600160a01b038216906370a0823190602401602060405180830381865afa1580156111d9573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906111fd9190612739565b6001600160a01b0382165f908152600860205260409020555b5060010161114a565b505b6001600160a01b0389165f9081526007602090815260408083208054600160ff199182168117909255600284529184200180549091169055818052600890525f8051602061294c833981519152549061271061127d8b8461280b565b6112879190612822565b905080156112f7576040515f90339083908381818185875af1925050503d805f81146112ce576040519150601f19603f3d011682016040523d82523d5f602084013e6112d3565b606091505b50509050806112f5576040516312171d8360e31b815260040160405180910390fd5b505b5f5b600454811015611384575f60048281548110611317576113176127f7565b5f9182526020808320909101546001600160a01b03168083526008909152604090912054909150801561137a575f6127106113528f8461280b565b61135c9190612822565b90508015611378576113786001600160a01b03841633836121ba565b505b50506001016112f9565b50604080518b81526020810183905233916001600160a01b038e16917fad1bf40e0ce43ef79dbf6810b7f7b195b2eda91bb3bdc5296fb0f68ce66527e5910160405180910390a350505050505061091b60015f8051602061296c83398151915255565b60405163c9c0a11f60e01b81523060048201525f906060906001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000169063c9c0a11f906024015f60405180830381865afa15801561144d573d5f803e3d5ffd5b505050506040513d5f823e601f3d908101601f191682016040526114749190810190612855565b915091505b9250929050565b335f908152600160205260409020546001600160a01b0316806114b657604051632c58d33b60e11b815260040160405180910390fd5b335f81815260016020818152604080842080546001600160a01b031916815583018490556002909152808320838155909101805460ff19169055516001600160a01b03841692917f05a0df38e8e0cb5197c7b9264c23f65e51d2f9b776f0b875ec353a6c4f1013ab91a350565b61152b6120e3565b6108675f6121f4565b6001600160a01b038082165f908152600160208181526040928390208351808501909452805490941680845293909101549082015290331461158957604051632c58d33b60e11b815260040160405180910390fd5b6001600160a01b0382165f9081526007602052604090205460ff16156115cd57604051632058b6db60e01b81526001600160a01b0383166004820152602401610c3f565b604051631bab58f560e01b81523060048201525f907f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031690631bab58f590602401602060405180830381865afa158015611631573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061165591906127d9565b9050600381600381111561166b5761166b6126d8565b1461168b578060405163a193be4360e01b8152600401610c3f91906126ec565b6001600160a01b0383165f9081526002602052604090206001015460ff16156116c75760405163013737b160e41b815260040160405180910390fd5b5f8260200151426116d89190612726565b604080518082018252828152600160208083018281526001600160a01b038a165f8181526002845286902094518555905193909201805460ff191693151593909317909255915183815292935033927f4666f783d61c0ef155b4904a7bce845e67a2709fb94d063b848c52c36a4b5eb7910160405180910390a350505050565b604051632a8a753b60e01b81523060048201525f907f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031690632a8a753b90602401610b8d565b6117ae6120e3565b6001600160a01b0382166117d55760405163d92e233d60e01b815260040160405180910390fd5b8080156117fa57506001600160a01b0382165f9081526003602052604090205460ff16155b1561184a57600480546001810182555f919091527f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b0180546001600160a01b0319166001600160a01b0384161790555b6001600160a01b0382165f81815260036020908152604091829020805460ff191685151590811790915591519182527f67821d5384bb02aab1ba91a477f89c9966cd30f475b02618bdc58712bca5127591015b60405180910390a25050565b5f6001600160a01b0382166118bf575047919050565b6040516370a0823160e01b81523060048201526001600160a01b038316906370a0823190602401602060405180830381865afa158015611901573d5f803e3d5ffd5b505050506040513d601f19601f820116820180604052508101906119259190612739565b92915050565b336001600160a01b03821614611953576040516282b42960e81b815260040160405180910390fd5b6001600160a01b0381165f9081526002602052604090206001015460ff1661198e576040516320e318a960e21b815260040160405180910390fd5b6001600160a01b0381165f81815260026020526040808220600101805460ff19169055513392917f8752415616cba98e3a237f6cc07f0aba1ac50517bac8db4d0522423ef49e1c2e91a350565b604051632208aeb760e11b81526001600160a01b037f000000000000000000000000000000000000000000000000000000000000000016906344115d6e90611a2f9030908890889088908890600401612913565b5f604051808303815f87803b158015611a46575f80fd5b505af1158015611a58573d5f803e3d5ffd5b5050505050505050565b611a6a6120e3565b80611a885760405163504570e360e01b815260040160405180910390fd5b604051631bab58f560e01b81523060048201525f907f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031690631bab58f590602401602060405180830381865afa158015611aec573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190611b1091906127d9565b90505f816003811115611b2557611b256126d8565b14611b45578060405163683f44bb60e11b8152600401610c3f91906126ec565b600682905560405142815282907f4251fea67bc7da0a6cd08b3e2888bbb307ff1ae040427489792be245335aaa469060200161189d565b60606004805480602002602001604051908101604052809291908181526020018280548015611bd257602002820191905f5260205f20905b81546001600160a01b03168152600190910190602001808311611bb4575b5050505050905090565b611be46120c8565b600654611c045760405163ea75680160e01b815260040160405180910390fd5b604051631bab58f560e01b81523060048201525f907f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031690631bab58f590602401602060405180830381865afa158015611c68573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190611c8c91906127d9565b90506003816003811115611ca257611ca26126d8565b14611cc2578060405163a193be4360e01b8152600401610c3f91906126ec565b335f9081526007602052604090205460ff1615611cf457604051632058b6db60e01b8152336004820152602401610c3f565b5f611d00338787612145565b9050611d428484808060200260200160405190810160405280939291908181526020018383602002808284375f920191909152505060065491508490506121a6565b611d5f576040516309bde33960e01b815260040160405180910390fd5b60095460ff16611e67576009805460ff191660011790555f8080526008602052475f8051602061294c833981519152555b600454811015611e65575f60048281548110611dae57611dae6127f7565b5f9182526020808320909101546001600160a01b0316808352600390915260409091205490915060ff1615611e5c576040516370a0823160e01b81523060048201526001600160a01b038216906370a0823190602401602060405180830381865afa158015611e1f573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190611e439190612739565b6001600160a01b0382165f908152600860205260409020555b50600101611d90565b505b335f9081526007602090815260408220805460ff19166001179055818052600890525f8051602061294c8339815191525490612710611ea6898461280b565b611eb09190612822565b90508015611f20576040515f90339083908381818185875af1925050503d805f8114611ef7576040519150601f19603f3d011682016040523d82523d5f602084013e611efc565b606091505b5050905080611f1e576040516312171d8360e31b815260040160405180910390fd5b505b5f5b600454811015611fad575f60048281548110611f4057611f406127f7565b5f9182526020808320909101546001600160a01b031680835260089091526040909120549091508015611fa3575f612710611f7b8d8461280b565b611f859190612822565b90508015611fa157611fa16001600160a01b03841633836121ba565b505b5050600101611f22565b50604080518981526020810183905233917fb50dcc0598795f75a00e650ff10148aa2274185f91ef64eb1e220f77d331254c910160405180910390a250505050610ac360015f8051602061296c83398151915255565b604051631bab58f560e01b81523060048201525f907f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031690631bab58f590602401602060405180830381865afa158015612067573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610bcc91906127d9565b6120936120e3565b6001600160a01b0381166120bc57604051631e4fbdf760e01b81525f6004820152602401610c3f565b6120c5816121f4565b50565b6120d0612243565b60025f8051602061296c83398151915255565b5f546001600160a01b031633146108675760405163118cdaa760e01b8152336004820152602401610c3f565b61211d848484846001612272565b610ac357604051635274afe760e01b81526001600160a01b0385166004820152602401610c3f565b604080516001600160a01b0385166020820152908101839052606081018290525f9060800160408051601f19818403018152828252805160209182012090830152016040516020818303038152906040528051906020012090509392505050565b5f6121b28484846122df565b949350505050565b6121c783838360016122f4565b6121ef57604051635274afe760e01b81526001600160a01b0384166004820152602401610c3f565b505050565b5f80546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b5f8051602061296c8339815191525460020361086757604051633ee5aeb560e01b815260040160405180910390fd5b6040516323b872dd60e01b5f8181526001600160a01b038781166004528616602452604485905291602083606481808c5af1925060015f511483166122ce5783831516156122c2573d5f823e3d81fd5b5f883b113d1516831692505b604052505f60605295945050505050565b5f826122eb8584612356565b14949350505050565b60405163a9059cbb60e01b5f8181526001600160a01b038616600452602485905291602083604481808b5af1925060015f5114831661234a57838315161561233e573d5f823e3d81fd5b5f873b113d1516831692505b60405250949350505050565b5f81815b84518110156123905761238682868381518110612379576123796127f7565b6020026020010151612398565b915060010161235a565b509392505050565b5f8183106123b2575f8281526020849052604090206123c0565b5f8381526020839052604090205b9392505050565b5f602082840312156123d7575f80fd5b5035919050565b80356001600160a01b03811681146123f4575f80fd5b919050565b5f806040838503121561240a575f80fd5b612413836123de565b946020939093013593505050565b5f60208284031215612431575f80fd5b6123c0826123de565b5f8083601f84011261244a575f80fd5b50813567ffffffffffffffff811115612461575f80fd5b602083019150836020828501011115611479575f80fd5b5f8060208385031215612489575f80fd5b823567ffffffffffffffff81111561249f575f80fd5b6124ab8582860161243a565b90969095509350505050565b5f8083601f8401126124c7575f80fd5b50813567ffffffffffffffff8111156124de575f80fd5b6020830191508360208260051b8501011115611479575f80fd5b5f805f805f6080868803121561250c575f80fd5b612515866123de565b94506020860135935060408601359250606086013567ffffffffffffffff81111561253e575f80fd5b61254a888289016124b7565b969995985093965092949392505050565b5f5b8381101561257557818101518382015260200161255d565b50505f910152565b8215158152604060208201525f82518060408401526125a381606085016020870161255b565b601f01601f1916919091016060019392505050565b80151581146120c5575f80fd5b5f80604083850312156125d6575f80fd5b6125df836123de565b915060208301356125ef816125b8565b809150509250929050565b5f805f806060858703121561260d575f80fd5b8435935060208501359250604085013567ffffffffffffffff811115612631575f80fd5b61263d8782880161243a565b95989497509550505050565b602080825282518282018190525f9190848201906040850190845b818110156126895783516001600160a01b031683529284019291840191600101612664565b50909695505050505050565b5f805f80606085870312156126a8575f80fd5b8435935060208501359250604085013567ffffffffffffffff8111156126cc575f80fd5b61263d878288016124b7565b634e487b7160e01b5f52602160045260245ffd5b602081016004831061270c57634e487b7160e01b5f52602160045260245ffd5b91905290565b634e487b7160e01b5f52601160045260245ffd5b8082018082111561192557611925612712565b5f60208284031215612749575f80fd5b5051919050565b81835281816020850137505f828201602090810191909152601f909101601f19169091010190565b838152604060208201525f612791604083018486612750565b95945050505050565b6001600160a01b03841681526040602082018190525f906127919083018486612750565b5f602082840312156127ce575f80fd5b81516123c0816125b8565b5f602082840312156127e9575f80fd5b8151600481106123c0575f80fd5b634e487b7160e01b5f52603260045260245ffd5b808202811582820484141761192557611925612712565b5f8261283c57634e487b7160e01b5f52601260045260245ffd5b500490565b634e487b7160e01b5f52604160045260245ffd5b5f8060408385031215612866575f80fd5b8251612871816125b8565b602084015190925067ffffffffffffffff8082111561288e575f80fd5b818501915085601f8301126128a1575f80fd5b8151818111156128b3576128b3612841565b604051601f8201601f19908116603f011681019083821181831017156128db576128db612841565b816040528281528860208487010111156128f3575f80fd5b61290483602083016020880161255b565b80955050505050509250929050565b60018060a01b0386168152846020820152836040820152608060608201525f612940608083018486612750565b97965050505050505056fe5eff886ea0ce6ca488a3d6e336d6c0f75f46d19b42c06ce5ee98e42c96d256c79b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00a2646970667358221220c2f42cb6dec7f937b4793333a6348e70f05b9b39fb0353047b1090a7bcaa4ac264736f6c63430008180033" as Hex;

export function getVaultFactoryContract(
  address: Address = CONTRACT_ADDRESSES.vaultFactory,
  client: PublicClient | WalletClient = publicClient
) {
  return getContract({
    address,
    abi: VAULT_FACTORY_ABI,
    client,
  });
}

export const contracts = {
  vault: getInheritanceVaultContract(CONTRACT_ADDRESSES.vault),
  demoVault: getInheritanceVaultContract(CONTRACT_ADDRESSES.demoVault),
  consensus: getConsensusContract(CONTRACT_ADDRESSES.consensus),
  demoConsensus: getConsensusContract(CONTRACT_ADDRESSES.demoConsensus),
  guardianRegistry: getGuardianRegistryContract(CONTRACT_ADDRESSES.guardianRegistry),
  demoGuardianRegistry: getGuardianRegistryContract(CONTRACT_ADDRESSES.demoGuardianRegistry),
  stealthRegistry: getStealthRegistryContract(CONTRACT_ADDRESSES.stealthRegistry),
  balanceCommitment: getBalanceCommitmentContract(CONTRACT_ADDRESSES.balanceCommitment),
  beneficiaryFactory: getBeneficiaryFactoryContract(CONTRACT_ADDRESSES.beneficiaryFactory),
  vaultFactory: getVaultFactoryContract(CONTRACT_ADDRESSES.vaultFactory),
};
