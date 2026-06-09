# Vimeo Downloader Full

Extension de Chrome para descargar videos de Vimeo a los que tienes acceso.
**Version completa y gratuita — sin paywall, sin limitaciones.**

## Como funciona

La extension intercepta la peticion XHR/fetch que el propio reproductor de Vimeo hace internamente para cargar la configuracion del video. Al capturar esa respuesta (que ya llega al navegador con tus credenciales), se extraen los enlaces MP4 directos sin necesidad de llamadas externas que generen errores 403.

```
content-inject.js  →  inyecta ajax-listener.js en el mundo MAIN de la pagina
ajax-listener.js   →  parchea XHR + fetch para capturar la config del player
content-main.js    →  puente: pagina → popup
background.js      →  descarga archivos y coordina mensajes
popup.html/js      →  interfaz en espanol con todas las calidades disponibles
```

## Instalacion

1. Descarga o clona este repositorio
2. Abre `chrome://extensions`
3. Activa el **Modo desarrollador**
4. Clic en **Cargar descomprimida** y selecciona esta carpeta

## Uso

1. Abre un video en Vimeo
2. Espera que el video **empiece a reproducirse** (activa la peticion de config)
3. Haz clic en el icono de la extension
4. Elige **Descargar mejor calidad** o selecciona otra resolucion

## Notas

- Funciona solo con videos a los que tienes acceso (propios, compartidos o publicos)
- Requiere que el video cargue en el reproductor al menos una vez
- Algunos videos solo usan streaming HLS y no tienen MP4 directo disponible
