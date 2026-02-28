// In-memory wallet storage for MVP
// Keys are session IDs, values are maps of wallet names to keypairs

import { WithId } from "mongodb";
import { clientPromise, db } from "./mongodb";
import { encrypt } from "./security";

interface StoredWallet {
  name: string;
  publicKey: string;
  network: "testnet" | "public";
  secretKey?: string; // Only in memory for current session
}

async function getWalletCollection() {
  const client = await clientPromise;
  return client.db("StellarAgent").collection<StoredWallet>("wallets");
}
// export function getSessionWallets(
//   sessionId: string,
// ): Map<string, StoredWallet> {
//   if (!walletSessions.has(sessionId)) {
//     walletSessions.set(sessionId, new Map());
//   }
//   return walletSessions.get(sessionId)!;
// }

export async function addWallet(
  sessionId: string,
  name: string,
  publicKey: string,
  secretKey: string,
  network: "testnet" | "public",
) {
  const encrypted = encrypt(secretKey);

  await db.collection("wallets").insertOne({
    sessionId,
    name,
    publicKey,
    encryptedSecretKey: encrypted,
    network,
    createdAt: new Date(),
  });

  return { name, publicKey, network };
}

export async function getWallet(sessionId: string, name: string) {
  return await db.collection("wallets").findOne({
    sessionId,
    name,
  });
}

export async function listWallets(sessionId: string) {
  return await db
    .collection("wallets")
    .find({ sessionId })
    .project({ encryptedSecretKey: 0 })
    .toArray();
}

export async function setNetwork(
  sessionId: string,
  name: string,
  network: "testnet" | "public",
): Promise<WithId<Document> | null> {
  const wallet = await getWallet(sessionId, name);
  if (!wallet) return null;
  wallet.network = network;
  return wallet;
}

export async function removeWallet(
  sessionId: string,
  name: string,
): Promise<boolean> {
  const col = await getWalletCollection();
  const result = await col.deleteOne({ sessionId, name });
  return result.deletedCount === 1;
}
