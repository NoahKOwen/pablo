// server/services/hdWallet.ts

import { ethers } from "ethers";

/**
 * HD Wallet Service for generating unique deposit addresses per user.
 *
 * Uses BIP44 derivation path for BSC:
 *   m/44'/714'/0'/0/{index}
 *
 * MASTER_SEED can be:
 *   - a 12/24-word BIP39 mnemonic, OR
 *   - a hex seed (0x...).
 */

const MASTER_SEED_ENV = "MASTER_SEED";
const BSC_DERIVATION_PATH = "m/44'/714'/0'/0"; // BSC path (BNB Chain)

/**
 * Internal helper: get the HD node for a specific derivation index.
 */
function getHdNodeForIndex(derivationIndex: number): ethers.HDNodeWallet {
  const rawSeed = process.env[MASTER_SEED_ENV];

  if (!rawSeed) {
    throw new Error("MASTER_SEED environment variable not set");
  }

  const masterSeed = rawSeed.trim();
  if (!masterSeed) {
    throw new Error("MASTER_SEED environment variable is empty");
  }

  const path = `${BSC_DERIVATION_PATH}/${derivationIndex}`;

  // Mnemonic case (12+ words)
  const wordCount = masterSeed.split(/\s+/).length;
  if (wordCount >= 12) {
    let mnemonic: ethers.Mnemonic;
    try {
      mnemonic = ethers.Mnemonic.fromPhrase(masterSeed);
    } catch {
      throw new Error(
        "Invalid MASTER_SEED mnemonic. Must be a valid 12/24-word phrase.",
      );
    }
    return ethers.HDNodeWallet.fromMnemonic(mnemonic, path);
  }

  // Hex seed case
  if (!/^0x[a-fA-F0-9]{64,}$/.test(masterSeed)) {
    throw new Error(
      "MASTER_SEED must be either a 12/24-word mnemonic or a 0x-prefixed hex seed",
    );
  }

  try {
    const root = ethers.HDNodeWallet.fromSeed(masterSeed);
    return root.derivePath(path);
  } catch {
    throw new Error("Invalid MASTER_SEED hex seed");
  }
}

/**
 * Derives a unique BSC deposit address for a user.
 * @param derivationIndex - Unique index for this user.
 * @returns Ethereum-compatible address (0x...)
 */
export function deriveDepositAddress(derivationIndex: number): string {
  const hdNode = getHdNodeForIndex(derivationIndex);
  return hdNode.address.toLowerCase();
}

/**
 * Generates a new master seed mnemonic (for initial setup).
 * WARNING: Only call this once during initial setup!
 * @returns 12-word mnemonic phrase
 */
export function generateMasterSeed(): string {
  const wallet = ethers.Wallet.createRandom();
  return wallet.mnemonic!.phrase;
}

/**
 * Validates that a master seed is properly formatted.
 * Accepts either mnemonic phrases or 0x-hex seeds.
 */
export function validateMasterSeed(seed: string): boolean {
  const trimmed = seed.trim();
  if (!trimmed) return false;

  try {
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount >= 12) {
      ethers.Mnemonic.fromPhrase(trimmed);
      return true;
    }

    if (!/^0x[a-fA-F0-9]{64,}$/.test(trimmed)) {
      return false;
    }

    ethers.HDNodeWallet.fromSeed(trimmed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the private key for a derived address (for sweeper functionality).
 * SECURITY: Only use this for automated sweeping, never expose to users.
 * @param derivationIndex - User's derivation index.
 * @returns Private key (0x...)
 */
export function getDerivedPrivateKey(derivationIndex: number): string {
  const hdNode = getHdNodeForIndex(derivationIndex);
  return hdNode.privateKey;
}
