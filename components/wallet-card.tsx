import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface WalletCardProps {
  name: string;
  publicKey: string;
  network: 'testnet' | 'public';
}

export function WalletCard({ name, publicKey, network }: WalletCardProps) {
  const shortKey = publicKey.substring(0, 10) + '...' + publicKey.substring(publicKey.length - 6);

  return (
    <Card className="mb-3">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{name}</CardTitle>
        <CardDescription>{network === 'testnet' ? '🧪 Testnet' : '🌍 Public Network'}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-mono text-gray-600 break-all">{shortKey}</p>
      </CardContent>
    </Card>
  );
}
