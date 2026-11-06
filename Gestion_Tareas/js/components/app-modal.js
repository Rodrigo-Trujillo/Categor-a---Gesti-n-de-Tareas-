//DECISIÓN: se usa <dialog> con un ShowModal(); la trampa de foco con Tab se hace a mano.

import { getDeepActiveElement } from '../utils/utils.js';

const plantilla = document.createElement('template');
plantilla.innerHTML = `
  <style>
    :host { display: contents; }

    dialog {
      border: 0;
      padding: 0;
      width: min(32rem, calc(100vw - 2rem));
      border-radius: var(--radio, 12px);
      background: var(--color-superficie, #ffffff);
      color: var(--color-texto, #1f2933);
      box-shadow: var(--sombra, 0 10px 30px rgb(0 0 0 / 0.25));
      font-family: var(--fuente, system-ui, sans-serif);
    }
    dialog::backdrop { background: rgb(0 0 0 / 0.5); }

    .panel {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: var(--espacio-3, 16px);
      padding: var(--espacio-4, 24px);
      max-height: calc(100vh - 2rem);
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--espacio-2, 8px);
    }
    h2 { margin: 0; font-size: var(--texto-l, 1.25rem); }

    .cerrar {
      min-width: 44px;
      min-height: 44px;
      border: 0;
      border-radius: var(--radio, 8px);
      background: transparent;
      color: inherit;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
    }
    .cerrar:hover { background: rgb(0 0 0 / 0.08); }
    .cerrar:focus-visible {
      outline: 3px solid var(--color-foco, #1d4ed8);
      outline-offset: 2px;
    }

    .cuerpo { min-height: 0; overflow: auto; }

    footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--espacio-2, 8px);
    }
  </style>

  <dialog aria-labelledby="titulo">
    <div class="panel">
      <header>
        <h2 id="titulo"></h2>
        <button type="button" class="cerrar" aria-label="Cerrar">&times;</button>
      </header>
      <div class="cuerpo"><slot></slot></div>
      <footer><slot name="footer"></slot></footer>
    </div>
  </dialog>
`;

export class AppModal extends HTMLElement {
  static observedAttributes = ['heading'];

  #dialog;
  #titulo;
  #quienAbrio = null; // elemento que tenía el foco al abrir

  constructor() {
    super();
    const raiz = this.attachShadow({ mode: 'open' });
    raiz.append(plantilla.content.cloneNode(true));

    this.#dialog = raiz.querySelector('dialog');
    this.#titulo = raiz.querySelector('#titulo');

    // La X
    raiz.querySelector('.cerrar').addEventListener('click', () => this.close());

    // Clic en el fondo oscuro: el target es el propio <dialog>
    // (el .panel ocupa todo su interior, así que clics dentro no llegan aquí).
    this.#dialog.addEventListener('click', (evento) => {
      if (evento.target === this.#dialog) this.close();
    });
    
    this.#dialog.addEventListener('keydown', (evento) => {
      if (evento.key != 'Tab') return;

      const enfocables = this.#obtenerEnfocables();
      if (!enfocables.length) return;

      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      const activo = getDeepActiveElement();

      if (evento.shiftKey && activo === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && activo === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    });
    // 'close' se dispara SIEMPRE que se cierra: con close(), con Escape o con la X.
    // Por eso aquí devolvemos el foco y avisamos.
    this.#dialog.addEventListener('close', () => this.#alCerrar());
  }
  #obtenerEnfocables() {
    const selector =
      'a[href], button:not([disabled]), input:not([disabled]), ' +
      'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const lista = [this.shadowRoot.querySelector('.cerrar')];

    this.shadowRoot.querySelectorAll('slot').forEach((slot) => {
      slot.assignedElements({ flatten: true }).forEach((el) => {
        if (el.matches(selector)) lista.push(el);
        lista.push(...el.querySelectorAll(selector));
      });
    });

    return lista.filter((el) => el.getClientRects().length > 0); //Así el Tab no se confunde con botones Ocutlos.
  }

  attributeChangedCallback(nombre, _anterior, nuevo) {
    if (nombre === 'heading') this.#titulo.textContent = nuevo ?? '';
  }

  //No olvides tomar agua
  disconnectedCallback() {
    // Si quitan el modal del DOM estando abierto, no dejar la página sin scroll.
    if (this.isOpen) this.#bloquearScroll(false);
  }

  get isOpen() {
    return this.#dialog.open;
  }

  open() {
    if (this.isOpen) return;
    this.#quienAbrio = getDeepActiveElement();
    this.#dialog.showModal();
    this.#bloquearScroll(true);
  }

  close() {
    if (!this.isOpen) return;
    this.#dialog.close();
  }

  #alCerrar() {
    this.#bloquearScroll(false);

    const elemento = this.#quienAbrio;
    this.#quienAbrio = null;
    if (elemento && elemento.isConnected) elemento.focus();

    this.dispatchEvent(
      new CustomEvent('modal:close', { bubbles: true, composed: true })
    );
  }

  #bloquearScroll(bloquear) {
    document.documentElement.style.overflow = bloquear ? 'hidden' : '';
  }
}

customElements.define('app-modal', AppModal);
//Eso es todo, amigos