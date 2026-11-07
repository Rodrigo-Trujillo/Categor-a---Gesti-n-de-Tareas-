// js/utils/validators.js
// Validaciones del formulario. Funciones puras: no tocan el DOM ni localStorage.
// Todas devuelven { valid: boolean, error: string }.

const TITULO_MIN = 3;
const TITULO_MAX = 120;
const TOLERANCIA_MS = 60 * 1000; // 1 minuto

/**
 * Valida el título de una tarea.
 * @param {string} titulo
 * @returns {{ valid: boolean, error: string }}
 */
export function validateTitle(titulo) {
  const limpio = typeof titulo === "string" ? titulo.trim() : "";

  if (limpio.length === 0) {
    return { valid: false, error: "El título es obligatorio." };
  }
  if (limpio.length < TITULO_MIN) {
    return { valid: false, error: `El título debe tener al menos ${TITULO_MIN} caracteres.` };
  }
  if (limpio.length > TITULO_MAX) {
    return { valid: false, error: `El título no puede superar ${TITULO_MAX} caracteres.` };
  }
  return { valid: true, error: "" };
}

/**
 * Valida la fecha de registro (string ISO, ej: "2026-11-06T14:30:00.000Z").
 * No puede ser inválida ni futura (se tolera 1 minuto de diferencia).
 * @param {string} fecha
 * @returns {{ valid: boolean, error: string }}
 */
export function validateDate(fecha) {
  // DECISIÓN: la fecha es obligatoria; el formulario la rellena con "ahora" por defecto.
  if (!fecha) {
    return { valid: false, error: "La fecha de registro es obligatoria." };
  }

  const ms = new Date(fecha).getTime();
  if (Number.isNaN(ms)) {
    return { valid: false, error: "La fecha no es válida." };
  }
  if (ms > Date.now() + TOLERANCIA_MS) {
    return { valid: false, error: "La fecha no puede ser futura." };
  }
  return { valid: true, error: "" };
}
