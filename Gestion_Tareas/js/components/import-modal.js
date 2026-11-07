// js/components/import-modal.js
// Modal para importar tareas desde la API pública.
//
// Propiedad:  existingApiIds: number[]   apiIds que ya están guardados (quedan deshabilitados)
// Método:     open()                     abre el modal y carga las tareas de la API
// Emite:      import:confirm { tasks: TaskDraft[] }   (tareas sin fechaRegistro)
//
// Al cerrar el modal se cancela la petición en curso (AbortController).

import './app-modal.js';
import { fetchTodos } from '../services/api.js';
import { filterTasks } from '../utils/utils.js';

const plantilla = document.createElement('template');
plantilla.innerHTML = `
  <style>
    :host { display: contents; }
    [hidden] { display: none !important; }

    .contenido { display: flex; flex-direction: column; gap: var(--espacio-3, 16px); }
    .estado { margin: 0; color: var(--color-texto-suave, #4b5563); }

    .error {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--espacio-2, 8px);
      padding: var(--espacio-3, 16px);
      border: 1px solid var(--color-error, #b91c1c);
      border-radius: var(--radio, 8px);
      color: var(--color-error, #b91c1c);
    }
    .error p { margin: 0; }

    .campo { display: flex; flex-direction: column; gap: var(--espacio-1, 4px); }
    label.etiqueta { font-size: var(--texto-s, 0.875rem); font-weight: 600; }

    input[type="search"] {
      box-sizing: border-box;
      min-height: 44px;
      padding: 0 var(--espacio-3, 16px);
      border: 1px solid var(--color-borde, #d1d5db);
      border-radius: var(--radio, 8px);
      background: var(--color-superficie, #ffffff);
      color: inherit;
      font: inherit;
    }

    .seleccion {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--espacio-2, 8px);
    }
    .todas { display: flex; align-items: center; gap: var(--espacio-2, 8px); min-height: 44px; }
    .contador { font-size: var(--texto-s, 0.875rem); color: var(--color-texto-suave, #4b5563); }

    input[type="checkbox"] {
      flex: none;
      width: 1.5rem;
      height: 1.5rem;
      margin: 0;
      accent-color: var(--color-primario, #2563eb);
    }

    ul {
      list-style: none;
      margin: 0;
      padding: var(--espacio-1, 4px);
      max-height: 45vh;
      overflow: auto;
      border: 1px solid var(--color-borde, #d1d5db);
      border-radius: var(--radio, 8px);
    }
    .fila {
      display: flex;
      align-items: center;
      gap: var(--espacio-3, 16px);
      min-height: 44px;
      padding: 0 var(--espacio-2, 8px);
      border-radius: var(--radio, 8px);
      cursor: pointer;
    }
    .fila:hover { background: var(--color-fondo, #f3f4f6); }
    .fila.deshabilitada { cursor: default; opacity: 0.65; }
    .titulo { flex: 1; min-width: 0; overflow-wrap: anywhere; }
    .nota { flex: none; font-size: var(--texto-s, 0.875rem); color: var(--color-texto-suave, #4b5563); }

    .vacio { margin: 0; text-align: center; color: var(--color-texto-suave, #4b5563); }

    button {
      box-sizing: border-box;
      min-height: 44px;
      padding: 0 var(--espacio-4, 24px);
      border: 1px solid var(--color-borde, #d1d5db);
      border-radius: var(--radio, 8px);
      background: var(--color-superficie, #ffffff);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    button:hover:not(:disabled) { filter: brightness(0.94); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    #importar {
      border-color: transparent;
      background: var(--color-primario, #2563eb);
      color: var(--color-primario-texto, #ffffff);
    }
    :is(button, input):focus-visible {
      outline: 3px solid var(--color-foco, #1d4ed8);
      outline-offset: 2px;
    }
  </style>

  <app-modal id="modal" heading="Importar tareas">
    <div class="contenido">
      <p class="estado" id="estado" role="status"></p>

      <div class="error" id="error" role="alert" hidden>
        <p id="mensaje-error"></p>
        <button type="button" id="reintentar">Reintentar</button>
      </div>

      <div class="contenido" id="listo" hidden>
        <div class="campo">
          <label class="etiqueta" for="buscar">Buscar en el banco de tareas</label>
          <input id="buscar" type="search" autocomplete="off" placeholder="Buscar por título">
        </div>

        <div class="seleccion">
          <div class="todas">
            <input id="todas" type="checkbox">
            <label for="todas">Seleccionar todas las visibles</label>
          </div>
          <span class="contador" id="contador" aria-live="polite"></span>
        </div>

        <ul id="lista"></ul>
        <p class="vacio" id="sin-resultados" hidden>Ninguna tarea coincide con tu búsqueda.</p>
      </div>
    </div>

    <button slot="footer" type="button" id="cancelar">Cancelar</button>
    <button slot="footer" type="button" id="importar" disabled>Importar</button>
  </app-modal>
`;

export class ImportModal extends HTMLElement {
  #modal;
  #refs;
  #borradores = [];          // las tareas que devolvió la API
  #filas = new Map();        // apiId -> { li, check, borrador }
  #seleccion = new Set();    // apiIds marcados (se conservan aunque el buscador los oculte)
  #existentes = new Set();   // apiIds que ya están guardados
  #query = '';
  #controlador = null;       // AbortController de la petición en curso

  constructor() {
    super();
    const raiz = this.attachShadow({ mode: 'open' });
    raiz.append(plantilla.content.cloneNode(true));

    this.#modal = raiz.querySelector('#modal');
    this.#refs = {
      estado: raiz.querySelector('#estado'),
      error: raiz.querySelector('#error'),
      mensajeError: raiz.querySelector('#mensaje-error'),
      reintentar: raiz.querySelector('#reintentar'),
      listo: raiz.querySelector('#listo'),
      buscar: raiz.querySelector('#buscar'),
      todas: raiz.querySelector('#todas'),
      contador: raiz.querySelector('#contador'),
      lista: raiz.querySelector('#lista'),
      sinResultados: raiz.querySelector('#sin-resultados'),
      cancelar: raiz.querySelector('#cancelar'),
      importar: raiz.querySelector('#importar'),
    };

    this.#refs.reintentar.addEventListener('click', () => this.#cargar());
    this.#refs.cancelar.addEventListener('click', () => this.#modal.close());
    this.#refs.importar.addEventListener('click', () => this.#confirmar());

    this.#refs.buscar.addEventListener('input', () => {
      this.#query = this.#refs.buscar.value;
      this.#aplicarFiltro();
    });

    this.#refs.todas.addEventListener('change', () =>
      this.#alternarVisibles(this.#refs.todas.checked)
    );

    // Un solo oyente para las ~200 casillas (delegación de eventos)
    this.#refs.lista.addEventListener('change', (evento) => {
      const casilla = evento.target;
      const apiId = Number(casilla.dataset.apiId);
      if (casilla.checked) this.#seleccion.add(apiId);
      else this.#seleccion.delete(apiId);
      this.#actualizarResumen();
    });

    // Al cerrar (por cualquier vía) se cancela la petición que siga en curso.
    this.#modal.addEventListener('modal:close', () => {
      this.#controlador?.abort();
      this.#controlador = null;
    });
  }

  set existingApiIds(ids) {
    this.#existentes = new Set(Array.isArray(ids) ? ids : []);
  }

  get existingApiIds() {
    return [...this.#existentes];
  }

  open() {
    if (this.#modal.isOpen) return;
    this.#reiniciar();
    this.#modal.open();
    this.#cargar();
  }

  // ---------- Carga ----------

  async #cargar() {
    this.#controlador?.abort(); // por si "Reintentar" se pulsa con otra petición viva
    const controlador = new AbortController();
    this.#controlador = controlador;

    this.#mostrar('cargando');
    try {
      const borradores = await fetchTodos({ signal: controlador.signal });
      if (controlador.signal.aborted) return;

      this.#borradores = borradores;
      this.#construirLista();
      this.#mostrar('listo');
      this.#refs.buscar.focus();
    } catch (error) {
      // Cerrar el modal cancela la petición a propósito: no es un error que mostrar.
      if (error.name === 'AbortError' || controlador.signal.aborted) return;
      this.#refs.mensajeError.textContent = error.message;
      this.#mostrar('error');
      this.#refs.reintentar.focus();
    }
  }

  #mostrar(estado) {
    this.#refs.estado.textContent = estado === 'cargando' ? 'Cargando tareas…' : '';
    this.#refs.error.hidden = estado !== 'error';
    this.#refs.listo.hidden = estado !== 'listo';
  }

  #reiniciar() {
    this.#borradores = [];
    this.#filas.clear();
    this.#seleccion.clear();
    this.#query = '';
    this.#refs.buscar.value = '';
    this.#refs.lista.replaceChildren();
    this.#actualizarResumen();
  }

  // ---------- Lista ----------

  // Se crean las filas UNA vez; el buscador solo las oculta (así se conserva lo marcado).
  #construirLista() {
    const fragmento = document.createDocumentFragment();
    for (const borrador of this.#borradores) {
      fragmento.append(this.#crearFila(borrador));
    }
    this.#refs.lista.replaceChildren(fragmento);
    this.#aplicarFiltro();
  }

  #crearFila(borrador) {
    const yaImportada = this.#existentes.has(borrador.apiId);

    const li = document.createElement('li');
    const etiqueta = document.createElement('label');
    etiqueta.className = 'fila';
    if (yaImportada) etiqueta.classList.add('deshabilitada');

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.dataset.apiId = borrador.apiId;
    check.disabled = yaImportada;

    const titulo = document.createElement('span');
    titulo.className = 'titulo';
    titulo.textContent = borrador.titulo; // textContent, nunca innerHTML

    const nota = document.createElement('span');
    nota.className = 'nota';
    nota.textContent = yaImportada ? 'Ya importada' : borrador.completado ? 'Completada' : 'Pendiente';

    etiqueta.append(check, titulo, nota);
    li.append(etiqueta);
    this.#filas.set(borrador.apiId, { li, check, borrador });
    return li;
  }

  #aplicarFiltro() {
    const visibles = new Set(filterTasks(this.#borradores, 'all', this.#query));
    let cantidad = 0;
    for (const { li, borrador } of this.#filas.values()) {
      const visible = visibles.has(borrador);
      li.hidden = !visible;
      if (visible) cantidad++;
    }
    this.#refs.sinResultados.hidden = cantidad > 0;
    this.#actualizarResumen();
  }

  // Filas que se pueden marcar ahora: visibles y no importadas todavía.
  #filasSeleccionables() {
    return [...this.#filas.values()].filter((f) => !f.li.hidden && !f.check.disabled);
  }

  #alternarVisibles(marcar) {
    for (const fila of this.#filasSeleccionables()) {
      fila.check.checked = marcar;
      if (marcar) this.#seleccion.add(fila.borrador.apiId);
      else this.#seleccion.delete(fila.borrador.apiId);
    }
    this.#actualizarResumen();
  }

  #actualizarResumen() {
    const seleccionables = this.#filasSeleccionables();
    const marcadas = seleccionables.filter((f) => f.check.checked).length;
    const total = this.#seleccion.size;

    const todas = this.#refs.todas;
    todas.disabled = seleccionables.length === 0;
    todas.checked = seleccionables.length > 0 && marcadas === seleccionables.length;
    todas.indeterminate = marcadas > 0 && marcadas < seleccionables.length;

    this.#refs.contador.textContent =
      total === 0 ? 'Ninguna seleccionada' : total === 1 ? '1 seleccionada' : `${total} seleccionadas`;

    this.#refs.importar.disabled = total === 0;
    this.#refs.importar.textContent =
      total === 0 ? 'Importar' : total === 1 ? 'Importar 1 tarea' : `Importar ${total} tareas`;
  }

  // ---------- Confirmar ----------

  #confirmar() {
    const tasks = this.#borradores.filter(
      (b) => this.#seleccion.has(b.apiId) && !this.#existentes.has(b.apiId)
    );
    if (tasks.length === 0) return;

    this.dispatchEvent(
      new CustomEvent('import:confirm', { detail: { tasks }, bubbles: true, composed: true })
    );
    this.#modal.close();
  }
}

customElements.define('import-modal', ImportModal);
