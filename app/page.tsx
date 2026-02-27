import { ChatInterface } from '@/components/chat-interface';

export const metadata = {
  title: 'Stellar Wallet Chat',
  description: 'Manage your Stellar wallets with AI assistance',
};

export default function Home() {
  return (
    <main className="h-screen bg-gradient-to-b from-blue-50 to-white">
      <ChatInterface />
    </main>
  );
}
