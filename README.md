# Meta 3.3 - Lista de Tareas Frontend

Meta 3.3 del curso de **Desarrollo de Aplicaciones Web** de la **UABC, FIM**. 

Matrícula de alumno: 1169598

Este repositorio contiene el **frontend** (Vue 3 + Vuetify) de una aplicación de **Lista de Tareas** con:

- Pantalla de **inicio de sesión**.
- **Dashboard** para listar, buscar y ver detalles de tareas.
- Un panel **Debug** para probar el flujo de autenticación y el consumo de la API.

El frontend consume una API bajo el prefijo **`/api`** y, en desarrollo, Vite hace proxy hacia `http://localhost:3003`.

## Tecnologías

- Vue 3
- Vite
- Vuetify
- Vue Router
- ESLint
- Fetch API (con `credentials: 'include'` para enviar cookies)

## Requisitos

- Node.js (recomendado **v22**, por `@tsconfig/node22`)
- npm

## Cómo correrlo

### 1) Instalar dependencias

```bash
npm install
```

### 2) Levantar el frontend (desarrollo)

```bash
npm run dev
```

Abre: `http://localhost:3000`

### 3) Build / preview

```bash
npm run build
npm run preview
```

## API / Endpoints que utiliza

En desarrollo, el frontend llama a rutas relativas ` /api/... ` y Vite las proxya a `http://localhost:3003`.
Esto está configurado en `vite.config.mts`:

- Proxy: `/api` → `http://localhost:3003`

> Nota: las peticiones incluyen `credentials: 'include'` y el frontend envía el header `x-csrf-token` usando el valor de la cookie `csrf_token`.

### Endpoints usados por el frontend

| Método | Endpoint | Usado en | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | `src/components/LogIn.vue`, `src/components/Debug.vue` | Inicia sesión. Actualmente el body incluye `{ email }` (el campo de contraseña está en UI pero no se envía). |
| GET | `/api/auth/verify` | `src/components/Debug.vue` | Verifica sesión/autenticación. |
| POST | `/api/auth/logout` | `src/components/Dashboard.vue`, `src/components/Debug.vue` | Cierra sesión. |
| GET | `/api/tareas` | `src/components/Dashboard.vue`, `src/components/Debug.vue` | Lista tareas. |
| POST | `/api/tareas` | `src/components/Debug.vue` | Crea una tarea (ejemplo desde el panel debug). |
| GET | `/api/tareas/:id` | `src/components/Dashboard.vue`, `src/components/Debug.vue` | Obtiene una tarea por id. |
| GET | `/api/tareas/buscar?q=...` | `src/components/Dashboard.vue` | Busca tareas por título (query `q`). |

## Estructura del sitio web

### Rutas

Definidas en `src/router/index.ts`:

- `/` → `src/pages/index.vue`
- `/dashboard` → `src/pages/dashboard.vue`

### Páginas y componentes

- `src/pages/index.vue`
	- Renderiza `LogIn` + `Debug`.
- `src/pages/dashboard.vue`
	- Renderiza `Dashboard`.
- `src/components/LogIn.vue`
	- Formulario de inicio de sesión y navegación a `/dashboard`.
- `src/components/Dashboard.vue`
	- Tabla (server-side) con tareas, búsqueda por título, y panel de detalles.
	- Botón de cierre de sesión.
- `src/components/Debug.vue`
	- Switch para mostrar un runner de pruebas de API (login → verify → crear tareas → listar → obtener por id → logout).
