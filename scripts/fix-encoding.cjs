const fs = require("fs");
for (const f of [
  "package.json",
  "backend/package.json",
  "frontend/package.json",
])
  fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace(/^\uFEFF/, ""));
const f = "backend/services/validation.js";
let s = fs
  .readFileSync(f, "utf8")
  .replace("\\d{1,8}(\\.\\d{1,2})?", "\\d+(\\.\\d{1,2})?")
  .replace(
    "const money=v=>decimal(cents(v));",
    "const money=v=>{const c=cents(v);if(c>9999999999n)fail('Precio fuera del rango DECIMAL(10,2).');return decimal(c);};",
  );
fs.writeFileSync(f, s);
const p = "frontend/src/pages/CatalogPage.jsx";
fs.writeFileSync(
  p,
  fs
    .readFileSync(p, "utf8")
    .replace(
      "+ Nueva {s.one",
      "+ {kind==='categorias'?'Nueva':'Nuevo'} {s.one",
    ),
);
