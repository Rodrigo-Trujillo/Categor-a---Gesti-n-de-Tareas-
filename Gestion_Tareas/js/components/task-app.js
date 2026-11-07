// ===== Bloque Alan: filtro, búsqueda y acciones masivas =====
#status = 'all';
#query = '';

// En el render:
const todas = getTasks();
const visibles = filterTasks(todas, this.#status, this.#query);
lista.tasks = visibles;
lista.setAttribute('empty-reason', todas.length === 0 ? 'none' : 'no-results');
barra.toggleAttribute('no-tasks', todas.length === 0);

// Listeners:
this.addEventListener('filter:change', (e) => { this.#status = e.detail.status; this.#render(); });
this.addEventListener('search:change', (e) => { this.#query = e.detail.query; this.#render(); });

this.addEventListener('tasks:complete-all', () => {
  const pendientes = getTasks().filter((t) => !t.completado).length;
  if (pendientes === 0) { this.#anunciar('Todas las tareas ya están terminadas.'); return; }
  this.#confirm.ask({
    action: 'complete-all',
    payload: { cantidad: pendientes },
    heading: 'Marcar todas como terminadas',
    message: `Se marcarán como terminadas ${pendientes} ${pendientes === 1 ? 'tarea' : 'tareas'}. ¿Continuar?`,
    confirmLabel: 'Marcar todas',
  });
});

this.addEventListener('tasks:clear-all', () => {
  const total = getTasks().length;
  if (total === 0) return;
  this.#confirm.ask({
    action: 'clear-all',
    heading: 'Vaciar lista',
    message: `Se eliminarán ${total} ${total === 1 ? 'tarea' : 'tareas'}, también las importadas. Esta acción no se puede deshacer.`,
    confirmLabel: 'Vaciar lista',
  });
});

this.addEventListener('confirm:accept', (e) => {
  const { action, payload } = e.detail;
  if (action === 'complete-all') completeAllTasks();
  if (action === 'clear-all') clearTasks();
  if (action === 'delete-task') removeTask(payload.id);
  this.#render();
});