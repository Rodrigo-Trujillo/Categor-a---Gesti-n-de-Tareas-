// js/utils/utils.js
// Funciones puras: no tocan el DOM (salvo getDeepActiveElement, que solo lee) ni localStorage.

/** Quita tildes y pasa a minúsculas para comparar textos. "Árbol" -> "arbol" */
function normalizar(texto = '') {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Filtra por estado y por búsqueda a la vez. Devuelve un arreglo NUEVO.
 * @param {Array} tasks
 * @param {'all'|'pending'|'completed'} status
 * @param {string} query
 */
export function filterTasks(tasks, status = 'all', query = '') {
  const texto = normalizar(query);

  return tasks.filter((tarea) => {
    const coincideEstado =
      status === 'completed' ? tarea.completado
      : status === 'pending' ? !tarea.completado
      : true; // 'all' (o cualquier valor desconocido)

    const coincideTexto = normalizar(tarea.titulo).includes(texto);

    return coincideEstado && coincideTexto;
  });
}

/** ISO -> texto legible en es-CO. Si la fecha no es válida, devuelve ''. */
export function formatDate(isoString) {
  const fecha = new Date(isoString);
  if (Number.isNaN(fecha.getTime())) return '';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(fecha);
}

const pad = (n) => String(n).padStart(2, '0');

/**
 * ISO (UTC) -> 'YYYY-MM-DDTHH:mm' en HORA LOCAL, para el value de un
 * <input type="datetime-local">. No sirve iso.slice(0, 16): eso muestra la hora UTC.
 */
export function toDatetimeLocal(isoString) {
  const fecha = new Date(isoString);
  if (Number.isNaN(fecha.getTime())) return '';
  return (
    `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}` +
    `T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`
  );
}

/**
 * Valor de un datetime-local (hora local, sin zona) -> ISO en UTC.
 * Un string "YYYY-MM-DDTHH:mm" sin zona se interpreta como hora local.
 * Devuelve '' si el valor no es válido.
 */
export function fromDatetimeLocal(valor) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toISOString();
}

/**
 * Elemento realmente enfocado, atravesando shadow roots.
 * document.activeElement solo devuelve el host más externo.
 */
export function getDeepActiveElement() {
  let activo = document.activeElement;
  while (activo?.shadowRoot?.activeElement) {
    activo = activo.shadowRoot.activeElement;
  }
  return activo;
}
