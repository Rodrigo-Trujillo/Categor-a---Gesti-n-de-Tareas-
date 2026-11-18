import './task-item.js';

const plantilla = document.createElement('template');
plantilla.innerHTML = `
  <style>
    :host { display: block; }
    [hidden] { display: none !important; }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--espacio-3);
    }

    .vacio {
      padding: var(--espacio-5) var(--espacio-3);
      text-align: center;
      background: var(--color-superficie);
      border: 1px dashed var(--color-borde);
      border-radius: var(--radio);
      font-family: var(--fuente);
      color: var(--color-texto-suave);
    }
    .vacio .icono { font-size: 2rem; }
    .vacio p {
      margin: var(--espacio-2) 0 var(--espacio-3);
      font-size: var(--texto-m);
    }
    .vacio-filtro p { margin-bottom: 0; }

    .acciones {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--espacio-2);
    }
    button {
      min-height: 44px;
      padding: 0 var(--espacio-4);
      border: 1px solid var(--color-primario);
      border-radius: var(--radio);
      font: inherit;
      cursor: pointer;
    }
    .primario {
      background: var(--color-primario);
      color: var(--color-primario-texto);
    }
    .secundario {
      background: var(--color-superficie);
      color: var(--color-primario);
    }

    :focus-visible {
      outline: 3px solid var(--color-foco);
      outline-offset: 2px;
    }
  </style>

  <ul></ul>

  <div class="vacio vacio-none" hidden>
    <span class="icono" aria-hidden="true">📭</span>
    <p>Aún no tienes tareas.</p>
    <div class="acciones">
      <button type="button" class="primario nueva">Nueva tarea</button>
      <button type="button" class="secundario importar">Importar tareas</button>
    </div>
  </div>

  <div class="vacio vacio-filtro" hidden>
    <p>Ninguna tarea coincide con tu búsqueda o filtro.</p>
  </div>
`;

export class TaskList extends HTMLElement {
  static observedAttributes = ['empty-reason'];

  #tasks = [];
  #items = new Map(); // id de la tarea -> <li> que ya está dibujado
  #nombresCategoria = new Map(); // id de la categoría -> nombre
  #refs;

  constructor() {
    super();
    const raiz = this.attachShadow({ mode: 'open' });
    raiz.append(plantilla.content.cloneNode(true));

    this.#refs = {
      lista: raiz.querySelector('ul'),
      vacioNone: raiz.querySelector('.vacio-none'),
      vacioFiltro: raiz.querySelector('.vacio-filtro'),
    };

    raiz
      .querySelector('.nueva')
      .addEventListener('click', () => this.#emitir('task:create-request'));
    raiz
      .querySelector('.importar')
      .addEventListener('click', () => this.#emitir('import:open'));
  }

  get tasks() {
    return this.#tasks;
  }

  set tasks(valor) {
    this.#tasks = Array.isArray(valor) ? valor : [];
    this.#render();
  }

  // task-app asigna la lista de categorías (antes que las tareas) para poder mostrar el nombre.
  set categories(lista) {
    const categorias = Array.isArray(lista) ? lista : [];
    this.#nombresCategoria = new Map(categorias.map((c) => [c.id, c.nombre]));
    this.#render();
  }

  connectedCallback() {
    this.#render();
  }

  attributeChangedCallback() {
    this.#render();
  }

  #emitir(nombre) {
    this.dispatchEvent(new CustomEvent(nombre, { bubbles: true, composed: true }));
  }

  #render() {
    const ids = new Set(this.#tasks.map((t) => t.id));

    // 1. Quitar las tareas que ya no están
    for (const [id, li] of this.#items) {
      if (!ids.has(id)) {
        li.remove();
        this.#items.delete(id);
      }
    }

    // 2. Crear las nuevas y actualizar las que ya existían
    const ordenados = this.#tasks.map((tarea) => {
      let li = this.#items.get(tarea.id);
      if (!li) {
        li = document.createElement('li');
        li.append(document.createElement('task-item'));
        this.#items.set(tarea.id, li);
      }
      li.firstElementChild.categoryName = this.#nombresCategoria.get(tarea.categoriaId) ?? '';
      li.firstElementChild.task = tarea;
      return li;
    });

    // 3. Ordenar moviendo solo lo necesario: así el teclado no pierde el foco
    let referencia = this.#refs.lista.firstElementChild;
    for (const li of ordenados) {
      if (li === referencia) {
        referencia = referencia.nextElementSibling;
      } else {
        this.#refs.lista.insertBefore(li, referencia);
      }
    }

    // 4. Estado vacío: sin tareas guardadas (none) o filtro sin resultados (no-results)
    const hayTareas = ordenados.length > 0;
    const sinResultados = this.getAttribute('empty-reason') === 'no-results';
    this.#refs.lista.hidden = !hayTareas;
    this.#refs.vacioNone.hidden = hayTareas || sinResultados;
    this.#refs.vacioFiltro.hidden = hayTareas || !sinResultados;
  }
}

customElements.define('task-list', TaskList);