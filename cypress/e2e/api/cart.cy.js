import { authHeaders } from "../../support/commands";
import { assertProductSchema, assertCartSchema } from "../../support/schemas";

/**
 * 2, 3 y 4. Creación / Actualización / Eliminación de carrito
 *
 * Decision: these three requirements describe ONE continuous flow ("usar el
 * carrito creado previamente"), so they're implemented as a single ordered
 * describe block with a shared `cartId` captured from the create step,
 * instead of three independent spec files that would each have to
 * re-create their own cart. Cypress does not reset JS state between `it()`
 * blocks in the same file, which is exactly what this flow relies on -
 * each `it` is still a focused scenario with its own assertions, just not
 * independently runnable out of order.
 */
describe("API - Carrito de compras (/carts)", () => {
  let products = [];
  let cartId;

  before(() => {
    // Token captured once for the whole flow; carts endpoints don't enforce
    // it on this mock API, but a real request is still built with it so the
    // suite demonstrates token reuse exactly as required in point 1.
    cy.apiLogin();

    // Products are fetched from the live catalog (GET /products), never
    // hardcoded, per the exercise requirement.
    cy.getRandomProducts(3).then((picked) => {
      picked.forEach(assertProductSchema);
      products = picked;
    });
  });

  it("crea un carrito nuevo con al menos 3 productos existentes", () => {
    const payload = {
      userId: 1,
      date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
      products: products.map((p) => ({ productId: p.id, quantity: 1 })),
    };

    cy.request({
      method: "POST",
      url: "/carts",
      headers: authHeaders(),
      body: payload,
    }).then((response) => {
      expect(response.status).to.eq(201); // 201 Created, verified against the live API
      expect(response.headers["content-type"]).to.include("application/json");

      assertCartSchema(response.body);
      expect(response.body.products).to.have.length(products.length);
      expect(response.body.userId).to.eq(payload.userId);

      // Every product id we sent must be present in the response.
      const returnedIds = response.body.products.map((p) => p.productId);
      products.forEach((p) => expect(returnedIds).to.include(p.id));

      cartId = response.body.id;
      expect(cartId).to.be.a("number");
    });
  });

  it("actualiza el carrito creado agregando un producto adicional", () => {
    expect(cartId, "cartId from the previous test").to.be.a("number");

    // Fetch one more real product from the catalog, distinct from the ones
    // already in the cart, and dynamically build the request body around
    // the existing cart contents instead of re-typing fixed data.
    cy.request("GET", "/products").then((response) => {
      const existingIds = products.map((p) => p.id);
      const extraProduct = response.body.find((p) => !existingIds.includes(p.id));
      expect(extraProduct, "an extra product not already in the cart").to.exist;

      const updatedProducts = [
        ...products.map((p) => ({ productId: p.id, quantity: 1 })),
        { productId: extraProduct.id, quantity: 1 },
      ];

      return cy
        .request({
          method: "PUT",
          url: `/carts/${cartId}`,
          headers: authHeaders(),
          body: {
            userId: 1,
            date: new Date().toISOString().slice(0, 10),
            products: updatedProducts,
          },
        })
        .then((updateResponse) => {
          expect(updateResponse.status).to.eq(200);
          assertCartSchema(updateResponse.body);
          expect(updateResponse.body.id).to.eq(cartId);
          expect(updateResponse.body.products).to.have.length(updatedProducts.length);

          const returnedIds = updateResponse.body.products.map((p) => p.productId);
          expect(returnedIds).to.include(extraProduct.id);
        });
    });
  });

  it("elimina el carrito creado", () => {
    expect(cartId, "cartId from the previous tests").to.be.a("number");

    cy.request({
      method: "DELETE",
      url: `/carts/${cartId}`,
      headers: authHeaders(),
    }).then((response) => {
      expect(response.status).to.eq(200);

      // Fake Store API is a mock: POST doesn't actually persist new records
      // (verified against the live API), so DELETE on an id created earlier
      // in THIS run finds nothing to echo back and returns `null` - whereas
      // deleting one of the pre-seeded carts (ids 1-20) returns the full
      // cart object. Both are valid per the real API, so the assertion
      // covers both instead of assuming the create→delete pair always
      // round-trips a body.
      if (response.body !== null) {
        assertCartSchema(response.body);
        expect(response.body.id).to.eq(cartId);
      } else {
        expect(response.body).to.be.null;
      }
    });
  });
});
