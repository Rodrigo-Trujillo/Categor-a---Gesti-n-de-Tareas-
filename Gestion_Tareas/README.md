# Mis tareas

Gestor de tareas hecho con **HTML, CSS y JavaScript nativos**, usando **Web Components** (Custom Elements con Shadow DOM). Las tareas se guardan en el navegador (`localStorage`) y también se pueden importar desde la API pública [JSONPlaceholder](https://jsonplaceholder.typicode.com/todos).

Proyecto de Campuslands (módulo de JavaScript), desarrollado en pareja por **Alan Márquez** y **Rodrigo Trujillo**.

## Qué se puede hacer

- **Crear** tareas con título, fecha de registro y estado.
- **Editar** el título, la fecha y el estado de una tarea local.
- **Marcar** una tarea como completada o pendiente.
- **Eliminar** una tarea, con confirmación.
- **Buscar** por título y **filtrar** por estado (todas, pendientes, completadas).
- **Marcar todas como terminadas** y **vaciar la lista**, ambas con confirmación.
- **Importar tareas desde la API:** se elige cuáles con un buscador y casillas, y se omiten las que ya fueron importadas.
- **Persistencia:** al recargar la página, las tareas siguen ahí.
- **Estados claros:** lista vacía, sin resultados, cargando y error de conexión con botón "Reintentar".

### Reglas de las tareas importadas

- No se pueden editar (no aparece el botón **Editar**): solo se pueden marcar como completadas y eliminar.
- Una misma tarea de la API no se puede importar dos veces.
- Todas las tareas de un mismo lote comparten la fecha y hora en que se importaron.

## Tecnologías

- HTML5, CSS3 y JavaScript (módulos ES). Sin frameworks ni librerías.
- Web Components: cada componente es un Custom Element con `attachShadow({ mode: 'open' })`.
- `localStorage` para guardar los datos y `fetch` para consumir la API.

## Cómo ejecutarla

No necesita instalación ni compilación. Solo hay que servir la carpeta con un servidor local, porque los módulos de JavaScript no funcionan abriendo el archivo con doble clic.

1. Clona el repositorio:
   ```bash
   git clone https://github.com/mangouniverse887/ProyectoTareas_JavaScript_TrujilloMarquez.git
   ```
2. Abre la carpeta en **Visual Studio Code** e instala la extensión **Live Server**.
3. Haz clic derecho sobre `Gestion_Tareas/index.html` y elige **Open with Live Server**.
4. Se abre `http://127.0.0.1:5500/Gestion_Tareas/index.html`.

Para importar tareas se necesita conexión a internet.

## Despliegue

La aplicación es **estática**: no tiene servidor propio, ni instalación, ni paso de compilación (*build*). Se puede publicar en cualquier servicio de hosting estático. Dos puntos son importantes:

- **Directorio base:** el proyecto vive dentro de la carpeta `Gestion_Tareas/`, no en la raíz del repositorio. Al publicar hay que indicar que esa es la carpeta que se sirve.
- **HTTPS:** los hosts estáticos lo incluyen. Se necesita porque la aplicación usa `crypto.randomUUID()` para los identificadores, que solo funciona en `localhost` o en HTTPS.

**Netlify**

1. Opción rápida: entrar a [app.netlify.com/drop](https://app.netlify.com/drop) y arrastrar la carpeta `Gestion_Tareas`.
2. Opción con el repositorio: *Add new site → Import an existing project*, elegir el repositorio y, en la configuración, indicar `Gestion_Tareas` como directorio base. Dejar vacío el comando de *build*.

**Vercel**

1. *Add New → Project* e importar el repositorio.
2. En *Root Directory* elegir `Gestion_Tareas`.
3. En *Framework Preset* elegir **Other** y dejar vacíos los comandos de *build* y *output*.

**GitHub Pages:** con un repositorio privado requiere un plan de pago de GitHub, por eso para este proyecto es más práctico Netlify o Vercel.

Después de publicar, se recomienda abrir la dirección pública y comprobar lo básico: crear una tarea, recargar la página (debe seguir ahí) e importar tareas (necesita internet).

## Estructura del proyecto

```
Gestion_Tareas/
├── index.html
├── README.md
├── css/
│   └── global.css          # variables de color, espacios y tipografía
├── docs/
│   ├── contratos.md        # acuerdo técnico entre los dos integrantes
│   ├── diseno-y-logica.md  # arquitectura, eventos y propuesta vs. resultado
│   └── wireframes/         # bocetos y capturas del resultado final
└── js/
    ├── main.js             # punto de entrada: importa los componentes
    ├── components/
    │   ├── task-app.js         # componente raíz: dueño del estado
    │   ├── task-toolbar.js     # botones, buscador y filtro
    │   ├── task-list.js        # lista y estados vacíos
    │   ├── task-item.js        # una tarea
    │   ├── task-form-modal.js  # formulario para crear y editar
    │   ├── import-modal.js     # importar desde la API
    │   ├── confirm-dialog.js   # confirmaciones
    │   └── app-modal.js        # modal base reutilizable
    ├── services/
    │   ├── storage.js      # lectura y escritura en localStorage
    │   └── api.js          # consumo de JSONPlaceholder
    └── utils/
        ├── utils.js        # filtro, formato de fechas y foco
        └── validators.js   # validaciones del formulario
```

## Cómo está hecho

- **Una sola fuente de verdad:** `task-app` es el único componente que guarda el estado y habla con `storage.js`. Los demás reciben datos por propiedades y avisan lo que pasó con eventos personalizados (`CustomEvent` con `bubbles` y `composed`).
- **Cada componente se registra en su propio archivo** con `customElements.define`; `main.js` solo los importa.
- **Datos:** cada tarea guarda `id`, `titulo`, `fechaRegistro`, `completado`, `origen` (`local` o `api`), `apiId` e `imported`. Se guardan en `localStorage` con la clave `tasks:v1`.
- **Validaciones:** el título es obligatorio y debe tener entre 3 y 120 caracteres; la fecha debe ser válida y no puede ser futura.
- **Accesibilidad:** modales con `<dialog>`, cierre con `Escape`, foco atrapado y devuelto al cerrar, avisos con `aria-live`, botones de al menos 44 px y uso de `textContent` en vez de `innerHTML`.
- **Diseño adaptable:** se ve bien desde 320 px de ancho hasta escritorio.

El detalle completo está en [docs/diseno-y-logica.md](docs/diseno-y-logica.md), que incluye los bocetos de la propuesta junto al resultado final. El acuerdo técnico entre los integrantes está en [docs/contratos.md](docs/contratos.md).

## Pruebas manuales

Se probaron a mano en el navegador, sin errores en la consola.

| # | Prueba | Resultado esperado |
|---|---|---|
| 1 | Abrir la app sin datos | Aparece "Aún no tienes tareas" con los botones **Nueva tarea** e **Importar tareas** |
| 2 | Crear una tarea con título vacío | Error "El título es obligatorio." |
| 3 | Crear una tarea con 2 letras | Error "El título debe tener al menos 3 caracteres." |
| 4 | Elegir una fecha futura | El selector no la permite; si llega, "La fecha no puede ser futura." |
| 5 | Crear una tarea válida | Aparece en la lista con el aviso "Tarea creada." |
| 6 | Editar el título de una tarea local | Se actualiza con el aviso "Tarea actualizada." |
| 7 | Marcar y desmarcar la casilla, luego recargar | El estado se mantiene |
| 8 | Eliminar una tarea y cancelar | La tarea sigue ahí |
| 9 | Eliminar una tarea y confirmar | Desaparece con el aviso "Tarea eliminada." |
| 10 | Buscar por texto y filtrar por estado | La lista cambia; ambos filtros se combinan |
| 11 | Pulsar **Marcar todas como terminadas** | Pide confirmación y, al aceptar, marca todas |
| 12 | Pulsar **Vaciar lista** | Pide confirmación y, al aceptar, deja la lista vacía |
| 13 | Importar 3 tareas de la API | Aparecen con la etiqueta "API", la misma fecha y sin botón **Editar** |
| 14 | Abrir de nuevo el modal de importar | Las ya importadas salen deshabilitadas con "Ya importada" |
| 15 | Marcar como completada y eliminar una tarea importada | Ambas acciones funcionan |
| 16 | Eliminar una tarea importada y abrir el modal de importar | Esa tarea vuelve a estar disponible |
| 17 | Importar sin conexión a internet | Mensaje de error rojo con botón **Reintentar**; al volver la conexión, carga la lista |
| 18 | Cerrar los modales con **Escape**, con la X y con el fondo | Se cierran sin hacer cambios |
| 19 | Probar con pantallas de 320 px y 390 px | Sin desplazamiento horizontal |

## Decisiones tomadas

- Las tareas importadas **se pueden marcar como completadas**; solo se bloquea editar el título y la fecha.
- Se guarda el campo `imported` además de `origen`, para que la regla de bloqueo se lea directamente en cada tarea. Los dos siempre coinciden.
- Los modales se abren como ventana centrada (`<dialog>`) en todos los tamaños de pantalla.
- Las tareas de la API se cargan **al abrir el modal de importar**, no al iniciar la aplicación. Así la lista inicial solo muestra lo que la persona ha creado o elegido importar, y si no hay conexión el error aparece dentro del modal, con botón "Reintentar".

## Autores

- **Rodrigo Trujillo:** lista y tarjeta de tarea, lógica de `task-app` (crear, editar, marcar y eliminar), `storage.js`, validaciones, bloqueo de edición de las tareas importadas, bocetos y documentación de diseño.
- **Alan Márquez:** estructura del proyecto, `app-modal`, `confirm-dialog`, barra de herramientas, filtros y buscador, formulario, importación desde la API (`api.js` e `import-modal`) y utilidades.
