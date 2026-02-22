"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Gift,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import { Sidebar } from "../../components/Layout/Sidebar";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Toaster } from "../../components/ui/toaster";
import { useAuth } from "../../components/Auth/AuthContext";
import { toast } from "../../hooks/use-toast";
import { sedeService } from "../PageSuperAdmin/Sedes/sedeService";
import { giftcardsService } from "./giftcardsService";
import type { Sede } from "../../types/sede";
import type { GiftCard, GiftCardStatus } from "./types";
import { CreateGiftCardModal, type CreateGiftCardSubmission } from "./components/CreateGiftCardModal";
import { GiftCardConfirmationModal } from "./components/GiftCardConfirmationModal";
import { GiftCardsSummaryCards } from "./components/GiftCardsSummaryCards";
import { GiftCardsTable } from "./components/GiftCardsTable";

const PAGE_SIZE = 15;
const SUPER_ADMIN_ROLES = new Set(["super_admin", "superadmin"]);

type StatusFilter = "all" | "activa" | "usada" | "cancelada" | "vencida" | "parcialmente_usada";

const STATUS_OPTIONS: Array<{ label: string; value: StatusFilter }> = [
  { label: "Todos los estados", value: "all" },
  { label: "Activa", value: "activa" },
  { label: "Parcial", value: "parcialmente_usada" },
  { label: "Usada", value: "usada" },
  { label: "Cancelada", value: "cancelada" },
  { label: "Vencida", value: "vencida" },
];

export default function GiftCardsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const role = user?.role || sessionStorage.getItem("beaux-role") || "";
  const token = user?.access_token || sessionStorage.getItem("access_token") || "";

  const isSuperAdmin = SUPER_ADMIN_ROLES.has(role);

  const [sedes, setSedes] = useState<Sede[]>([]);
  const [isLoadingSedes, setIsLoadingSedes] = useState(false);
  const [selectedSedeId, setSelectedSedeId] = useState("");

  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isCreatingGiftCard, setIsCreatingGiftCard] = useState(false);
  const [latestCreatedGiftCard, setLatestCreatedGiftCard] = useState<GiftCard | null>(null);
  const [latestCreatedEmail, setLatestCreatedEmail] = useState<string | undefined>(undefined);

  const latestRequestIdRef = useRef(0);

  const selectedSedeName = useMemo(() => {
    if (!selectedSedeId) return "";
    const found = sedes.find((sede) => sede.sede_id === selectedSedeId);
    return found?.nombre || selectedSedeId;
  }, [sedes, selectedSedeId]);

  const displayCurrency = useMemo(() => {
    const fromCards = giftCards.find((item) => item.moneda)?.moneda;
    const fromSession = sessionStorage.getItem("beaux-moneda");
    return String(fromCards || fromSession || user?.moneda || "COP").toUpperCase();
  }, [giftCards, user?.moneda]);

  const filteredGiftCards = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return giftCards;

    return giftCards.filter((giftCard) => {
      const searchable = [
        giftCard.codigo,
        giftCard.comprador_nombre,
        giftCard.beneficiario_nombre,
        giftCard.sede_nombre,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return searchable.includes(term);
    });
  }, [giftCards, searchTerm]);

  const summaryMetrics = useMemo(() => {
    const activeStatuses = new Set<GiftCardStatus>(["activa", "parcialmente_usada"]);

    const activeCount = filteredGiftCards.filter((giftCard) => activeStatuses.has(giftCard.estado)).length;
    const totalIssued = filteredGiftCards.reduce((total, giftCard) => total + Number(giftCard.valor || 0), 0);
    const pendingBalance = filteredGiftCards.reduce(
      (total, giftCard) => total + Number(giftCard.saldo_disponible || 0) + Number(giftCard.saldo_reservado || 0),
      0
    );

    return { activeCount, totalIssued, pendingBalance };
  }, [filteredGiftCards]);

  const loadGiftCards = useCallback(
    async (page: number, options?: { preserveInitial?: boolean }) => {
      if (!token || !selectedSedeId) return;

      const requestId = ++latestRequestIdRef.current;
      const preserveInitial = options?.preserveInitial ?? false;

      try {
        if (!preserveInitial) {
          setIsInitialLoading(page === 1);
        }
        setIsFetching(true);
        setError(null);

        const response = await giftcardsService.getGiftCardsBySede(token, selectedSedeId, {
          estado: statusFilter === "all" ? undefined : statusFilter,
          page,
          limit: PAGE_SIZE,
        });

        if (requestId !== latestRequestIdRef.current) return;

        setGiftCards(Array.isArray(response.giftcards) ? response.giftcards : []);
        setCurrentPage(response.pagination?.page ?? page);
        setTotalPages(response.pagination?.total_pages ?? 0);
        setTotalItems(response.pagination?.total ?? 0);
      } catch (fetchError) {
        if (requestId !== latestRequestIdRef.current) return;

        setGiftCards([]);
        setTotalPages(0);
        setTotalItems(0);
        setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las Gift Cards");
      } finally {
        if (requestId !== latestRequestIdRef.current) return;

        setIsInitialLoading(false);
        setIsFetching(false);
      }
    },
    [selectedSedeId, statusFilter, token]
  );

  useEffect(() => {
    if (!searchInput.trim()) {
      setSearchTerm("");
      return;
    }

    const timeout = setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (authLoading || !token) return;

    if (!isSuperAdmin) {
      const userSedeId = user?.sede_id || sessionStorage.getItem("beaux-sede_id") || "";
      setSelectedSedeId(userSedeId);
      return;
    }

    let isMounted = true;

    const fetchSedes = async () => {
      try {
        setIsLoadingSedes(true);
        const list = await sedeService.getSedes(token);

        if (!isMounted) return;

        setSedes(list);

        const storedSedeId = sessionStorage.getItem("beaux-sede_id") || "";
        const selected = list.find((sede) => sede.sede_id === storedSedeId)?.sede_id || list[0]?.sede_id || "";
        setSelectedSedeId(selected);
      } catch (sedesError) {
        if (!isMounted) return;

        setError(sedesError instanceof Error ? sedesError.message : "No se pudieron cargar las sedes");
      } finally {
        if (isMounted) {
          setIsLoadingSedes(false);
        }
      }
    };

    fetchSedes();

    return () => {
      isMounted = false;
    };
  }, [authLoading, isSuperAdmin, token, user?.sede_id]);

  useEffect(() => {
    if (!token || !selectedSedeId) return;
    loadGiftCards(1);
  }, [loadGiftCards, selectedSedeId, token]);

  const handleCreateGiftCard = async (submission: CreateGiftCardSubmission) => {
    if (!token) {
      throw new Error("Sesión no disponible. Inicia sesión nuevamente.");
    }

    setIsCreatingGiftCard(true);

    try {
      const created = await giftcardsService.createGiftCard(token, submission.payload);
      const refreshed = await giftcardsService
        .refreshGiftCardAfterCreate(token, created.giftcard.codigo)
        .catch(() => created.giftcard);

      setLatestCreatedGiftCard(refreshed);
      setLatestCreatedEmail(submission.beneficiaryEmail);
      setCreateModalOpen(false);
      setConfirmModalOpen(true);

      toast({
        title: "Gift Card creada",
        description: `Código ${refreshed.codigo} generado correctamente.`,
      });

      await loadGiftCards(1, { preserveInitial: true });
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "No se pudo crear la Gift Card";
      toast({
        title: "Error creando Gift Card",
        description: message,
      });
      throw new Error(message);
    } finally {
      setIsCreatingGiftCard(false);
    }
  };

  const goToPage = (page: number) => {
    if (page < 1 || (totalPages > 0 && page > totalPages) || page === currentPage) return;
    loadGiftCards(page, { preserveInitial: true });
  };

  const paginationRange = useMemo(() => {
    if (totalItems === 0) {
      return { from: 0, to: 0 };
    }

    const from = (currentPage - 1) * PAGE_SIZE + 1;
    const to = Math.min(currentPage * PAGE_SIZE, totalItems);
    return { from, to };
  }, [currentPage, totalItems]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando sesión...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />

        <main className="flex-1 overflow-auto">
          <div className="space-y-6 p-6 md:p-8">
            <header className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-600 via-indigo-600 to-blue-600 p-6 text-white shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                    <Gift className="h-3.5 w-3.5" />
                    Módulo de facturación prepago
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight">Gift Cards</h1>
                  <p className="mt-1 text-sm text-indigo-100">
                    Crea, filtra y monitorea el saldo de tarjetas regalo por sede.
                  </p>
                </div>

                <Button
                  className="bg-white text-indigo-700 shadow hover:bg-indigo-50"
                  onClick={() => setCreateModalOpen(true)}
                  disabled={!selectedSedeId}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Gift Card
                </Button>
              </div>
            </header>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                {isSuperAdmin ? (
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-xs font-medium text-gray-600">Sede</label>
                    <select
                      value={selectedSedeId}
                      onChange={(event) => setSelectedSedeId(event.target.value)}
                      className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700"
                      disabled={isLoadingSedes}
                    >
                      <option value="">Selecciona una sede</option>
                      {sedes.map((sede) => (
                        <option key={sede._id} value={sede.sede_id}>
                          {sede.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-xs font-medium text-gray-600">Sede</label>
                    <Input value={selectedSedeName || selectedSedeId || "Sin sede"} readOnly className="bg-gray-50" />
                  </div>
                )}

                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Estado</label>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                    className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-6">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Buscar</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Código, comprador o beneficiario"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </section>

            <GiftCardsSummaryCards
              activeCount={summaryMetrics.activeCount}
              totalIssued={summaryMetrics.totalIssued}
              pendingBalance={summaryMetrics.pendingBalance}
              currency={displayCurrency}
              isRefreshing={isFetching}
            />

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <div>{error}</div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => loadGiftCards(currentPage || 1, { preserveInitial: true })}
                >
                  Reintentar
                </Button>
              </div>
            ) : null}

            {isInitialLoading && giftCards.length === 0 ? (
              <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-16 text-gray-600 shadow-sm">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Cargando Gift Cards...
              </div>
            ) : (
              <GiftCardsTable giftCards={filteredGiftCards} currency={displayCurrency} isFetching={isFetching} />
            )}

            {totalPages > 1 ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="text-gray-600">
                  Mostrando <span className="font-semibold text-gray-900">{paginationRange.from}</span> a{" "}
                  <span className="font-semibold text-gray-900">{paginationRange.to}</span> de{" "}
                  <span className="font-semibold text-gray-900">{totalItems}</span> registros
                </div>

                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" onClick={() => goToPage(1)} disabled={currentPage === 1 || isFetching}>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1 || isFetching}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <span className="px-3 text-xs font-medium text-gray-600">
                    Página {currentPage} de {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages || isFetching}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage >= totalPages || isFetching}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>

      <CreateGiftCardModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        token={token}
        sedeId={selectedSedeId}
        sedeName={selectedSedeName}
        currency={displayCurrency}
        onCreate={handleCreateGiftCard}
        isSubmitting={isCreatingGiftCard}
      />

      <GiftCardConfirmationModal
        open={confirmModalOpen}
        onOpenChange={setConfirmModalOpen}
        giftCard={latestCreatedGiftCard}
        fallbackCurrency={displayCurrency}
        beneficiaryEmail={latestCreatedEmail}
      />

      <Toaster />
    </>
  );
}
