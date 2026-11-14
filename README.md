# neticware-lp-front
Landing page simple de neticware

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
