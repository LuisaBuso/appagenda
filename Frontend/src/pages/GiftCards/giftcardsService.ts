import { API_BASE_URL } from "../../types/config";
import type {
  GiftCard,
  GiftCardCreatePayload,
  GiftCardDeleteResponse,
  GiftCardHistoryResponse,
  GiftCardListParams,
  GiftCardRedeemPayload,
  GiftCardReleasePayload,
  GiftCardReservePayload,
  GiftCardsListResponse,
  GiftCardResponse,
  GiftCardUpdatePayload,
} from "./types";

interface ApiErrorBody {
  detail?: string | Array<{ msg?: string }>;
  message?: string;
  error?: string;
}

interface ClientsResponse {
  clientes?: Array<Record<string, unknown>>;
  data?: Array<Record<string, unknown>>;
}

function buildHeaders(token: string, hasJsonBody = false): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
  };
}

async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function parseApiError(response: Response): Promise<string> {
  const fallback = `Error ${response.status}: ${response.statusText}`;
  const body = await parseJsonSafely<ApiErrorBody>(response);

  if (!body) {
    return fallback;
  }

  if (typeof body.detail === "string" && body.detail.trim().length > 0) {
    return body.detail;
  }

  if (Array.isArray(body.detail) && body.detail.length > 0) {
    const detailMessage = body.detail[0]?.msg;
    if (detailMessage) {
      return detailMessage;
    }
  }

  if (typeof body.message === "string" && body.message.trim().length > 0) {
    return body.message;
  }

  if (typeof body.error === "string" && body.error.trim().length > 0) {
    return body.error;
  }

  return fallback;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function buildGiftcardsUrl(path: string): string {
  return `${API_BASE_URL}api/giftcards${path}`;
}

export const giftcardsService = {
  async createGiftCard(token: string, payload: GiftCardCreatePayload): Promise<GiftCardResponse> {
    const response = await fetch(buildGiftcardsUrl("/"), {
      method: "POST",
      headers: buildHeaders(token, true),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const result = await parseJsonSafely<GiftCardResponse>(response);
    if (!result?.giftcard) {
      throw new Error("La API no devolvió la gift card creada");
    }

    return result;
  },

  async getGiftCardsBySede(
    token: string,
    sedeId: string,
    params: GiftCardListParams = {}
  ): Promise<GiftCardsListResponse> {
    const query = new URLSearchParams();

    if (params.estado) query.set("estado", params.estado);
    if (params.cliente_id) query.set("cliente_id", params.cliente_id);
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));

    const queryString = query.toString();
    const suffix = queryString.length > 0 ? `?${queryString}` : "";

    const response = await fetch(buildGiftcardsUrl(`/sede/${encodeURIComponent(sedeId)}${suffix}`), {
      method: "GET",
      headers: buildHeaders(token),
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const result = await parseJsonSafely<GiftCardsListResponse>(response);
    if (!result) {
      throw new Error("No se pudo leer la respuesta de gift cards");
    }

    return {
      success: Boolean(result.success),
      pagination: result.pagination ?? {
        page: params.page ?? 1,
        limit: params.limit ?? 10,
        total: 0,
        total_pages: 0,
      },
      giftcards: Array.isArray(result.giftcards) ? result.giftcards : [],
    };
  },

  async getGiftCardByCode(token: string, codigo: string): Promise<GiftCardResponse> {
    const response = await fetch(
      buildGiftcardsUrl(`/${encodeURIComponent(normalizeCode(codigo))}`),
      {
        method: "GET",
        headers: buildHeaders(token),
      }
    );

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const result = await parseJsonSafely<GiftCardResponse>(response);
    if (!result?.giftcard) {
      throw new Error("No se encontró información de la gift card");
    }

    return result;
  },

  async updateGiftCard(
    token: string,
    codigo: string,
    payload: GiftCardUpdatePayload
  ): Promise<GiftCardResponse> {
    const response = await fetch(
      buildGiftcardsUrl(`/${encodeURIComponent(normalizeCode(codigo))}`),
      {
        method: "PUT",
        headers: buildHeaders(token, true),
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const result = await parseJsonSafely<GiftCardResponse>(response);
    if (!result?.giftcard) {
      throw new Error("No se pudo actualizar la gift card");
    }

    return result;
  },

  async deleteGiftCard(token: string, codigo: string): Promise<GiftCardDeleteResponse> {
    const response = await fetch(
      buildGiftcardsUrl(`/${encodeURIComponent(normalizeCode(codigo))}`),
      {
        method: "DELETE",
        headers: buildHeaders(token),
      }
    );

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const result = await parseJsonSafely<GiftCardDeleteResponse>(response);
    if (!result) {
      throw new Error("No se pudo cancelar la gift card");
    }

    return result;
  },

  async reserveGiftCard(
    token: string,
    codigo: string,
    payload: GiftCardReservePayload
  ): Promise<GiftCardResponse> {
    const response = await fetch(
      buildGiftcardsUrl(`/${encodeURIComponent(normalizeCode(codigo))}/reservar`),
      {
        method: "POST",
        headers: buildHeaders(token, true),
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const result = await parseJsonSafely<GiftCardResponse>(response);
    if (!result?.giftcard) {
      throw new Error("No se pudo reservar saldo de la gift card");
    }

    return result;
  },

  async releaseGiftCard(
    token: string,
    codigo: string,
    payload: GiftCardReleasePayload
  ): Promise<GiftCardResponse> {
    const response = await fetch(
      buildGiftcardsUrl(`/${encodeURIComponent(normalizeCode(codigo))}/liberar`),
      {
        method: "POST",
        headers: buildHeaders(token, true),
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const result = await parseJsonSafely<GiftCardResponse>(response);
    if (!result?.giftcard) {
      throw new Error("No se pudo liberar saldo de la gift card");
    }

    return result;
  },

  async redeemGiftCard(
    token: string,
    codigo: string,
    payload: GiftCardRedeemPayload
  ): Promise<GiftCardResponse> {
    const response = await fetch(
      buildGiftcardsUrl(`/${encodeURIComponent(normalizeCode(codigo))}/redimir`),
      {
        method: "POST",
        headers: buildHeaders(token, true),
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const result = await parseJsonSafely<GiftCardResponse>(response);
    if (!result?.giftcard) {
      throw new Error("No se pudo redimir la gift card");
    }

    return result;
  },

  async getGiftCardHistory(token: string, codigo: string): Promise<GiftCardHistoryResponse> {
    const response = await fetch(
      buildGiftcardsUrl(`/${encodeURIComponent(normalizeCode(codigo))}/historial`),
      {
        method: "GET",
        headers: buildHeaders(token),
      }
    );

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const result = await parseJsonSafely<GiftCardHistoryResponse>(response);
    if (!result) {
      throw new Error("No se pudo obtener el historial de la gift card");
    }

    return result;
  },

  async fetchClientsForSelector(token: string): Promise<Array<{ id: string; nombre: string; email?: string; telefono?: string }>> {
    const response = await fetch(`${API_BASE_URL}clientes/todos?pagina=1&limite=200`, {
      method: "GET",
      headers: buildHeaders(token),
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response));
    }

    const payload = await parseJsonSafely<ClientsResponse | Array<Record<string, unknown>>>(response);
    const records = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.clientes)
        ? payload.clientes
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

    const clientOptions: Array<{ id: string; nombre: string; email?: string; telefono?: string }> = [];

    for (const item of records) {
      const id = String(item.cliente_id ?? item.id ?? item._id ?? "").trim();
      const nombre = String(item.nombre ?? "").trim();

      if (!id || !nombre) {
        continue;
      }

      const email = String(item.correo ?? item.email ?? "").trim();
      const telefono = String(item.telefono ?? "").trim();

      clientOptions.push({
        id,
        nombre,
        email: email || undefined,
        telefono: telefono || undefined,
      });
    }

    return clientOptions.sort((a, b) => a.nombre.localeCompare(b.nombre));
  },

  async refreshGiftCardAfterCreate(token: string, codigo: string): Promise<GiftCard> {
    const result = await this.getGiftCardByCode(token, codigo);
    return result.giftcard;
  },
};
