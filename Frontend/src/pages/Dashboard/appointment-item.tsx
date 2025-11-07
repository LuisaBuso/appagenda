import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';

interface AppointmentItemProps {
  name: string;
  service: string;
  time: string;
  avatarUrl?: string;
}

export function AppointmentItem({ name, service, time, avatarUrl }: AppointmentItemProps) {
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
        <div>
          <p className="font-medium text-gray-900">{name}</p>
          <p className="text-sm text-gray-500">{service}</p>
        </div>
      </div>
      <p className="text-sm font-medium text-gray-900">{time}</p>
    </div>
  );
}