# SegurDecesos.com

Web de comparación de seguros de decesos. El cliente escribe su **edad, sexo y código postal** y ve en segundos un **precio orientativo** de varias compañías. Después deja sus datos para que le llaméis con el presupuesto exacto.

Es una web **estática**: solo HTML, CSS y JavaScript. No necesita base de datos, ni programas especiales, ni compilar nada. Se sube tal cual a cualquier hosting.

---

## 1. Qué hay en cada carpeta

```
index.html                    Página principal (calculadora y secciones)
data/
  tarifas.json                PRECIOS por compañía, edad, sexo y zona/provincia
  capitales-provincia.json    CAPITAL recomendado por provincia
js/
  config.js                   Teléfono, WhatsApp, clave del formulario, Google Analytics
  app.js                      Calculadora y formulario (no hace falta tocarlo)
  cookies.js                  Banner de cookies (no hace falta tocarlo)
css/styles.css                Colores y diseño
legal/                        Aviso legal, privacidad y cookies (PLANTILLAS)
seguro-decesos-<provincia>/   52 páginas, una por provincia (para Google)
herramientas/                 Script para regenerar las páginas de provincia
sitemap.xml, robots.txt       Para Google
```

---

## 2. Antes de publicar: lista de tareas

- [ ] **Precios reales** en `data/tarifas.json` (ahora son **ficticios**)
- [ ] **Capitales reales** en `data/capitales-provincia.json` (ahora son **ficticios**)
- [ ] Borrar la línea `"_AVISO"` de los dos JSON cuando los datos sean reales (así desaparece la etiqueta "DATOS DE EJEMPLO FICTICIOS" de la web)
- [ ] Datos de la correduría: sustituir los textos entre `[CORCHETES]` (ver apartado 5)
- [ ] Teléfono, WhatsApp y clave de Web3Forms en `js/config.js`
- [ ] Opiniones de clientes **reales** en `index.html` (ahora son de ejemplo) o borrar esa sección
- [ ] Revisión de los textos legales por un profesional
- [ ] Si usas nombres o logos de compañías reales, asegúrate de tener permiso para usarlos

---

## 3. Cómo actualizar los PRECIOS (`data/tarifas.json`)

Puedes abrir el archivo con cualquier editor de texto (Bloc de notas, TextEdit o, mejor, [Visual Studio Code](https://code.visualstudio.com/), que es gratis y avisa si te equivocas con una coma).

### 3.1. Tramos de edad

```json
"tramosEdad": [
  {"desde": 18, "hasta": 30},
  {"desde": 31, "hasta": 40},
  ...
  {"desde": 86, "hasta": 90}
]
```

Cada lista de precios tiene **un precio por tramo, en el mismo orden**. Si hay 11 tramos, cada lista tiene 11 números. La edad mínima y máxima que acepta la calculadora salen de aquí (primer "desde" y último "hasta").

### 3.2. Zonas

```json
"zonas": {
  "A": { "nombre": "Zona A (coste alto)", "provincias": ["01", "07", "08", "20", "28", "31", "48"] },
  "B": { "nombre": "Zona B (coste medio)", "provincias": ["03", "11", ...] },
  "C": { "nombre": "Zona C (resto de provincias)", "provincias": "resto" }
}
```

Las provincias se indican con los **2 primeros números del código postal** (28 = Madrid, 46 = Valencia…). La zona con `"resto"` incluye todas las provincias que no estén en otra zona. Puedes crear las zonas que quieras (A, B, C, D…).

### 3.3. Compañías

```json
{
  "id": "ejemplo-a",
  "nombre": "Aseguradora Ejemplo A",
  "logo": "",
  "color": "#2F6F8F",
  "edadMaxima": 80,
  "descuentoPagoAnual": 0.03,
  "coberturas": ["Servicio fúnebre completo", "Traslado nacional", "Asistencia psicológica"],
  "primasMensuales": {
    "A": { "ambos": [5.77, 7.88, 10.65, 14.42, 18.51, 24.71, 33.72, 46.0, 62.29, null, null] },
    "B": { "ambos": [...] },
    "C": { "ambos": [...] }
  }
}
```

| Campo | Qué es |
|---|---|
| `id` | Identificador interno, sin espacios ni tildes. Tiene que ser distinto para cada compañía |
| `nombre` | Nombre que se ve en la web |
| `logo` | Ruta a la imagen del logo, por ejemplo `"img/logos/compania.png"`. Si lo dejas vacío (`""`), se muestra la inicial sobre el `color` |
| `edadMaxima` | A partir de esta edad la compañía no aparece |
| `descuentoPagoAnual` | Descuento por pagar el año entero: `0.03` = 3 %. Pon `0` si no hay descuento. El precio anual se calcula así: mensual × 12 − descuento |
| `coberturas` | Lista de 2 o 3 coberturas destacadas |
| `primasMensuales` | **Prima mensual en euros** para cada zona. Usa punto para los decimales (`12.5`, no `12,5`). Pon `null` en un tramo si la compañía no lo ofrece |

**Precio por sexo.** En cada zona puedes usar `"ambos"` (mismo precio para hombres y mujeres) o separar `"hombre"` y `"mujer"`:

```json
"A": { "hombre": [ ... ], "mujer": [ ... ] }
```

> ⚠️ **Importante:** desde el 21/12/2012 (sentencia *Test-Achats* del Tribunal de Justicia de la UE y Directiva 2004/113/CE) las aseguradoras **no pueden** cobrar distinto por ser hombre o mujer. Por eso los datos de ejemplo usan `"ambos"`. Si las tarifas reales son unisex, puedes mantener la pregunta del sexo para tener más información del cliente o quitarla del formulario.

**Precio para una provincia concreta.** Si una compañía tiene un precio distinto en una provincia, añade una entrada con el código de esa provincia. La provincia tiene prioridad sobre la zona:

```json
"primasMensuales": {
  "A":  { "ambos": [ ... ] },
  "28": { "ambos": [ ... ] }      <- solo Madrid
}
```

**Añadir una compañía:** copia un bloque `{ ... }` entero, pégalo detrás de otro (separado por una coma) y cambia el `id` y los datos. **Quitar una:** borra su bloque y la coma que sobre.

Las compañías se ordenan solas de más barata a más cara.

---

## 4. Cómo actualizar los CAPITALES (`data/capitales-provincia.json`)

```json
"28": { "nombre": "Madrid", "slug": "madrid", "capitalRecomendado": 4500 }
```

Cambia solo `capitalRecomendado`: euros **sin puntos ni símbolo** (`4500`, no `4.500 €`). No cambies `slug`, porque es la dirección de la página de esa provincia.

### Comprobar que el JSON está bien

Un error típico es que falte o sobre una coma. Para comprobarlo, pega el contenido en [jsonlint.com](https://jsonlint.com) y pulsa *Validate JSON*. Si la web dice "No hemos podido cargar los precios", el JSON tiene un error.

---

## 5. Datos de la correduría

Busca y reemplaza estos textos en **todos los archivos** de la carpeta. En Visual Studio Code: menú *Editar → Reemplazar en archivos* (Ctrl+Mayús+H):

| Texto a buscar | Ejemplo |
|---|---|
| `[NOMBRE CORREDURÍA]` | Seguros Pérez Correduría S.L. |
| `[NÚMERO DGSFP]` | J-1234 |
| `[TELÉFONO]` | 600 111 222 |
| `[EMAIL]` | info@segurdecesos.com |
| `[DIRECCIÓN]` | C/ Mayor 1, 46001 Valencia |
| `[HORARIO]` | 9:00 a 19:00 |
| `[NIF]`, `[FECHA]` y los demás `[...]` de `legal/` | — |

Y en `js/config.js`:

```js
telefono: "34600111222",   // 34 + número, todo junto
whatsapp: "34600111222",
```

Estos dos números hacen funcionar los botones de **Llamar** y **WhatsApp**. El mensaje de WhatsApp se rellena solo con la edad, la provincia y la compañía elegida.

---

## 6. Recibir los formularios (Web3Forms)

Cada vez que alguien pide presupuesto, te llega un **email** con nombre, teléfono, email, edad, sexo, código postal, provincia, capital, compañía elegida y precio orientativo.

1. Entra en **https://web3forms.com**.
2. Escribe el email donde quieres recibir las solicitudes y pulsa *Create Access Key*.
3. Te llega un email con una clave del tipo `a1b2c3d4-...`.
4. Pégala en `js/config.js`:
   ```js
   web3formsKey: "a1b2c3d4-....",
   ```
5. Sube la web y haz una prueba de envío.

El plan gratuito permite 250 envíos al mes. El formulario tiene una protección anti-spam incluida. Mientras no pongas la clave, el formulario muestra un aviso y no envía nada.

> En la política de privacidad, Web3Forms figura como proveedor. Revisa sus condiciones y si implica transferencias internacionales de datos.

---

## 7. Ver la web en tu ordenador

Los precios se leen de los JSON, así que **no basta con hacer doble clic en `index.html`**: el navegador bloquea la lectura de archivos. Hay que abrirla con un pequeño servidor. Elige una opción:

**Opción A: Visual Studio Code (la más fácil)**
1. Instala la extensión **Live Server**.
2. Abre la carpeta de la web, haz clic derecho en `index.html` y elige **Open with Live Server**.

**Opción B: Python (si lo tienes instalado)**
```bash
cd carpeta-de-la-web
python3 -m http.server 8000
```
Abre en el navegador: http://localhost:8000

---

## 8. Publicar la web y conectar segurdecesos.com

Recomendado: **Cloudflare Pages** o **Netlify**. Los dos son gratis para una web así, incluyen HTTPS y son muy rápidos.

### Opción 1: Netlify, arrastrando la carpeta (sin GitHub)
1. Crea una cuenta en https://app.netlify.com.
2. En *Sites*, elige **Deploy manually** y arrastra la carpeta de la web.
3. En unos segundos tendrás una dirección del tipo `algo.netlify.app`. Pruébala.
4. **Conectar el dominio:** *Domain management → Add a domain →* `segurdecesos.com`. Netlify te dirá qué registros DNS poner. Normalmente son:
   - Un registro **A** para `@` → `75.2.60.5`
   - Un registro **CNAME** para `www` → `tu-sitio.netlify.app`

   Ponlos en el panel de la empresa donde compraste el dominio (GoDaddy, IONOS, DonDominio…), en el apartado *DNS*.
5. Espera entre unos minutos y 24 horas. El certificado HTTPS se activa solo.

Para actualizar precios con esta opción, cambia los JSON y vuelve a arrastrar la carpeta en *Deploys*.

### Opción 2: Cloudflare Pages o Netlify conectados a GitHub (recomendado a medio plazo)
1. Sube esta carpeta a un repositorio de GitHub.
2. En Cloudflare Pages (*Workers & Pages → Create → Pages → Connect to Git*) o en Netlify (*Add new site → Import from Git*), elige el repositorio.
3. Configuración de compilación: **ninguna**. *Build command* vacío y *Output directory* `/`.
4. Conecta el dominio igual que arriba: *Custom domains → segurdecesos.com*. Si el dominio ya está en Cloudflare, se configura solo.

Con esta opción, cada vez que cambies un JSON en GitHub (se puede editar desde la propia web de GitHub, con el icono del lápiz), la web se actualiza sola en un minuto.

### Opción 3: hosting tradicional (cPanel, FTP)
Sube todo el contenido de la carpeta a `public_html` con el gestor de archivos o por FTP. Activa el certificado SSL gratuito (Let's Encrypt) desde el panel.

### Después de publicar
- Da de alta la web en **Google Search Console** (https://search.google.com/search-console) y envía `https://segurdecesos.com/sitemap.xml`.
- Prueba en el móvil la calculadora, el formulario, WhatsApp y el botón de llamada.

---

## 9. Páginas por provincia (SEO)

Hay una página por provincia, por ejemplo `segurdecesos.com/seguro-decesos-madrid/`, pensada para búsquedas como *"seguro de decesos Madrid"*. Cada una tiene su título, su descripción y la misma calculadora. El capital de la provincia se lee del JSON, así que **se actualiza solo**.

Si cambias **textos** de `index.html` y quieres que también cambien en las 52 páginas de provincia, ejecuta (necesita Python 3):

```bash
python3 herramientas/generar-paginas.py
```

El script también regenera `sitemap.xml` y la lista de provincias de la portada. **Para cambiar precios o capitales no hace falta ejecutarlo.**

---

## 10. Colores y textos

- Los **colores** están al principio de `css/styles.css` (`--primary`, `--accent`…).
- Los **textos** (preguntas frecuentes, "Cómo funciona", etc.) están en `index.html`, con comentarios que indican cada sección.
- **Google Analytics** (opcional): pon tu ID `G-XXXXXXX` en `js/config.js`. Solo se carga si el visitante acepta las cookies analíticas.
