import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import type { GiftCard } from "../types";
import { GiftCardStatusBadge } from "./GiftCardStatusBadge";
import { formatGiftCardDate, formatMoney } from "./utils";

interface GiftCardsTableProps {
  giftCards: GiftCard[];
  currency: string;
  isFetching: boolean;
}

export function GiftCardsTable({ giftCards, currency, isFetching }: GiftCardsTableProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h2 className="text-base font-semibold text-gray-900">Listado de Gift Cards</h2>
        {isFetching ? (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Actualizando...
          </div>
        ) : null}
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/60 hover:bg-gray-50/60">
            <TableHead className="px-5">Código</TableHead>
            <TableHead>Cliente comprador</TableHead>
            <TableHead>Beneficiario</TableHead>
            <TableHead>Valor inicial</TableHead>
            <TableHead>Saldo actual</TableHead>
            <TableHead>Fecha emisión</TableHead>
            <TableHead className="pr-5">Estado</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {giftCards.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">
                No se encontraron Gift Cards con los filtros aplicados.
              </TableCell>
            </TableRow>
          ) : (
            giftCards.map((giftCard) => (
              <TableRow key={giftCard._id || giftCard.codigo} className="hover:bg-slate-50/70">
                <TableCell className="px-5 font-semibold text-indigo-700">{giftCard.codigo}</TableCell>
                <TableCell className="text-gray-700">
                  {giftCard.comprador_nombre?.trim() || "Sin comprador"}
                </TableCell>
                <TableCell className="text-gray-700">
                  {giftCard.beneficiario_nombre?.trim() || giftCard.comprador_nombre?.trim() || "Sin beneficiario"}
                </TableCell>
                <TableCell className="font-medium text-gray-900">
                  {formatMoney(Number(giftCard.valor || 0), giftCard.moneda || currency)}
                </TableCell>
                <TableCell className="font-medium text-gray-900">
                  {formatMoney(Number(giftCard.saldo_disponible || 0), giftCard.moneda || currency)}
                </TableCell>
                <TableCell className="text-gray-700">
                  {formatGiftCardDate(giftCard.fecha_emision || giftCard.created_at)}
                </TableCell>
                <TableCell className="pr-5">
                  <GiftCardStatusBadge status={giftCard.estado} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
