const STORAGE_KEY = 'tasks:v1';
const CATEGORIES_KEY = 'categories:v1';

// Campos que cada tipo de tarea permite cambiar
const CAMPOS_LOCAL = ['titulo', 'descripcion', 'fechaRegistro', 'completado','categoriaId'];
const CAMPOS_IMPORTADA = ['completado'];

function esTareaValida(t) {
  return (
    t !== null &&
    typeof t === 'object' &&
    typeof t.id === 'string' &&
    typeof t.titulo === 'string' &&
    // La descripción es opcional: las tareas guardadas antes de existir este campo siguen siendo válidas.
    (t.categoriaId === undefined || t.categoriaId === null || typeof t.categoriaId === 'string') &&
    (t.descripcion === undefined || typeof t.descripcion === 'string') &&
    typeof t.fechaRegistro === 'string' &&
    typeof t.completado === 'boolean' &&
    (t.origen === 'local' || t.origen === 'api') &&
    (t.apiId === null || typeof t.apiId === 'number') &&
    typeof t.imported === 'boolean'
  );
}

// Guarda o lanza Error. Así task-app puede mostrar el problema al usuario.
function persist(tareas) {
  if (!saveTasks(tareas)) {
    throw new Error('No se pudo guardar en el navegador (almacenamiento lleno o bloqueado).');
  }
}

export function getTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    // Se normaliza: toda tarea sale con `descripcion` (cadena vacía si no la tenía).
    return Array.isArray(data)
      ? data.filter(esTareaValida).map((t) => ({
          ...t,
          descripcion: t.descripcion ?? '',
          categoriaId: t.categoriaId ?? null,
        }))
      : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch {
    return false;
  }
}

export function addTask({ titulo, descripcion = '', fechaRegistro, completado = false, categoriaId = null }) {
  const tarea = {
    id: 'LOC-' + crypto.randomUUID(),
    titulo,
    descripcion,
    categoriaId,
    fechaRegistro: fechaRegistro ?? new Date().toISOString(),
    completado,
    origen: 'local',
    apiId: null,
    imported: false,
  };
  persist([...getTasks(), tarea]);
  return tarea;
}

export function addTasks(nuevas) {
  const actuales = getTasks();
  const apiIdsVistos = new Set(
    actuales.filter((t) => t.apiId !== null).map((t) => t.apiId)
  );
  const aGuardar = [];

  for (const t of nuevas) {
    if (!esTareaValida(t)) continue;
    if (t.apiId !== null) {
      if (apiIdsVistos.has(t.apiId)) continue; // duplicada (ya guardada o repetida en el lote)
      apiIdsVistos.add(t.apiId);
    }
    aGuardar.push(t);
  }

  if (aGuardar.length > 0) persist([...actuales, ...aGuardar]);
  return { agregadas: aGuardar.length, omitidas: nuevas.length - aGuardar.length };
}

export function updateTask(id, cambios) {
  const tareas = getTasks();
  const indice = tareas.findIndex((t) => t.id === id);
  if (indice === -1) return null;

  const tarea = tareas[indice];
  // DECISIÓN: una tarea importada solo puede cambiar `completado`.
  const permitidos = tarea.imported ? CAMPOS_IMPORTADA : CAMPOS_LOCAL;
  const noPermitidos = Object.keys(cambios).filter((c) => !permitidos.includes(c));
  if (noPermitidos.length > 0) {
    throw new Error(`Campos no permitidos: ${noPermitidos.join(', ')}`);
  }

  const actualizada = { ...tarea, ...cambios };
  tareas[indice] = actualizada;
  persist(tareas);
  return actualizada;
}

export function removeTask(id) {
  const tareas = getTasks();
  const restantes = tareas.filter((t) => t.id !== id);
  if (restantes.length === tareas.length) return false;
  persist(restantes);
  return true;
}

// DECISIÓN: afecta a todas las tareas guardadas, no solo a las visibles por el filtro.
export function completeAllTasks() {
  let cambiadas = 0;
  const actualizadas = getTasks().map((t) => {
    if (t.completado) return t;
    cambiadas++;
    return { ...t, completado: true };
  });
  if (cambiadas > 0) persist(actualizadas);
  return cambiadas;
}

export function clearTasks() {
  persist([]);
}

// Categorías

function esCategoriaValida(c) {
  return (
    c !== null &&
    typeof c === 'object' &&
    typeof c.id === 'string' &&
    typeof c.nombre === 'string'
  );
}

function persistCategories(categorias) {
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categorias));
  } catch {
    throw new Error('No se pudo guardar en el navegador (almacenamiento lleno o bloqueado).');
  }
}

export function getCategories() {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(esCategororiaValida) : [];
  } catch {
    return [];
  }
}

export function addCategory({ nombre }) {
  const categoria = { id: 'CAT-' + crypto.randomUUID(), nombre: nombre.trim() };
  persistCategories([...getCategories(), categoria]);
  return categoria;
}

export function updateCategory(id, nombre) {
  const categorias = getCategories();
  const indice = categorias.findIndex((c) => c.id === id);
  if (indice === -1) return null;

  const actualizada = { ...categorias[indice], nombre: nombre.trim() };
  categorias[indice] = actualizada;
  persistCategories(categorias);
  return actualizada;
}

//Decisión: si se borra una categoría, las tareas que la tenían quedan con `categoriaId` nulo.
export function removeCategory(id) {
  const categorias = getCategories();
  const restantes = categorias.filter((c) => c.id !== id);
  if (restantes.length === categorias.length) return false;
 

  const tareas = getTasks();
  if (tareas.some((t) => t.categoriaId === id)) {
    persist(tareas.map((t)=> t.categoriaId === id ? { ...t, categoriaId: null } : t));
  }
  persistCategories(restantes);
  return true;
} 