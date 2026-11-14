# Fuentes de imágenes

Originales conservados para regenerar las variantes. No se publican: Vercel los
excluye con `.vercelignore`, el build copia únicamente archivos de su lista
permitida a `dist/` y `_config.yml` los excluye del build Jekyll de GitHub Pages.

Ejecutar `npm ci` y `npm run images` desde la raíz. Los resultados y sus hashes se
guardan en `assets/images/optimized/` y `assets/image-manifest.json`. Subir al repo
las variantes junto con los cambios de referencias. El despliegue no convierte
imágenes ni necesita acceso a estos originales.

Para servicios se usa el AVIF 1200 × 675 existente como fuente común: el AVIF de
1200 se conserva sin recomprimir; la variante de 600 y ambos WebP se derivan de
ese encuadre. Los WebP cuadrados anteriores se conservan aquí solo como archivo.
