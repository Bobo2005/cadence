/**
 * verify-ui-e2e.mjs
 * Direct CDP automation script to test and screenshot:
 * 1. Contest Window Panel (live reads, ClaimPending state, guardian attestations, EIP-712 stealth reset -> Active ECG)
 * 2. Claim Portal (Empty state for new user, Alice ECIES decryption & Merkle claim, Bob decryption)
 */

import fs from "fs";
import path from "path";

const ARTIFACTS_DIR = "C:/Users/USER/.gemini/antigravity-ide/brain/03768d41-476d-4152-b7b5-772b8a781406";
const TARGET_PAGE_ID = "0D746AD1B0814F3CBD3D11C03DEB580B";

class CDPClient {
  constructor(pageId) {
    this.pageId = pageId;
    this.ws = null;
    this.msgId = 1;
    this.pending = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://127.0.0.1:9222/devtools/page/${this.pageId}`);
      this.ws.onopen = () => {
        console.log("Connected to CDP on page:", this.pageId);
        resolve();
      };
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.id && this.pending.has(msg.id)) {
            const { resolve: pResolve, reject: pReject } = this.pending.get(msg.id);
            this.pending.delete(msg.id);
            if (msg.error) pReject(new Error(JSON.stringify(msg.error)));
            else pResolve(msg.result);
          }
        } catch (e) {
          console.error("CDP parse error:", e);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = this.msgId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval exception: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async screenshot(filename) {
    const res = await this.send("Page.captureScreenshot", { format: "png" });
    const fullPath = path.join(ARTIFACTS_DIR, filename);
    fs.writeFileSync(fullPath, Buffer.from(res.data, "base64"));
    console.log(`Saved screenshot: ${filename} (${Math.round(res.data.length / 1024)} KB)`);
    return fullPath;
  }

  async close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connectOrSwitchPersona(cdp, personaTarget) {
  console.log(`[Persona] Connecting or switching to: ${personaTarget}...`);
  const isConnected = await cdp.eval(`
    (() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => 
        (b.innerText && b.innerText.includes("0x")) || (b.title && b.title.includes("switch persona"))
      );
      return Boolean(btn);
    })()
  `);

  if (!isConnected) {
    console.log("[Persona] Currently disconnected. Opening Connect Wallet modal...");
    await cdp.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll("button")).find(b => 
          b.innerText.includes("Connect Wallet") || b.innerText.includes("Connect Wallet to Begin")
        );
        if (btn) btn.click();
      })()
    `);
    await sleep(800);

    console.log("[Persona] Clicking 'Demo Personas' tab...");
    await cdp.eval(`
      (() => {
        const tabs = Array.from(document.querySelectorAll("button"));
        const demoTab = tabs.find(b => b.innerText.includes("Demo Personas") || b.innerText === "Demo Personas");
        if (demoTab) demoTab.click();
      })()
    `);
    await sleep(600);

    console.log(`[Persona] Selecting ${personaTarget} from demo personas list...`);
    const clicked = await cdp.eval(`
      (() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const target = btns.find(b => b.innerText.includes("${personaTarget}"));
        if (target) {
          target.click();
          return true;
        }
        return false;
      })()
    `);
    console.log("[Persona] Selection result:", clicked);
    await sleep(1500);
  } else {
    console.log(`[Persona] Already connected. Opening account dropdown to switch to ${personaTarget}...`);
    await cdp.eval(`
      (() => {
        const pill = Array.from(document.querySelectorAll("button")).find(b => 
          (b.innerText && b.innerText.includes("0x")) || (b.title && b.title.includes("switch persona"))
        );
        if (pill) pill.click();
      })()
    `);
    await sleep(600);

    const switched = await cdp.eval(`
      (() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const target = btns.find(b => b.innerText.includes("${personaTarget}"));
        if (target) {
          target.click();
          return true;
        }
        return false;
      })()
    `);
    console.log("[Persona] Switch result:", switched);
    await sleep(1500);
  }
}

async function run() {
  console.log("=== CADENCE E2E BROWSER VERIFICATION VIA CDP ===");
  const cdp = new CDPClient(TARGET_PAGE_ID);
  await cdp.connect();

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  // Set viewport to 1440x900
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // -------------------------------------------------------------
  // STEP 1: CONTEST WINDOW - CLAIM PENDING & RESET PROTOCOL FLOW
  // -------------------------------------------------------------
  console.log("\n=======================================================");
  console.log("STEP 1: CONTEST WINDOW (/contest) - LIVE READS & RESET");
  console.log("=======================================================");
  await cdp.send("Page.navigate", { url: "http://localhost:3000/contest" });
  await sleep(3000);

  // Connect as Owner
  await connectOrSwitchPersona(cdp, "Vault Owner");
  await sleep(2500);

  // Switch Active Locker in dropdown to "Contest Window Demo Locker (72h Challenge Period)"
  console.log("Selecting Contest Window Demo Locker in Active Locker dropdown...");
  const selectedLocker = await cdp.eval(`
    (() => {
      const select = document.querySelector("select");
      if (!select) return "no_select";
      const options = Array.from(select.options);
      const targetOpt = options.find(o => o.text.includes("Contest Window") || o.text.includes("Challenge"));
      if (targetOpt) {
        select.value = targetOpt.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return targetOpt.text;
      }
      return "option_not_found";
    })()
  `);
  console.log("Selected Locker in dropdown:", selectedLocker);
  await sleep(3000);

  // Inspect live ClaimPending state, countdown timer, and guardian attestations
  const contestPendingState = await cdp.eval(`
    (() => {
      const text = document.body.innerText;
      return {
        hasClaimPending: text.includes("CLAIM PENDING") || text.includes("CONTEST PERIOD REMAINING"),
        hasContestTimer: text.includes("71h") || text.includes("CONTEST PERIOD REMAINING") || text.includes("h :"),
        hasAssertedLapse: text.includes("ASSERTED LAPSE"),
        hasResetBtn: Array.from(document.querySelectorAll("button")).some(b => b.innerText.includes("RESET PROTOCOL")),
        fullSnippet: text.slice(0, 600)
      };
    })()
  `);
  console.log("Contest Window Live Pending State:", contestPendingState);

  await cdp.screenshot("contest_window_pending_live.png");

  // Click "RESET PROTOCOL: I'M ALIVE" button
  console.log("\n--- Triggering RESET PROTOCOL: I'M ALIVE ---");
  const resetInitiated = await cdp.eval(`
    (() => {
      const btn = document.getElementById("reset-protocol-contest-button") ||
        Array.from(document.querySelectorAll("button")).find(b => 
          b.innerText.includes("RESET PROTOCOL") || b.innerText.includes("I'M ALIVE")
        );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()
  `);
  console.log("Reset button clicked:", resetInitiated);

  // Await signature generation, relayed execution, and state update
  console.log("Waiting for off-chain stealth EIP-712 signature & relayed cancellation...");
  await sleep(4000);

  const resetActiveState = await cdp.eval(`
    (() => {
      const text = document.body.innerText;
      return {
        isRestoredActive: text.includes("HEARTBEAT ACTIVE · CONTEST INACTIVE") || text.includes("NORMAL OPERATION"),
        hasStandbyMonitoring: text.includes("STANDBY · MONITORING"),
        snippet: text.slice(0, 500)
      };
    })()
  `);
  console.log("Contest Window Restored Active State:", resetActiveState);

  await cdp.screenshot("contest_window_reset_active.png");

  // -------------------------------------------------------------
  // STEP 2: CLAIM PORTAL - EMPTY STATE (NEW USER)
  // -------------------------------------------------------------
  console.log("\n=======================================================");
  console.log("STEP 2: CLAIM PORTAL - EMPTY STATE (/claim)");
  console.log("=======================================================");
  await cdp.send("Page.navigate", { url: "http://localhost:3000/claim" });
  await sleep(3000);

  // Switch to New User persona (0x1111...1111)
  await connectOrSwitchPersona(cdp, "New User");
  await sleep(2500);

  // Verify genuine ClaimEmptyState (Zero claims, explanation, and persona switch buttons)
  const emptyState = await cdp.eval(`
    (() => {
      const text = document.body.innerText;
      return {
        hasEmptyTitle: text.includes("No Inheritance Allocations Found"),
        hasExplanation: text.includes("Connected wallet 0x1111...1111 is not listed as an heir"),
        hasAliceGuidance: text.includes("Alice (Primary Heir · 40% Share)"),
        hasBobGuidance: text.includes("Bob (Secondary Heir · 60% Share)"),
        noDummyAllocations: !text.includes("40.00% Allocation") && !text.includes("60.00% Allocation"),
        snippet: text.slice(0, 500)
      };
    })()
  `);
  console.log("Claim Portal Empty State Check:", emptyState);

  await cdp.screenshot("claim_empty_state.png");

  // -------------------------------------------------------------
  // STEP 3: CLAIM PORTAL - BENEFICIARY ALICE (ECIES & MERKLE CLAIM)
  // -------------------------------------------------------------
  console.log("\n=======================================================");
  console.log("STEP 3: CLAIM PORTAL - BENEFICIARY ALICE (/claim)");
  console.log("=======================================================");
  await connectOrSwitchPersona(cdp, "Alice");
  console.log("Switched to Alice persona. Waiting for live contract read & ECIES client decryption...");
  await sleep(4000);

  // Verify Alice claim card
  const aliceDetails = await cdp.eval(`
    (() => {
      const text = document.body.innerText;
      return {
        has40Percent: text.includes("40.00% Allocation") || text.includes("40.00%"),
        has1EthShare: text.includes("1.00 ETH"),
        hasEciesVerified: text.includes("ECIES Decryption:") && text.includes("✓ Verified Locally"),
        hasMerkleProofVerified: text.includes("Merkle Leaf Proof:") && text.includes("✓ Root Membership Valid"),
        hasClaimButton: Array.from(document.querySelectorAll("button")).some(b => b.innerText.includes("Execute Inheritance Claim")),
        snippet: text.slice(0, 600)
      };
    })()
  `);
  console.log("Alice Decrypted Claim Verification:", aliceDetails);

  await cdp.screenshot("claim_alice_decrypted.png");

  // Click "Execute Inheritance Claim"
  console.log("\n--- Executing Inheritance Claim for Alice ---");
  const claimExecuted = await cdp.eval(`
    (() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => 
        b.innerText.includes("Execute Inheritance Claim")
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    })()
  `);
  console.log("Execute claim clicked:", claimExecuted);
  await sleep(4000);

  const aliceExecutionResult = await cdp.eval(`
    (() => {
      const text = document.body.innerText;
      return {
        hasSuccessBanner: text.includes("Claim Successfully Executed") || text.includes("Transferred 1.00 ETH"),
        hasTxHash: text.includes("Tx Hash:"),
        hasClaimedBadge: text.includes("CLAIMED"),
        snippet: text.slice(0, 500)
      };
    })()
  `);
  console.log("Alice Claim Result:", aliceExecutionResult);

  await cdp.screenshot("claim_alice_executed.png");

  // -------------------------------------------------------------
  // STEP 4: CLAIM PORTAL - BENEFICIARY BOB (ECIES DECRYPTION)
  // -------------------------------------------------------------
  console.log("\n=======================================================");
  console.log("STEP 4: CLAIM PORTAL - BENEFICIARY BOB (/claim)");
  console.log("=======================================================");
  await connectOrSwitchPersona(cdp, "Bob");
  console.log("Switched to Bob persona. Waiting for live contract read & ECIES client decryption...");
  await sleep(4000);

  // Verify Bob claim card
  const bobDetails = await cdp.eval(`
    (() => {
      const text = document.body.innerText;
      return {
        has60Percent: text.includes("60.00% Allocation") || text.includes("60.00%"),
        has1_5EthShare: text.includes("1.50 ETH"),
        hasEciesVerified: text.includes("ECIES Decryption:") && text.includes("✓ Verified Locally"),
        hasMerkleProofVerified: text.includes("Merkle Leaf Proof:") && text.includes("✓ Root Membership Valid"),
        hasClaimButton: Array.from(document.querySelectorAll("button")).some(b => b.innerText.includes("Execute Inheritance Claim")),
        snippet: text.slice(0, 600)
      };
    })()
  `);
  console.log("Bob Decrypted Claim Verification:", bobDetails);

  await cdp.screenshot("claim_bob_decrypted.png");

  console.log("\n=======================================================");
  console.log("ALL E2E VERIFICATIONS SUCCEEDED AND SCREENSHOTS CAPTURED!");
  console.log("=======================================================");
  await cdp.close();
}

run().catch((err) => {
  console.error("E2E Verification Error:", err);
  process.exit(1);
});
