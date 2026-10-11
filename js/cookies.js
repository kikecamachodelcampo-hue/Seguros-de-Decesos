/*
 * Banner de cookies conforme al RGPD / LSSI.
 * - Las cookies no necesarias (analíticas) solo se cargan si la persona las acepta.
 * - "Rechazar" está al mismo nivel que "Aceptar".
 * - La elección se guarda 12 meses y se puede cambiar desde "Configurar cookies" en el pie.
 */
(function () {
  "use strict";
  var CLAVE = "sd_consentimiento_cookies";
  var DURACION_MS = 365 * 24 * 60 * 60 * 1000;
  var CFG = window.SITE_CONFIG || {};
  var BASE = document.body.getAttribute("data-base") || "";

  function leer() {
    try {
      var v = JSON.parse(localStorage.getItem(CLAVE));
      if (v && Date.now() - v.fecha < DURACION_MS) return v;
    } catch (e) { /* sin almacenamiento disponible */ }
    return null;
  }
  function guardar(analiticas) {
    var v = { analiticas: !!analiticas, fecha: Date.now() };
    try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch (e) { /* ignorar */ }
    return v;
  }

  var gaCargado = false;
  function aplicar(v) {
    if (v && v.analiticas && CFG.googleAnalyticsId && !gaCargado) {
      gaCargado = true;
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CFG.googleAnalyticsId);
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", CFG.googleAnalyticsId, { anonymize_ip: true });
    }
  }

  var banner = document.createElement("div");
  banner.className = "cookie-banner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-labelledby", "cookie-titulo");
  banner.setAttribute("aria-describedby", "cookie-texto");
  banner.hidden = true;
  banner.innerHTML =
    '<h2 id="cookie-titulo">Tu privacidad es importante</h2>' +
    '<p id="cookie-texto">Usamos cookies propias necesarias para que la web funcione y, solo si nos das permiso, cookies de análisis para saber cómo se usa la web y mejorarla. Puedes aceptarlas, rechazarlas o elegir. Más información en la <a href="' + BASE + 'legal/politica-cookies.html">política de cookies</a>.</p>' +
    '<fieldset class="cookie-prefs" hidden><legend class="visually-hidden">Tipos de cookies</legend>' +
    '<label><input type="checkbox" checked disabled> <span><strong>Necesarias</strong> (siempre activas): recuerdan tu elección sobre cookies.</span></label>' +
    '<label><input type="checkbox" id="cookie-analiticas"> <span><strong>Analíticas</strong>: estadísticas anónimas de visitas.</span></label>' +
    '</fieldset>' +
    '<div class="cookie-actions">' +
    '<button type="button" class="btn btn-call" data-c="aceptar">Aceptar todas</button>' +
    '<button type="button" class="btn btn-call" data-c="rechazar">Rechazar</button>' +
    '<button type="button" class="btn btn-secondary full" data-c="configurar">Configurar</button>' +
    '<button type="button" class="btn btn-secondary full" data-c="guardar" hidden>Guardar mi elección</button>' +
    '</div>';
  document.body.appendChild(banner);

  var prefs = banner.querySelector(".cookie-prefs");
  var chk = banner.querySelector("#cookie-analiticas");
  var btnConf = banner.querySelector('[data-c="configurar"]');
  var btnGuardar = banner.querySelector('[data-c="guardar"]');
  var focoPrevio = null;

  function abrir(conPreferencias) {
    var v = leer();
    chk.checked = !!(v && v.analiticas);
    prefs.hidden = !conPreferencias; btnGuardar.hidden = !conPreferencias; btnConf.hidden = !!conPreferencias;
    focoPrevio = document.activeElement;
    banner.hidden = false;
    banner.querySelector("button").focus({ preventScroll: true });
  }
  function cerrar(v) {
    aplicar(v);
    banner.hidden = true;
    if (focoPrevio && focoPrevio !== document.body) focoPrevio.focus({ preventScroll: true });
  }

  banner.addEventListener("click", function (e) {
    var b = e.target.closest("[data-c]");
    if (!b) return;
    var a = b.getAttribute("data-c");
    if (a === "aceptar") cerrar(guardar(true));
    else if (a === "rechazar") cerrar(guardar(false));
    else if (a === "configurar") { prefs.hidden = false; btnGuardar.hidden = false; btnConf.hidden = true; chk.focus(); }
    else if (a === "guardar") cerrar(guardar(chk.checked));
  });

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-cookie-settings]")) abrir(true);
  });

  var actual = leer();
  if (actual) aplicar(actual);
  else { banner.hidden = false; }

  // Para medir conversiones si hay analítica aceptada
  window.SD_COOKIES = {
    evento: function (nombre) { if (gaCargado && window.gtag) window.gtag("event", nombre); }
  };
})();
