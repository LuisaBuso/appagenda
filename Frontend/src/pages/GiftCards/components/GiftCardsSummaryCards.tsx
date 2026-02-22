import { CreditCard, Loader2, Wallet, WalletCards } from "lucide-react";
import { Card, CardContent } from "../../../components/ui/card";
import { formatMoney } from "./utils";

interface GiftCardsSummaryCardsProps {
  activeCount: number;
  totalIssued: number;
  pendingBalance: number;
  currency: string;
  isRefreshing: boolean;
}

export function GiftCardsSummaryCards({
  activeCount,
  totalIssued,
  pendingBalance,
  currency,
  isRefreshing,
}: GiftCardsSummaryCardsProps) {
  const metrics = [
    {
      title: "Gift Cards activas",
      value: String(activeCount),
      description: "Disponibles para uso",
      icon: CreditCard,
      iconStyles: "text-indigo-600",
      containerStyles: "from-indigo-50 via-white to-indigo-50",
    },
    {
      title: "Saldo total emitido",
      value: formatMoney(totalIssued, currency),
      description: "Valor inicial emitido",
      icon: WalletCards,
      iconStyles: "text-blue-600",
      containerStyles: "from-blue-50 via-white to-blue-50",
    },
    {
      title: "Saldo pendiente",
      value: formatMoney(pendingBalance, currency),
      description: "Saldo por redimir",
      icon: Wallet,
      iconStyles: "text-emerald-600",
      containerStyles: "from-emerald-50 via-white to-emerald-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <Card
            key={metric.title}
            className={`relative overflow-hidden border border-gray-200 bg-gradient-to-br ${metric.containerStyles} shadow-sm`}
          >
            <CardContent className="flex items-start justify-between p-5">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-semibold text-gray-900">{metric.value}</p>
                <p className="text-xs text-gray-500">{metric.description}</p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/80 shadow-sm">
                {isRefreshing ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                ) : (
                  <Icon className={`h-5 w-5 ${metric.iconStyles}`} />
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
