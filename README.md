# Casa al día

Aplicación sin dependencias para controlar facturas domésticas. Importes en pesos argentinos. No contiene datos de ejemplo ni contraseñas.

## Usar

Abrí esta carpeta con un servidor web local (por ejemplo, `python -m http.server 5173`) y visitá http://localhost:5173. También funciona publicada en GitHub Pages. Usá siempre la misma dirección: los registros locales pertenecen al navegador y al origen web.

1. Agregá un servicio, su enlace oficial, usuario opcional y unidad de consumo.
2. Registrá facturas con período, importe, vencimiento y consumo opcional.
3. Marcá los pagos. Podés editar facturas o deshacer un pago.
4. Descargá respaldos periódicos. Borrar los datos del navegador elimina tus registros locales.

Las alertas indican vencidas, vencimiento hoy y próximos siete días. No hay avisos en segundo plano. La variación de importe se calcula frente al último período anterior registrado.

## Publicar en GitHub Pages

Creá un repositorio en tu cuenta y subí `index.html`, `estado.html`, `styles.css`, `app.js`, `favicon.svg`, `datos.json` y `.nojekyll`. En **Settings → Pages**, elegí publicación desde la rama principal y la carpeta raíz. GitHub mostrará la dirección cuando termine la publicación.

Tu panel está en la raíz. El enlace para tu madre termina en `/estado.html` y permite solo consultar.

## Actualizar la vista familiar

En el panel, pulsá **Descargar estado público**. Revisá su contenido y reemplazá `datos.json` en el repositorio. Cuando GitHub Pages termine de publicar, tu madre verá los cambios al recargar. **No hay sincronización automática:** modificar tu panel por sí solo no actualiza internet. El botón **Ver estado actual** muestra una vista previa local.

El archivo público contiene nombres de servicios, períodos, importes, fechas, pagos, consumo y notas. No contiene enlaces, usuarios ni contraseñas. Todo dato publicado puede ser leído por terceros. No escribas información privada en las notas públicas.

## Accesos y privacidad

El panel no tiene autenticación: es una interfaz para datos guardados en tu dispositivo, no un área privada protegida en un servidor. Los usuarios y enlaces se almacenan solo en tu navegador y en el respaldo que descargues. No subas respaldos al repositorio.

El campo de contraseña es temporal, no se guarda ni se exporta y se vacía al cerrar su ventana. El portapapeles conserva lo copiado hasta que lo reemplaces. Para claves persistentes, usá un gestor de contraseñas.

Para sincronizar automáticamente varios dispositivos hace falta incorporar almacenamiento remoto con autenticación para escritura; GitHub Pages por sí solo no lo proporciona. Nunca agregues tokens de GitHub al código del navegador.
