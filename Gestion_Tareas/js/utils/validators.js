// js/utils/validators.js
// Validaciones del formulario. Funciones puras: no tocan el DOM ni localStorage.
// Todas devuelven { valid: boolean, error: string }.

const TITULO_MIN = 3;
const TITULO_MAX = 120;
const DESCRIPCION_MAX = 500;
const TOLERANCIA_MS = 60 * 1000; // 1 minuto
const CATEGORIA_MIN = 2;
const CATEGORIA_MAX = 30;

// Caracteres de control (invisibles, p. ej. un NUL o un retroceso). Se permiten el salto de línea y el tabulador.
const CARACTERES_DE_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

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
  if (CARACTERES_DE_CONTROL.test(limpio)) {
    return { valid: false, error: "El título contiene caracteres no permitidos." };
  }
  return { valid: true, error: "" };
}

/**
 * Valida la descripción de una tarea. Es opcional: vacía es válida.
 * @param {string} descripcion
 * @returns {{ valid: boolean, error: string }}
 */
export function validateDescription(descripcion) {
  const limpia = typeof descripcion === "string" ? descripcion.trim() : "";

  if (limpia.length > DESCRIPCION_MAX) {
    return { valid: false, error: `La descripción no puede superar ${DESCRIPCION_MAX} caracteres.` };
  }
  if (CARACTERES_DE_CONTROL.test(limpia)) {
    return { valid: false, error: "La descripción contiene caracteres no permitidos." };
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

/**
 * Valida la categoría de una tarea.
 * @param {string} nombre
 * @param {string[]} otrosNombres Nombres de las demas categorías (para evitar duplicados). Opcional.
 * @returns {{ valid: boolean, error: string }}
 */
export function validateCategory(nombre, otrosNombres = []) {
  const limpio = typeof nombre === "string" ? nombre.trim() : "";

  if (limpio.length === 0) {
    return { valid: false, error: "La categoría es obligatoria." };
  }
  if (limpio.length < CATEGORIA_MIN) {
    return { valid: false, error: `La categoría debe tener al menos ${CATEGORIA_MIN} caracteres.` };
  }
  if (limpio.length > CATEGORIA_MAX) {
    return { valid: false, error: `La categoría no puede superar ${CATEGORIA_MAX} caracteres.` };
  }
  if (CARACTERES_DE_CONTROL.test(limpio)) {
    return { valid: false, error: "La categoría contiene caracteres no permitidos." };
  }
  const repetida = otrosNombres.some((n) => n.trim().toLowerCase() === limpio.toLowerCase());
  if (repetida) {
    return { valid: false, error: "Ya existe una categoría con ese nombre." };
  }
  return { valid: true, error: "" };
}
