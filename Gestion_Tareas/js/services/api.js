// js/services/api.js
// Consumo de la API pública JSONPlaceholder. No toca el DOM ni localStorage.

const URL_TODOS = 'https://jsonplaceholder.typicode.com/todos';
const ERROR_FORMATO = 'La respuesta del servidor no tiene el formato esperado.';

// Una "todo" de la API solo se acepta si tiene la forma que necesitamos.
function esTodoValido(todo) {
  return (
    todo !== null &&
    typeof todo === 'object' &&
    Number.isInteger(todo.id) &&
    todo.id > 0 &&
    typeof todo.title === 'string' &&
    todo.title.trim() !== '' &&
    typeof todo.completed === 'boolean'
  );
}

// Convierte una "todo" de la API a nuestro modelo (sin fechaRegistro: la pone task-app al importar).
function aBorrador(todo) {
  return {
    id: `API-${todo.id}`,
    titulo: todo.title.trim(),
    completado: todo.completed,
    origen: 'api',
    apiId: todo.id,
    imported: true,
  };
}

/**
 * Trae las tareas del banco de la API.
 * @param {{ signal?: AbortSignal }} [opciones]  signal permite cancelar la petición.
 * @returns {Promise<Array>} borradores (TaskDraft): tareas del modelo sin fechaRegistro.
 * @throws {Error} con mensaje legible en español si algo falla.
 *         Si se cancela con signal, se relanza el AbortError tal cual: quien llama lo ignora.
 */
export async function fetchTodos({ signal } = {}) {
  let respuesta;
  try {
    respuesta = await fetch(URL_TODOS, { signal });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error(
      'No se pudo conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.'
    );
  }

  if (!respuesta.ok) {
    throw new Error(
      `El servidor respondió con error ${respuesta.status}. Inténtalo de nuevo más tarde.`
    );
  }

  let datos;
  try {
    datos = await respuesta.json();
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error(ERROR_FORMATO);
  }

  if (!Array.isArray(datos)) throw new Error(ERROR_FORMATO);

  // Los elementos con forma inválida se ignoran en vez de romper toda la carga.
  return datos.filter(esTodoValido).map(aBorrador);
}
