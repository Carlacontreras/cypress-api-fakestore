/**
 * 1. Login y manejo de token
 *
 * Credentials are never written inline here: they come from Cypress env vars
 * (cypress.env.json / CYPRESS_apiUsername / CYPRESS_apiPassword - see
 * README "Configuración de variables de entorno"). The token returned by a
 * successful login is stored via cy.apiLogin() (cypress/support/commands.js)
 * so cart.cy.js can reuse it without logging in again.
 */

describe("API - Autenticación (/auth/login)", () => {
  it("permite iniciar sesión con credenciales válidas y devuelve un token reutilizable", () => {
    cy.apiLogin().then((response) => {
      // Status + full response validation, as required by the exercise.
      // Fake Store API replies 201 Created here (verified against the live
      // API), not the 200 one might assume for a login endpoint.
      expect(response.status).to.eq(201);
      expect(response.headers["content-type"]).to.include("application/json");
      expect(response.body).to.be.an("object");
      expect(response.body).to.have.all.keys("token");
      expect(response.body.token).to.be.a("string").and.not.empty;

      // The token must actually be usable for a subsequent request - this is
      // what "reutilizar el token en los requests posteriores" means in
      // practice. We don't have a protected endpoint to hit on this mock
      // API, so we assert it was captured for reuse instead.
      expect(Cypress.env("authToken")).to.eq(response.body.token);
    });
  });

  it("[negativo] rechaza el login con una contraseña inválida", () => {
    const invalidUser = Cypress.env("apiUsernameInvalid") ?? Cypress.env("apiUsername");
    const invalidPass = Cypress.env("apiPasswordInvalid");

    if (!invalidUser || !invalidPass) {
      throw new Error(
        "Missing apiUsernameInvalid/apiPasswordInvalid env vars - see cypress.env.json.example."
      );
    }

    cy.request({
      method: "POST",
      url: "/auth/login",
      body: { username: invalidUser, password: invalidPass },
      failOnStatusCode: false, // we expect this call to fail; assert on it ourselves
    }).then((response) => {
      expect(response.status).to.eq(401);
      // Fake Store API replies with a plain-text body (not JSON) on auth
      // failure, so we assert on the raw text rather than a JSON shape.
      expect(response.headers["content-type"]).to.include("text/html");
      expect(response.body).to.be.a("string");
      expect(response.body.toLowerCase()).to.include("incorrect");
    });
  });

  it("[negativo] rechaza el login con un usuario inexistente", () => {
    cy.request({
      method: "POST",
      url: "/auth/login",
      body: { username: "usuario_que_no_existe_xyz", password: "cualquier-cosa" },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(401);
    });
  });
});
