import './task-list.js';
import {
  getTasks,
  addTask,
  updateTask,
  removeTask,
  completeAllTasks,
  clearTasks,
} from '../services/storage.js';
import { filterTasks } from '../utils/utils.js';

const plantilla = document.createElement('template');
plantilla.innerHTML = `
  <style>
    :host { display: block; }

    .app {
      display: flex;
      flex-direction: column;
      gap: var(--espacio-4);
      font-family: var(--fuente);
    }
    h1 {
      margin: 0;
      font-size: 1.75rem;
      line-height: 1.2;
    }
    .mensaje {
      margin: 0;
      min-height: 1.5rem;
      font-size: var(--texto-s);
      color: var(--color-texto-suave);
    }
    .mensaje.error { color: var(--color-error); }
  </style>

  <div class="app">
    <h1>Mis tareas</h1>
    <task-toolbar></task-toolbar>
    <p class="mensaje" role="status" aria-live="polite"></p>
    <task-list></task-list>
  </div>

  <confirm-dialog></confirm-dialog>
  <task-form-modal></task-form-modal>
  <import-modal></import-modal>
`;

export class TaskApp extends HTMLElement {
  #tasks = []; // todas las tareas guardadas
  #status = 'all'; // filtro por estado: all | pending | completed
  #query = ''; // texto del buscador
  #acciones = new Map(); // action de confirm-dialog -> función que la ejecuta
  #temporizador;
  #refs;

  constructor() {
    super();
    const raiz = this.attachShadow({ mode: 'open' });
    raiz.append(plantilla.content.cloneNode(true));

    this.#refs = {
      barra: raiz.querySelector('task-toolbar'),
      mensaje: raiz.querySelector('.mensaje'),
      lista: raiz.querySelector('task-list'),
      confirmar: raiz.querySelector('confirm-dialog'),
      formulario: raiz.querySelector('task-form-modal'),
      importar: raiz.querySelector('import-modal'),
    };

    this.#conectarBloqueRodrigo(raiz);
    this.#conectarBloqueAlan(raiz);
  }

  connectedCallback() {
    this.#cargar();
  }

  // ===== BLOQUE DE RODRIGO: lista, crear, editar, marcar y eliminar =====
  #conectarBloqueRodrigo(raiz) {
    raiz.addEventListener('task:create-request', () => {
      this.#refs.formulario.openCreate();
    });

    raiz.addEventListener('task:edit-request', (e) => {
      const tarea = this.#tasks.find((t) => t.id === e.detail.id);
      if (tarea) this.#refs.formulario.openEdit(tarea);
    });

    raiz.addEventListener('task:save', (e) => {
      const { id, titulo, fechaRegistro, completado } = e.detail;
      if (id) {
        this.#ejecutar(() => {
          updateTask(id, { titulo, fechaRegistro, completado });
          return 'Tarea actualizada.';
        });
      } else {
        this.#ejecutar(() => {
          addTask({ titulo, fechaRegistro, completado });
          return 'Tarea creada.';
        });
      }
    });

    raiz.addEventListener('task:toggle', (e) => {
      const { id, completado } = e.detail;
      this.#ejecutar(() => {
        updateTask(id, { completado });
      });
    });

    raiz.addEventListener('task:delete-request', (e) => {
      const tarea = this.#tasks.find((t) => t.id === e.detail.id);
      if (!tarea) return;
      this.#refs.confirmar.ask({
        action: 'delete-task',
        payload: { id: tarea.id },
        heading: 'Eliminar tarea',
        message: `¿Eliminar la tarea «${tarea.titulo}»? Esta acción no se puede deshacer.`,
        confirmLabel: 'Eliminar',
      });
    });

    // Cada acción confirmable se registra en #acciones; las de Alan van en su bloque
    this.#acciones.set('delete-task', ({ id }) =>
      this.#ejecutar(() => {
        removeTask(id);
        return 'Tarea eliminada.';
      })
    );

    raiz.addEventListener('confirm:accept', (e) => {
      const accion = this.#acciones.get(e.detail.action);
      if (accion) accion(e.detail.payload);
    });
  }

  // ===== BLOQUE DE ALAN: toolbar, filtro, buscador, marcar todas y vaciar =====
  #conectarBloqueAlan(raiz) {
    raiz.addEventListener('filter:change', (e) => {
      this.#status = e.detail.status;
      this.#render();
    });

    raiz.addEventListener('search:change', (e) => {
      this.#query = e.detail.query;
      this.#render();
    });

    raiz.addEventListener('tasks:complete-all', () => {
      const pendientes = this.#tasks.filter((t) => !t.completado).length;
      if (pendientes === 0) {
        this.#mostrarMensaje('Todas las tareas ya están terminadas.');
        return;
      }
      this.#refs.confirmar.ask({
        action: 'complete-all',
        payload: { count: pendientes },
        heading: 'Marcar todas como terminadas',
        message: `Se marcarán como terminadas ${pendientes} ${pendientes === 1 ? 'tarea' : 'tareas'}. ¿Continuar?`,
        confirmLabel: 'Marcar todas',
      });
    });

    raiz.addEventListener('tasks:clear-all', () => {
      const total = this.#tasks.length;
      if (total === 0) return;
      this.#refs.confirmar.ask({
        action: 'clear-all',
        payload: null,
        heading: 'Vaciar lista',
        message: `Se eliminarán ${total} ${total === 1 ? 'tarea' : 'tareas'}, también las importadas. Esta acción no se puede deshacer.`,
        confirmLabel: 'Vaciar lista',
      });
    });

    // Las confirmaciones las ejecuta el listener de confirm:accept del bloque de Rodrigo
    this.#acciones.set('complete-all', () =>
      this.#ejecutar(() => {
        const cambiadas = completeAllTasks();
        return `${cambiadas} ${cambiadas === 1 ? 'tarea marcada como terminada' : 'tareas marcadas como terminadas'}.`;
      })
    );

    this.#acciones.set('clear-all', () =>
      this.#ejecutar(() => {
        clearTasks();
        return 'Lista vaciada.';
      })
    );
  }

  // ===== Funciones compartidas =====
  #cargar() {
    this.#tasks = getTasks();
    this.#render();
  }

  #render() {
    this.#refs.lista.setAttribute(
      'empty-reason',
      this.#tasks.length === 0 ? 'none' : 'no-results'
    );
    this.#refs.lista.tasks = filterTasks(this.#tasks, this.#status, this.#query);
    this.#refs.barra.toggleAttribute('no-tasks', this.#tasks.length === 0);
  }

  // Hace un cambio en storage; si falla, muestra el error en vez de romper la app.
  // `accion` puede devolver un texto para mostrárselo al usuario.
  #ejecutar(accion) {
    try {
      const mensaje = accion();
      this.#cargar();
      if (mensaje) this.#mostrarMensaje(mensaje);
    } catch (error) {
      this.#mostrarMensaje(error.message, true);
    }
  }

  #mostrarMensaje(texto, esError = false) {
    clearTimeout(this.#temporizador);
    this.#refs.mensaje.textContent = texto;
    this.#refs.mensaje.classList.toggle('error', esError);
    this.#temporizador = setTimeout(() => {
      this.#refs.mensaje.textContent = '';
    }, 6000);
  }
}

customElements.define('task-app', TaskApp);