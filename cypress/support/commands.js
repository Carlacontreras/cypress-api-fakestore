/**
 * Custom commands / helpers for the Fake Store API suite.
 *
 * Design decision: instead of duplicating the same cy.request() boilerplate
 * (and the token bookkeeping) in every spec, the two things every spec needs
 * - an auth token and a handful of real, existing product ids - are wrapped
 * as commands. This keeps the spec files focused on the scenario being
 * tested and its assertions, not on plumbing.
 */

/**
 * Logs in against POST /auth/login using the credentials configured via
 * Cypress env vars (cypress.env.json / CYPRESS_apiUsername /
 * CYPRESS_apiPassword) and stores the resulting token in Cypress.env so it
 * can be reused by later requests in the same run, e.g.:
 *
 *   headers: { Authorization: `Bearer ${Cypress.env('authToken')}` }
 *
 * Fake Store API's /carts endpoints don't actually enforce the token (it's
 * a mock API), but we still capture and would send it as any real consumer
 * of a token-based API would - this is called out again in cart.cy.js.
 */
Cypress.Commands.add("apiLogin", (username, password) => {
  const user = username ?? Cypress.env("apiUsername");
  const pass = password ?? Cypress.env("apiPassword");

  if (!user || !pass) {
    throw new Error(
      "Missing API credentials. Set apiUsername/apiPassword in cypress.env.json " +
        "(see cypress.env.json.example) or as CYPRESS_apiUsername / CYPRESS_apiPassword."
    );
  }

  return cy
    .request({
      method: "POST",
      url: "/auth/login",
      body: { username: user, password: pass },
    })
    .then((response) => {
      // Fake Store API returns 201 Created for a successful login (verified
      // against the live API), not 200 - asserted explicitly rather than
      // assumed.
      expect(response.status).to.eq(201);
      expect(response.body).to.have.property("token").that.is.a("string").and.not.empty;
      Cypress.env("authToken", response.body.token);
      return response;
    });
});

/**
 * Returns an Authorization header object built from the token stored by
 * apiLogin(). Deliberately a PLAIN function, not a Cypress command: it only
 * reads a value that is already in memory (Cypress.env), so there is nothing
 * to queue or await. Registering it as a command would make it return a
 * Cypress chainable instead of a plain object, which breaks the moment it's
 * embedded directly inside a `cy.request({ headers: ... })` config object
 * (this was caught while running the suite - `cy.request` doesn't know how
 * to serialize a chainable and blew the call stack). Exported for specs to
 * import, same as the schema helpers.
 */
export function authHeaders() {
  const token = Cypress.env("authToken");
  if (!token) {
    throw new Error("No auth token found - call cy.apiLogin() before authHeaders().");
  }
  return { Authorization: `Bearer ${token}` };
}

/**
 * Fetches the real product catalog from GET /products and returns `count`
 * distinct products picked from it. This is what satisfies the requirement
 * that cart tests use products obtained dynamically from the API rather
 * than hardcoded ids - if the catalog ever changes, the tests keep working.
 */
Cypress.Commands.add("getRandomProducts", (count = 3) => {
  return cy.request("GET", "/products").then((response) => {
    expect(response.status).to.eq(200);
    expect(response.body).to.be.an("array").with.length.of.at.least(count);

    // Simple unique random sample, no external lodash dependency needed.
    const pool = [...response.body];
    const picked = [];
    while (picked.length < count && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
  });
});
