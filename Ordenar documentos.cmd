@echo off
setlocal
title Organizar facturas y comprobantes
set "PYTHONUTF8=1"
python -u "%~dp0organizar_documentos.py" --aplicar
if errorlevel 1 echo Hubo un problema. Revisa el mensaje anterior.
echo.
echo Presiona una tecla para cerrar esta ventana.
pause >nul
endlocal
