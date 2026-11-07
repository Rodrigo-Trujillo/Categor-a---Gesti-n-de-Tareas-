// js/components/task-form-modal.js
// Modal con el formulario para crear o editar una tarea.
//
// API pública:  openCreate()  |  openEdit(task)
// Emite:        task:save  { id?, titulo, fechaRegistro (ISO), completado }
//               (sin id = crear; con id = actualizar). Guardar en storage es de task-app.
//
// El formulario solo existe visible mientras el modal está abierto.

import './app-modal.js';
import { validateTitle, validateDate } from '../utils/validators.js';
import { toDatetimeLocal, fromDatetimeLocal } from '../utils/utils.js';

const plantilla = document.createElement('template');
plantilla.innerHTML = `
  <style>
    :host { display: contents; }
    [hidden] { display: none !important; }

    form { display: flex; flex-direction: column; gap: var(--espacio-3, 16px); }
    .campo { display: flex; flex-direction: column; gap: var(--espacio-1, 4px); }

    label { font-size: var(--texto-s, 0.875rem); font-weight: 600; }

    input[type="text"], input[type="datetime-local"] {
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

    .check { display: flex; align-items: center; gap: var(--espacio-3, 16px); min-height: 44px; }
    .check input { width: 1.5rem; height: 1.5rem; margin: 0; accent-color: var(--color-primario, #2563eb); }
    .check label { font-weight: 400; font-size: var(--texto-m, 1rem); }

    .error { margin: 0; font-size: var(--texto-s, 0.875rem); color: var(--color-error, #b91c1c); }

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
    button:hover { filter: brightness(0.94); }
    #guardar {
      border-color: transparent;
      background: var(--color-primario, #2563eb);
      color: var(--color-primario-texto, #ffffff);
    }
    :is(button, input):focus-visible {
      outline: 3px solid var(--color-foco, #1d4ed8);
      outline-offset: 2px;
    }
  </style>

  <app-modal id="modal" heading="Nueva tarea">
    <form id="form" novalidate>
      <div class="campo">
        <label for="titulo">Título de la tarea</label>
        <input id="titulo" type="text" autocomplete="off">
        <p class="error" id="error-titulo" hidden></p>
      </div>

      <div class="campo">
        <label for="fecha">Fecha de registro</label>
        <input id="fecha" type="datetime-local">
        <p class="error" id="error-fecha" hidden></p>
      </div>

      <div class="check">
        <input id="completado" type="checkbox">
        <label for="completado">Tarea completada</label>
      </div>
    </form>

    <button slot="footer" type="button" id="cancelar">Cancelar</button>
    <button slot="footer" type="submit" form="form" id="guardar">Guardar</button>
  </app-modal>
`;

export class TaskFormModal extends HTMLElement {
  #modal;
  #form;
  #campos;
  #errores;
  #id = null;              // null = creando; con valor = editando esa tarea
  #fechaOriginal = null;   // ISO de la tarea que se edita (para no perder los segundos)

  constructor() {
    super();
    const raiz = this.attachShadow({ mode: 'open' });
    raiz.append(plantilla.content.cloneNode(true));

    this.#modal = raiz.querySelector('#modal');
    this.#form = raiz.querySelector('#form');
    this.#campos = {
      titulo: raiz.querySelector('#titulo'),
      fecha: raiz.querySelector('#fecha'),
      completado: raiz.querySelector('#completado'),
    };
    this.#errores = {
      titulo: raiz.querySelector('#error-titulo'),
      fecha: raiz.querySelector('#error-fecha'),
    };

    this.#form.addEventListener('submit', (evento) => {
      evento.preventDefault();
      this.#guardar();
    });
    raiz.querySelector('#cancelar').addEventListener('click', () => this.#modal.close());

    // Si ya se mostró un error, se revalida mientras la persona lo corrige.
    this.#campos.titulo.addEventListener('input', () => {
      if (this.#campos.titulo.getAttribute('aria-invalid') === 'true') {
        this.#mostrarError('titulo', validateTitle(this.#campos.titulo.value));
      }
    });
    this.#campos.fecha.addEventListener('change', () => {
      if (this.#campos.fecha.getAttribute('aria-invalid') === 'true') {
        this.#mostrarError('fecha', validateDate(this.#valorFechaISO()));
      }
    });

    // modal:close llega al cerrar por cualquier vía (Guardar, Cancelar, Escape, X, fondo).
    this.#modal.addEventListener('modal:close', () => this.#limpiar());
  }

  openCreate() {
    this.#abrir({
      heading: 'Nueva tarea',
      id: null,
      titulo: '',
      fechaISO: new Date().toISOString(), // por defecto, ahora
      completado: false,
    });
  }

  openEdit(task) {
    // Las tareas importadas no se editan (la interfaz ya oculta el botón; esto es un seguro).
    if (!task || task.imported) {
      console.warn('task-form-modal: no se puede editar una tarea importada o inexistente.');
      return;
    }
    this.#abrir({
      heading: 'Editar tarea',
      id: task.id,
      titulo: task.titulo,
      fechaISO: task.fechaRegistro,
      completado: task.completado,
    });
  }

  #abrir({ heading, id, titulo, fechaISO, completado }) {
    this.#limpiar();
    this.#id = id;
    this.#fechaOriginal = id ? fechaISO : null;

    this.#modal.setAttribute('heading', heading);
    this.#campos.titulo.value = titulo;
    this.#campos.fecha.value = toDatetimeLocal(fechaISO);
    this.#campos.fecha.max = toDatetimeLocal(new Date().toISOString()); // el selector no deja elegir futuro
    this.#campos.completado.checked = completado;

    this.#modal.open();
    this.#campos.titulo.focus(); // open() deja el foco en la X; aquí queremos el primer campo
  }

  // ISO de lo que hay en el campo de fecha. Si no la tocaron, se conserva la original.
  #valorFechaISO() {
    const valor = this.#campos.fecha.value;
    if (this.#fechaOriginal && valor === toDatetimeLocal(this.#fechaOriginal)) {
      return this.#fechaOriginal;
    }
    return fromDatetimeLocal(valor); // '' si está vacío o incompleto
  }

  #guardar() {
    const titulo = this.#campos.titulo.value;
    const fechaISO = this.#valorFechaISO();

    const resultadoTitulo = validateTitle(titulo);
    const resultadoFecha = validateDate(fechaISO);
    this.#mostrarError('titulo', resultadoTitulo);
    this.#mostrarError('fecha', resultadoFecha);

    // Con errores no se guarda: el foco va al primer campo inválido.
    if (!resultadoTitulo.valid) { this.#campos.titulo.focus(); return; }
    if (!resultadoFecha.valid) { this.#campos.fecha.focus(); return; }

    const detail = {
      titulo: titulo.trim(),
      fechaRegistro: fechaISO,
      completado: this.#campos.completado.checked,
    };
    if (this.#id) detail.id = this.#id;

    this.dispatchEvent(
      new CustomEvent('task:save', { detail, bubbles: true, composed: true })
    );
    this.#modal.close();
  }

  #mostrarError(nombre, { valid, error }) {
    const campo = this.#campos[nombre];
    const mensaje = this.#errores[nombre];

    mensaje.textContent = valid ? '' : error;
    mensaje.hidden = valid;
    campo.setAttribute('aria-invalid', String(!valid));
    if (valid) campo.removeAttribute('aria-describedby');
    else campo.setAttribute('aria-describedby', mensaje.id);
  }

  #limpiar() {
    for (const nombre of ['titulo', 'fecha']) {
      const campo = this.#campos[nombre];
      this.#errores[nombre].textContent = '';
      this.#errores[nombre].hidden = true;
      campo.removeAttribute('aria-invalid');
      campo.removeAttribute('aria-describedby');
    }
    this.#id = null;
    this.#fechaOriginal = null;
  }
}

customElements.define('task-form-modal', TaskFormModal);
