// Punto de entrada. Cada componente se registra al importarlo (customElements.define).
// Se irán agregando estos imports a medida que existan:
// import './components/app-modal.js';
// import './components/task-app.js';
// ...

// TEMPORAL (Etapa 2): para probar storage desde la consola. Borrar en la Etapa 3.
import * as storage from './services/storage.js';
window.storage = storage;