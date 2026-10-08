# Casa al día · Contabilidad 2.0

Aplicación de facturas domésticas con datos locales y mensajes de pago para WhatsApp.

## Uso

Abrí https://cross-naicha.github.io/contabilidad-2.0/ en tu navegador habitual. Agregá servicios y registrá facturas, consumos y vencimientos. Al marcar un pago, se abre un mensaje editable para mamá con servicio, período, importe, fecha de pago y vencimiento. Pulsá **Copiar para WhatsApp** y pegalo en su chat. La aplicación no accede a contactos ni envía mensajes. Desde la vista de facturas pagadas podés volver a generar el mensaje.

Las notas personales, usuarios y enlaces no se incluyen en el mensaje. Las alertas aparecen al abrir la aplicación.

## Almacenamiento

Los datos se guardan en localStorage del navegador, bajo la clave existente `casa-al-dia-v1`. Esta actualización conserva los registros anteriores. GitHub aloja únicamente HTML, CSS y JavaScript: no recibe registros, usuarios ni facturas. No hay base de datos remota ni archivo público de datos.

Usá el mismo navegador y la misma dirección. Otro dispositivo, otro perfil o una dirección distinta no comparte los registros. Borrar los datos del sitio o usar una sesión privada puede eliminar los registros. Descargá respaldos periódicos y guardalos en tu computadora; nunca los subas al repositorio. Podés restaurarlos desde el panel en otro navegador.

La página no lee archivos del disco automáticamente: para restaurar un respaldo debés seleccionarlo y confirmar. Cualquier persona con acceso a tu perfil del navegador puede ver los registros locales. La contraseña del servicio se guarda sin cifrar en este navegador y se puede copiar desde su tarjeta. No se incluye en los mensajes ni en los respaldos descargados: al restaurar en otro navegador debés volver a cargarla. Los servicios anteriores se conservan; podés editarlos para completar su entidad. El portapapeles conserva el texto hasta que lo reemplaces.

## Desarrollo y publicación

Sin dependencias ni compilación. Para desarrollo local, ejecutá `python -m http.server 5173` y abrí http://127.0.0.1:5173/. Los registros de esa dirección son distintos a los de GitHub Pages. GitHub Pages publica la rama `main` desde la raíz; subí solo los archivos de la aplicación.

La vista familiar y la exportación pública fueron retiradas. No hay envíos automáticos de WhatsApp ni notificaciones en segundo plano.

## Nombres de facturas y comprobantes

Cada factura recibe una base fija `SER-PRO-AAAAMM-NN`: tres letras del servicio, tres del proveedor, período y secuencia de dos dígitos. Letras mayúsculas sin tildes ni espacios; nombres cortos se completan con X. La factura termina en `-FAC.pdf` y su comprobante de pago en `-PAG.pdf`. Copiá estos nombres desde la factura para guardar o renombrar tus archivos. La aplicación no descarga ni renombra automáticamente los archivos de la empresa.

La base no cambia al editar el registro. El contador es compartido entre abreviaturas coincidentes y no reutiliza números de facturas eliminadas; se conserva en el respaldo. El límite es de 99 códigos para cada combinación de abreviaturas y período. Las facturas anteriores reciben códigos al cargarse y se conservan al guardar o descargar un respaldo.

## Procesos de pago por servicio

En **Opciones → Configurar pasos**, agregá etiquetas, arrastralas o usá Subir/Bajar para ordenar, quitá las que no necesites y personalizá sus instrucciones. Guardá la secuencia para ese servicio. Los servicios sin configuración usan una secuencia sugerida según su forma de acceso.

**Iniciar proceso de pago** muestra un paso y una acción principal a la vez. El avance se guarda localmente y se retoma después de cerrar o recargar. Volver y Omitir no deshacen acciones ya realizadas ni marcan pagos. El paso Confirmar pago requiere una confirmación explícita; la app no paga en la web del proveedor ni detecta automáticamente lo que hiciste allí.

Registrar factura dentro del proceso la vincula a sus códigos y pago. También podés seleccionar una factura existente de ese servicio. Los pasos de comprobante y WhatsApp requieren una factura ya pagada. Editar la secuencia afecta procesos nuevos; un proceso en curso conserva su secuencia. Configuraciones y progreso se incluyen en el respaldo local, sin contraseñas.

## Períodos bimestrales de EDET

Cuando la entidad es EDET, las facturas nuevas usan por defecto año y período bimestral de 1 a 6. Se muestra como `1/2026 (bimestral)`, sin asignarlo a un mes concreto. El nombre de documento usa año y número de período de dos dígitos, por ejemplo `LUZ-EDE-202601-01-FAC.pdf`. El formulario también permite elegir formato mensual. Los registros anteriores mantienen su formato; podés editarlos explícitamente para pasarlos a bimestral. Las comparaciones de importe usan períodos del mismo formato.

## Referencia bancaria transversal

Cada factura recibe una referencia global de seis caracteres: AAA001, AAA002, … AAA999, AAB001, etc., independientemente del servicio y período. La referencia se comparte entre factura y comprobante; los nombres pasan a ser, por ejemplo, `LUZ-EDE-202601-01-AAA001-FAC.pdf` y `LUZ-EDE-202601-01-AAA001-PAG.pdf`. Los archivos anteriores no se renombran automáticamente.

La referencia se puede copiar desde la factura o con el paso **Copiar referencia bancaria** del editor de secuencias. Las secuencias sugeridas nuevas incluyen este paso antes de confirmar el pago. Las secuencias personalizadas y procesos en curso no se alteran. Referencias y contador se conservan localmente y en los respaldos; editar o eliminar una factura no libera su referencia. Las facturas anteriores reciben referencia al cargar la actualización. Este contador pertenece a los datos de ese navegador: para trasladarlo a otro dispositivo, restaurá un respaldo actualizado.

## Organizar los PDF locales

Colocá los archivos codificados en `Facturas & Comprobantes`. Desde la carpeta del proyecto, ejecutá `python organizar_documentos.py` para ver los destinos sin mover nada. Ejecutá `python organizar_documentos.py --aplicar` para moverlos.

`LUZ-EDE-202602-01-AAA001-FAC.pdf` y su par `PAG.pdf` van a `Facturas & Comprobantes/Electricidad/2-2026/`. El script reconoce LUZ y ELE como Electricidad, crea las carpetas de período y conserva los nombres. El número se toma del período codificado, no del vencimiento. También admite códigos anteriores sin referencia bancaria. Para otros servicios, agregá su abreviatura y carpeta en CARPETAS dentro del script.

Los nombres desconocidos, servicios sin configurar y duplicados se conservan en la carpeta principal con un aviso. No hay movimiento automático en segundo plano: se ejecuta manualmente. La carpeta de documentos está excluida de Git para evitar subir facturas personales.

Para ejecutar con doble clic en Windows, usá `Ordenar documentos.cmd` o el acceso directo `Ordenar` en Facturas & Comprobantes. El lanzador usa --aplicar y mantiene la ventana abierta para mostrar movimientos o errores. Las carpetas de servicio y período se crean automáticamente al mover cada documento reconocido.

El organizador toma únicamente archivos sueltos de la raíz de Facturas & Comprobantes. Ignora Ordenar.lnk y las subcarpetas; no necesita una carpeta Pendientes.

## Tarjetas cifradas

La pestaña Tarjetas guarda número, titular y vencimiento; nunca solicita ni almacena el código de seguridad. Elegí una clave independiente de al menos 12 caracteres. Los datos se cifran con AES-256-GCM y una clave derivada mediante PBKDF2-SHA256 (600.000 iteraciones), con sal e IV aleatorios. Solo el contenido cifrado se guarda en localStorage, bajo casa-tarjetas-v1. La clave queda en memoria mientras la sección está desbloqueada. Requiere HTTPS o localhost.

Se bloquea manualmente, al recargar y tras cinco minutos sin actividad. El número se muestra enmascarado, con botones para copiar cada dato. El portapapeles no se borra automáticamente. El cifrado no protege frente a código malicioso ejecutándose mientras está desbloqueada. Las contraseñas de los servicios conservan su almacenamiento anterior: esta sección cifra únicamente tarjetas.

El respaldo cifrado de tarjetas es independiente del respaldo de facturas y requiere su clave para restaurarse. No hay recuperación si olvidás la clave. El nombre del respaldo está excluido de Git; Git no tiene acceso al almacenamiento del navegador. Podés agregar Datos de tarjeta como paso de cualquier secuencia de pago.

## Instalar como aplicación (PWA)

Abrí http://127.0.0.1:5175 con Live Server encendido y esperá el mensaje Lista para usar sin conexión. En Chrome o Edge, usá Instalar app cuando aparezca, o la opción de instalación del navegador. Después de la primera carga completa se puede abrir incluso con Live Server apagado. Los sitios de los proveedores y WhatsApp requieren internet.

La instalación conserva los datos del mismo navegador, perfil y dirección. No sincroniza con otro dispositivo y no crea respaldos. Si se borran los datos del sitio, se pierde tanto la copia sin conexión como los registros locales. El puerto 5175 debe reservarse para este proyecto.

El service worker almacena solo los recursos de la aplicación; no guarda respaldos ni PDFs. Para publicar cambios, incrementá CACHE (v1, v2, etc.) en sw.js. Cuando haya una nueva versión aparecerá Actualizar app. Live Server debe estar encendido para obtener actualizaciones locales. No se recarga automáticamente un formulario en uso.

## Tipos de comprobante

En Configuraciones → Tipos de comprobante, creá una plantilla con campos de texto, número, fecha, importe o lista de opciones. Elegí cuáles son obligatorios y ordenalos con Subir/Bajar. Luego asigná la plantilla desde Editar servicio.

Agregá Registrar comprobante a la secuencia del servicio. Requiere seleccionar una factura; al guardar avanza al siguiente paso y al cancelar permanece en el mismo. También está disponible en cada factura del historial. Se guarda un comprobante por factura, editable, con el nombre PAG y la misma referencia bancaria. El pago se confirma por separado. No adjunta ni mueve archivos PDF.

Los registros conservan una copia de sus campos y opciones, aunque después se modifique o elimine una plantilla. Las plantillas asignadas a servicios deben desasignarse antes de borrarlas. El respaldo habitual incluye las plantillas, las asignaciones y los comprobantes.

Live Server tiene la recarga automática desactivada para no interrumpir formularios. Reiniciá Live Server tras cambiar su configuración. Las actualizaciones de la PWA se aplican desde Actualizar app. La copia sin conexión excluye el script de recarga inyectado por Live Server; si intentás salir con un formulario abierto y editado, el navegador puede pedir confirmación.

## Próximo vencimiento anunciado

Al registrar o editar una factura, podés ingresar la fecha anunciada para la siguiente. Es opcional y debe ser posterior al vencimiento actual. Se conserva en el historial y en el respaldo habitual. En Servicios aparece como Próxima factura, pendiente de registrar. El aviso usa la factura con el vencimiento actual más reciente del servicio; al registrar la siguiente, deja de mostrar el anuncio anterior y usa el de la nueva factura, si tiene uno. No crea facturas ni importa montos estimados.
