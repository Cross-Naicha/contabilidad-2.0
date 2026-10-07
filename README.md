# Casa al día · Contabilidad 2.0

Aplicación de facturas domésticas con datos locales y mensajes de pago para WhatsApp.

## Uso

Abrí https://cross-naicha.github.io/contabilidad-2.0/ en tu navegador habitual. Agregá servicios y registrá facturas, consumos y vencimientos. Al marcar un pago, se abre un mensaje editable para mamá con servicio, período, importe, fecha de pago y vencimiento. Pulsá **Copiar para WhatsApp** y pegalo en su chat. La aplicación no accede a contactos ni envía mensajes. Desde la vista de facturas pagadas podés volver a generar el mensaje.

Las notas personales, usuarios y enlaces no se incluyen en el mensaje. Las alertas aparecen al abrir la aplicación.

## Almacenamiento

Los datos se guardan en localStorage del navegador, bajo la clave existente `casa-al-dia-v1`. Esta actualización conserva los registros anteriores. GitHub aloja únicamente HTML, CSS y JavaScript: no recibe registros, usuarios ni facturas. No hay base de datos remota ni archivo público de datos.

Usá el mismo navegador y la misma dirección. Otro dispositivo, otro perfil o una dirección distinta no comparte los registros. Borrar los datos del sitio o usar una sesión privada puede eliminar los registros. Descargá respaldos periódicos y guardalos en tu computadora; nunca los subas al repositorio. Podés restaurarlos desde el panel en otro navegador.

La página no lee archivos del disco automáticamente: para restaurar un respaldo debés seleccionarlo y confirmar. Cualquier persona con acceso a tu perfil del navegador puede ver los registros locales. La contraseña del servicio es temporal, se borra al cerrar su ventana y nunca se guarda ni se exporta. El portapapeles conserva el texto hasta que lo reemplaces.

## Desarrollo y publicación

Sin dependencias ni compilación. Para desarrollo local, ejecutá `python -m http.server 5173` y abrí http://127.0.0.1:5173/. Los registros de esa dirección son distintos a los de GitHub Pages. GitHub Pages publica la rama `main` desde la raíz; subí solo los archivos de la aplicación.

La vista familiar y la exportación pública fueron retiradas. No hay envíos automáticos de WhatsApp ni notificaciones en segundo plano.
