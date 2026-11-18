// js/components/task-app.js
// Componente raíz. Es el ÚNICO dueño del estado y el único que habla con storage.js.
// Los demás componentes solo emiten eventos; aquí se decide qué hacer con cada uno.
//
// Flujo: evento -> acción en storage -> #render() (vuelve a leer y repinta).

import './task-toolbar.js';
import './task-list.js';
import './confirm-dialog.js';
import './task-form-modal.js';
import './category-manager-modal.js';
import { filterTasks } from '../utils/utils.js';
import {
  getTasks,
  addTask,
  addTasks,
  updateTask,
  removeTask,
  completeAllTasks,
  clearTasks,
  getCategories,
  addCategory,
  updateCategory,
  removeCategory,
} from '../services/storage.js';

const plantilla = document.createElement('template');
plantilla.innerHTML = `
  <style>
    :host { display: block; font-family: var(--fuente, system-ui, sans-serif); }
    [hidden] { display: none !important; }

    .app { display: flex; flex-direction: column; gap: var(--espacio-4, 24px); }

    h1 { margin: 0; font-size: 1.75rem; }
    h1:focus-visible { outline: 3px solid var(--color-foco, #1d4ed8); outline-offset: 4px; }

    /* Región de avisos: siempre presente (para que los lectores de pantalla la anuncien) */
    .aviso { margin: 0; }
    .aviso:not(:empty) {
      padding: var(--espacio-2, 8px) var(--espacio-3, 16px);
      border: 1px solid var(--color-exito, #15803d);
      border-radius: var(--radio, 8px);
      background: var(--color-superficie, #ffffff);
      color: var(--color-exito, #15803d);
    }
    .error {
      margin: 0;
      padding: var(--espacio-2, 8px) var(--espacio-3, 16px);
      border: 1px solid var(--color-error, #b91c1c);
      border-radius: var(--radio, 8px);
      background: var(--color-superficie, #ffffff);
      color: var(--color-error, #b91c1c);
    }
  </style>

  <div class="app">
    <h1 tabindex="-1">Mis tareas</h1>
    <p class="aviso" role="status"></p>
    <p class="error" role="alert" hidden></p>
    <task-toolbar></task-toolbar>
    <task-list></task-list>
  </div>

  <task-form-modal></task-form-modal>
  <confirm-dialog></confirm-dialog>
  <import-modal></import-modal>
  <category-manager-modal></category-manager-modal>
`;

export class TaskApp extends HTMLElement {
  #status = 'all';   // filtro por estado: all | pending | completed
  #query = '';       // texto del buscador
  #refs;
  #temporizadorAviso = null;

  constructor() {
    super();
    const raiz = this.attachShadow({ mode: 'open' });
    raiz.append(plantilla.content.cloneNode(true));

    this.#refs = {
      titulo: raiz.querySelector('h1'),
      aviso: raiz.querySelector('.aviso'),
      error: raiz.querySelector('.error'),
      barra: raiz.querySelector('task-toolbar'),
      lista: raiz.querySelector('task-list'),
      formulario: raiz.querySelector('task-form-modal'),
      confirmar: raiz.querySelector('confirm-dialog'),
      importar: raiz.querySelector('import-modal'),
      categorias: raiz.querySelector('category-manager-modal'),
    };

    // Los eventos de los hijos son composed: atraviesan sus shadow DOM y llegan aquí.
    const alEvento = (nombre, manejador) =>
      raiz.addEventListener(nombre, (evento) => manejador(evento.detail ?? {}));

    alEvento('task:create-request', () => this.#refs.formulario.openCreate());
    alEvento('task:edit-request', ({ id }) => {
      const tarea = this.#buscar(id);
      if (tarea) this.#refs.formulario.openEdit(tarea);
    });
    alEvento('task:save', (datos) => this.#guardarTarea(datos));
    alEvento('task:toggle', ({ id, completado }) =>
      this.#intentar(() => updateTask(id, { completado }))
    );
    alEvento('task:delete-request', ({ id }) => this.#pedirEliminar(id));

    alEvento('import:open', () => this.#abrirImportacion());
    alEvento('import:confirm', ({ tasks }) => this.#importar(tasks));

    alEvento('categories:open', () => this.#abrirCategorias());
    alEvento('category:save', (datos) => this.#guardarCategoria(datos));
    alEvento('category:delete-request', ({ id }) => this.#pedirEliminarCategoria(id));

    alEvento('filter:change', ({ status }) => { this.#status = status; this.#render(); });
    alEvento('search:change', ({ query }) => { this.#query = query; this.#render(); });

    alEvento('tasks:complete-all', () => this.#pedirCompletarTodas());
    alEvento('tasks:clear-all', () => this.#pedirVaciar());

    alEvento('confirm:accept', ({ action, payload }) => this.#ejecutarConfirmada(action, payload));
    // confirm:cancel y modal:close no necesitan acción: no había nada que deshacer.
  }

  connectedCallback() {
    // Asegura que los hijos ya estén "activos" antes de asignarles propiedades (lista.tasks).
    customElements.upgrade(this.shadowRoot);
    this.#render();
  }

  disconnectedCallback() {
    clearTimeout(this.#temporizadorAviso);
  }

  // ---------- Pintar ----------

  #render() {
    const todas = getTasks();
    const visibles = filterTasks(todas, this.#status, this.#query);

    this.#refs.lista.tasks = visibles;
    this.#refs.lista.setAttribute('empty-reason', todas.length === 0 ? 'none' : 'no-results');
    this.#refs.barra.toggleAttribute('no-tasks', todas.length === 0);
    const categorias = getCategories();
    this.#refs.categorias.categories = categorias;
    this.#refs.formulario.categories = categorias;
  }

  // Ejecuta una acción de storage. Si falla (por ejemplo, almacenamiento lleno), avisa.
  #intentar(accion) {
    try {
      accion();
      this.#refs.error.hidden = true;
    } catch (error) {
      this.#refs.error.textContent = error.message;
      this.#refs.error.hidden = false;
    }
    this.#render();
  }

  #anunciar(texto) {
    this.#refs.aviso.textContent = texto;
    clearTimeout(this.#temporizadorAviso);
    this.#temporizadorAviso = setTimeout(() => { this.#refs.aviso.textContent = ''; }, 6000);
  }

  #buscar(id) {
    return getTasks().find((tarea) => tarea.id === id);
  }

  // ---------- Crear / editar ----------

  #guardarTarea({ id, ...datos }) {
    this.#intentar(() => {
      if (id) {
        if (!updateTask(id, datos)) throw new Error('La tarea que intentas editar ya no existe.');
        this.#anunciar('Tarea actualizada.');
      } else {
        addTask(datos);
        this.#anunciar('Tarea creada.');
      }
    });
  }

  // ---------- Confirmaciones ----------

  #pedirEliminar(id) {
    const tarea = this.#buscar(id);
    if (!tarea) return;
    this.#refs.confirmar.ask({
      action: 'delete-task',
      payload: { id },
      heading: 'Eliminar tarea',
      message: `¿Eliminar la tarea “${tarea.titulo}”? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
    });
  }

  #pedirCompletarTodas() {
    const pendientes = getTasks().filter((t) => !t.completado).length;
    if (pendientes === 0) {
      this.#anunciar('Todas las tareas ya están terminadas.');
      return;
    }
    this.#refs.confirmar.ask({
      action: 'complete-all',
      payload: { cantidad: pendientes },
      heading: 'Marcar todas como terminadas',
      message: `Se marcarán como terminadas ${pendientes} ${pendientes === 1 ? 'tarea' : 'tareas'}. ¿Continuar?`,
      confirmLabel: 'Marcar todas',
    });
  }

  #pedirVaciar() {
    const total = getTasks().length;
    if (total === 0) return;
    this.#refs.confirmar.ask({
      action: 'clear-all',
      heading: 'Vaciar lista',
      message: `Se eliminarán ${total} ${total === 1 ? 'tarea' : 'tareas'}, también las importadas. Esta acción no se puede deshacer.`,
      confirmLabel: 'Vaciar lista',
    });
  }

  #ejecutarConfirmada(action, payload) {
    switch (action) {
      case 'delete-task':
        this.#intentar(() => {
          if (removeTask(payload.id)) this.#anunciar('Tarea eliminada.');
        });
        // El botón que abrió el diálogo ya no existe: el foco va al título de la página.
        this.#refs.titulo.focus();
        break;

      case 'complete-all':
        this.#intentar(() => {
          const n = completeAllTasks();
          this.#anunciar(
            n === 1 ? '1 tarea marcada como terminada.' : `${n} tareas marcadas como terminadas.`
          );
        });
        break;

      case 'clear-all':
        this.#intentar(() => {
          clearTasks();
          this.#anunciar('Lista vaciada.');
        });
        break;

      case 'delete-category':
        this.#intentar(() => {
          if (removeCategory(payload.id)) this.#anunciar('Categoría eliminada.');
        });
        // La fila que tenía el botón ya no existe: el foco vuelve al campo del modal.
        this.#refs.categorias.focusNombre();
        break;

      default:
        console.warn(`task-app: acción de confirmación desconocida: ${action}`);
    }
  }

  // ---------- Categorías ----------

  #abrirCategorias() {
    this.#refs.categorias.categories = getCategories();
    this.#refs.categorias.open();
  }

  #guardarCategoria({ id, nombre }) {
    this.#intentar(() => {
      if (id) {
        if (!updateCategory(id, nombre)) throw new Error('La categoría que intentas editar ya no existe.');
        this.#anunciar('Categoría actualizada.');
      } else {
        addCategory(nombre);
        this.#anunciar('Categoría creada.');
      }
    });
  }

  #pedirEliminarCategoria(id) {
    const categoria = getCategories().find((c) => c.id === id);
    if (!categoria) return;

    const enUso = getTasks().filter((t) => t.categoriaId === id).length;
    const aviso = enUso > 0
      ? ` Sus ${enUso} ${enUso === 1 ? 'tarea quedará' : 'tareas quedarán'} sin categoría.`
      : '';

    this.#refs.confirmar.ask({
      action: 'delete-category',
      payload: { id },
      heading: 'Eliminar categoría',
      message: `¿Eliminar la categoría “${categoria.nombre}”?${aviso}`,
      confirmLabel: 'Eliminar',
    });
  }

  // ---------- Importar ----------

  #abrirImportacion() {
    const modal = this.#refs.importar;
    // Mientras import-modal no exista (etapa 5), se avisa en vez de fallar.
    if (typeof modal.open !== 'function') {
      this.#anunciar('La importación de tareas todavía no está disponible.');
      return;
    }
    modal.existingApiIds = getTasks()
      .filter((t) => t.apiId !== null)
      .map((t) => t.apiId);
    modal.open();
  }

  #importar(borradores = []) {
    // Una sola fecha para todo el lote: el momento de confirmar la importación.
    const fechaRegistro = new Date().toISOString();
    const tareas = borradores.map((borrador) => ({ ...borrador, fechaRegistro }));

    this.#intentar(() => {
      const { agregadas, omitidas } = addTasks(tareas);
      const partes = [`${agregadas} ${agregadas === 1 ? 'importada' : 'importadas'}`];
      if (omitidas > 0) partes.push(`${omitidas} ${omitidas === 1 ? 'omitida' : 'omitidas'}`);
      this.#anunciar(partes.join(', ') + '.');
    });
  }
}

customElements.define('task-app', TaskApp);
