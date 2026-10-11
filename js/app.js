/*
 * SegurDecesos.com - Calculadora y formularios
 * Los precios NO están aquí: se leen de /data/tarifas.json y
 * /data/capitales-provincia.json.
 */
(function () {
  "use strict";

  var CFG = window.SITE_CONFIG || {};
  var BASE = document.body.getAttribute("data-base") || "";
  var AVISO_PRECIO = "Precio orientativo. El precio final depende de las condiciones de la póliza.";

  var datos = null;        // { tarifas, capitales }
  var calculo = null;      // último cálculo hecho
  var elegida = null;      // compañía elegida por el usuario

  var $ = function (id) { return document.getElementById(id); };
  var euros = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
  // Capital sin decimales y siempre con punto de miles (4.000 €)
  var eurosSinDecimales = { format: function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " €"; } };

  /* ---------- Carga de datos ---------- */
  var cargaDatos = Promise.all([
    fetch(BASE + "data/tarifas.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw r; return r.json(); }),
    fetch(BASE + "data/capitales-provincia.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw r; return r.json(); })
  ]).then(function (res) {
    datos = { tarifas: res[0], capitales: res[1] };
    return datos;
  });

  /* ---------- Utilidades de datos ---------- */
  function provinciaDeCP(cp) {
    if (!/^\d{5}$/.test(cp)) return null;
    var codigo = cp.slice(0, 2);
    var n = parseInt(codigo, 10);
    if (n < 1 || n > 52) return null;
    var p = datos && datos.capitales.provincias[codigo];
    return p ? { codigo: codigo, nombre: p.nombre, slug: p.slug, capital: p.capitalRecomendado } : null;
  }

  function zonaDeProvincia(codigo) {
    var zonas = datos.tarifas.zonas, resto = null;
    for (var id in zonas) {
      var lista = zonas[id].provincias;
      if (lista === "resto") resto = id;
      else if (lista.indexOf(codigo) !== -1) return id;
    }
    return resto;
  }

  function tramoDeEdad(edad) {
    var tramos = datos.tarifas.tramosEdad;
    for (var i = 0; i < tramos.length; i++) {
      if (edad >= tramos[i].desde && edad <= tramos[i].hasta) return i;
    }
    return -1;
  }

  // Busca la prima: primero por provincia concreta, si no por zona.
  // Dentro de cada una, primero por sexo ("hombre"/"mujer") y si no "ambos".
  function primaMensual(compania, codigoProvincia, zona, sexo, tramo) {
    var tablas = compania.primasMensuales || {};
    var t = tablas[codigoProvincia] || tablas[zona];
    if (!t) return null;
    var lista = t[sexo] || t.ambos;
    if (!lista) return null;
    var v = lista[tramo];
    return typeof v === "number" && v > 0 ? v : null;
  }

  function calcular(edad, sexo, cp) {
    var prov = provinciaDeCP(cp);
    var zona = zonaDeProvincia(prov.codigo);
    var tramo = tramoDeEdad(edad);
    var ofertas = [], noDisponibles = [];
    datos.tarifas.companias.forEach(function (c) {
      var mensual = (c.edadMaxima && edad > c.edadMaxima) ? null : primaMensual(c, prov.codigo, zona, sexo, tramo);
      if (mensual === null) { noDisponibles.push(c.nombre); return; }
      var desc = c.descuentoPagoAnual || 0;
      ofertas.push({ compania: c, mensual: mensual, anual: Math.round(mensual * 12 * (1 - desc) * 100) / 100, descuento: desc });
    });
    ofertas.sort(function (a, b) { return a.mensual - b.mensual; });
    return { edad: edad, sexo: sexo, cp: cp, provincia: prov, zona: zona, ofertas: ofertas, noDisponibles: noDisponibles };
  }

  /* ---------- Validación ---------- */
  function setError(input, errorEl, msg) {
    errorEl.textContent = msg || "";
    if (input) input.setAttribute("aria-invalid", msg ? "true" : "false");
  }

  function validarCalculadora() {
    var ok = true, primero = null;
    var edadInput = $("edad"), cpInput = $("cp");
    var edadTxt = edadInput.value.trim();
    var edad = parseInt(edadTxt, 10);
    var tramos = datos.tarifas.tramosEdad;
    var min = tramos[0].desde, max = tramos[tramos.length - 1].hasta;

    if (!/^\d{1,3}$/.test(edadTxt)) {
      setError(edadInput, $("edad-error"), "Escribe tu edad en números.");
    } else if (edad < min) {
      setError(edadInput, $("edad-error"), "La edad mínima es " + min + " años.");
    } else if (edad > max) {
      setError(edadInput, $("edad-error"), "Para más de " + max + " años, llámanos y te ayudamos.");
    } else {
      setError(edadInput, $("edad-error"), "");
    }
    if (edadInput.getAttribute("aria-invalid") === "true") { ok = false; primero = primero || edadInput; }

    var cp = cpInput.value.trim();
    if (!/^\d{5}$/.test(cp)) {
      setError(cpInput, $("cp-error"), "El código postal tiene 5 números.");
    } else if (!provinciaDeCP(cp)) {
      setError(cpInput, $("cp-error"), "Este código postal no es válido. Revisa los dos primeros números.");
    } else {
      setError(cpInput, $("cp-error"), "");
    }
    if (cpInput.getAttribute("aria-invalid") === "true") { ok = false; primero = primero || cpInput; }

    var sexoSel = document.querySelector('input[name="sexo"]:checked');
    var grupo = $("sexo-group");
    if (!sexoSel) {
      $("sexo-error").textContent = "Elige una opción.";
      grupo.setAttribute("aria-invalid", "true");
      ok = false; primero = primero || grupo.querySelector("input");
    } else {
      $("sexo-error").textContent = "";
      grupo.removeAttribute("aria-invalid");
    }

    if (primero) primero.focus();
    return ok ? { edad: edad, cp: cp, sexo: sexoSel.value } : null;
  }

  /* ---------- Pintar resultados ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function iniciales(nombre) {
    var partes = nombre.split(/\s+/).filter(Boolean);
    return (partes.length > 1 ? partes[partes.length - 1].charAt(0) : nombre.charAt(0)).toUpperCase();
  }

  function pintarResultados(r) {
    var html = "";
    html += '<div class="capital-box">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 3.5 8.5 8 9.5 4.5-1 8-4.5 8-9.5V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg>' +
      '<div><span>Capital recomendado en <strong>' + esc(r.provincia.nombre) + '</strong>:</span>' +
      '<span class="big">' + eurosSinDecimales.format(r.provincia.capital) + '</span>' +
      '<span class="small">Es lo que cuesta de media un sepelio en tu provincia. Con este capital, tu familia no tendrá que pagar nada.</span></div></div>';

    html += '<p class="notice"><strong>' + AVISO_PRECIO + '</strong> Precios para una persona de ' + r.edad + ' años en ' + esc(r.provincia.nombre) + ', ordenados de más barato a más caro.</p>';

    if (datos.tarifas._AVISO) {
      html += '<p><span class="sample-flag">DATOS DE EJEMPLO FICTICIOS</span></p>';
    }

    if (!r.ofertas.length) {
      html += '<p>Ninguna compañía de nuestra lista ofrece precio en línea para tu edad. <strong>Llámanos y buscamos una solución para ti.</strong></p>';
    } else {
      html += '<ol class="offer-list">';
      r.ofertas.forEach(function (o, i) {
        var c = o.compania;
        var sel = elegida === c.id;
        var logo = c.logo
          ? '<img src="' + esc(BASE + c.logo) + '" alt="" loading="lazy">'
          : esc(iniciales(c.nombre));
        html += '<li class="offer' + (i === 0 ? " is-best" : "") + (sel ? " is-selected" : "") + '" data-id="' + esc(c.id) + '">' +
          (i === 0 ? '<span class="offer-badge">La más económica</span>' : "") +
          '<div class="offer-head"><div class="offer-logo" style="background:' + esc(c.color || "#1f5f7a") + '">' + logo + '</div>' +
          '<h3 class="offer-name">' + esc(c.nombre) + '</h3></div>' +
          '<div class="offer-price"><span class="month">' + euros.format(o.mensual) + ' <small>al mes</small></span>' +
          '<span class="year">o ' + euros.format(o.anual) + ' al año' + (o.descuento ? " (pago anual)" : "") + '</span></div>' +
          '<ul class="covers">' + (c.coberturas || []).slice(0, 3).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + '</ul>' +
          '<button type="button" class="btn ' + (sel ? "btn-call" : "btn-secondary") + ' select-btn" data-select="' + esc(c.id) + '" aria-pressed="' + sel + '">' +
          (sel ? "✓ Elegida" : "Me interesa esta") + '<span class="visually-hidden"> - ' + esc(c.nombre) + '</span></button>' +
          '<p class="disclaimer">' + AVISO_PRECIO + '</p>' +
          '</li>';
      });
      html += '</ol>';
    }
    if (r.noDisponibles.length) {
      html += '<p class="unavailable">' + (r.noDisponibles.length === 1 ? "1 compañía no acepta" : r.noDisponibles.length + " compañías no aceptan") +
        ' nuevos clientes de ' + r.edad + ' años.</p>';
    }
    $("resultados-contenido").innerHTML = html;
  }

  /* ---------- Resumen, campos ocultos y WhatsApp ---------- */
  function nombreElegida() {
    if (!elegida || !calculo) return "";
    var o = calculo.ofertas.filter(function (x) { return x.compania.id === elegida; })[0];
    return o ? o.compania.nombre : "";
  }

  function mensajeWhatsApp() {
    var t = "Hola, me gustaría información sobre un seguro de decesos.";
    if (calculo) {
      t += " Tengo " + calculo.edad + " años y vivo en " + calculo.provincia.nombre + ".";
      var n = nombreElegida();
      t += n ? " Me interesa la compañía " + n + "." : " Aún no he elegido compañía.";
    }
    return t;
  }

  function actualizarContacto() {
    var resumen = $("resumen");
    if (calculo) {
      var n = nombreElegida();
      var oferta = calculo.ofertas.filter(function (x) { return x.compania.id === elegida; })[0];
      resumen.innerHTML = "<strong>Tus datos:</strong> " + calculo.edad + " años · " +
        (calculo.sexo === "mujer" ? "Mujer" : "Hombre") + " · " + esc(calculo.provincia.nombre) +
        (n ? "<br><strong>Compañía elegida:</strong> " + esc(n) : "");
      $("h-edad").value = calculo.edad;
      $("h-sexo").value = calculo.sexo;
      $("h-cp").value = calculo.cp;
      $("h-provincia").value = calculo.provincia.nombre;
      $("h-capital").value = calculo.provincia.capital + " EUR";
      $("h-compania").value = n || "Sin elegir";
      $("h-precio").value = oferta ? euros.format(oferta.mensual) + "/mes" : "";
    }
    var url = "https://wa.me/" + (CFG.whatsapp || "") + "?text=" + encodeURIComponent(mensajeWhatsApp());
    document.querySelectorAll("[data-wa]").forEach(function (a) {
      a.href = url; a.target = "_blank"; a.rel = "noopener";
    });
  }

  /* ---------- Eventos de la calculadora ---------- */
  var form = $("calc-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = $("calc-btn");
      btn.disabled = true;
      cargaDatos.then(function () {
        var v = validarCalculadora();
        if (!v) return;
        calculo = calcular(v.edad, v.sexo, v.cp);
        elegida = null;
        pintarResultados(calculo);
        actualizarContacto();
        var sec = $("resultados");
        sec.hidden = false;
        sec.scrollIntoView({ behavior: "smooth", block: "start" });
        $("resultados-titulo").focus({ preventScroll: true });
      }).catch(function () {
        $("resultados").hidden = false;
        $("resultados-contenido").innerHTML = "<p>No hemos podido cargar los precios. Por favor, llámanos o escríbenos por WhatsApp.</p>";
      }).then(function () { btn.disabled = false; });
    });

    // Solo números en edad y código postal + aviso de provincia al escribir
    ["edad", "cp"].forEach(function (id) {
      $(id).addEventListener("input", function () {
        var limpio = this.value.replace(/\D/g, "");
        if (limpio !== this.value) this.value = limpio;
      });
    });
    $("cp").addEventListener("input", function () {
      var cp = this.value, fb = $("cp-feedback");
      if (cp.length < 5) { fb.textContent = ""; return; }
      cargaDatos.then(function () {
        var p = provinciaDeCP(cp);
        fb.textContent = p ? "✓ " + p.nombre : "";
        if (p) setError($("cp"), $("cp-error"), "");
      });
    });
  }

  // Elegir compañía
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-select]");
    if (!b) return;
    elegida = b.getAttribute("data-select");
    pintarResultados(calculo);
    actualizarContacto();
    var nuevo = document.querySelector('[data-select="' + elegida + '"]');
    if (nuevo) nuevo.focus();
    $("contacto").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ---------- Formulario de contacto (Web3Forms) ---------- */
  var cform = $("contact-form");
  if (cform) {
    cform.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true, primero = null;
      var nombre = $("nombre"), tel = $("telefono"), email = $("email"), rgpd = $("rgpd");
      var status = $("form-status");
      status.className = "form-status"; status.textContent = "";

      if (nombre.value.trim().length < 2) { setError(nombre, $("nombre-error"), "Escribe tu nombre."); ok = false; primero = primero || nombre; }
      else setError(nombre, $("nombre-error"), "");

      var telLimpio = tel.value.replace(/[\s.\-()]/g, "").replace(/^(\+34|0034)/, "");
      if (!/^[6789]\d{8}$/.test(telLimpio)) { setError(tel, $("telefono-error"), "Escribe un teléfono de 9 números."); ok = false; primero = primero || tel; }
      else setError(tel, $("telefono-error"), "");

      if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { setError(email, $("email-error"), "Revisa el email, parece incompleto."); ok = false; primero = primero || email; }
      else setError(email, $("email-error"), "");

      if (!rgpd.checked) { setError(rgpd, $("rgpd-error"), "Para poder llamarte necesitamos que aceptes la política de privacidad."); ok = false; primero = primero || rgpd; }
      else setError(rgpd, $("rgpd-error"), "");

      if (!ok) { primero.focus(); return; }

      if (!CFG.web3formsKey || CFG.web3formsKey.indexOf("PEGA_AQUI") === 0) {
        status.className = "form-status error";
        status.textContent = "El formulario aún no está configurado (falta la clave de Web3Forms en js/config.js). Mientras tanto, llámanos o escríbenos por WhatsApp.";
        return;
      }

      var fd = new FormData(cform);
      var payload = {};
      fd.forEach(function (v, k) { payload[k] = v; });
      payload.access_key = CFG.web3formsKey;
      payload.subject = CFG.asuntoEmail || "Nueva solicitud de presupuesto";
      payload.from_name = CFG.marca || "Web";
      payload.fecha_consentimiento = new Date().toISOString();
      payload.pagina = location.href;
      if (!payload.email) delete payload.email;

      var btn = $("contact-btn");
      btn.disabled = true; btn.textContent = "Enviando…";
      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      }).then(function (r) { return r.json(); }).then(function (res) {
        if (!res.success) throw new Error(res.message);
        status.className = "form-status ok";
        status.textContent = "¡Gracias, " + nombre.value.trim().split(" ")[0] + "! Hemos recibido tu solicitud. Te llamaremos lo antes posible.";
        cform.reset();
        if (window.SD_COOKIES) window.SD_COOKIES.evento("solicitud_presupuesto");
      }).catch(function () {
        status.className = "form-status error";
        status.textContent = "No se ha podido enviar. Inténtalo de nuevo o llámanos por teléfono.";
      }).then(function () {
        btn.disabled = false; btn.textContent = "Quiero mi presupuesto exacto";
      });
    });
  }

  /* ---------- Enlaces de llamada, WhatsApp y año ---------- */
  document.querySelectorAll("[data-tel]").forEach(function (a) { a.href = "tel:+" + (CFG.telefono || ""); });
  document.querySelectorAll("[data-year]").forEach(function (s) { s.textContent = new Date().getFullYear(); });
  actualizarContacto();

  /* ---------- Páginas de provincia: mostrar su capital ---------- */
  var codProv = document.body.getAttribute("data-provincia");
  if (codProv) {
    cargaDatos.then(function () {
      var p = datos.capitales.provincias[codProv];
      document.querySelectorAll("[data-capital-provincia]").forEach(function (el) {
        el.textContent = eurosSinDecimales.format(p.capitalRecomendado);
      });
    });
  }
})();
