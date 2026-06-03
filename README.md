# Liss García · Sitio + Plataforma de Certificación

Sitio de marca (Home) con la plataforma de Certificación Oficial integrada en `/certificacion-capilar`.
Todo es estático y autocontenido. Hosting recomendado: **Netlify** (gratis). Dominio: **Cloudflare**.

```
/                         → Home (marca, academia, servicios, contacto)
/certificacion-capilar/   → Plataforma de Certificación Oficial
```

---

## Estructura del paquete

| Archivo / carpeta | Qué es |
|---|---|
| `index.html` | Home de Liss García |
| `certificacion-capilar/index.html` | Plataforma de certificación (38 reactivos) |
| `favicon.svg`, `icon-192/512.png`, `apple-touch-icon.png` | Iconos / instalable (PWA) |
| `site.webmanifest` | Configuración PWA |
| `og-cover.png` | Imagen al compartir en redes/WhatsApp |
| `robots.txt`, `sitemap.xml` | SEO técnico (ambas URLs) |
| `llms.txt`, `llms-full.txt` | LLMO (ChatGPT/Gemini/Perplexity) |
| `_headers` | Headers de seguridad (Netlify/Cloudflare) |
| `backend/Codigo_Apps_Script_Correo.gs` | Correo + base de datos en Drive + IA Gemini + contactos |
| `README.md` | Esta guía |

---

## PASO 1 · Subir a GitHub (para actualizar fácil)

Necesitas una cuenta gratis en https://github.com

**Opción simple (web, sin terminal):**
1. GitHub → **New repository** → nombre: `lissgarcia-sitio` → Create.
2. En el repo → **Add file → Upload files** → arrastra TODO el contenido de esta carpeta.
3. **Commit changes.** Listo: tu código vive en Git.

**Opción terminal:**
```bash
cd carpeta-del-sitio
git init
git add .
git commit -m "Sitio Liss García v1"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/lissgarcia-sitio.git
git push -u origin main
```

> Para actualizar después: cambias el archivo y haces `Upload files` (o `git commit` + `git push`). Netlify republica solo.

---

## PASO 2 · Publicar en Netlify (conectado a GitHub = auto-deploy)

1. Entra a https://app.netlify.com → **Add new site → Import an existing project**.
2. Conecta **GitHub** y elige el repo `lissgarcia-sitio`.
3. Build command: *(vacío)* · Publish directory: `/` (raíz). **Deploy.**
4. Te da una URL `nombre.netlify.app`. Cada vez que actualices el repo, Netlify republica solo.

> Alternativa rápida sin Git: https://app.netlify.com/drop y arrastra la carpeta (pero pierdes el auto-deploy).

---

## PASO 3 · Dominio en Cloudflare

1. Compra `lissgarcia.com` en https://dash.cloudflare.com (Registrar, a precio de costo).
2. En Netlify → **Domain settings → Add custom domain** → `lissgarcia.com`.
3. Netlify te da los registros DNS → cópialos en Cloudflare (o delega los nameservers a Netlify).
4. HTTPS se activa solo.

---

## PASO 4 · Reemplazar el dominio en los archivos

Busca y reemplaza `lissgarcia.com` por `lissgarcia.com` en:
- `index.html`
- `certificacion-capilar/index.html`
- `sitemap.xml`, `robots.txt`, `llms.txt`, `llms-full.txt`

(Sube el cambio a GitHub → Netlify republica.)

---

## PASO 5 · Encender correo + base de datos + IA (Apps Script)

1. https://script.google.com (Gmail de Liss) → Nuevo proyecto → pega `backend/Codigo_Apps_Script_Correo.gs`.
2. Llave Gemini gratis en https://aistudio.google.com → ⚙ Propiedades del script → `GEMINI_KEY` = tu llave.
3. Implementar → Aplicación web → Ejecutar como: **Yo** · Acceso: **Cualquiera** → autoriza.
4. Copia la **URL** y pégala en DOS lugares:
   - `certificacion-capilar/index.html` → `"appsScriptUrl": "TU_URL"`
   - `index.html` → `var APPS_SCRIPT_URL = "TU_URL";` (activa el formulario de contacto)
5. Sube los cambios. Prueba la plataforma con `…/certificacion-capilar/#probar-correo`.

> Se crean solas en el Drive de Liss: **"Liss García · Registros Certificación"** y **"Liss García · Contactos del sitio"**.

---

## Verificación
- Schema: https://validator.schema.org
- Compartir (OG): https://www.opengraph.xyz
- Calidad: Chrome → DevTools → Lighthouse

*Designed by Soul Lens · Powered by Xplorers Startups*
