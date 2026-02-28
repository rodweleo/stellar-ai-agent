import {
  Horizon,
  Networks,
  Keypair,
  TransactionBuilder,
  BASE_FEE,
  Asset,
  Operation,
} from "@stellar/stellar-sdk";
import {
  addWallet,
  getWallet,
  setNetwork as updateNetwork,
} from "./wallet-manager";
import axios from "axios";

const TESTNET_SERVER = new Horizon.Server(
  "https://horizon-testnet.stellar.org",
);
const PUBLIC_SERVER = new Horizon.Server("https://horizon.stellar.org");

function getServer(network: "testnet" | "public"): Horizon.Server {
  return network === "testnet" ? TESTNET_SERVER : PUBLIC_SERVER;
}

export interface ToolResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

// Create a new wallet
export async function createWallet(
  sessionId: string,
  name: string,
  network: "testnet" | "public" = "testnet",
): Promise<ToolResult> {
  try {
    const keypair = Keypair.random();
    const publicKey = keypair.publicKey();

    await addWallet(sessionId, name, publicKey, keypair.secret(), network);

    await fundWallet(publicKey);

    return {
      success: true,
      message: `Wallet '${name}' created successfully on ${network}. Public key is ${keypair.publicKey()}`,
      data: {
        name,
        publicKey: keypair.publicKey(),
        network,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to create wallet",
      error: String(error),
    };
  }
}

// Get account balance
export async function getBalance(
  walletAddress: string,
  network: "testnet" | "public",
): Promise<ToolResult | string> {
  try {
    if (!walletAddress) {
      return "Wallet address is required to fetch the account balance";
    }

    if (!network) {
      return "You need to specify the network for the wallet public key";
    }

    const server = getServer(network);
    const account = await server.loadAccount(walletAddress);

    const balances = account.balances.map((balance) => ({
      asset: balance.asset_type === "native" ? "XLM" : balance.asset_code,
      amount: balance.balance,
    }));

    return {
      success: true,
      message: `Balance for wallet '${walletAddress}'`,
      data: {
        walletAddress,
        balances,
        network: network,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to get balance for wallet '${walletAddress}'`,
      error: String(error),
    };
  }
}

export async function fundWallet(
  publicKey: string,
): Promise<ToolResult | string> {
  try {
    console.log(`Funding public account -> ${publicKey}`);
    const res = await axios.get(
      `https://friendbot.stellar.org/?addr=${publicKey}`,
    );

    if (res.status === 400) {
      return {
        success: false,
        data: res.data,
        message: "Wallet funded failed",
      };
    }
    return {
      success: true,
      data: res.data,
      message: "Wallet funded successfully",
    };
  } catch (e) {
    return {
      success: false,
      message: `Failed to fund wallet: '${publicKey}'`,
      error: e.response.data.detail,
    };
  }
}

// Send payment
export async function sendPayment(
  sessionId: string,
  fromWallet: string,
  toPublicKey: string,
  amount: string,
  asset: string = "XLM",
): Promise<ToolResult> {
  try {
    const wallet = await getWallet(sessionId, fromWallet);
    if (!wallet) {
      return {
        success: false,
        message: `Wallet '${fromWallet}' not found`,
      };
    }

    if (!wallet.secretKey) {
      return {
        success: false,
        message: "Cannot send payment: secret key not available",
      };
    }

    const server = getServer(wallet.network);
    const sourceAccount = await server.loadAccount(wallet.publicKey);

    const txBuilder = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase:
        wallet.network === "testnet" ? Networks.TESTNET : Networks.PUBLIC,
    });

    const stellarAsset =
      asset === "XLM" ? Asset.native() : new Asset(asset, wallet.publicKey);

    const tx = txBuilder
      .addOperation(
        Operation.payment({
          destination: toPublicKey,
          asset: stellarAsset,
          amount: amount,
        }),
      )
      // .setBaseFee(BASE_FEE)
      .setTimeout(30)
      .build();

    const keypair = Keypair.fromSecret(wallet.secretKey);
    tx.sign(keypair);

    const result = await server.submitTransaction(tx);

    return {
      success: true,
      message: `Payment of ${amount} ${asset} sent successfully`,
      data: {
        transactionHash: result.hash,
        ledger: result.ledger,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to send payment",
      error: String(error),
    };
  }
}

// Get account info
export async function getAccountInfo(
  sessionId: string,
  walletName: string,
): Promise<ToolResult> {
  try {
    const wallet = await getWallet(sessionId, walletName);
    if (!wallet) {
      return {
        success: false,
        message: `Wallet '${walletName}' not found`,
      };
    }

    const server = getServer(wallet.network);
    const account = await server.loadAccount(wallet.publicKey);

    return {
      success: true,
      message: `Account info for wallet '${walletName}'`,
      data: {
        walletName,
        publicKey: wallet.publicKey,
        network: wallet.network,
        sequence: account.sequence,
        subentryCount: account.subentry_count,
        signers: account.signers,
        balances: account.balances,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to get account info for wallet '${walletName}'`,
      error: String(error),
    };
  }
}

// Set network for wallet
export async function setNetwork(
  sessionId: string,
  walletName: string,
  network: "testnet" | "public",
): Promise<ToolResult> {
  try {
    const wallet = updateNetwork(sessionId, walletName, network);
    if (!wallet) {
      return {
        success: false,
        message: `Wallet '${walletName}' not found`,
      };
    }

    return {
      success: true,
      message: `Network switched to ${network}`,
      data: {
        walletName,
        network,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to set network",
      error: String(error),
    };
  }
}
