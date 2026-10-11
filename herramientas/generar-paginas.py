#!/usr/bin/env python3
"""
Genera las páginas de provincia (SEO) y el sitemap a partir de index.html.

Úsalo SOLO si cambias textos de index.html y quieres que las 52 páginas de
provincia tengan el mismo cambio. Para cambiar precios o capitales NO hace
falta: las páginas leen los JSON de /data al abrirse.

    python3 herramientas/generar-paginas.py
"""
import json, re, pathlib, datetime

RAIZ = pathlib.Path(__file__).resolve().parent.parent
DOMINIO = "https://segurdecesos.com"

def entre(texto, marca, nuevo):
    patron = re.compile(r"(<!-- %s:INICIO -->)(.*?)(\s*<!-- %s:FIN -->)" % (marca, marca), re.S)
    return patron.sub(lambda m: m.group(1) + nuevo + m.group(3), texto)

def miles(n):
    return f"{int(n):,}".replace(",", ".")

def rutas_un_nivel(html):
    # Ajusta las rutas relativas para una página que está en una subcarpeta
    for pref in ('css/', 'js/', 'img/', 'legal/', 'data/', 'seguro-decesos-'):
        html = html.replace(f'href="{pref}', f'href="../{pref}').replace(f'src="{pref}', f'src="../{pref}')
    html = html.replace('href="./"', 'href="../"')
    html = html.replace('data-base=""', 'data-base="../"')
    return html

def main():
    capitales = json.loads((RAIZ / "data/capitales-provincia.json").read_text(encoding="utf-8"))["provincias"]
    index_path = RAIZ / "index.html"
    index = index_path.read_text(encoding="utf-8")

    # 1) Lista de enlaces a provincias dentro de index.html
    items = "\n".join(
        f'          <li><a href="seguro-decesos-{p["slug"]}/">Seguro de decesos en {p["nombre"]}</a></li>'
        for _, p in sorted(capitales.items(), key=lambda kv: kv[1]["slug"])
    )
    lista = '\n        <ul class="province-links">\n' + items + '\n        </ul>'
    index = entre(index, "PROVINCIAS", lista)
    index_path.write_text(index, encoding="utf-8")

    # 2) Una página por provincia
    urls = [DOMINIO + "/"]
    for codigo, p in capitales.items():
        n, slug = p["nombre"], p["slug"]
        url = f"{DOMINIO}/seguro-decesos-{slug}/"
        seo = f'''
  <title>Seguro de decesos en {n}: precio y comparativa | SegurDecesos</title>
  <meta name="description" content="Calcula gratis el precio del seguro de decesos en {n}. Te decimos el capital recomendado para un sepelio en {n} y comparamos varias compañías por ti.">
  <link rel="canonical" href="{url}">
  <meta property="og:title" content="Seguro de decesos en {n}: precio y comparativa">
  <meta property="og:description" content="Precio orientativo del seguro de decesos en {n} en 10 segundos.">
  <meta property="og:url" content="{url}">'''
        portada = f'''
          <h1 id="titulo-principal">Seguro de decesos en {n}: compara precios en 10 segundos</h1>
          <p class="lead">En {n}, un sepelio cuesta de media unos <strong data-capital-provincia>{miles(p["capitalRecomendado"])} €</strong>. Compara gratis varias compañías y elige con calma.</p>'''
        html = entre(index, "SEO", seo)
        html = entre(html, "PORTADA", portada)
        html = html.replace('<body data-base="">', f'<body data-base="" data-provincia="{codigo}">')
        html = html.replace('placeholder="Ej: 46001"', f'placeholder="Ej: {codigo}001"')
        html = rutas_un_nivel(html)
        destino = RAIZ / f"seguro-decesos-{slug}" / "index.html"
        destino.parent.mkdir(exist_ok=True)
        destino.write_text(html, encoding="utf-8")
        urls.append(url)

    # 3) sitemap.xml
    hoy = datetime.date.today().isoformat()
    for legal in ("aviso-legal", "politica-privacidad", "politica-cookies"):
        urls.append(f"{DOMINIO}/legal/{legal}.html")
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sm += [f"  <url><loc>{u}</loc><lastmod>{hoy}</lastmod></url>" for u in urls]
    sm.append("</urlset>")
    (RAIZ / "sitemap.xml").write_text("\n".join(sm) + "\n", encoding="utf-8")
    print(f"Hecho: {len(capitales)} páginas de provincia y sitemap.xml con {len(urls)} direcciones.")

if __name__ == "__main__":
    main()
