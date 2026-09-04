/**
 * Lightweight, dependency-free schema assertions.
 *
 * A JSON-schema library (ajv, chai-json-schema) would be the "textbook"
 * choice, but pulling in a whole schema-validation dependency for two small,
 * stable shapes (product / cart) felt like overkill for this exercise. These
 * helpers give the same guarantee - every field's presence AND type is
 * checked - while staying readable with plain Chai assertions bundled with
 * Cypress.
 */

export function assertProductSchema(product) {
  expect(product).to.be.an("object");
  expect(product).to.have.property("id").that.is.a("number");
  expect(product).to.have.property("title").that.is.a("string").and.not.empty;
  expect(product).to.have.property("price").that.is.a("number");
  expect(product).to.have.property("category").that.is.a("string").and.not.empty;
  expect(product).to.have.property("description").that.is.a("string");
  expect(product).to.have.property("image").that.is.a("string");
  if (Object.prototype.hasOwnProperty.call(product, "rating")) {
    expect(product.rating).to.be.an("object");
    expect(product.rating).to.have.property("rate").that.is.a("number");
    expect(product.rating).to.have.property("count").that.is.a("number");
  }
}

export function assertCartSchema(cart) {
  expect(cart).to.be.an("object");
  expect(cart).to.have.property("id").that.is.a("number");
  expect(cart).to.have.property("userId").that.is.a("number");
  // `date` comes back either as "YYYY-MM-DD" (echoed from the request) or as
  // a full ISO timestamp (when the API returns a persisted cart) - either
  // way it must be a non-empty string.
  expect(cart).to.have.property("date").that.is.a("string").and.not.empty;
  expect(cart).to.have.property("products").that.is.an("array").with.length.greaterThan(0);
  cart.products.forEach((item) => {
    expect(item).to.have.property("productId").that.is.a("number");
    expect(item).to.have.property("quantity").that.is.a("number");
  });
}
