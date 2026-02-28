import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI!);
export const clientPromise = client.connect();

export const db = client.db("stellar_chat");
