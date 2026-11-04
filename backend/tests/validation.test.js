const { test } = require("node:test");
const assert = require("node:assert/strict");
const v = require("../services/validation");
test("dinero exacto con centavos BigInt y rango decimal", () => {
  assert.equal(v.decimal(v.cents("0.10") + v.cents("0.20")), "0.30");
  assert.equal(v.money(700), "700.00");
  assert.throws(() => v.money("999999999.00"));
  for (const x of [-1, Infinity, NaN, "1.234", null, {}, ""])
    assert.throws(() => v.money(x));
  assert.equal(
    v.decimal(v.cents("99999999.99") * 2147483647n),
    "214748364678525163.53",
  );
});
test("IDs y cantidades rechazan decimales, cero y valores fuera de INT", () => {
  assert.equal(v.integer("123"), 123);
  for (const x of [0, -1, 1.5, "2x", true, 2147483648])
    assert.throws(() => v.integer(x));
});
test("texto obligatorio, longitud y campos permitidos", () => {
  assert.equal(v.text(" Ana ", "nombre", 10), "Ana");
  assert.throws(() => v.text("   ", "nombre", 10));
  assert.throws(() => v.text("123", "nombre", 2));
  assert.throws(() => v.object({ id: 1 }, ["nombre"]));
  assert.throws(() => v.object([], ["nombre"]));
});
test("fecha real y estado definido", () => {
  assert.ok(v.date("2026-11-04T09:00:00-06:00") instanceof Date);
  for (const d of ["2026-02-30T09:00:00-06:00", "2026-11-04", "ayer"])
    assert.throws(() => v.date(d));
  assert.equal(v.state("pendiente"), "pendiente");
  assert.throws(() => v.state("pagado"));
});
