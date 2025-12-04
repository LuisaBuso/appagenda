import { useEffect } from "react";
// En tu archivo PaymentOptions.tsx
interface PaymentOptionsProps {
    selectedType: "deposit" | "full";
    onTypeChange: (type: "deposit" | "full") => void;
    depositAmount: string;
    onDepositAmountChange: (amount: string) => void;
    totalAmount: number;
    fixedDeposit?: number;
    canHaveDeposit?: boolean; // 🔥 NUEVA PROP
}

export function PaymentOptions({
    selectedType,
    onTypeChange,
    depositAmount,
    onDepositAmountChange,
    totalAmount,
    fixedDeposit,
    canHaveDeposit = true // 🔥 Valor por defecto
}: PaymentOptionsProps) {
    
    // 🔥 SI HAY ABONO FIJO Y SE PERMITE, USAR ESE VALOR
    useEffect(() => {
        if (fixedDeposit && canHaveDeposit) {
            onDepositAmountChange(fixedDeposit.toString());
        }
    }, [fixedDeposit, canHaveDeposit, onDepositAmountChange]);

    // 🔥 SI NO SE PERMITE ABONO, FORZAR PAGO COMPLETO
    useEffect(() => {
        if (!canHaveDeposit && selectedType === "deposit") {
            onTypeChange("full");
        }
    }, [canHaveDeposit, selectedType, onTypeChange]);

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Opciones de pago</h2>
            
            <div className="space-y-4">
                {/* 🔥 OPCIÓN DE ABONO - SOLO SI SE PERMITE */}
                {canHaveDeposit && (
                    <button
                        onClick={() => onTypeChange("deposit")}
                        className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                            selectedType === "deposit" 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-semibold">Abono</div>
                                <div className="text-sm text-gray-600 mt-1">
                                    {fixedDeposit 
                                        ? `Abono fijo de $${fixedDeposit.toLocaleString()} COP`
                                        : `Reserva con abono de $${parseInt(depositAmount).toLocaleString()} COP`
                                    }
                                </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 ${
                                selectedType === "deposit" 
                                    ? 'bg-blue-500 border-blue-500' 
                                    : 'border-gray-300'
                            }`}>
                                {selectedType === "deposit" && (
                                    <div className="w-full h-full rounded-full bg-white scale-50"></div>
                                )}
                            </div>
                        </div>
                    </button>
                )}

                {/* Opción de pago completo */}
                <button
                    onClick={() => onTypeChange("full")}
                    className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                        selectedType === "full" 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-semibold">Pago completo</div>
                            <div className="text-sm text-gray-600 mt-1">
                                Pago total de ${totalAmount.toLocaleString()} COP
                            </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 ${
                            selectedType === "full" 
                                ? 'bg-green-500 border-green-500' 
                                : 'border-gray-300'
                        }`}>
                            {selectedType === "full" && (
                                <div className="w-full h-full rounded-full bg-white scale-50"></div>
                            )}
                        </div>
                    </div>
                </button>
            </div>

            {/* 🔥 MOSTRAR INPUT SOLO SI NO HAY ABONO FIJO Y SE PERMITE ABONO */}
            {selectedType === "deposit" && !fixedDeposit && canHaveDeposit && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Monto del abono
                    </label>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500">$</span>
                        <input
                            type="number"
                            value={depositAmount}
                            onChange={(e) => onDepositAmountChange(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="50000"
                            min="0"
                            max={totalAmount}
                        />
                        <span className="text-gray-500">COP</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                        Recomendado: ${Math.round(totalAmount * 0.3).toLocaleString()} COP (30%)
                    </div>
                </div>
            )}

            {/* 🔥 MENSAJE INFORMATIVO CUANDO NO APLICA ABONO */}
            {!canHaveDeposit && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-700 text-sm">
                        💡 Los servicios con valor igual o menor a ${fixedDeposit?.toLocaleString()} COP 
                        requieren <strong>pago completo</strong>.
                    </p>
                </div>
            )}
        </div>
    )
}