import { z } from "zod";
import {
  createWallet,
  getBalance,
  sendPayment,
  getAccountInfo,
  setNetwork,
} from "@/lib/stellar-tools";
import { listWallets } from "@/lib/wallet-manager";
import { tool } from "@langchain/core/tools";
import { createAgent } from "langchain";
import { ChatGroq } from "@langchain/groq";
import { MemorySaver } from "@langchain/langgraph";
import crypto from "crypto";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { MongoClient } from "mongodb";

// Connect to your MongoDB cluster
const client = new MongoClient(process.env.MONGODB_URI!);

client
  .connect()
  .then(async (res) => {
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  })
  .catch((e) => {
    console.error(`Something went wrong: ${e.message}`);
  });

// Initialize the MongoDB checkpointer
const checkpointer = new MongoDBSaver({
  client,
  dbName: "StellarAgent",
});

// const checkpointer = new MemorySaver();

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.3-70b-versatile",
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
  }
);

export const getBalanceTool = tool(
  async ({ wallet_name, toolCallId }) => {
    const sessionId = toolCallId.split("-")[0];
    return await getBalance(sessionId, wallet_name);
  },
  {
    name: "get_balance",
    description: "Get the balance of a specific wallet",
    parameters: z.object({
      wallet_name: z
        .string()
        .describe("Name of the wallet to check balance for"),
      toolCallId: z.any(),
    }),
  }
);

export const sendPaymentTool = tool(
  async ({ from_wallet, to_address, amount, asset }, { toolCallId }) => {
    const sessionId = toolCallId.split("-")[0];
    return await sendPayment(sessionId, from_wallet, to_address, amount, asset);
  },
  {
    description: "Send XLM payment from one wallet to another address",
    parameters: z.object({
      from_wallet: z.string().describe("Name of the wallet to send from"),
      to_address: z.string().describe("Destination public key or address"),
      amount: z.string().describe("Amount of XLM to send"),
      asset: z.string().default("XLM").describe("Asset code (default: XLM)"),
    }),
  }
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
    description: "Get detailed account information for a wallet",
    parameters: z.object({
      wallet_name: z.string().describe("Name of the wallet"),
    }),
  }
);

export const stellarAgent = createAgent({
  model: llm,
  tools: [createWalletTool],
  systemPrompt: `You are a helpful Stellar blockchain assistant. You help users manage their Stellar wallets, check balances, and send payments.
  
  When users ask to create wallets, check balances, send payments, or manage their accounts, use the available tools to help them.
  
  Always explain what you're doing and provide clear feedback about the results.
  
  Be helpful and clear in your responses, and ask for clarification if needed.
  `,
  checkpointer,
});
