import type { Hex } from "viem";

// OneClickVault ABI & Bytecode
export const ONE_CLICK_VAULT_ABI = [
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
        "name": "contestWindowDuration",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "initialAllocationRoot",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "guardianRegistryAddress",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "initialGuardianRoot",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "guardianThreshold",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "totalGuardians",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "consensusAddress",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "receive",
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "MAX_WHITELISTED_TOKENS",
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
    "name": "TokenTransferFailed",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "beneficiary",
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
    "name": "MaxTokensExceeded",
    "inputs": []
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

export const ONE_CLICK_VAULT_BYTECODE = "0x60a06040526040516200323d3803806200323d833981016040819052620000269162000513565b604080515f8152602081019091528990899083836001600160a01b0381166200006857604051631e4fbdf760e01b81525f600482015260240160405180910390fd5b6200007381620004a8565b5060017f9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00556001600160a01b038116620000c05760405163d92e233d60e01b815260040160405180910390fd5b6001600160a01b038181166080819052604051637e962c8b60e01b81523060048201529186166024830152604482018590526203f480606483015290637e962c8b906084015f604051808303815f87803b1580156200011d575f80fd5b505af115801562000130573d5f803e3d5ffd5b50505050601482511115620001585760405163bf235b3160e01b815260040160405180910390fd5b5f5b825181101562000266575f8382815181106200017a576200017a62000592565b602002602001015190505f6001600160a01b0316816001600160a01b031614158015620001bf57506001600160a01b0381165f9081526003602052604090205460ff16155b156200025c576001600160a01b0381165f818152600360209081526040808320805460ff1916600190811790915560048054808301825594527f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b90930180546001600160a01b03191685179055519182527f67821d5384bb02aab1ba91a477f89c9966cd30f475b02618bdc58712bca51275910160405180910390a25b506001016200015a565b50505050505f871180156200027e5750866203f48014155b15620002e657608051604051632ed85a6360e21b8152306004820152602481018990526001600160a01b039091169063bb61698c906044015f604051808303815f87803b158015620002ce575f80fd5b505af1158015620002e1573d5f803e3d5ffd5b505050505b85156200032857600686905560405142815286907f4251fea67bc7da0a6cd08b3e2888bbb307ff1ae040427489792be245335aaa469060200160405180910390a25b83158015906200034057506001600160a01b03851615155b156200041057604051632464065160e11b81523060048201526024810185905260448101849052606481018390526001600160a01b038616906348c80ca2906084015f604051808303815f87803b1580156200039a575f80fd5b505af1158015620003ad573d5f803e3d5ffd5b50506040516316a2547d60e21b81523060048201526001600160a01b03848116602483015288169250635a8951f491506044015f604051808303815f87803b158015620003f8575f80fd5b505af11580156200040b573d5f803e3d5ffd5b505050505b341562000499575f80805260056020527f05b8ccbb9d4d8fb16ea74ce3c29a41f1b461fbdaff4714a0d9a8eb05499746bc805434929062000453908490620005a6565b90915550506040513481525f906001600160a01b038b16907f5548c837ab068cf56a2c2479df0882a4922fd203edb7517321831d95078c5f629060200160405180910390a35b505050505050505050620005cc565b5f80546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b80516001600160a01b03811681146200050e575f80fd5b919050565b5f805f805f805f805f6101208a8c0312156200052d575f80fd5b620005388a620004f7565b985060208a0151975060408a0151965060608a015195506200055d60808b01620004f7565b945060a08a0151935060c08a0151925060e08a01519150620005836101008b01620004f7565b90509295985092959850929598565b634e487b7160e01b5f52603260045260245ffd5b80820180821115620005c657634e487b7160e01b5f52601160045260245ffd5b92915050565b608051612bef6200064e5f395f818161057c015281816108df01528181610a8601528181610b2c01528181610b7901528181610d3901528181610dca01528181610e5d01528181610fe20152818161141f015281816115fa0152818161178501528181611b6301528181611c1001528181611d8c01526121820152612bef5ff3fe60806040526004361061022b575f3560e01c806373b2e80e11610129578063d3d7c002116100a8578063e26f79001161006d578063e26f79001461074e578063e7bfdf991461076f578063ea87627d1461078e578063f2fde38b146107af578063f6326fb3146107ce575f80fd5b8063d3d7c0021461067e578063dc0e424d1461069d578063df398543146106bc578063e21ca638146106db578063e22e4aea1461072f575f80fd5b80639417ecbe116100ee5780639417ecbe146105d3578063ab37f486146105fe578063b2a481781461062c578063bfd25fa51461064b578063c9bcc97e1461065f575f80fd5b806373b2e80e1461050d5780637c08fe021461053b5780638da5cb5b1461054f5780638ef3f7611461056b57806393f8565f1461059e575f80fd5b8063411063b4116101b55780636b9aed461161017a5780636b9aed46146104845780636e04ff0d146104a357806370265c7a146104d0578063711bd04e146104e4578063715018a6146104f9575f80fd5b8063411063b4146103a05780634585e33b146103fd578063530554811461041c578063548bda3a146104475780635e829a0214610470575f80fd5b80632154bc44116101fb5780632154bc44146103005780632bd7cc0f146103375780632de0ea021461034b578063338b5dea1461036d57806335c817cc1461038c575f80fd5b806308bf49a11461023e578063111c60761461025d578063183ff0851461027c578063187bc8f214610290575f80fd5b3661023a576102386107d2565b005b5f80fd5b348015610249575f80fd5b506102386102583660046125b3565b610888565b348015610268575f80fd5b506102386102773660046125e5565b610941565b348015610287575f80fd5b50610238610a34565b34801561029b575f80fd5b506102e66102aa36600461260d565b6001600160a01b03165f908152600260209081526040918290208251808401909352805480845260019091015460ff1615159290910182905291565b604080519283529015156020830152015b60405180910390f35b34801561030b575f80fd5b5061031f61031a3660046125b3565b610ae8565b6040516001600160a01b0390911681526020016102f7565b348015610342575f80fd5b50610238610b10565b348015610356575f80fd5b5061035f610b62565b6040519081526020016102f7565b348015610378575f80fd5b506102386103873660046125e5565b610bf0565b348015610397575f80fd5b5061035f610d22565b3480156103ab575f80fd5b506103de6103ba36600461260d565b600160208190525f918252604090912080549101546001600160a01b039091169082565b604080516001600160a01b0390931683526020830191909152016102f7565b348015610408575f80fd5b50610238610417366004612664565b610d70565b348015610427575f80fd5b5061035f61043636600461260d565b60056020525f908152604090205481565b348015610452575f80fd5b506009546104609060ff1681565b60405190151581526020016102f7565b34801561047b575f80fd5b50610460610e46565b34801561048f575f80fd5b5061023861049e3660046126e4565b610ece565b3480156104ae575f80fd5b506104c26104bd366004612664565b6113fd565b6040516102f7929190612769565b3480156104db575f80fd5b50610238611496565b3480156104ef575f80fd5b5061035f60065481565b348015610504575f80fd5b50610238611539565b348015610518575f80fd5b5061046061052736600461260d565b60076020525f908152604090205460ff1681565b348015610546575f80fd5b5061035f601481565b34801561055a575f80fd5b505f546001600160a01b031661031f565b348015610576575f80fd5b5061031f7f000000000000000000000000000000000000000000000000000000000000000081565b3480156105a9575f80fd5b506102e66105b836600461260d565b60026020525f90815260409020805460019091015460ff1682565b3480156105de575f80fd5b5061035f6105ed36600461260d565b60086020525f908152604090205481565b348015610609575f80fd5b5061046061061836600461260d565b60036020525f908152604090205460ff1681565b348015610637575f80fd5b5061023861064636600461260d565b61154a565b348015610656575f80fd5b5061035f61176e565b34801561066a575f80fd5b506102386106793660046127b1565b6117bc565b348015610689575f80fd5b5061035f61069836600461260d565b611a1a565b3480156106a8575f80fd5b506102386106b736600461260d565b611a9c565b3480156106c7575f80fd5b506102386106d63660046127e6565b611b4c565b3480156106e6575f80fd5b506103de6106f536600461260d565b6001600160a01b039081165f9081526001602081815260409283902083518085019094528054909416808452939091015491018190529091565b34801561073a575f80fd5b506102386107493660046125b3565b611bd3565b348015610759575f80fd5b50610762611ced565b6040516102f79190612835565b34801561077a575f80fd5b50610238610789366004612881565b611d4d565b348015610799575f80fd5b506107a261216b565b6040516102f791906128d8565b3480156107ba575f80fd5b506102386107c936600461260d565b6121f3565b6102385b6107da612230565b345f036107fa57604051631f2a200560e01b815260040160405180910390fd5b5f80805260056020527f05b8ccbb9d4d8fb16ea74ce3c29a41f1b461fbdaff4714a0d9a8eb05499746bc8054349290610834908490612912565b90915550506040513481525f9033907f5548c837ab068cf56a2c2479df0882a4922fd203edb7517321831d95078c5f629060200160405180910390a361088660015f80516020612b9a83398151915255565b565b61089061224b565b6040518181527fb24e51923480d0477496736979b576ce3300ca713ab5fb476d69ea8f6aa304909060200160405180910390a160405163fb70e49f60e01b8152306004820152602481018290527f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03169063fb70e49f906044015f604051808303815f87803b158015610928575f80fd5b505af115801561093a573d5f803e3d5ffd5b5050505050565b6001600160a01b0382166109685760405163d92e233d60e01b815260040160405180910390fd5b336001600160a01b0383160361099157604051637196dc6960e01b815260040160405180910390fd5b805f036109b1576040516337a7e3cf60e01b815260040160405180910390fd5b6040805180820182526001600160a01b038481168083526020808401868152335f818152600180855290889020965187546001600160a01b031916961695909517865590519490930193909355925184815290917f1dbe70bb26427543b5cba89620b2ece89c71b0d44248748f5192ebc0b3508f34910160405180910390a35050565b610a3c61224b565b60405142815233907fcc93aea41d7d01f6d303934d972342daf1ba36a9aa055bd25c531b41a30007189060200160405180910390a2604051630f66f5ef60e01b81523060048201527f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031690630f66f5ef906024015b5f604051808303815f87803b158015610ad0575f80fd5b505af1158015610ae2573d5f803e3d5ffd5b50505050565b60048181548110610af7575f80fd5b5f918252602090912001546001600160a01b0316905081565b610b1861224b565b604051621ad9ff60e21b81523060048201527f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031690626b67fc90602401610ab9565b60405163d08fa47b60e01b81523060048201525f907f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03169063d08fa47b906024015b602060405180830381865afa158015610bc7573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610beb9190612925565b905090565b610bf8612230565b6001600160a01b038216610c1f5760405163d92e233d60e01b815260040160405180910390fd5b6001600160a01b0382165f9081526003602052604090205460ff16610c675760405163751dff9760e11b81526001600160a01b03831660048201526024015b60405180910390fd5b805f03610c8757604051631f2a200560e01b815260040160405180910390fd5b610c9c6001600160a01b038316333084612277565b6001600160a01b0382165f9081526005602052604081208054839290610cc3908490612912565b90915550506040518181526001600160a01b0383169033907f5548c837ab068cf56a2c2479df0882a4922fd203edb7517321831d95078c5f629060200160405180910390a3610d1e60015f80516020612b9a83398151915255565b5050565b60405163f288326960e01b81523060048201525f907f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03169063f288326990602401610bac565b610d78612230565b7fc79afd4406e862024726068d80f443b4b739fab4d9ee5e1c1f3cd872f1d17e3d428383604051610dab93929190612964565b60405180910390a1604051637e93112760e01b81526001600160a01b037f00000000000000000000000000000000000000000000000000000000000000001690637e93112790610e0390309086908690600401612986565b5f604051808303815f87803b158015610e1a575f80fd5b505af1158015610e2c573d5f803e3d5ffd5b50505050610d1e60015f80516020612b9a83398151915255565b604051632701666760e11b81523060048201525f907f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031690634e02ccce90602401602060405180830381865afa158015610eaa573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610beb91906129aa565b610ed6612230565b6001600160a01b038086165f9081526001602081815260409283902083518085019094528054909416808452939091015490820152903314610f2b57604051632c58d33b60e11b815260040160405180910390fd5b6001600160a01b0386165f908152600260209081526040918290208251808401909352805483526001015460ff161515908201819052610f7e576040516320e318a960e21b815260040160405180910390fd5b8051421015610fab578051604051625b638f60e31b81524260048201526024810191909152604401610c5e565b600654610fcb5760405163ea75680160e01b815260040160405180910390fd5b604051631bab58f560e01b81523060048201525f907f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031690631bab58f590602401602060405180830381865afa15801561102f573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061105391906129c5565b90506003816003811115611069576110696128c4565b14611089578060405163a193be4360e01b8152600401610c5e91906128d8565b6001600160a01b0388165f9081526007602052604090205460ff16156110cd57604051632058b6db60e01b81526001600160a01b0389166004820152602401610c5e565b5f6110d98989896122ad565b905061111b8686808060200260200160405190810160405280939291908181526020018383602002808284375f9201919091525050600654915084905061230e565b611138576040516309bde33960e01b815260040160405180910390fd5b60095460ff16611240576009805460ff191660011790555f8080526008602052475f80516020612b7a833981519152555b60045481101561123e575f60048281548110611187576111876129e3565b5f9182526020808320909101546001600160a01b0316808352600390915260409091205490915060ff1615611235576040516370a0823160e01b81523060048201526001600160a01b038216906370a0823190602401602060405180830381865afa1580156111f8573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061121c9190612925565b6001600160a01b0382165f908152600860205260409020555b50600101611169565b505b6001600160a01b0389165f9081526007602090815260408083208054600160ff199182168117909255600284529184200180549091169055818052600890525f80516020612b7a833981519152549061271061129c8b846129f7565b6112a69190612a0e565b90508015611316576040515f90339083908381818185875af1925050503d805f81146112ed576040519150601f19603f3d011682016040523d82523d5f602084013e6112f2565b606091505b5050905080611314576040516312171d8360e31b815260040160405180910390fd5b505b5f5b60045481101561139a575f60048281548110611336576113366129e3565b5f9182526020808320909101546001600160a01b031680835260089091526040909120549091508015611390575f6127106113718f846129f7565b61137b9190612a0e565b9050801561138e5761138e833383612322565b505b5050600101611318565b50604080518b81526020810183905233916001600160a01b038e16917fad1bf40e0ce43ef79dbf6810b7f7b195b2eda91bb3bdc5296fb0f68ce66527e5910160405180910390a350505050505061093a60015f80516020612b9a83398151915255565b60405163c9c0a11f60e01b81523060048201525f906060906001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000169063c9c0a11f906024015f60405180830381865afa158015611463573d5f803e3d5ffd5b505050506040513d5f823e601f3d908101601f1916820160405261148a9190810190612a41565b915091505b9250929050565b335f908152600160205260409020546001600160a01b0316806114cc57604051632c58d33b60e11b815260040160405180910390fd5b335f81815260016020818152604080842080546001600160a01b031916815583018490556002909152808320838155909101805460ff19169055516001600160a01b03841692917f05a0df38e8e0cb5197c7b9264c23f65e51d2f9b776f0b875ec353a6c4f1013ab91a350565b61154161224b565b6108865f612442565b6001600160a01b038082165f908152600160208181526040928390208351808501909452805490941680845293909101549082015290331461159f57604051632c58d33b60e11b815260040160405180910390fd5b6001600160a01b0382165f9081526007602052604090205460ff16156115e357604051632058b6db60e01b81526001600160a01b0383166004820152602401610c5e565b604051631bab58f560e01b81523060048201525f907f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031690631bab58f590602401602060405180830381865afa158015611647573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061166b91906129c5565b90506003816003811115611681576116816128c4565b146116a1578060405163a193be4360e01b8152600401610c5e91906128d8565b6001600160a01b0383165f9081526002602052604090206001015460ff16156116dd5760405163013737b160e41b815260040160405180910390fd5b5f8260200151426116ee9190612912565b604080518082018252828152600160208083018281526001600160a01b038a165f8181526002845286902094518555905193909201805460ff191693151593909317909255915183815292935033927f4666f783d61c0ef155b4904a7bce845e67a2709fb94d063b848c52c36a4b5eb7910160405180910390a350505050565b604051632a8a753b60e01b81523060048201525f907f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031690632a8a753b90602401610bac565b6117c461224b565b6001600160a01b0382166117eb5760405163d92e233d60e01b815260040160405180910390fd5b801561189b576001600160a01b0382165f9081526003602052604090205460ff16611896576004546014116118335760405163bf235b3160e01b815260040160405180910390fd5b6004805460018082019092557f8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b0180546001600160a01b0319166001600160a01b0385169081179091555f908152600360205260409020805460ff191690911790555b6119d1565b6001600160a01b0382165f9081526003602052604090205460ff16156119d1576001600160a01b0382165f908152600360205260408120805460ff19169055600454905b818110156119ce57836001600160a01b031660048281548110611904576119046129e3565b5f918252602090912001546001600160a01b0316036119c657600461192a600184612aff565b8154811061193a5761193a6129e3565b5f91825260209091200154600480546001600160a01b039092169183908110611965576119656129e3565b905f5260205f20015f6101000a8154816001600160a01b0302191690836001600160a01b0316021790555060048054806119a1576119a1612b12565b5f8281526020902081015f1990810180546001600160a01b03191690550190556119ce565b6001016118df565b50505b816001600160a01b03167f67821d5384bb02aab1ba91a477f89c9966cd30f475b02618bdc58712bca5127582604051611a0e911515815260200190565b60405180910390a25050565b5f6001600160a01b038216611a30575047919050565b6040516370a0823160e01b81523060048201526001600160a01b038316906370a0823190602401602060405180830381865afa158015611a72573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190611a969190612925565b92915050565b336001600160a01b03821614611ac4576040516282b42960e81b815260040160405180910390fd5b6001600160a01b0381165f9081526002602052604090206001015460ff16611aff576040516320e318a960e21b815260040160405180910390fd5b6001600160a01b0381165f81815260026020526040808220600101805460ff19169055513392917f8752415616cba98e3a237f6cc07f0aba1ac50517bac8db4d0522423ef49e1c2e91a350565b604051632208aeb760e11b81526001600160a01b037f000000000000000000000000000000000000000000000000000000000000000016906344115d6e90611ba09030908890889088908890600401612b26565b5f604051808303815f87803b158015611bb7575f80fd5b505af1158015611bc9573d5f803e3d5ffd5b5050505050505050565b611bdb61224b565b80611bf95760405163504570e360e01b815260040160405180910390fd5b604051631bab58f560e01b81523060048201525f907f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031690631bab58f590602401602060405180830381865afa158015611c5d573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190611c8191906129c5565b90505f816003811115611c9657611c966128c4565b14611cb6578060405163683f44bb60e11b8152600401610c5e91906128d8565b600682905560405142815282907f4251fea67bc7da0a6cd08b3e2888bbb307ff1ae040427489792be245335aaa4690602001611a0e565b60606004805480602002602001604051908101604052809291908181526020018280548015611d4357602002820191905f5260205f20905b81546001600160a01b03168152600190910190602001808311611d25575b5050505050905090565b611d55612230565b600654611d755760405163ea75680160e01b815260040160405180910390fd5b604051631bab58f560e01b81523060048201525f907f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031690631bab58f590602401602060405180830381865afa158015611dd9573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190611dfd91906129c5565b90506003816003811115611e1357611e136128c4565b14611e33578060405163a193be4360e01b8152600401610c5e91906128d8565b335f9081526007602052604090205460ff1615611e6557604051632058b6db60e01b8152336004820152602401610c5e565b5f611e713387876122ad565b9050611eb38484808060200260200160405190810160405280939291908181526020018383602002808284375f9201919091525050600654915084905061230e565b611ed0576040516309bde33960e01b815260040160405180910390fd5b60095460ff16611fd8576009805460ff191660011790555f8080526008602052475f80516020612b7a833981519152555b600454811015611fd6575f60048281548110611f1f57611f1f6129e3565b5f9182526020808320909101546001600160a01b0316808352600390915260409091205490915060ff1615611fcd576040516370a0823160e01b81523060048201526001600160a01b038216906370a0823190602401602060405180830381865afa158015611f90573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190611fb49190612925565b6001600160a01b0382165f908152600860205260409020555b50600101611f01565b505b335f9081526007602090815260408220805460ff19166001179055818052600890525f80516020612b7a833981519152549061271061201789846129f7565b6120219190612a0e565b90508015612091576040515f90339083908381818185875af1925050503d805f8114612068576040519150601f19603f3d011682016040523d82523d5f602084013e61206d565b606091505b505090508061208f576040516312171d8360e31b815260040160405180910390fd5b505b5f5b600454811015612115575f600482815481106120b1576120b16129e3565b5f9182526020808320909101546001600160a01b03168083526008909152604090912054909150801561210b575f6127106120ec8d846129f7565b6120f69190612a0e565b9050801561210957612109833383612322565b505b5050600101612093565b50604080518981526020810183905233917fb50dcc0598795f75a00e650ff10148aa2274185f91ef64eb1e220f77d331254c910160405180910390a250505050610ae260015f80516020612b9a83398151915255565b604051631bab58f560e01b81523060048201525f907f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031690631bab58f590602401602060405180830381865afa1580156121cf573d5f803e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610beb91906129c5565b6121fb61224b565b6001600160a01b03811661222457604051631e4fbdf760e01b81525f6004820152602401610c5e565b61222d81612442565b50565b612238612491565b60025f80516020612b9a83398151915255565b5f546001600160a01b031633146108865760405163118cdaa760e01b8152336004820152602401610c5e565b6122858484848460016124c0565b610ae257604051635274afe760e01b81526001600160a01b0385166004820152602401610c5e565b604080516001600160a01b0385166020820152908101839052606081018290525f9060800160408051601f19818403018152828252805160209182012090830152016040516020818303038152906040528051906020012090509392505050565b5f61231a84848461252d565b949350505050565b604080516001600160a01b038481166024830152604480830185905283518084039091018152606490920183526020820180516001600160e01b031663a9059cbb60e01b17905291515f9283929087169161237d9190612b5e565b5f604051808303815f865af19150503d805f81146123b6576040519150601f19603f3d011682016040523d82523d5f602084013e6123bb565b606091505b50915091508115806123e957508051158015906123e95750808060200190518101906123e791906129aa565b155b1561093a57836001600160a01b0316856001600160a01b03167fc87767983e580cd51a7614924de0506ff919e5220d94509794cd03bb6564b0bf8560405161243391815260200190565b60405180910390a35050505050565b5f80546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b5f80516020612b9a8339815191525460020361088657604051633ee5aeb560e01b815260040160405180910390fd5b6040516323b872dd60e01b5f8181526001600160a01b038781166004528616602452604485905291602083606481808c5af1925060015f5114831661251c578383151615612510573d5f823e3d81fd5b5f883b113d1516831692505b604052505f60605295945050505050565b5f826125398584612542565b14949350505050565b5f81815b845181101561257c5761257282868381518110612565576125656129e3565b6020026020010151612584565b9150600101612546565b509392505050565b5f81831061259e575f8281526020849052604090206125ac565b5f8381526020839052604090205b9392505050565b5f602082840312156125c3575f80fd5b5035919050565b80356001600160a01b03811681146125e0575f80fd5b919050565b5f80604083850312156125f6575f80fd5b6125ff836125ca565b946020939093013593505050565b5f6020828403121561261d575f80fd5b6125ac826125ca565b5f8083601f840112612636575f80fd5b50813567ffffffffffffffff81111561264d575f80fd5b60208301915083602082850101111561148f575f80fd5b5f8060208385031215612675575f80fd5b823567ffffffffffffffff81111561268b575f80fd5b61269785828601612626565b90969095509350505050565b5f8083601f8401126126b3575f80fd5b50813567ffffffffffffffff8111156126ca575f80fd5b6020830191508360208260051b850101111561148f575f80fd5b5f805f805f608086880312156126f8575f80fd5b612701866125ca565b94506020860135935060408601359250606086013567ffffffffffffffff81111561272a575f80fd5b612736888289016126a3565b969995985093965092949392505050565b5f5b83811015612761578181015183820152602001612749565b50505f910152565b8215158152604060208201525f825180604084015261278f816060850160208701612747565b601f01601f1916919091016060019392505050565b801515811461222d575f80fd5b5f80604083850312156127c2575f80fd5b6127cb836125ca565b915060208301356127db816127a4565b809150509250929050565b5f805f80606085870312156127f9575f80fd5b8435935060208501359250604085013567ffffffffffffffff81111561281d575f80fd5b61282987828801612626565b95989497509550505050565b602080825282518282018190525f9190848201906040850190845b818110156128755783516001600160a01b031683529284019291840191600101612850565b50909695505050505050565b5f805f8060608587031215612894575f80fd5b8435935060208501359250604085013567ffffffffffffffff8111156128b8575f80fd5b612829878288016126a3565b634e487b7160e01b5f52602160045260245ffd5b60208101600483106128f857634e487b7160e01b5f52602160045260245ffd5b91905290565b634e487b7160e01b5f52601160045260245ffd5b80820180821115611a9657611a966128fe565b5f60208284031215612935575f80fd5b5051919050565b81835281816020850137505f828201602090810191909152601f909101601f19169091010190565b838152604060208201525f61297d60408301848661293c565b95945050505050565b6001600160a01b03841681526040602082018190525f9061297d908301848661293c565b5f602082840312156129ba575f80fd5b81516125ac816127a4565b5f602082840312156129d5575f80fd5b8151600481106125ac575f80fd5b634e487b7160e01b5f52603260045260245ffd5b8082028115828204841417611a9657611a966128fe565b5f82612a2857634e487b7160e01b5f52601260045260245ffd5b500490565b634e487b7160e01b5f52604160045260245ffd5b5f8060408385031215612a52575f80fd5b8251612a5d816127a4565b602084015190925067ffffffffffffffff80821115612a7a575f80fd5b818501915085601f830112612a8d575f80fd5b815181811115612a9f57612a9f612a2d565b604051601f8201601f19908116603f01168101908382118183101715612ac757612ac7612a2d565b81604052828152886020848701011115612adf575f80fd5b612af0836020830160208801612747565b80955050505050509250929050565b81810381811115611a9657611a966128fe565b634e487b7160e01b5f52603160045260245ffd5b60018060a01b0386168152846020820152836040820152608060608201525f612b5360808301848661293c565b979650505050505050565b5f8251612b6f818460208701612747565b919091019291505056fe5eff886ea0ce6ca488a3d6e336d6c0f75f46d19b42c06ce5ee98e42c96d256c79b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00a2646970667358221220ad977d9f69620defb74e8ad5c176596b8a44ddffbc7950f5fd955638abedf51064736f6c63430008180033" as Hex;
