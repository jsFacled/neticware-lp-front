# neticware-lp-front
Landing page simple de neticware

## Imágenes y publicación

Las imágenes servidas están en `assets/images/optimized/`, con un hash del
contenido en el nombre. Los originales están en `_image-sources/`. Sharp y SVGO
tienen versiones exactas y lockfile; el manifiesto registra las versiones de los
codificadores y el SHA-256 de cada salida.

Usar Node.js 24 para las herramientas de imágenes y Lighthouse, como en CI.

```sh
npm ci
npm run images    # Solo al cambiar originales o recetas
npm run build     # Publica únicamente la lista permitida en dist/
npm test
npm run preview   # http://127.0.0.1:4174
```

Las conversiones se ejecutan en desarrollo; el build de Vercel usa las variantes
ya versionadas en Git. No necesita los originales ni ejecutar Sharp. `dist/` no
contiene originales, pruebas, informes, dependencias ni herramientas. Para
publicar mediante un artefacto de GitHub Pages se debe usar `dist/`; para la
configuración anterior basada en Jekyll, `_config.yml` excluye estos archivos.
No se modificó la configuración remota de Pages.

La mascota principal tiene AVIF y fallback WebP; las otras poses usan WebP con
transparencia. Cada pose tiene dos anchos ajustados a sus tamaños de presentación.
El HTML permite descubrir la imagen principal sin esperar JavaScript. El
controlador comparte las precargas y espera `decode()` antes de cambiar de pose;
una respuesta tardía no puede reemplazar una pose solicitada posteriormente. Los
errores conservan la imagen visible y tienen una espera mínima antes de reintentar.

La caché de un año con `immutable` se aplica solo a `/assets/images/optimized/`.
Cambiar bytes cambia la URL. El manifiesto JavaScript también cambia su parámetro
de versión automáticamente. Las rutas históricas de imágenes se mantienen como
rewrites de Vercel con destinos optimizados. Las cabeceras del dominio público
deben verificarse después del despliegue: Cloudflare puede modificar la política
del origen. Vercel y GitHub Pages no comparten la configuración de cabeceras.

## Medición reproducible

`lighthouserc.cjs` fija tres ejecuciones por página, viewport móvil 390 × 844,
densidad 2, latencia simulada de 150 ms, 1638,4 Kbit/s y CPU ×4. Usar el mismo
navegador y equipo; comparar las medianas y conservar los seis informes JSON/HTML.
Son mediciones locales de laboratorio, no estadísticas de usuarios reales.

```sh
npm run build
npm run preview
# En otra terminal, con el servidor activo:
npx lhci collect --config=lighthouserc.cjs
npx lhci assert --config=lighthouserc.cjs
npx lhci upload --config=lighthouserc.cjs
```

Los informes quedan en `output/lighthouse/after/`. `AUDIT_BASE_URL` permite medir
otro servidor y `AUDIT_LABEL` cambia la carpeta de informes. La comparación de
esta rama usa el commit `cd183a51f147babd7a57f0582211cc9492bd6602` como referencia,
servido con el mismo servidor local y compresión de texto. El servidor de prueba
reproduce las rewrites y la caché de imágenes; no implementa envío de formularios.

Las pruebas adicionales cubren carreras entre poses, fallos de decodificación,
reutilización de precargas, referencias existentes, hashes y exclusión de
originales del paquete. Ejecutar el build antes de esas pruebas.

`basic-ftp` se fija mediante override a 6.2.6 para corregir una dependencia
transitiva de Lighthouse CI. Las herramientas son dependencias de desarrollo;
el sitio publicado sigue siendo HTML, CSS y JavaScript estáticos.

## Formulario de contacto

El navegador envía JSON directamente a
`https://formsubmit.co/ajax/ef7d59049898d7f53426aae769f74ea4` mediante `POST`.
El JavaScript del formulario prepara el motivo, asunto y plantilla. No se utiliza
una función de Vercel ni una clave nueva para esta integración.

El formulario muestra éxito solo cuando FormSubmit devuelve HTTP exitoso y
`success: true` o `success: "true"`. Un error HTTP, HTML en vez de JSON, una respuesta
negativa o un fallo de red conserva los datos y muestra un error. No hay reintentos
automáticos porque el proveedor podría haber procesado un envío cuya respuesta
se perdió. Una confirmación del proveedor no acredita la entrega final en el correo.

El navegador limita la espera a 20 segundos, incluida la lectura completa de la
respuesta. Si vence ese plazo, cancela la solicitud, conserva los datos y vuelve a
habilitar el botón, sin reenviar automáticamente. El temporizador se elimina al
terminar la operación. Mientras espera se bloquean nuevos envíos para evitar
solicitudes duplicadas.

El valor de `_honey` se incluye en el JSON, tanto vacío como ocupado; FormSubmit
gestiona el descarte de las consultas que llenan ese campo. Se conservan
`_captcha: "false"` y `_template: "box"` del envío directo anterior.

## Pruebas locales

Con Node.js 22 o posterior, sin instalar dependencias ni conectarse a Vercel:

```sh
node --test tests/contact.test.cjs
```

Las pruebas ejecutan el JavaScript del formulario con un DOM y respuestas de
FormSubmit simulados: no hacen solicitudes de red ni envían correos reales.
Cubren el destino directo, el contenido enviado para cada motivo, `_honey`,
éxito booleano y textual, rechazo con HTTP 200, respuestas HTML o JSON inválido,
errores HTTP/red, validación de campos y prevención de envíos duplicados.
Los timeouts se prueban con un reloj simulado, tanto antes de recibir encabezados
como mientras se lee el cuerpo de la respuesta.

Un servidor estático como `python -m http.server` permite revisar la página.
Enviar desde esa página contacta al proveedor real. Las pruebas simuladas no
verifican la autorización CORS de FormSubmit: el envío directo sigue dependiendo
de ella. La aceptación desde producción y la llegada del correo deben comprobarse
con una prueba real autorizada después del despliegue.
