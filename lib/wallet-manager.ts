// In-memory wallet storage for MVP
// Keys are session IDs, values are maps of wallet names to keypairs

interface StoredWallet {
  name: string;
  publicKey: string;
  network: 'testnet' | 'public';
  secretKey?: string; // Only in memory for current session
}

const walletSessions = new Map<string, Map<string, StoredWallet>>();

export function getSessionWallets(sessionId: string): Map<string, StoredWallet> {
  if (!walletSessions.has(sessionId)) {
    walletSessions.set(sessionId, new Map());
  }
  return walletSessions.get(sessionId)!;
}

export function addWallet(
  sessionId: string,
  name: string,
  publicKey: string,
  secretKey: string,
  network: 'testnet' | 'public' = 'testnet'
): StoredWallet {
  const wallets = getSessionWallets(sessionId);
  const wallet: StoredWallet = {
    name,
    publicKey,
    network,
    secretKey, // Stored in memory only
  };
  wallets.set(name, wallet);
  return wallet;
}

export function getWallet(
  sessionId: string,
  name: string
): StoredWallet | undefined {
  return getSessionWallets(sessionId).get(name);
}

export function listWallets(sessionId: string): StoredWallet[] {
  const wallets = getSessionWallets(sessionId);
  return Array.from(wallets.values()).map((w) => ({
    ...w,
    secretKey: undefined, // Don't expose secret key in responses
  }));
}

export function setNetwork(
  sessionId: string,
  name: string,
  network: 'testnet' | 'public'
): StoredWallet | null {
  const wallet = getWallet(sessionId, name);
  if (!wallet) return null;
  wallet.network = network;
  return wallet;
}

export function removeWallet(sessionId: string, name: string): boolean {
  return getSessionWallets(sessionId).delete(name);
}
