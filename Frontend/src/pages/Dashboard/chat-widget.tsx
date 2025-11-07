import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Send } from 'lucide-react';

export function ChatWidget() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Chat</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <p className="text-sm font-medium">How was may day?</p>
          <p className="text-sm text-gray-600">You had 12 bookings and $2,500 in revenue.</p>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Type a message" className="flex-1" />
          <Button size="icon" variant="ghost">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}