import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Switch } from "../../../components/ui/switch";
import { Textarea } from "../../../components/ui/textarea";
import { giftcardsService } from "../giftcardsService";
import type { GiftCardClientOption, GiftCardCreatePayload } from "../types";
import { formatMoney, toPositiveNumber } from "./utils";

const PRESET_AMOUNTS = [50000, 100000, 150000, 200000, 300000];

type AmountMode = "preset" | "free";
type BuyerMode = "client" | "manual";
type BeneficiaryMode = "client" | "manual";
type ValidityMode = "annual" | "custom";
type PaymentMethod = "efectivo" | "transferencia" | "tarjeta_credito" | "tarjeta_debito";

const PAYMENT_OPTIONS: Array<{ label: string; value: PaymentMethod }> = [
  { label: "Efectivo", value: "efectivo" },
  { label: "Transferencia", value: "transferencia" },
  { label: "Tarjeta Crédito", value: "tarjeta_credito" },
  { label: "Tarjeta Débito", value: "tarjeta_debito" },
];

export interface CreateGiftCardSubmission {
  payload: GiftCardCreatePayload;
  paymentMethod: PaymentMethod;
  beneficiaryEmail?: string;
  beneficiaryPhone?: string;
}

interface CreateGiftCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  sedeId: string;
  sedeName?: string;
  currency: string;
  onCreate: (submission: CreateGiftCardSubmission) => Promise<void>;
  isSubmitting: boolean;
}

function getDateInputFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getTodayDateInput(): string {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function calculateDaysBetweenToday(endDate: string): number {
  const today = new Date(getTodayDateInput());
  const target = new Date(endDate);
  if (Number.isNaN(target.getTime())) return 0;

  const milliseconds = target.getTime() - today.getTime();
  return Math.ceil(milliseconds / (1000 * 60 * 60 * 24));
}

export function CreateGiftCardModal({
  open,
  onOpenChange,
  token,
  sedeId,
  sedeName,
  currency,
  onCreate,
  isSubmitting,
}: CreateGiftCardModalProps) {
  const [clients, setClients] = useState<GiftCardClientOption[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [hasLoadedClients, setHasLoadedClients] = useState(false);

  const [amountMode, setAmountMode] = useState<AmountMode>("preset");
  const [presetAmount, setPresetAmount] = useState<number>(PRESET_AMOUNTS[1]);
  const [freeAmountInput, setFreeAmountInput] = useState<string>("");

  const [buyerMode, setBuyerMode] = useState<BuyerMode>("client");
  const [buyerSearch, setBuyerSearch] = useState("");
  const [selectedBuyerId, setSelectedBuyerId] = useState("");
  const [buyerManualName, setBuyerManualName] = useState("");

  const [isForAnotherPerson, setIsForAnotherPerson] = useState(false);
  const [beneficiaryMode, setBeneficiaryMode] = useState<BeneficiaryMode>("manual");
  const [beneficiarySearch, setBeneficiarySearch] = useState("");
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [beneficiaryPhone, setBeneficiaryPhone] = useState("");
  const [beneficiaryEmail, setBeneficiaryEmail] = useState("");

  const [validityMode, setValidityMode] = useState<ValidityMode>("annual");
  const [customExpiryDate, setCustomExpiryDate] = useState(getDateInputFromToday(365));

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [optionalMessage, setOptionalMessage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const selectedBuyer = useMemo(
    () => clients.find((client) => client.id === selectedBuyerId) ?? null,
    [clients, selectedBuyerId]
  );

  const selectedBeneficiary = useMemo(
    () => clients.find((client) => client.id === selectedBeneficiaryId) ?? null,
    [clients, selectedBeneficiaryId]
  );

  const buyerOptions = useMemo(() => {
    const term = buyerSearch.trim().toLowerCase();
    if (!term) return clients.slice(0, 60);

    return clients
      .filter((client) => {
        const value = `${client.nombre} ${client.email ?? ""} ${client.id}`.toLowerCase();
        return value.includes(term);
      })
      .slice(0, 60);
  }, [buyerSearch, clients]);

  const beneficiaryOptions = useMemo(() => {
    const term = beneficiarySearch.trim().toLowerCase();
    if (!term) return clients.slice(0, 60);

    return clients
      .filter((client) => {
        const value = `${client.nombre} ${client.email ?? ""} ${client.id}`.toLowerCase();
        return value.includes(term);
      })
      .slice(0, 60);
  }, [beneficiarySearch, clients]);

  const totalAmount = amountMode === "preset" ? presetAmount : toPositiveNumber(freeAmountInput);

  useEffect(() => {
    if (!open || !token || hasLoadedClients) return;

    let isMounted = true;

    const loadClients = async () => {
      try {
        setIsLoadingClients(true);
        setClientsError(null);
        const list = await giftcardsService.fetchClientsForSelector(token);
        if (!isMounted) return;
        setClients(list);
        setHasLoadedClients(true);
      } catch (error) {
        if (!isMounted) return;
        setClientsError(error instanceof Error ? error.message : "No se pudieron cargar clientes");
      } finally {
        if (isMounted) {
          setIsLoadingClients(false);
        }
      }
    };

    loadClients();

    return () => {
      isMounted = false;
    };
  }, [open, token, hasLoadedClients]);

  useEffect(() => {
    if (open) return;

    setFormError(null);
    setAmountMode("preset");
    setPresetAmount(PRESET_AMOUNTS[1]);
    setFreeAmountInput("");
    setBuyerMode("client");
    setBuyerSearch("");
    setSelectedBuyerId("");
    setBuyerManualName("");
    setIsForAnotherPerson(false);
    setBeneficiaryMode("manual");
    setBeneficiarySearch("");
    setSelectedBeneficiaryId("");
    setBeneficiaryName("");
    setBeneficiaryPhone("");
    setBeneficiaryEmail("");
    setValidityMode("annual");
    setCustomExpiryDate(getDateInputFromToday(365));
    setPaymentMethod("efectivo");
    setOptionalMessage("");
  }, [open]);

  const submitCreateGiftCard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFormError(null);

    if (!sedeId) {
      setFormError("No se encontró la sede para crear la Gift Card");
      return;
    }

    if (!totalAmount || totalAmount <= 0) {
      setFormError("El valor de la Gift Card debe ser mayor a 0");
      return;
    }

    const buyerName = buyerMode === "client" ? selectedBuyer?.nombre?.trim() : buyerManualName.trim();
    if (!buyerName) {
      setFormError("Debes seleccionar o escribir el comprador");
      return;
    }

    const customDays = validityMode === "custom" ? calculateDaysBetweenToday(customExpiryDate) : 365;
    if (validityMode === "custom" && customDays <= 0) {
      setFormError("La fecha de vigencia personalizada debe ser posterior a hoy");
      return;
    }

    let finalBeneficiaryId: string | undefined;
    let finalBeneficiaryName = "";
    let finalBeneficiaryEmail = "";
    let finalBeneficiaryPhone = "";

    if (isForAnotherPerson) {
      if (beneficiaryMode === "client") {
        if (!selectedBeneficiary?.id) {
          setFormError("Selecciona el cliente beneficiario");
          return;
        }

        finalBeneficiaryId = selectedBeneficiary.id;
        finalBeneficiaryName = selectedBeneficiary.nombre;
        finalBeneficiaryEmail = selectedBeneficiary.email ?? "";
        finalBeneficiaryPhone = selectedBeneficiary.telefono ?? "";
      } else {
        finalBeneficiaryName = beneficiaryName.trim();
        finalBeneficiaryEmail = beneficiaryEmail.trim();
        finalBeneficiaryPhone = beneficiaryPhone.trim();

        if (!finalBeneficiaryName) {
          setFormError("El nombre del beneficiario es obligatorio");
          return;
        }
      }
    } else {
      finalBeneficiaryId = buyerMode === "client" ? selectedBuyer?.id : undefined;
      finalBeneficiaryName = buyerName;
      finalBeneficiaryEmail = selectedBuyer?.email ?? "";
      finalBeneficiaryPhone = selectedBuyer?.telefono ?? "";
    }

    const notesParts: string[] = [];
    if (optionalMessage.trim()) {
      notesParts.push(`Mensaje: ${optionalMessage.trim()}`);
    }
    notesParts.push(`Metodo de pago: ${paymentMethod}`);
    if (finalBeneficiaryPhone) {
      notesParts.push(`Telefono beneficiario: ${finalBeneficiaryPhone}`);
    }
    if (finalBeneficiaryEmail) {
      notesParts.push(`Email beneficiario: ${finalBeneficiaryEmail}`);
    }

    const payload: GiftCardCreatePayload = {
      sede_id: sedeId,
      valor: totalAmount,
      moneda: currency,
      dias_vigencia: validityMode === "custom" ? customDays : 365,
      comprador_cliente_id: buyerMode === "client" ? selectedBuyer?.id : undefined,
      comprador_nombre: buyerName,
      beneficiario_cliente_id: finalBeneficiaryId,
      beneficiario_nombre: finalBeneficiaryName,
      notas: notesParts.join(" | "),
    };

    try {
      await onCreate({
        payload,
        paymentMethod,
        beneficiaryEmail: finalBeneficiaryEmail || undefined,
        beneficiaryPhone: finalBeneficiaryPhone || undefined,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo crear la Gift Card");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto border-0 bg-white p-0 shadow-2xl">
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 px-7 py-6 text-white">
          <DialogHeader className="text-left">
            <DialogTitle className="text-2xl font-semibold">Crear Gift Card</DialogTitle>
            <DialogDescription className="text-indigo-100">
              Configura el valor, comprador, beneficiario y vigencia para emitir la Gift Card.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={submitCreateGiftCard} className="space-y-6 px-7 py-6">
          <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Valor de la Gift Card</h3>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                {formatMoney(totalAmount, currency)}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAmountMode("preset")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  amountMode === "preset"
                    ? "bg-indigo-600 text-white"
                    : "border border-gray-200 bg-white text-gray-700"
                }`}
              >
                Monto predefinido
              </button>
              <button
                type="button"
                onClick={() => setAmountMode("free")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  amountMode === "free"
                    ? "bg-indigo-600 text-white"
                    : "border border-gray-200 bg-white text-gray-700"
                }`}
              >
                Monto libre
              </button>
            </div>

            {amountMode === "preset" ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PRESET_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPresetAmount(value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                      presetAmount === value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300"
                    }`}
                  >
                    {formatMoney(value, currency)}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Monto libre</label>
                <Input
                  inputMode="numeric"
                  placeholder="Ej: 150000"
                  value={freeAmountInput}
                  onChange={(event) => setFreeAmountInput(event.target.value)}
                />
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">Comprador</h3>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setBuyerMode("client")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  buyerMode === "client"
                    ? "bg-blue-600 text-white"
                    : "border border-gray-200 bg-white text-gray-700"
                }`}
              >
                Cliente registrado
              </button>
              <button
                type="button"
                onClick={() => setBuyerMode("manual")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  buyerMode === "manual"
                    ? "bg-blue-600 text-white"
                    : "border border-gray-200 bg-white text-gray-700"
                }`}
              >
                Nombre manual
              </button>
            </div>

            {buyerMode === "client" ? (
              <div className="grid grid-cols-1 gap-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={buyerSearch}
                    onChange={(event) => setBuyerSearch(event.target.value)}
                    placeholder="Buscar por nombre, correo o ID"
                    className="pl-9"
                  />
                </div>

                <select
                  value={selectedBuyerId}
                  onChange={(event) => setSelectedBuyerId(event.target.value)}
                  className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  disabled={isLoadingClients}
                >
                  <option value="">Selecciona un comprador</option>
                  {buyerOptions.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.nombre} {client.email ? `(${client.email})` : ""}
                    </option>
                  ))}
                </select>

                {isLoadingClients ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Cargando clientes...
                  </div>
                ) : null}
                {clientsError ? <p className="text-xs text-amber-700">{clientsError}</p> : null}
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-gray-600">Nombre comprador</label>
                <Input
                  value={buyerManualName}
                  onChange={(event) => setBuyerManualName(event.target.value)}
                  placeholder="Nombre completo del comprador"
                />
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">Beneficiario</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Switch checked={isForAnotherPerson} onCheckedChange={setIsForAnotherPerson} />
                <span>Es para otra persona</span>
              </div>
            </div>

            {!isForAnotherPerson ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                La Gift Card quedará a nombre del comprador.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setBeneficiaryMode("manual")}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                      beneficiaryMode === "manual"
                        ? "bg-emerald-600 text-white"
                        : "border border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    Datos manuales
                  </button>
                  <button
                    type="button"
                    onClick={() => setBeneficiaryMode("client")}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                      beneficiaryMode === "client"
                        ? "bg-emerald-600 text-white"
                        : "border border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    Cliente registrado
                  </button>
                </div>

                {beneficiaryMode === "client" ? (
                  <div className="grid grid-cols-1 gap-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        value={beneficiarySearch}
                        onChange={(event) => setBeneficiarySearch(event.target.value)}
                        placeholder="Buscar beneficiario"
                        className="pl-9"
                      />
                    </div>
                    <select
                      value={selectedBeneficiaryId}
                      onChange={(event) => setSelectedBeneficiaryId(event.target.value)}
                      className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700"
                      disabled={isLoadingClients}
                    >
                      <option value="">Selecciona beneficiario</option>
                      {beneficiaryOptions.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.nombre} {client.email ? `(${client.email})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Nombre</label>
                      <Input
                        value={beneficiaryName}
                        onChange={(event) => setBeneficiaryName(event.target.value)}
                        placeholder="Nombre beneficiario"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Teléfono</label>
                      <Input
                        value={beneficiaryPhone}
                        onChange={(event) => setBeneficiaryPhone(event.target.value)}
                        placeholder="Opcional"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Email</label>
                      <Input
                        value={beneficiaryEmail}
                        onChange={(event) => setBeneficiaryEmail(event.target.value)}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-900">Vigencia</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setValidityMode("annual")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    validityMode === "annual"
                      ? "bg-indigo-600 text-white"
                      : "border border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  12 meses
                </button>
                <button
                  type="button"
                  onClick={() => setValidityMode("custom")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    validityMode === "custom"
                      ? "bg-indigo-600 text-white"
                      : "border border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  Personalizada
                </button>
              </div>

              {validityMode === "custom" ? (
                <div>
                  <label className="text-xs font-medium text-gray-600">Repetir hasta</label>
                  <Input
                    type="date"
                    value={customExpiryDate}
                    min={getTodayDateInput()}
                    onChange={(event) => setCustomExpiryDate(event.target.value)}
                  />
                </div>
              ) : (
                <p className="text-xs text-gray-500">Vencimiento automático a 365 días desde emisión.</p>
              )}
            </div>

            <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-900">Método de pago</h3>
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700"
              >
                {PAYMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div>
                <label className="text-xs font-medium text-gray-600">Sede</label>
                <Input value={sedeName?.trim() || sedeId} readOnly className="bg-gray-50" />
              </div>
            </div>
          </section>

          <section className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">Mensaje opcional</h3>
            <Textarea
              value={optionalMessage}
              onChange={(event) => setOptionalMessage(event.target.value)}
              placeholder="Mensaje que aparecerá en la gift card"
              rows={3}
            />
          </section>

          {formError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          ) : null}

          <DialogFooter className="border-t border-gray-100 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 text-white hover:bg-indigo-500"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Gift Card"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
