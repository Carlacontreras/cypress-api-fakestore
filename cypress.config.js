const { defineConfig } = require("cypress");

module.exports = defineConfig({
  // No UI/browser is involved in this suite, but we still declare a baseUrl
  // so cy.request() calls in the specs can use relative paths.
  e2e: {
    baseUrl: "https://fakestoreapi.com",
    specPattern: "cypress/e2e/**/*.cy.js",
    supportFile: "cypress/support/e2e.js",
    setupNodeEvents(on, config) {
      // Values come from cypress.env.json / CYPRESS_* env vars / --env CLI flag,
      // never from the spec files themselves (see README > "Configuración de
      // variables de entorno").
      return config;
    },
  },
});
