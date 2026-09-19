// StealthAddressRegistry ABI
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
