// src/auth/authService.ts
import { API_BASE_URL } from "../../types/config";

export async function login(email: string, password: string) {
  const body = new URLSearchParams({ username: email, password });

  const res = await fetch(`${API_BASE_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    credentials: "include", // 🔥 necesario para guardar cookie del refresh_token
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Error al iniciar sesión");
  }

  return res.json(); // { access_token, rol, email, nombre, ... }
}

export async function refreshToken() {
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (res.status === 401) {
    // 🔇 No loguear nada, solo lanzar error silencioso
    throw new Error("No refresh cookie");
  }

  if (!res.ok) throw new Error("Error al refrescar el token");
  return res.json();
}


export async function logout() {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // si el back no responde, igual limpiamos el front
  }
}
