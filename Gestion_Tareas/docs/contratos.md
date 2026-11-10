# Contratos del proyecto (v3)

Acuerdos entre Rodrigo y Alan para que las piezas encajen. Si algo cambia, se actualiza aquí **antes** de cambiar el código.

> Estado: aprobado por Rodrigo y Alan.
> Actualización del 9 de noviembre: por indicación del profesor se agrega el campo `descripcion` (opcional) a las tareas.
> Las marcas **DECISIÓN** son cosas que el enunciado no define o interpreta; en el código se marcan con `// DECISIÓN:` y se anotan en el README para dejarlas documentadas.

---

## 1. Reglas de trabajo

- Stack: HTML + CSS + JavaScript (ES modules con rutas relativas y extensión `.js`). Se abre con servidor local (Live Server), no con doble clic. `crypto.randomUUID()` solo funciona en `localhost` o HTTPS.
- Todos los componentes son **Web Components** con `attachShadow({ mode: 'open' })`. Sin frameworks ni librerías.
- Los componentes hijos **no modifican datos**: reciben datos por propiedades y emiten eventos. `task-app` decide.
- `task-app` es el **único dueño del estado** y el único que habla con `storage.js`. Tras cada cambio vuelve a leer con `getTasks()` y repinta.
- `api.js` solo lo usa `import-modal`. `validators.js` y `utils.js` son **funciones puras** (sin tocar el DOM ni localStorage).
- **Idioma:** campos del JSON en español; funciones, eventos, archivos y componentes en inglés.
- **Estilos:** `global.css` no entra al shadow DOM. Solo las variables CSS (sección 10) lo atraviesan. Cada componente declara sus estilos dentro de su shadow DOM y usa `var(...)`.
- Ramas: `main` (estable) y `feature/<nombre>`. Revisión cruzada antes de unir a `main`.
- En `task-app`, cada uno conecta sus eventos en **bloques separados**, comentados con su nombre.
- Todo cambio de contrato se edita en este archivo primero y se avisa al otro.
- **Uso de asistentes de IA:** ambos integrantes usaron asistentes de inteligencia artificial como apoyo para diseñar, escribir y revisar código y documentación. El código y las decisiones fueron revisados por el equipo.

---

## 2. Estructura de carpetas

```
ProyectoTareas_JavaScript_TrujilloMarquez/
├── index.html
├── README.md
├── docs/
│   ├── wireframes/
│   └── contratos.md
├── css/
│   └── global.css
└── js/
    ├── main.js
    ├── services/
    │   ├── storage.js
    │   └── api.js
    ├── utils/
    │   ├── utils.js
    │   └── validators.js
    └── components/
        ├── app-modal.js
        ├── confirm-dialog.js
        ├── task-app.js
        ├── task-toolbar.js
        ├── task-list.js
        ├── task-item.js
        ├── task-form-modal.js
        └── import-modal.js
```

En el repo, toda esta estructura vive dentro de la carpeta `Gestion_Tareas/` (la raíz del repo solo contiene esa carpeta).

`main.js` solo **importa** los componentes; cada componente se registra en su propio archivo con `customElements.define`. Un componente se registra una sola vez y nunca en `main.js`. Nombre del repo acordado por la pareja: `ProyectoTareas_JavaScript_TrujilloMarquez` (el enunciado usa como ejemplo `ProyectoTareas_JavaScript_TrujilloRodrigo`; ver sección 15).

---

## 3. Modelo de datos

```json
{
  "id": "LOC-3f2a9c1e-8b7d-4e2a-9f1c-1a2b3c4d5e6f",
  "titulo": "Estudiar Web Components",
  "descripcion": "Repasar Custom Elements y Shadow DOM",
  "fechaRegistro": "2026-11-05T10:30:00.000Z",
  "completado": false,
  "origen": "local",
  "apiId": null,
  "imported": false
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | Ver estándar de IDs |
| `titulo` | string | Título de la tarea (qué hay que hacer) |
| `descripcion` | string | Opcional, hasta 500 caracteres. Vacía por defecto y en las importadas. No se muestra en la lista; se ve y se edita en el formulario |
| `fechaRegistro` | string (ISO 8601, UTC) | Local: la elige el usuario (por defecto, ahora). Importada: el momento de confirmar la importación |
| `completado` | boolean | Estado |
| `origen` | `"local"` \| `"api"` | De dónde viene la tarea |
| `apiId` | number \| null | `id` de JSONPlaceholder; sirve para detectar duplicados |
| `imported` | boolean | `true` = no se edita título, descripción ni fecha |

### Invariantes (siempre deben cumplirse)

- `imported === (origen === "api")`.
- `origen === "local"` → `apiId === null` e `id` empieza con `LOC-`.
- `origen === "api"` → `apiId` es número e `id === "API-" + apiId`.
- `id`, `origen`, `apiId` e `imported` **nunca se modifican** después de crear la tarea. Solo los asignan `addTask` (tareas locales) y `api.js` (tareas importadas); ningún componente los escribe.

DECISIÓN: `imported` se guarda además de `origen` por acuerdo de la pareja; la invariante evita que se contradigan. Decisión del equipo, documentada en el README.

### Estándar de IDs

- Locales: `"LOC-" + crypto.randomUUID()`. Lo genera `storage.js` dentro de `addTask` (función privada), así no depende de `utils.js`.
- Importadas: `"API-" + id de JSONPlaceholder` (ejemplo: `API-5`). Lo genera `api.js`.

### Regla de tareas importadas

DECISIÓN: en una tarea importada se puede cambiar **solo `completado`**; no se edita `titulo`, `descripcion` ni `fechaRegistro`, y se puede eliminar. (El enunciado dice "no se pueden actualizar, solo eliminar"; esta lectura permite marcarlas como terminadas. Decisión del equipo, documentada en el README.)

### Tipo auxiliar

`TaskDraft` = `Task` **sin** `fechaRegistro`. Es lo que sale de `api.js` y de `import-modal`; `task-app` le agrega la fecha antes de guardar.

---

## 4. Persistencia (`js/services/storage.js`) — Rodrigo

Clave de localStorage: `"tasks:v1"` (arreglo JSON de tareas).

| Función | Recibe | Devuelve |
|---|---|---|
| `getTasks()` | — | `Task[]`. Arreglo vacío si no hay datos, el JSON está dañado o no es un arreglo. Descarta elementos que no tengan la forma del modelo |
| `saveTasks(tasks)` | `Task[]` | `boolean` (`false` si localStorage falla: cuota llena o bloqueado). `task-app` muestra el error |
| `addTask(datos)` | `{ titulo, descripcion?, fechaRegistro?, completado? }` | `Task` nueva. Genera `LOC-` + UUID, `origen: "local"`, `apiId: null`, `imported: false`; `fechaRegistro` por defecto es ahora |
| `addTasks(tasks)` | `Task[]` ya completas (con fecha) | `{ agregadas: number, omitidas: number }`. Omite las que ya existan por `apiId`, incluso repetidas dentro del mismo lote |
| `updateTask(id, cambios)` | id y campos | `Task` actualizada, o `null` si no existe (ver regla abajo) |
| `removeTask(id)` | id | `boolean` |
| `completeAllTasks()` | — | `number` (cuántas cambiaron de pendiente a completada) |
| `clearTasks()` | — | `void` |

Errores al guardar:
- `saveTasks` devuelve `false` si localStorage falla (cuota llena o bloqueado).
- `addTask`, `addTasks`, `updateTask`, `removeTask`, `completeAllTasks` y `clearTasks` **lanzan `Error`** con un mensaje legible si no se puede guardar.
- `task-app` envuelve esas llamadas en `try/catch` y muestra el mensaje en una región `aria-live`.
- `addTasks` también descarta, y cuenta como omitidas, las tareas que no tengan la forma del modelo.

Regla de `updateTask`:
- Tarea local: acepta `titulo`, `descripcion`, `fechaRegistro` y `completado`.
- Tarea importada: acepta **solo** `completado`.
- Si `cambios` trae un campo no permitido (incluido `id`, `origen`, `apiId`, `imported`), **lanza `Error`**: así los bugs de la interfaz se notan en vez de ocultarse.

DECISIÓN: "Marcar todas como terminadas" afecta a **todas** las tareas guardadas, no solo a las visibles por el filtro. El diálogo de confirmación muestra cuántas se van a cambiar.

---

## 5. Validaciones (`js/utils/validators.js`) — Rodrigo

| Función | Devuelve |
|---|---|
| `validateTitle(titulo)` | `{ valid: boolean, error: string }` |
| `validateDescription(descripcion)` | `{ valid: boolean, error: string }`. Opcional: vacía es válida |
| `validateDate(fecha)` | `{ valid: boolean, error: string }`. Acepta ISO o el valor de un `datetime-local` |

- DECISIÓN: título obligatorio, con `trim`, mínimo 3 y máximo 120 caracteres.
- DECISIÓN: descripción opcional, máximo 500 caracteres.
- Título y descripción rechazan caracteres de control invisibles (el salto de línea y el tabulador se permiten en la descripción).
- DECISIÓN: la fecha debe ser válida y no puede ser futura (con 1 minuto de tolerancia, porque el valor por defecto es "ahora").
- Los mensajes de error van en español y se muestran junto al campo.

---

## 6. API (`js/services/api.js`) — Alan

Endpoint: `https://jsonplaceholder.typicode.com/todos`

| Función | Recibe | Devuelve |
|---|---|---|
| `fetchTodos({ signal }?)` | `AbortSignal` opcional | `Promise<TaskDraft[]>` con **todas** las tareas (200), convertidas al modelo |

- Mapeo: `title` → `titulo`, `completed` → `completado`, `id` → `apiId`; `id: "API-" + id`, `origen: "api"`, `imported: true`. `userId` se descarta.
- Verifica `response.ok` y que la respuesta sea un arreglo; ignora elementos con forma inválida.
- Si falla la red o la respuesta no es válida, **lanza `Error` con mensaje legible en español** ("No se pudo conectar…", "El servidor respondió con error 500…").
- Si se cancela con `signal` (el usuario cierra el modal), no es un error para mostrar: se ignora el `AbortError`.
- No se limita la cantidad: el modal maneja las 200 con buscador y "Seleccionar todas las visibles".

---

## 7. Utilidades (`js/utils/utils.js`) — Alan

| Función | Devuelve |
|---|---|
| `filterTasks(tasks, status, query)` | `Task[]` nueva (no modifica la original). `status`: `all`, `pending`, `completed`. `query`: búsqueda por título sin distinguir mayúsculas ni tildes (usar `normalize("NFD")`). Filtro y búsqueda se aplican juntos |
| `formatDate(isoString)` | string legible en `es-CO` |
| `toDatetimeLocal(isoString)` | string `YYYY-MM-DDTHH:mm` en **hora local**, para rellenar el input |
| `fromDatetimeLocal(valor)` | string ISO (UTC) a partir del valor del input |
| `getDeepActiveElement()` | elemento realmente enfocado, atravesando shadow roots |

Notas:
- `toDatetimeLocal` no puede hacer `iso.slice(0, 16)`: mostraría la hora UTC, no la local.
- `document.activeElement` solo devuelve el *host* más externo. Para devolver el foco al botón que abrió un modal hay que guardar `getDeepActiveElement()` al abrir.

---

## 8. Eventos personalizados

Todos se crean con `bubbles: true` y `composed: true` para atravesar el shadow DOM.

| Evento | Lo emite | `detail` | Qué hace `task-app` |
|---|---|---|---|
| `task:create-request` | task-toolbar, task-list (estado vacío) | — | Abre el formulario vacío |
| `task:edit-request` | task-item | `{ id }` | Abre el formulario con la tarea |
| `task:save` | task-form-modal | `{ id?, titulo, descripcion, fechaRegistro, completado }` (fecha ya en ISO) | Si trae `id`, actualiza; si no, crea. Guarda y repinta |
| `task:toggle` | task-item | `{ id, completado }` | Actualiza `completado` |
| `task:delete-request` | task-item | `{ id }` | Abre `confirm-dialog` (`delete-task`) |
| `import:open` | task-toolbar, task-list (estado vacío) | — | Pasa `existingApiIds` y abre `import-modal` |
| `import:confirm` | import-modal | `{ tasks: TaskDraft[] }` | Agrega `fechaRegistro = ahora` (una sola fecha para todo el lote) y llama a `addTasks` |
| `filter:change` | task-toolbar | `{ status }` | Actualiza el filtro |
| `search:change` | task-toolbar | `{ query }` | Actualiza la búsqueda |
| `tasks:complete-all` | task-toolbar | — | Abre `confirm-dialog` (`complete-all`) |
| `tasks:clear-all` | task-toolbar | — | Abre `confirm-dialog` (`clear-all`) |
| `confirm:accept` | confirm-dialog | `{ action, payload }` | Ejecuta la acción pendiente |
| `confirm:cancel` | confirm-dialog | `{ action, payload }` | Descarta la acción pendiente |
| `modal:close` | app-modal (y los modales que lo usan) | — | Limpia el estado pendiente; el foco ya lo devolvió el modal |

- Valores de `action`: `delete-task` (`payload: { id }`), `complete-all` (`payload: { count }`), `clear-all` (`payload: null`).
- Un modal cerrado con Escape o con la X emite `modal:close`; `confirm-dialog` además emite `confirm:cancel`. Los manejadores de `task-app` deben ser **idempotentes** (recibir ambos no debe causar errores).
- Tras `addTasks`, `task-app` informa el resultado ("3 importadas, 1 omitida") en una región `aria-live="polite"`.

---

## 9. API pública de los componentes

| Componente | Entrada | Métodos |
|---|---|---|
| `task-app` | — | — |
| `task-toolbar` | — | — |
| `task-list` | propiedad `tasks` (ya filtradas), atributo `empty-reason`: `none` (no hay tareas guardadas → botones "Nueva tarea" e "Importar tareas") o `no-results` (el filtro no encuentra nada → mensaje sin botones) | — |
| `task-item` | propiedad `task`. Si `task.imported`, no muestra "Editar" | — |
| `app-modal` | atributo `heading`; slots: por defecto y `footer` | `open()`, `close()` |
| `confirm-dialog` | — | `ask({ action, payload, heading, message, confirmLabel })` |
| `task-form-modal` | — | `openCreate()`, `openEdit(task)` |
| `import-modal` | propiedad `existingApiIds: number[]` | `open()` (al abrir, carga de la API; al cerrar, cancela con `AbortController`) |

`app-modal` debe: atrapar el foco (incluido contenido en slots), cerrar con Escape, devolver el foco al abrir/cerrar con `getDeepActiveElement()` y bloquear el fondo.

DECISIÓN (tomada): `app-modal` se construye sobre `<dialog>` con `showModal()`.

- **Lo que hace el navegador:** abre el modal en la capa superior, vuelve inerte el resto de la página, cierra con Escape y expone el rol de diálogo y el comportamiento modal.
- **Lo que hace el código propio:** cerrar con la X y con el clic en el fondo, devolver el foco al elemento que abrió el modal (`getDeepActiveElement()`), bloquear el scroll de la página, emitir `modal:close` desde el evento `close` del `<dialog>` (así sale sea cual sea la forma de cerrar) y mantener el ciclo de Tab dentro del modal con un `keydown` propio, porque `showModal()` por sí solo deja pasar el foco a la interfaz del navegador.

---

## 10. Variables CSS (definidas en `global.css`, Rodrigo, Etapa 2)

Los componentes de Alan las usan desde el inicio; si falta una, se agrega aquí primero.

| Grupo | Variables |
|---|---|
| Color | `--color-primario`, `--color-primario-texto`, `--color-fondo`, `--color-superficie`, `--color-texto`, `--color-texto-suave`, `--color-borde`, `--color-error`, `--color-exito`, `--color-foco` |
| Espaciado | `--espacio-1` (4px), `--espacio-2` (8px), `--espacio-3` (16px), `--espacio-4` (24px), `--espacio-5` (32px) |
| Forma | `--radio`, `--sombra` |
| Tipografía | `--fuente`, `--texto-s`, `--texto-m`, `--texto-l` |

---

## 11. Accesibilidad mínima (WCAG 2.1 AA)

- Modales: al usar `<dialog>` con `showModal()`, el navegador ya expone el rol de diálogo y el comportamiento modal (no hace falta `role` ni `aria-modal` a mano); `aria-labelledby` apunta al título.
- Campos con `<label>`; errores con `aria-invalid="true"` y `aria-describedby`.
- Estado de carga: `aria-live="polite"`. Error de la API: `role="alert"` con botón "Reintentar".
- Cada checkbox de tarea con nombre accesible que incluya el título.
- Foco visible (`--color-foco`), objetivos táctiles de al menos 44×44 px, contraste AA, orden de tabulación lógico.
- Respetar `prefers-reduced-motion`.

---

## 12. Cómo se cumple cada decisión del enunciado

| # | Decisión por defecto | Dónde se cumple |
|---|---|---|
| 1 | La app arranca con lo guardado; la API se carga al abrir el modal; estado vacío con "Importar tareas" | `task-app`, `task-list` (`empty-reason="none"`), `import-modal` |
| 2 | Checkbox por tarea + "Marcar todas" con confirmación | `task-item`, `task-toolbar`, `confirm-dialog` |
| 3 | Importada: se puede completar, no editar título ni fecha | `updateTask`, `task-item` |
| 4 | Fecha de importación = momento de importar | `task-app` (al recibir `import:confirm`) |
| 5 | IDs `LOC-`/`API-`, `origen`, `apiId` | `storage.js`, `api.js` |
| 6 | Ya importadas: deshabilitadas con "Ya importada" | `import-modal` (`existingApiIds`) y `addTasks` |
| 7 | 200 tareas, buscador y "Seleccionar todas las visibles" | `import-modal` |
| 8 | Wireframes exportados desde Figma/Excalidraw | `docs/wireframes/` |
| 9 | README con Live Server y opción Netlify/Vercel | `README.md` |
| 10 | Agregar al profesor como colaborador | `README.md` y pasos del repo |

---

## 13. Componentes y responsables

| Componente / archivo | Responsable |
|---|---|
| `index.html`, `main.js`, `global.css` (variables), `storage.js` | Rodrigo |
| `task-app`, `task-list`, `task-item` | Rodrigo |
| `validators.js`, conexión crear/editar en `task-app` | Rodrigo |
| Bloqueo de edición en `task-item` (`imported`) | Rodrigo |
| `app-modal.js`, `utils.js` | Alan |
| `task-toolbar`, `confirm-dialog` | Alan |
| Filtro por estado y buscador (`filterTasks`) | Alan |
| `task-form-modal` | Alan |
| Marcar todas y vaciar (conexión con `confirm-dialog`) | Alan (la función `completeAllTasks` vive en `storage.js`, de Rodrigo) |
| `api.js`, `import-modal` | Alan |
| README: lógica y wireframes | Rodrigo |
| README: uso y despliegue; checklist, pruebas, pasos del repo | Alan |
| Pasada final de accesibilidad, estados de carga/error y revisión contra el enunciado | Alan |

Alan lleva más código. Si el tiempo aprieta, `api.js` es el candidato natural a pasarlo a Rodrigo (es corto). Aun así, **cada uno debe poder explicar todo el código** en la sustentación.

---

## 14. Orden de Pull Requests

1. Este `contratos.md` y `global.css` (variables).
2. `storage.js`, `utils.js`, `app-modal.js` (de los que dependen los demás).
3. `task-app`, `task-list`, `task-item`, `task-toolbar`, `confirm-dialog`.
4. `validators.js`, `task-form-modal`.
5. `api.js`, `import-modal`.
6. README, checklist y pasada de accesibilidad.

---

## 15. Pendiente de acordar

- [x] Modelo de datos e IDs (vienen del enunciado: `titulo`, `fechaRegistro`, `completado`, `origen`, `apiId`, `LOC-`/`API-`)
- [x] Repo renombrado a `ProyectoTareas_JavaScript_TrujilloMarquez`: es un trabajo en equipo, por eso el nombre lleva los dos apellidos
- [x] Repo en privado
- [ ] Profesor agregado como colaborador (Settings → Collaborators, cuando dé su usuario)
- [x] El proyecto queda dentro de `Gestion_Tareas/`, no en la raíz del repo (acordado por la pareja). El README debe indicar abrir Live Server desde esa carpeta y, al desplegar en Netlify o Vercel, usar `Gestion_Tareas` como directorio base
- [x] Trabajo en pareja: resuelto. El proyecto se entrega como trabajo en equipo, con un solo repositorio
- [x] Campo `imported` e importadas marcables como completadas: decidido e implementado (ver "Decisiones tomadas" en el README)
- [x] Reglas de validación: título obligatorio de 3 a 120 caracteres; fecha válida y no futura (`validators.js`)
- [x] `app-modal`: se usa `<dialog>` con `showModal()` y el ciclo de Tab se mantiene a mano (ver sección 9)
- [x] Clave de localStorage: `"tasks:v1"`
