import { formatDate } from '../utils/utils.js';

const plantilla = document.createElement('template');
plantilla.innerHTML = `
  <style>
    :host { display: block; }
    [hidden] { display: none !important; }

    .item {
      display: flex;
      flex-direction: column;
      gap: var(--espacio-2);
      padding: var(--espacio-3);
      background: var(--color-superficie);
      border: 1px solid var(--color-borde);
      border-radius: var(--radio);
      font-family: var(--fuente);
    }
    .principal { flex: 1; min-width: 0; }

    .check {
      display: flex;
      align-items: center;
      gap: var(--espacio-3);
      min-height: 44px;
      cursor: pointer;
    }
    .check input {
      flex: none;
      width: 1.5rem;
      height: 1.5rem;
      margin: 0;
      accent-color: var(--color-primario);
    }
    .titulo {
      font-size: var(--texto-m);
      overflow-wrap: anywhere;
    }
    .completada .titulo {
      text-decoration: line-through;
      color: var(--color-texto-suave);
    }

    .meta {
      margin: 0;
      padding-left: calc(1.5rem + var(--espacio-3));
      font-size: var(--texto-s);
      color: var(--color-texto-suave);
    }

    .acciones { display: flex; gap: var(--espacio-2); }

    button {
      min-width: 44px;
      min-height: 44px;
      padding: 0 var(--espacio-3);
      border: 1px solid var(--color-borde);
      border-radius: var(--radio);
      background: var(--color-superficie);
      color: var(--color-texto);
      font: inherit;
      font-size: var(--texto-s);
      cursor: pointer;
    }
    button:hover { background: var(--color-fondo); }
    .eliminar { color: var(--color-error); border-color: var(--color-error); }

    :focus-visible {
      outline: 3px solid var(--color-foco);
      outline-offset: 2px;
    }

    @media (min-width: 768px) {
      .item {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }
  </style>

  <div class="item">
    <div class="principal">
      <label class="check">
        <input type="checkbox" />
        <span class="titulo"></span>
      </label>
      <p class="meta"><time></time> · <span class="origen"></span><span class="categoria-wrap" hidden> · Categoría: <strong class="categoria"></strong></span></p>
    </div>
    <div class="acciones">
      <button type="button" class="editar">Editar</button>
      <button type="button" class="eliminar">Eliminar</button>
    </div>
  </div>
`;

export class TaskItem extends HTMLElement {
  #task = null;
  #categoryName = ''; // nombre de la categoría de la tarea ('' = sin categoría)
  #refs;

  constructor() {
    super();
    const raiz = this.attachShadow({ mode: 'open' });
    raiz.append(plantilla.content.cloneNode(true));

    this.#refs = {
      item: raiz.querySelector('.item'),
      check: raiz.querySelector('input[type="checkbox"]'),
      titulo: raiz.querySelector('.titulo'),
      fecha: raiz.querySelector('time'),
      origen: raiz.querySelector('.origen'),
      categoriaWrap: raiz.querySelector('.categoria-wrap'),
      categoria: raiz.querySelector('.categoria'),
      editar: raiz.querySelector('.editar'),
      eliminar: raiz.querySelector('.eliminar'),
    };

    this.#refs.check.addEventListener('change', () => {
      if (!this.#task) return;
      this.#emitir('task:toggle', {
        id: this.#task.id,
        completado: this.#refs.check.checked,
      });
    });

    this.#refs.editar.addEventListener('click', () => {
      if (this.#task) this.#emitir('task:edit-request', { id: this.#task.id });
    });

    this.#refs.eliminar.addEventListener('click', () => {
      if (this.#task) this.#emitir('task:delete-request', { id: this.#task.id });
    });
  }

  get task() {
    return this.#task;
  }

  set task(valor) {
    this.#task = valor;
    this.#render();
  }

  // task-list le pasa el nombre ya resuelto: así task-item no necesita conocer las categorías.
  set categoryName(valor) {
    this.#categoryName = valor ?? '';
    this.#render();
  }

  #emitir(nombre, detail) {
    this.dispatchEvent(
      new CustomEvent(nombre, { detail, bubbles: true, composed: true })
    );
  }

  #render() {
    const t = this.#task;
    if (!t) return;

    // textContent (nunca innerHTML) para que un título con etiquetas HTML no se ejecute
    this.#refs.titulo.textContent = t.titulo;
    this.#refs.check.checked = t.completado;
    this.#refs.item.classList.toggle('completada', t.completado);

    this.#refs.fecha.textContent = formatDate(t.fechaRegistro);
    this.#refs.fecha.dateTime = t.fechaRegistro;
    this.#refs.origen.textContent = t.origen === 'api' ? 'API' : 'Local';
    this.#refs.categoria.textContent = this.#categoryName;
    this.#refs.categoriaWrap.hidden = !this.#categoryName;

    // Las tareas importadas no se editan, solo se eliminan
    this.#refs.editar.hidden = t.imported;

    // Nombres accesibles distintos para cada botón de cada tarea
    this.#refs.editar.setAttribute('aria-label', `Editar tarea: ${t.titulo}`);
    this.#refs.eliminar.setAttribute('aria-label', `Eliminar tarea: ${t.titulo}`);
  }
}

customElements.define('task-item', TaskItem);