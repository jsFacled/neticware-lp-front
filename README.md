# neticware-lp-front
Landing page simple de neticware

## Formulario de contacto

El navegador envía JSON a `POST /api/contact` en el mismo dominio. La función Node.js
de Vercel valida los campos y reenvía la consulta al endpoint existente de FormSubmit.
El destinatario, asunto, plantilla y URL del formulario se fijan en el servidor;
no se necesita una cuenta o clave nueva para esta integración.

La API confirma el envío solo cuando FormSubmit devuelve HTTP exitoso y
`success: true` o `success: "true"`. Normaliza la respuesta a `{ "success": true }`.
Un error HTTP, HTML en vez de JSON, una respuesta negativa o un fallo de red devuelve
`502`; el plazo de espera de 8 segundos devuelve `504`. Ninguno borra los datos del
formulario. No hay reintentos automáticos porque el proveedor podría haber procesado
un envío cuya respuesta se perdió. Una confirmación del proveedor no acredita la
entrega final en la bandeja de correo.

El navegador limita la espera a 20 segundos, incluida la lectura completa de la
respuesta. Si vence ese plazo, cancela la solicitud, conserva los datos y vuelve a
habilitar el botón, sin reenviar automáticamente. El temporizador se elimina al
terminar la operación. La API devuelve `400` si un cuerpo muy anidado no se puede
serializar para medirlo, o `413` si su tamaño serializado supera los 8 KiB.

El campo `_honey` viaja desde el formulario hasta la API. Si está ocupado, la API
descarta la consulta silenciosamente sin contactar a FormSubmit. Si está vacío,
también se incluye en el envío al proveedor. Se conserva `_captcha: "false"`.
Este honeypot no sustituye límites de frecuencia si aparecen abusos.

## Pruebas locales

Con Node.js 22 o posterior, sin instalar dependencias ni conectarse a Vercel:

```sh
node --test tests/contact.test.cjs
```

Las pruebas ejecutan el handler, el JavaScript del formulario con un DOM simulado
y recorridos HTTP sobre `127.0.0.1` con un adaptador del contrato `req/res` de Vercel.
Las respuestas de FormSubmit se simulan: las pruebas no envían correos reales.
Cubren éxito, rechazo con HTTP 200, respuestas HTML, errores HTTP/red, timeout,
validación de campos, JSON muy anidado, `_honey`, campos reservados y prevención de
envíos duplicados. Los timeouts del navegador se prueban con un reloj simulado,
tanto antes de recibir encabezados como mientras se lee el cuerpo de la respuesta.

Un servidor estático como `python -m http.server` permite revisar la página, pero
no ejecuta `/api/contact`. La ejecución en Vercel y la entrega real del correo
deben verificarse en un despliegue autorizado posterior. La función tiene un máximo
de 15 segundos configurado en `vercel.json`.
