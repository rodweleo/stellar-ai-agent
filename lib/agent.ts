import { z } from "zod";
import {
  createWallet,
  getBalance,
  sendPayment,
  getAccountInfo,
  setNetwork,
  fundWallet,
  buildPaymentXDR,
} from "@/lib/stellar-tools";
import { listWallets } from "@/lib/wallet-manager";
import { tool } from "@langchain/core/tools";
import { createAgent, humanInTheLoopMiddleware } from "langchain";
import { ChatGroq } from "@langchain/groq";
import { interrupt, MemorySaver } from "@langchain/langgraph";
import crypto from "crypto";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { MongoClient } from "mongodb";

// Connect to your MongoDB cluster
const client = new MongoClient(process.env.MONGODB_URI!);

// Initialize the MongoDB checkpointer
const checkpointer = new MongoDBSaver({
  client,
});

// const checkpointer = new MemorySaver();

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.1-8b-instant",
  temperature: 0,
});

export const configs = { configurable: { thread_id: crypto.randomUUID() } };

export const createWalletTool = tool(
  async ({ name, network }) => {
    return await createWallet(name, network);
  },
  {
    name: "create_wallet",
    description:
      "Create a new Stellar wallet with a random keypair. Returns the wallet name and public key.",
    schema: z.object({
      name: z.string().describe("Name for the new wallet"),
      network: z
        .enum(["testnet", "public"])
        .default("testnet")
        .describe("Stellar network to use"),
    }),
  },
);

export const getBalanceTool = tool(
  async ({ walletAddress, network }) => {
    return await getBalance(walletAddress, network);
  },
  {
    name: "get_balance",
    description: "Get the balance of a specific wallet",
    schema: z.object({
      walletAddress: z
        .string()
        .describe("The wallet address for the balance to be searched for"),
      network: z
        .enum(["testnet", "public"])
        .default("testnet")
        .describe("Stellar network to use"),
    }),
  },
);

export const fundWalletTool = tool(
  async ({ walletAddress }) => {
    return await fundWallet(walletAddress);
  },
  {
    name: "fund_wallet",
    description: "This is used to fund the wallet of the provided",
    schema: z.object({
      walletAddress: z.string().describe("The wallet address to fund."),
    }),
  },
);

export const sendPaymentTool = tool(
  async ({ from_wallet, to_address, amount, asset, network }, config) => {
    const sessionId = config?.configurable?.thread_id ?? crypto.randomUUID();

    const built = await buildPaymentXDR(
      sessionId,
      from_wallet,
      to_address,
      amount,
      asset,
      network,
    );

    if (!built.success) return built;

    // Native LangGraph interrupt — pauses the graph here and waits
    const decision = interrupt({
      type: "transaction_approval_required",
      xdr: built.xdr,
      details: built.data,
    });

    // Graph resumes here after /api/resume is called
    if (decision === "reject") {
      return { success: false, message: "Transaction rejected by user." };
    }

    return;
  },
  {
    name: "send_payment",
    description:
      "Build a Stellar payment transaction for user approval. Returns an unsigned XDR that the user must approve and sign.",
    schema: z.object({
      from_wallet: z.string().describe("Name of the wallet to send from"),
      to_address: z.string().describe("Destination public key"),
      amount: z.string().describe("Amount to send"),
      asset: z.string().default("XLM").describe("Asset code (default: XLM)"),
      network: z
        .enum(["testnet", "public"])
        .default("testnet")
        .describe("Stellar network to use"),
    }),
  },
);

//   list_wallets: tool({
//     description: "List all wallets in the current session",
//     parameters: z.object({}),
//     execute: async (_, { toolCallId }) => {
//       const sessionId = toolCallId.split("-")[0];
//       const wallets = listWallets(sessionId);
//       return {
//         success: true,
//         message: `Found ${wallets.length} wallet(s)`,
//         data: wallets,
//       };
//     },
//   }),

// export const setNetworkTool =  tool(
//     async ({ wallet_name, network ,toolCallId}) => {
//     const sessionId = toolCallId.split("-")[0];
//     return await setNetwork(sessionId, wallet_name, network);
//   },{
//     description: "Switch a wallet between testnet and public network",
//     parameters: z.object({
//       wallet_name: z.string().describe("Name of the wallet"),
//       network: z.enum(["testnet", "public"]).describe("Target network"),
//     })
//   }),

export const getAccountInfoTool = tool(
  async ({ wallet_name }, { toolCallId }) => {
    const sessionId = toolCallId.split("-")[0];
    return await getAccountInfo(sessionId, wallet_name);
  },
  {
    name: "get_account_info",
    description: "Get detailed account information for a wallet",
    schema: z.object({
      wallet_name: z.string().describe("Name of the wallet"),
    }),
  },
);

export const stellarAgent = createAgent({
  model: llm,
  tools: [
    createWalletTool,
    getBalanceTool,
    getAccountInfoTool,
    sendPaymentTool,
    fundWalletTool,
  ],
  middleware: [
    humanInTheLoopMiddleware({
      interruptOn: {
        send_payment: {
          allowedDecisions: ["approve", "reject"],
          description: "Sending payment requires approval",
        },
      },

      descriptionPrefix: "Sending payment requires approval",
    }),
  ],
  systemPrompt: `You are a helpful Stellar blockchain assistant. You help users manage their Stellar wallets, check balances, and send payments.
  
  When users ask to create wallets, check balances, send payments, or manage their accounts, use the available tools to help them.
  
  Always explain what you're doing and provide clear feedback about the results.
  
  Be helpful and clear in your responses, and ask for clarification if needed.
  `,
  checkpointer,
});
