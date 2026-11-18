// js/components/confirm-dialog.js
// Diálogo de confirmación reutilizable (borrar una tarea, marcar todas, vaciar).
// Usa <app-modal> por composición: lo crea dentro de su propio shadow DOM.
//
// Uso:
//   dialogo.ask({ action: 'clear-all', payload: null,
//                 heading: 'Vaciar lista', message: '...', confirmLabel: 'Vaciar' });
// Emite:
//   confirm:accept { action, payload }   al pulsar el botón de confirmar
//   confirm:cancel { action, payload }   al cancelar, con Escape, con la X o con el fondo

// Acciones destructivas: el botón de confirmar se pinta en color de error.
const ACCIONES_PELIGROSAS = new Set(['delete-task', 'delete-category', 'clear-all']);

const plantilla = document.createElement('template');
plantilla.innerHTML = `
  <style>
    :host { display: contents; }
    p { margin: 0; line-height: 1.5; }
    button {
      box-sizing: border-box;
      min-height: 44px;
      padding: 0 var(--espacio-3, 16px);
      border: 1px solid var(--color-borde, #cbd2d9);
      border-radius: var(--radio, 8px);
      background: var(--color-superficie, #ffffff);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    button:hover { filter: brightness(0.94); }
    button:focus-visible {
      outline: 3px solid var(--color-foco, #1d4ed8);
      outline-offset: 2px;
    }
    #aceptar {
      border-color: transparent;
      background: var(--color-primario, #1d4ed8);
      color: var(--color-primario-texto, #ffffff);
    }
    #aceptar.peligro {
      background: var(--color-error, #b42318);
      color: #ffffff;
    }
  </style>

  <app-modal id="modal" heading="Confirmar acción">
    <p id="mensaje"></p>
    <button slot="footer" type="button" id="cancelar">Cancelar</button>
    <button slot="footer" type="button" id="aceptar">Aceptar</button>
  </app-modal>
`;

export class ConfirmDialog extends HTMLElement {
  #modal;
  #mensaje;
  #aceptar;
  #cancelar;
  #pendiente = null; // { action, payload } mientras el diálogo espera respuesta

  constructor() {
    super();
    const raiz = this.attachShadow({ mode: 'open' });
    raiz.append(plantilla.content.cloneNode(true));

    this.#modal = raiz.querySelector('#modal');
    this.#mensaje = raiz.querySelector('#mensaje');
    this.#aceptar = raiz.querySelector('#aceptar');
    this.#cancelar = raiz.querySelector('#cancelar');

    this.#aceptar.addEventListener('click', () => this.#confirmar());
    this.#cancelar.addEventListener('click', () => this.#modal.close());

    // modal:close llega SIEMPRE al cerrar (botón, Escape, X o fondo).
    // Si todavía hay algo pendiente, es que nadie aceptó: es una cancelación.
    this.#modal.addEventListener('modal:close', () => this.#alCerrar());
  }

  ask({
    action,
    payload = null,
    heading = 'Confirmar acción',
    message = '',
    confirmLabel = 'Aceptar',
  }) {
    this.#pendiente = { action, payload };

    this.#modal.setAttribute('heading', heading);
    this.#mensaje.textContent = message;
    this.#aceptar.textContent = confirmLabel;
    this.#aceptar.classList.toggle('peligro', ACCIONES_PELIGROSAS.has(action));

    this.#modal.open();
    // En una acción destructiva el foco inicial va a "Cancelar", la opción segura.
    this.#cancelar.focus();
  }

  #confirmar() {
    const pendiente = this.#pendiente;
    if (!pendiente) return;

    // Se limpia ANTES de cerrar: así #alCerrar no lo toma como cancelación.
    this.#pendiente = null;
    this.#modal.close();
    this.#emitir('confirm:accept', pendiente);
  }

  #alCerrar() {
    if (!this.#pendiente) return;
    const pendiente = this.#pendiente;
    this.#pendiente = null;
    this.#emitir('confirm:cancel', pendiente);
  }

  #emitir(nombre, detail) {
    this.dispatchEvent(
      new CustomEvent(nombre, { detail, bubbles: true, composed: true })
    );
  }
}

customElements.define('confirm-dialog', ConfirmDialog);