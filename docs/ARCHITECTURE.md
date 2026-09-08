# ARCHITECTURE.md — Technical Architecture

## Stack
- **Contracts**: Solidity, Foundry (preferred over Hardhat for speed/testing ergonomics)
- **Automation**: Chainlink Automation (`AutomationCompatibleInterface`)
- **Account abstraction**: ERC-4337, EntryPoint v0.7
- **Gas sponsorship**: Pimlico via `permissionless.js`
- **Guardian privacy**: Merkle tree commitments (OpenZeppelin `MerkleProof`)
- **Owner identity privacy**: Stealth addresses (EIP-5564)
- **Balance privacy**: Pedersen commitment (subject to Day 13 go/no-go gate — see PROJECT-PLAN.md)
- **Allocation privacy**: ECIES encryption (EthCrypto or `eth_getEncryptionPublicKey`/`eth_decrypt`) + Merkle `allocationRoot`
- **Cancel signatures**: EIP-712 typed data + `ECDSA.recover`
- **Frontend**: Next.js (React) + viem + wagmi + Tailwind
- **Attestations (stretch)**: Ethereum Attestation Service (EAS)
- **Security**: Slither, Mythril
- **Notification service**: lightweight Node backend (event listener + email sender, e.g. via a chain indexer/webhook + an email provider such as Resend or SendGrid) — off-chain by necessity; stores only wallet address, email, and opt-in flags

## Critical Design Constraints (do not violate — see PROJECT-PLAN.md for full reasoning)

1. **Cancel mechanism is signature-based, never a direct `msg.sender` transaction.**
   `cancelClaimWithSig(uint256 nonce, uint256 deadline, bytes calldata sig)` verifies an EIP-712 digest signed by the stealth owner key, relayed by anyone. A direct-transaction cancel funded by the owner's main wallet would permanently link the stealth address to the owner's identity (the "Gas Linkage" trap).

2. **Build stealth address pipeline BEFORE the Contestable Claim state machine.**
   Test fixtures for cancel logic must use real stealth keypairs from day one, not mock EOAs, or the cancel function risks a `msg.sender == owner` implementation that breaks once stealth addresses are introduced.

3. **No plaintext allocation data on-chain, ever.**
   The contract stores only `bytes32 allocationRoot` (a Merkle commitment). Individual shares are ECIES-encrypted client-side per beneficiary and never touch a public mapping or emit in plaintext. A beneficiary decrypts their own payload locally, then submits `(shareBps, salt, merkleProof)` at claim time to unlock their share against the root.

4. **Total-allocation-sums-to-100% validation happens off-chain, in the creator UI**, before the Merkle tree is built — the contract cannot check this without decrypting all shares.

5. **Shielded balance (Pedersen commitment) is gated by a hard go/no-go checkpoint, not an open-ended task.** If it doesn't converge (see PROJECT-PLAN.md Day 13 criteria), de-scope immediately to transparent balance accounting and reframe the pitch — do not let it bleed into Week 3.

6. **An email is never stored as "linked" to a wallet without a valid signature from that wallet confirming it.** A beneficiary email entered by the owner at setup must sit in a pending/unverified state, sending no notifications, until the beneficiary connects that wallet themselves and signs to confirm. Skipping this lets anyone bind an arbitrary email to a wallet they don't control and intercept another person's notifications — this is a phishing vector, not a minor gap.

7. **Zero custodial trust in beneficiary recovery settings — strict, not best-effort.** Neither the vault owner nor the vault's consensus guardians have any method to set, modify, or redirect a beneficiary's backup-claim address or smart account ownership. `registerBackupClaimAddress` and any beneficiary-smart-account configuration function must resolve strictly against the calling wallet (`msg.sender` or a verified signature from the beneficiary's own key) — never against a `beneficiary` address parameter supplied by the owner or a guardian. If a function signature allows the owner to configure anyone's settings but their own, that is a bug, not a convenience feature.

8. **Gasless check-ins are dual-path, never claimed as universal.** ERC-4337 paymaster sponsorship only works when the connected account is an ERC-4337 smart account — it cannot sponsor a transaction from a plain EOA (MetaMask, Rabby, etc.). Detect account type via an on-chain bytecode check (`code.length > 0` at the connected address — smart accounts have deployed bytecode, EOAs don't) rather than guessing from wallet name or connector type. Route accordingly:
   - **Smart account**: use the Pimlico paymaster client (Prompt 16) for a genuinely sponsored 0-ETH UserOp.
   - **Plain EOA**: call `walletClient.writeContract({ functionName: 'checkIn' })` directly, signed and gas-paid by that wallet — there is no way around this, and the UI/pitch must not imply otherwise.
   Show an honest status banner reflecting which path applies — e.g. **"Sponsored · 0 ETH"** for the smart-account path, **"Direct Transaction · Normal Gas"** for the EOA path — so the user always knows which one they're getting, not just after the fact. Never fake or simulate a transaction hash for either path; both must show real pending states and surface real errors (user rejection, simulation revert).

9. **Zero Simulation & Real On-Chain Execution.**
   Zero fake transaction hashes, zero random hex generators, zero mock fallbacks. Every state transition (check-in, interval adjustment, contest reset, guardian attestation, beneficiary claim) executes real transactions on Ethereum Sepolia with genuine cryptographic proofs (EIP-712 digests, ECIES-secp256k1 client-side encryption, and Merkle proofs).

## Production Deployment Topology & Infrastructure

```
                               CADENCE CLOUD DEPLOYMENT TOPOLOGY

    [ VERCEL ]                                                        [ RENDER ]
+-------------------------+                                   +--------------------------+
|  cadence.vercel.app     |                                   | cadence-api.onrender.com |
|  (Next.js 16 App Router)|                                   | (Express Microservice)   |
|                         |    REST / CORS (Signature Bind)   |                          |
|  - Multi-RPC Fallback   | --------------------------------> |  - EIP-712 Verifier      |
|  - ECIES Client Decrypt |                                   |  - /health Keep-Alive    |
|  - Wagmi Connectors     | <-------------------------------- |  - Auto-Seeding Storage  |
|  - Turbopack Optimized  |       Outbox & Status Lookups     |  - Live Resend/SMTP      |
+-------------------------+                                   +--------------------------+
            |                                                              |
            | Read/Write Sepolia Contracts                                 | Verify Signatures
            v                                                              v
+----------------------------------------------------------------------------------------+
|                                ETHEREUM SEPOLIA TESTNET                                |
|  - InheritanceVault.sol (0x043d...9e74)      - ProofOfLifeConsensus.sol (0x7819...6Bc1)|
|  - GuardianRegistry.sol (0xcFD0...4863)      - StealthAddressRegistry.sol (0x583e...671E)|
|  - BalanceCommitment.sol (0x1AeA...A1BC)     - BeneficiarySmartAccount.sol             |
+----------------------------------------------------------------------------------------+
```

### High-Availability Multi-RPC Failover Pool
Public RPC endpoints frequently throttle or throw HTTP 429 errors during hackathon evaluations. The frontend contracts client and Wagmi configuration utilize Viem's `fallback([...])` pooling 4 independent Sepolia endpoints:
1. `NEXT_PUBLIC_RPC_URL` (Primary custom RPC)
2. `https://ethereum-sepolia-rpc.publicnode.com` (PublicNode)
3. `https://rpc.sepolia.org` (Ethereum Foundation)
4. `https://1rpc.io/sepolia` (Automata 1RPC privacy relay)
5. `https://sepolia.gateway.tenderly.co` (Tenderly Gateway)

If any single node fails or rate-limits, Viem automatically falls back to the next responsive node without dropping frontend state or interrupting user flows.

## Vault Provisioning: Four Sequential Transactions, Not One Atomic Deploy

Creating a vault is NOT a single transaction. It's four successive on-chain actions, each signed by the connected owner wallet, each of which can independently succeed or fail:

1. **Deploy Vault Instance** — via `VaultFactory.sol` (initial owner, check-in interval, `ProofOfLifeConsensus` address), not the owner deploying raw bytecode themselves.
2. **Deposit Initial Funds** — `vault.depositETH{value: amountWei}()`.
3. **Commit Allocation Merkle Root** — `vault.setAllocationRoot(allocationRoot)` (the 10,000-bps root from Prompt 9, per constraint #3/#4 below).
4. **Commit Guardian Merkle Root** — `guardianRegistry.commitGuardianRoot(...)` (built in Prompt 4).

**UI implication:** the Create Vault flow needs a step-by-step progress modal, not a single "Authorize & Deploy Vault" button that silently fires four transactions in sequence and hopes for the best. Each step needs its own real transaction hash, its own confirmation state, and its own failure handling.

**Partial-failure recovery — a real Resume/Retry mechanism, not just "reflect it honestly."** If a step fails after an earlier step succeeded (e.g. Step 2 fails after Step 1 deployed the vault), the modal must: (a) persist which steps have already succeeded (the deployed vault's address, at minimum) so the state survives a page refresh, (b) show the vault as existing but unfunded/unconfigured rather than pretending nothing happened, and (c) present a "Resume" button that picks up from the first failed/incomplete step — never a "Retry" that silently restarts from Step 1 and attempts to redeploy a vault that already exists. See PROMPTS.md Prompt 25 for the exact build requirement.

## Contract Structure

```
VaultFactory.sol               — deploys new InheritanceVault instances (step 1 of vault provisioning above)
InheritanceVault.sol           — per-vault contract instance: deposit, check-in, allocationRoot storage, claim entrypoint
ProofOfLifeConsensus.sol       — standalone consensus primitive (Spotlight C): timeout + guardian threshold + contest window state machine, called by the vault, not embedded in it
GuardianRegistry.sol           — Merkle commitment storage + M-of-N attestation verification for guardians
StealthAddressRegistry.sol     — EIP-5564 stealth meta-address registration/lookup
BalanceCommitment.sol          — Pedersen commitment storage + reveal/verify (Day 13 gated; has a transparent-accounting fallback mode)
BeneficiarySmartAccount.sol    — ERC-4337 account factory for beneficiaries + recovery guardian logic
libraries/
  MerkleProofLib.sol
  EIP712Lib.sol
  ECIESHelperLib.sol (if any on-chain helper needed; most ECIES work is client-side)
interfaces/
  IProofOfLifeConsensus.sol
  IChainlinkAutomation.sol
```

## State Machine (ProofOfLifeConsensus)

```
Active ──(timeout expired + guardian M-of-N)──> ClaimPending ──(cancelClaimWithSig, valid stealth sig)──> Active
                                                       │
                                                       └──(contestDeadline passed, no cancel)──> Finalized ──(beneficiary claim)──> Claimed
```

## Repository File Structure

```
/contracts
  /src
    InheritanceVault.sol
    ProofOfLifeConsensus.sol
    GuardianRegistry.sol
    StealthAddressRegistry.sol
    BalanceCommitment.sol
    BeneficiarySmartAccount.sol
    /libraries
    /interfaces
  /script
    Deploy.s.sol
  /test
    InheritanceVault.t.sol
    ProofOfLifeConsensus.t.sol
    ContestableClaim.t.sol       — must use real stealth keys per Constraint #2
    GuardianAttestation.t.sol
    AllocationPrivacy.t.sol
    BalanceCommitment.t.sol
  foundry.toml
  .env.example

/frontend
  /app (Next.js app router)
    /vault/create
    /vault/[id]
    /claim
  /components
    VaultPulseDashboard.tsx
    ContestWindowPanel.tsx
    CheckInButton.tsx
    GuardianSetupForm.tsx
    BeneficiarySetupForm.tsx
    ClaimFlow.tsx
    ui/ (shared design-system primitives — see DESIGN-SYSTEM.md)
  /lib
    contracts.ts        — viem contract clients
    stealth.ts           — EIP-5564 keygen/derivation
    encryption.ts         — ECIES encrypt/decrypt (EthCrypto)
    merkle.ts             — allocationRoot + guardian Merkle tree builders
    paymaster.ts          — Pimlico permissionless.js client (see PROJECT-PLAN.md snippet)
    eip712.ts             — cancelClaimWithSig digest builder
  /styles
    tokens.css            — design tokens, see DESIGN-SYSTEM.md
  package.json

/notifications
  index.ts              — event listener (watches Chainlink Automation/vault events)
  emailService.ts       — sends check-in reminders, beneficiary-added, and claim-ready emails
  bindingVerifier.ts    — verifies the wallet signature confirming an email→wallet binding before storing/activating it
  db.ts                 — minimal store: wallet address, email, verified flag, binding signature — one verified binding per wallet
  .env.example

/docs
  PRD.md
  ARCHITECTURE.md
  PROJECT-PLAN.md
  MEMORY.md
  HANDOFF.md
  DESIGN-SYSTEM.md

README.md
```

## Multi-Chain Roadmap (reference only — not built in MVP)
Phase 0 (MVP): ETH, USDC, USDT, WBTC — all EVM/ERC-20, zero architecture change.
Phase 1: native Solana program (separate Rust/Anchor implementation of the consensus primitive).
Phase 2: XRP Ledger, native Bitcoin (harder — Bitcoin's scripting limitations may keep it WBTC-only long-term).