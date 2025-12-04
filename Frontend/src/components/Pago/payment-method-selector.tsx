"use client"

import { Card } from "../../components/ui/card"
import { Button } from "../../components/ui/button"

interface PaymentMethodSelectorProps {
  selectedMethod: string
  onMethodChange: (method: string) => void
  amount: string
  paymentType: string
}

export function PaymentMethodSelector({
  selectedMethod,
  onMethodChange,
  amount,
  paymentType,
}: PaymentMethodSelectorProps) {
  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(Number(amount))
  }

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-lg font-semibold">Selecciona la forma de pago</h3>

      <div className="mb-6 space-y-3 rounded-lg border p-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Pago con link</span>
          <span className="font-medium">{formatAmount(amount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tipo de pago</span>
          <span className="font-medium">{paymentType}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Forma de</span>
          <span className="font-medium">Pago on link</span>
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-sm font-medium">Selecciona la forma de pago</h4>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedMethod === "link" ? "default" : "outline"}
            onClick={() => onMethodChange("link")}
            className={selectedMethod === "link" ? "bg-[oklch(0.55_0.25_280)] hover:bg-[oklch(0.50_0.25_280)]" : ""}
          >
            Pago con link
          </Button>
          <Button
            variant={selectedMethod === "card" ? "default" : "outline"}
            onClick={() => onMethodChange("card")}
            className={selectedMethod === "card" ? "bg-[oklch(0.55_0.25_280)] hover:bg-[oklch(0.50_0.25_280)]" : ""}
          >
            Tarjeta presente
          </Button>
          <Button
            variant={selectedMethod === "pix" ? "default" : "outline"}
            onClick={() => onMethodChange("pix")}
            className={selectedMethod === "pix" ? "bg-[oklch(0.55_0.25_280)] hover:bg-[oklch(0.50_0.25_280)]" : ""}
          >
            Terencia / PIX
          </Button>
        </div>
      </div>
    </Card>
  )
}
