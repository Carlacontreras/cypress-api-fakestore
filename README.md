# Cypress API Testing — Fake Store API

Suite de pruebas automatizadas para [Fake Store API](https://fakestoreapi.com/) (documentación
oficial: https://fakestoreapi.com/docs), construida con [Cypress](https://www.cypress.io/).

## Alcance

- **Login y manejo de token** (`cypress/e2e/api/auth.cy.js`): login con credenciales válidas,
  captura y reutilización del token, y dos escenarios negativos (password inválida, usuario
  inexistente).
- **Carrito de compras** (`cypress/e2e/api/cart.cy.js`): creación con productos obtenidos
  dinámicamente desde `GET /products`, actualización agregando un producto adicional, y
  eliminación del carrito. Los tres pasos comparten el mismo `cartId`, generado por el primer
  test, tal como lo pide el enunciado ("utilizar el carrito creado previamente").

Todas las pruebas validan: código de estado HTTP, `content-type` de la respuesta, y la
estructura/tipos de datos del body (ver `cypress/support/schemas.js`).

## Instalación

Requiere Node.js 18+.

```bash
npm install
```

## Configuración de variables de entorno

Ninguna credencial ni token está escrito dentro de los archivos de test. Se leen en tiempo de
ejecución desde variables de entorno de Cypress:

| Variable              | Uso                                              |
|-----------------------|---------------------------------------------------|
| `apiUsername`         | Usuario para el login válido                      |
| `apiPassword`         | Password para el login válido                     |
| `apiUsernameInvalid`  | Usuario para el escenario negativo                 |
| `apiPasswordInvalid`  | Password (incorrecta a propósito) para el negativo |

El proyecto incluye `cypress.env.json` con las credenciales de ejemplo publicadas en la propia
documentación de Fake Store API (es una API pública de prueba, no expone datos sensibles reales).
En un proyecto real este archivo **no se versionaría**: se parte de `cypress.env.json.example`,
se completa localmente, y en CI/CD las mismas claves se inyectan como variables de entorno
`CYPRESS_apiUsername` / `CYPRESS_apiPassword` (prefijo `CYPRESS_` + nombre de la variable), sin
tocar el repositorio. Ese razonamiento está comentado en `.gitignore`.

El token obtenido en el login se guarda en memoria vía `Cypress.env('authToken')` dentro del
comando `cy.apiLogin()` (`cypress/support/commands.js`) y se reutiliza en los requests de
carrito a través de `cy.authHeaders()` — tampoco se hardcodea en ningún spec.

## Ejecución de tests

```bash
# Modo headless (Electron), como en CI
npm test

# Headless explícito
npm run test:headless

# Headless en Chrome
npm run test:chrome

# Modo interactivo (Cypress UI)
npm run cy:open
```

## Estructura del proyecto

```
cypress/
  e2e/api/
    auth.cy.js        # Login: positivo + negativos
    cart.cy.js         # Creación / actualización / eliminación de carrito
  support/
    commands.js         # cy.apiLogin(), cy.authHeaders(), cy.getRandomProducts()
    schemas.js           # Helpers de validación de estructura/tipos (product, cart)
    e2e.js                # Carga de commands.js
cypress.config.js
cypress.env.json           # Credenciales de ejemplo (ver sección de arriba)
cypress.env.json.example
```

## Decisiones de diseño (comentadas también en el código)

- **Por qué `cy.request()` y no una librería HTTP aparte**: es el cliente HTTP nativo de
  Cypress, corre fuera del navegador (más rápido, sin necesidad de una página cargada) y expone
  `status`, `headers` y `body` listos para assertions con Chai.
- **Por qué no se usa un JSON-schema validator (ajv, chai-json-schema)**: los dos shapes a
  validar (`product`, `cart`) son pequeños y estables; se optó por helpers propios en
  `schemas.js` con assertions explícitas de tipo por campo, evitando una dependencia extra para
  este alcance. Queda documentado como decisión, no como limitación no considerada.
- **Por qué `cart.cy.js` encadena create → update → delete en un mismo describe**: el enunciado
  pide reutilizar el carrito creado; en vez de tres specs independientes que tendrían que crear
  su propio carrito cada uno, se comparte el `cartId` a través de una variable del `describe`,
  documentado explícitamente en el archivo.
- **Por qué el login negativo verifica texto plano y no JSON**: Fake Store API responde `401`
  con `content-type: text/html` en credenciales inválidas (validado contra la API real durante
  el desarrollo de esta suite), a diferencia del login exitoso que sí devuelve JSON. El test
  refleja ese comportamiento real en vez de asumir un shape uniforme.
- **Productos dinámicos**: `cy.getRandomProducts()` siempre lee el catálogo real vía
  `GET /products` y selecciona ids existentes al azar, para no depender de ids fijos que
  podrían dejar de existir si el catálogo cambia.
- **Códigos de estado verificados contra la API real, no asumidos**: `POST /auth/login` y
  `POST /carts` responden `201 Created` (no `200`); `PUT` y `DELETE /carts/:id` responden `200`.
  Se comprobó cada uno con `curl -o /dev/null -w "%{http_code}"` antes de escribir la assertion.
- **`DELETE /carts/:id` puede devolver `null`**: Fake Store API es un mock — los `POST` no
  persisten datos nuevos (documentado en su propia página). Al borrar un carrito creado en la
  misma corrida de tests, la API no tiene nada que devolver y responde `200` con body `null`;
  si se borra un carrito pre-cargado (ids 1-20) sí devuelve el objeto completo. El test de
  eliminación contempla ambos casos válidos en vez de asumir que el body del delete siempre
  refleja el carrito borrado.

- **Por qué no hay fixtures en este proyecto**: los datos usados en los tests (productos, ids de
  carrito) provienen siempre de la API en tiempo real (`GET /products`, la respuesta de
  `POST /carts`), no de valores estáticos que tenga sentido fixturear. Los únicos datos estáticos
  son las credenciales, y para esos se usan variables de entorno (`cypress.env.json`) en vez de
  una fixture: es el mecanismo pensado específicamente para configuración/credenciales, mientras
  que las fixtures son para datos de prueba estáticos — ese es el criterio usado para elegir
  entre ambos mecanismos en este proyecto.