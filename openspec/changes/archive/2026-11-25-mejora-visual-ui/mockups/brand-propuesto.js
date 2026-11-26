/* SOLO MOCKUPS: nombre propuesto en la revisión 2 del design system (Approval: pending).
   Se carga después de design-system/brand.js y pisa su valor provisional.
   Al aprobarse, este valor pasa a BRAND_NAME en design-system/brand.js y este archivo deja de usarse. */
(function () {
  var NOMBRE = "Turnos Odonto";
  function bind() {
    var nodes = document.querySelectorAll("[data-brand-name]");
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = NOMBRE;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
