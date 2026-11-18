// js/components/category-manager-modal.js
// Modal para crear, renombrar y eliminar categorías.
//
// API pública:  open()  |  set categories(lista)  (task-app se la pasa cada vez que cambian)
// Emite:        category:save           { id?, nombre }  (sin id = crear; con id = renombrar)
//               category:delete-request { id }
// Guardar en storage y confirmar el borrado es de task-app.

import './app-modal.js';
import { validateCategory } from '../utils/validators.js';

const plantilla = document.createElement('template');
plantilla.innerHTML = `
  <style>
    :host { display: contents; }
    [hidden] { display: none !important; }

    form { display: flex; flex-direction: column; gap: var(--espacio-2, 8px); }
    .campo { display: flex; flex-direction: column; gap: var(--espacio-1, 4px); }
    .fila { display: flex; flex-wrap: wrap; gap: var(--espacio-2, 8px); }

    label { font-size: var(--texto-s, 0.875rem); font-weight: 600; }

    input {
      box-sizing: border-box;
      min-height: 44px;
      padding: 0 var(--espacio-3, 16px);
      border: 1px solid var(--color-borde, #d1d5db);
      border-radius: var(--radio, 8px);
      background: var(--color-superficie, #ffffff);
      color: inherit;
      font: inherit;
    }
    input[aria-invalid="true"] { border-color: var(--color-error, #b91c1c); }

    .error { margin: 0; font-size: var(--texto-s, 0.875rem); color: var(--color-error, #b91c1c); }

    button {
      box-sizing: border-box;
      min-height: 44px;
      padding: 0 var(--espacio-3, 16px);
      border: 1px solid var(--color-borde, #d1d5db);
      border-radius: var(--radio, 8px);
      background: var(--color-superficie, #ffffff);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    button:hover { filter: brightness(0.94); }
    button.primario {
      border-color: transparent;
      background: var(--color-primario, #2563eb);
      color: var(--color-primario-texto, #ffffff);
    }
    button.peligro { border-color: currentColor; color: var(--color-error, #b91c1c); }
    :is(button, input):focus-visible {
      outline: 3px solid var(--color-foco, #1d4ed8);
      outline-offset: 2px;
    }

    ul { list-style: none; margin: var(--espacio-3, 16px) 0 0; padding: 0; }
    li {
      display: flex;
      align-items: center;
      gap: var(--espacio-2, 8px);
      padding: var(--espacio-2, 8px) 0;
      border-bottom: 1px solid var(--color-borde, #d1d5db);
    }
    .nombre { flex: 1; overflow-wrap: anywhere; }
    #vacio { margin: var(--espacio-3, 16px) 0 0; color: var(--color-texto-suave, #52606d); }
  </style>

  <app-modal id="modal" heading="Categorías">
    <form id="form" novalidate>
      <div class="campo">
        <label for="nombre">Nombre de la categoría</label>
        <input id="nombre" type="text" autocomplete="off">
        <p class="error" id="error-nombre" hidden></p>
      </div>
      <div class="fila">
        <button type="submit" class="primario" id="guardar">Agregar</button>
        <button type="button" id="cancelar-edicion" hidden>Cancelar edición</button>
      </div>
    </form>

    <ul id="lista" aria-label="Categorías existentes"></ul>
    <p id="vacio">Aún no hay categorías.</p>

    <button slot="footer" type="button" id="cerrar">Cerrar</button>
  </app-modal>
`;

export class CategoryManagerModal extends HTMLElement {
  #modal;
  #nombre;
  #error;
  #lista;
  #vacio;
  #botonGuardar;
  #botonCancelarEdicion;
  #categorias = [];
  #editandoId = null; // null = creando; con valor = renombrando esa categoría

  constructor() {
    super();
    const raiz = this.attachShadow({ mode: 'open' });
    raiz.append(plantilla.content.cloneNode(true));

    this.#modal = raiz.querySelector('#modal');
    this.#nombre = raiz.querySelector('#nombre');
    this.#error = raiz.querySelector('#error-nombre');
    this.#lista = raiz.querySelector('#lista');
    this.#vacio = raiz.querySelector('#vacio');
    this.#botonGuardar = raiz.querySelector('#guardar');
    this.#botonCancelarEdicion = raiz.querySelector('#cancelar-edicion');

    raiz.querySelector('#form').addEventListener('submit', (evento) => {
      evento.preventDefault();
      this.#enviar();
    });
    this.#botonCancelarEdicion.addEventListener('click', () => {
      this.#salirDeEdicion();
      this.#nombre.focus();
    });
    raiz.querySelector('#cerrar').addEventListener('click', () => this.#modal.close());

    // Si ya se mostró un error, se revalida mientras la persona lo corrige.
    this.#nombre.addEventListener('input', () => {
      if (this.#nombre.getAttribute('aria-invalid') === 'true') {
        this.#mostrarError(validateCategory(this.#nombre.value, this.#otrosNombres()));
      }
    });

    this.#modal.addEventListener('modal:close', () => this.#salirDeEdicion());
  }

  get categories() {
    return this.#categorias;
  }

  set categories(lista) {
    this.#categorias = Array.isArray(lista) ? lista : [];
    // Si la categoría que se editaba ya no existe, se sale del modo edición.
    if (this.#editandoId && !this.#categorias.some((c) => c.id === this.#editandoId)) {
      this.#salirDeEdicion();
    }
    this.#pintarLista();
  }

  open() {
    this.#salirDeEdicion();
    this.#modal.open();
    this.#nombre.focus(); // open() deja el foco en la X; aquí queremos el campo
  }

  focusNombre() {
    this.#nombre.focus();
  }

  // Nombres de las demás categorías (la que se está editando no cuenta como repetida).
  #otrosNombres() {
    return this.#categorias.filter((c) => c.id !== this.#editandoId).map((c) => c.nombre);
  }

  #pintarLista() {
    this.#lista.replaceChildren();
    this.#vacio.hidden = this.#categorias.length > 0;

    for (const categoria of this.#categorias) {
      const item = document.createElement('li');

      const texto = document.createElement('span');
      texto.className = 'nombre';
      texto.textContent = categoria.nombre; // textContent, no innerHTML: el nombre lo escribe el usuario

      const editar = document.createElement('button');
      editar.type = 'button';
      editar.textContent = 'Editar';
      editar.setAttribute('aria-label', `Editar categoría ${categoria.nombre}`);
      editar.addEventListener('click', () => this.#empezarEdicion(categoria));

      const eliminar = document.createElement('button');
      eliminar.type = 'button';
      eliminar.className = 'peligro';
      eliminar.textContent = 'Eliminar';
      eliminar.setAttribute('aria-label', `Eliminar categoría ${categoria.nombre}`);
      eliminar.addEventListener('click', () =>
        this.#emitir('category:delete-request', { id: categoria.id })
      );

      item.append(texto, editar, eliminar);
      this.#lista.append(item);
    }
  }

  #empezarEdicion(categoria) {
    this.#editandoId = categoria.id;
    this.#nombre.value = categoria.nombre;
    this.#botonGuardar.textContent = 'Guardar cambios';
    this.#botonCancelarEdicion.hidden = false;
    this.#mostrarError({ valid: true, error: '' });
    this.#nombre.focus();
    this.#nombre.select();
  }

  #salirDeEdicion() {
    this.#editandoId = null;
    this.#nombre.value = '';
    this.#botonGuardar.textContent = 'Agregar';
    this.#botonCancelarEdicion.hidden = true;
    this.#mostrarError({ valid: true, error: '' });
  }

  #enviar() {
    const resultado = validateCategory(this.#nombre.value, this.#otrosNombres());
    this.#mostrarError(resultado);
    if (!resultado.valid) {
      this.#nombre.focus();
      return;
    }

    const detail = { nombre: this.#nombre.value.trim() };
    if (this.#editandoId) detail.id = this.#editandoId;

    this.#emitir('category:save', detail);
    this.#salirDeEdicion();
    this.#nombre.focus();
  }

  #mostrarError({ valid, error }) {
    this.#error.textContent = valid ? '' : error;
    this.#error.hidden = valid;
    if (valid) {
      this.#nombre.removeAttribute('aria-invalid');
      this.#nombre.removeAttribute('aria-describedby');
    } else {
      this.#nombre.setAttribute('aria-invalid', 'true');
      this.#nombre.setAttribute('aria-describedby', this.#error.id);
    }
  }

  #emitir(nombre, detail) {
    this.dispatchEvent(
      new CustomEvent(nombre, { detail, bubbles: true, composed: true })
    );
  }
}

customElements.define('category-manager-modal', CategoryManagerModal);
