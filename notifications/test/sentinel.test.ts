import { describe, it } from "node:test";
import assert from "node:assert";
import { sentinel } from "../sentinel.js";

describe("Autonomous Vault Sentinel Tests", () => {
  it("should have the default demo vault registered", () => {
    const vaults = sentinel.getMonitoredVaults();
    assert(vaults.length > 0, "Default vaults should be registered");
    const demo = vaults.find((v) => v.vaultAddress.toLowerCase() === "0x6a555565caef70d28c8ec038d5af8475fe5c97b1");
    assert(demo, "Accelerated Demo Sepolia Locker should be monitored by default");
    assert.strictEqual(demo.guardians.length, 2, "Should have 2 default guardians");
  });

  it("should register a new vault for autonomous monitoring", () => {
    const newVault = sentinel.registerVault({
      vaultAddress: "0x1111111111111111111111111111111111111111",
      name: "Test Inheritance Vault",
      guardians: [
        { address: "0x81C3D582F3473F71C4C8bF394E1d32BA218991a2", label: "Guardian 1", email: "g1@example.com" },
        { address: "0x34d7E2B013A49FC43c9c7fc7A7010b108B7cA1F0", label: "Guardian 2", email: "g2@example.com" },
      ],
    });

    assert.strictEqual(newVault.vaultAddress, "0x1111111111111111111111111111111111111111");
    assert.strictEqual(newVault.guardians.length, 2);
    assert.strictEqual(newVault.guardians[0].email, "g1@example.com");
  });

  it("should execute checkVaults gracefully without unhandled rejections", async () => {
    // Should run check without error even if test network is unreachable or vault mock
    await assert.doesNotReject(async () => {
      await sentinel.checkVaults();
    });
  });
});
