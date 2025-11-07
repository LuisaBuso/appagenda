import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';

interface StylistItemProps {
  name: string;
  revenue: string;
  avatarUrl?: string;
}

export function StylistItem({ name, revenue, avatarUrl }: StylistItemProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-4 last:border-0">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <p className="font-medium text-gray-900">{name}</p>
      </div>
      <p className="font-semibold text-gray-900">{revenue}</p>
    </div>
  );
}