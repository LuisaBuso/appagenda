import { Card, CardContent } from '../../components/ui/card';

interface MetricCardProps {
  title: string;
  subtitle: string;
  value: string | number;
}

export function MetricCard({ title, subtitle, value }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3">
          <p className="text-sm font-medium text-gray-700">{title}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}