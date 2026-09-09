# @begraffic/email

Editor visual de email, compositor rich-text y motor de render (React Email) de Be Graffic.

```bash
pnpm add @begraffic/email
```

Sin Tailwind, sin CSS que importar, sin configuración. React 19 como peer.

## `@begraffic/email/render` — servidor

```ts
import { renderEmailDesign } from "@begraffic/email/render";

const { html, text } = await renderEmailDesign(design, { baseUrl: "https://tu-app.com" });
```

`baseUrl` es obligatoria: es el origen desde el que se sirven las imágenes alojadas.

## `@begraffic/email/editor` — cliente

```tsx
import { EmailEditor } from "@begraffic/email/editor";

<EmailEditor
  initialDesign={design}
  renderHtml={(d) => fetch("/api/render", { method: "POST", body: JSON.stringify(d) }).then((r) => r.text())}
  uploadImage={async (file) => "https://.../imagen.png"}
  searchPhotos={async (query) => []}
/>;
```

`renderHtml` es obligatoria; el resto son opcionales y las funciones que faltan
ocultan su parte de la interfaz (sin `searchPhotos` no hay buscador de fotos).

## `@begraffic/email/composer` — cliente

Compositor rich-text (`contentEditable` + barra de herramientas) para cuerpos de
correo escritos a mano: redacción, respuestas de bandeja, notas.

```tsx
import { RichEmailEditor } from "@begraffic/email/composer";

<RichEmailEditor
  value={html}
  onChange={setHtml}
  placeholder="Escribe tu mensaje…"
  uploadImage={async (file) => "https://.../imagen.png"}
/>;
```

Misma regla que el editor visual: `uploadImage` es opcional y, si falta, **el
botón de imagen no se pinta**. El compositor nunca incrusta binarios (`data:`)
en el HTML del correo, así que sin un sitio donde subir la imagen no hay
función que ofrecer.

`minHeight` y `expandedHeight` son longitudes CSS (`"160px"`, `"60vh"`), no
clases. Para el contenedor hay `style`.

## Limitación conocida: imágenes horneadas

Las imágenes de **títulos, cuentas atrás e iconos sociales** se generan en servidor
con `sharp` y `@napi-rs/canvas`. Ese generador **no viaja en el paquete**: son
binarios nativos pesados y no todos los consumidores los necesitan.

`/render` produce el HTML correcto y referencia esas imágenes contra tu `baseUrl`.
Para que existan, tu app debe servirlas en esas rutas o pasar URLs ya horneadas en
`RenderOptions.assets`. Un correo sin ellas se envía y se ve bien: pierde solo esos
adornos.

## Temas

El chrome del editor usa variables CSS con respaldo literal
(`var(--bg-card, #ffffff)`). Funciona tal cual; si tu app define esos tokens, manda
el tuyo. El tema se controla con la prop `theme`.
