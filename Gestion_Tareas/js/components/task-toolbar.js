// js/components/task-toolbar.js
// Barra de herramientas: botones de acción, filtro por estado y buscador.
// Solo EMITE eventos; no conoce las tareas ni el estado (eso es de task-app).
//
// Atributo opcional: no-tasks
//   Si task-app lo pone (toolbar.toggleAttribute('no-tasks', total === 0)),
//   "Marcar todas" y "Vaciar lista" quedan inactivos porque no hay nada que hacer.

const plantilla = document.createElement('template');
plantilla.innerHTML = `
  <style>
    :host {
      display: block;
      font-family: var(--fuente, system-ui, sans-serif);
      color: var(--color-texto, #1f2933);
    }
    .barra { display: flex; flex-direction: column; gap: var(--espacio-3, 16px); }
    .acciones { display: flex; flex-wrap: wrap; gap: var(--espacio-2, 8px); }
    .filtros { display: flex; flex-wrap: wrap; gap: var(--espacio-3, 16px); }
    .campo { display: flex; flex: 1 1 14rem; flex-direction: column; gap: var(--espacio-1, 4px); }

    label { font-size: var(--texto-s, 0.875rem); color: var(--color-texto-suave, #52606d); }

    input, select, button {
      box-sizing: border-box;
      min-height: 44px;
      border-radius: var(--radio, 8px);
      font: inherit;
    }
    input, select {
      padding: 0 var(--espacio-3, 16px);
      border: 1px solid var(--color-borde, #cbd2d9);
      background: var(--color-superficie, #ffffff);
      color: inherit;
    }
    button {
      padding: 0 var(--espacio-3, 16px);
      border: 1px solid var(--color-borde, #cbd2d9);
      background: var(--color-superficie, #ffffff);
      color: inherit;
      cursor: pointer;
    }
    button.primario {
      border-color: transparent;
      background: var(--color-primario, #1d4ed8);
      color: var(--color-primario-texto, #ffffff);
    }
    button.peligro { border-color: currentColor; color: var(--color-error, #b42318); }
    button:hover:not([aria-disabled="true"]) { filter: brightness(0.94); }
    button[aria-disabled="true"] { opacity: 0.5; cursor: not-allowed; }

    :is(button, input, select):focus-visible {
      outline: 3px solid var(--color-foco, #1d4ed8);
      outline-offset: 2px;
    }
  </style>

  <section class="barra" aria-label="Herramientas de tareas">
    <div class="acciones" role="group" aria-label="Acciones">
      <button type="button" class="primario" data-evento="task:create-request">Nueva tarea</button>
      <button type="button" data-evento="import:open">Importar tareas</button>
      <button type="button" data-evento="tasks:complete-all" data-masivo>Marcar todas como terminadas</button>
      <button type="button" class="peligro" data-evento="tasks:clear-all" data-masivo>Vaciar lista</button>
    </div>

    <div class="filtros">
      <div class="campo">
        <label for="buscar">Buscar tarea</label>
        <input id="buscar" type="search" placeholder="Buscar por título" autocomplete="off">
      </div>
      <div class="campo">
        <label for="estado">Estado</label>
        <select id="estado">
          <option value="all">Todas</option>
          <option value="pending">Pendientes</option>
          <option value="completed">Completadas</option>
        </select>
      </div>
    </div>
  </section>
`;

export class TaskToolbar extends HTMLElement {
  static observedAttributes = ['no-tasks'];

  #raiz;
  #masivos;

  constructor() {
    super();
    this.#raiz = this.attachShadow({ mode: 'open' });
    this.#raiz.append(plantilla.content.cloneNode(true));
    this.#masivos = this.#raiz.querySelectorAll('[data-masivo]');

    // Un solo manejador para los 4 botones: el nombre del evento va en data-evento.
    this.#raiz.querySelectorAll('button[data-evento]').forEach((boton) => {
      boton.addEventListener('click', () => {
        // aria-disabled no bloquea el clic por sí solo: lo ignoramos a mano.
        if (boton.getAttribute('aria-disabled') === 'true') return;
        this.#emitir(boton.dataset.evento);
      });
    });

    this.#raiz.querySelector('#estado').addEventListener('change', (evento) => {
      this.#emitir('filter:change', { status: evento.target.value });
    });

    // 'input' se dispara con cada tecla y también al limpiar el buscador con la X.
    this.#raiz.querySelector('#buscar').addEventListener('input', (evento) => {
      this.#emitir('search:change', { query: evento.target.value });
    });
  }

  attributeChangedCallback(nombre) {
    if (nombre !== 'no-tasks') return;
    const sinTareas = this.hasAttribute('no-tasks');
    // Se usa aria-disabled y NO disabled: tras confirmar "Vaciar lista", el modal
    // devuelve el foco a ese botón, y un botón disabled no puede recibir foco.
    this.#masivos.forEach((boton) =>
      boton.setAttribute('aria-disabled', String(sinTareas))
    );
  }

  #emitir(nombre, detail = null) {
    this.dispatchEvent(
      new CustomEvent(nombre, { detail, bubbles: true, composed: true })
    );
  }
}

// No se registra aquí: main.js hace customElements.define('task-toolbar', TaskToolbar)
