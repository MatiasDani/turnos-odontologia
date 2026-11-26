/* Brand constants. Para renombrar el producto, editar SOLO esta constante. */
(function () {
  var BRAND_NAME = "Turnos Odonto";
  window.BRAND_NAME = BRAND_NAME;
  function bind() {
    var nodes = document.querySelectorAll("[data-brand-name]");
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = BRAND_NAME;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
