"""Organiza facturas y comprobantes por servicio y período, sin sobrescribir."""

import argparse
import re
import shutil
from pathlib import Path

BASE = Path(__file__).resolve().parent / "Facturas & Comprobantes"
# Primeras tres letras del servicio usado en la aplicación.
CARPETAS = {"LUZ": "Electricidad", "ELE": "Electricidad"}
PATRON = re.compile(
    r"^(?P<servicio>[A-Z]{3})-(?P<proveedor>[A-Z]{3})-"
    r"(?P<anio>\d{4})(?P<periodo>0[1-9]|1[0-2])-"
    r"(?P<numero>0[1-9]|[1-9]\d)"
    r"(?:-(?P<referencia>[A-Z]{3}(?:00[1-9]|0[1-9]\d|[1-9]\d{2})))?"
    r"-(?P<tipo>FAC|PAG)\.pdf$",
    re.IGNORECASE,
)


def dentro(ruta: Path, base: Path) -> bool:
    """Comprueba el destino absoluto antes de cualquier movimiento."""
    return ruta.resolve().is_relative_to(base.resolve())


def destino_documento(archivo: Path, base: Path) -> tuple[Path | None, str]:
    datos = PATRON.fullmatch(archivo.name)
    if not datos:
        return None, "nombre no reconocido"
    carpeta = CARPETAS.get(datos["servicio"].upper())
    if not carpeta:
        return None, f"servicio {datos['servicio'].upper()} sin carpeta configurada"
    # El número es el período del proveedor: en EDET, 02 significa bimestre 2.
    periodo = f"{int(datos['periodo'])}-{datos['anio']}"
    destino = base / carpeta / periodo / archivo.name
    if not dentro(archivo, base) or not dentro(destino, base):
        return None, "ruta fuera de la carpeta de documentos"
    if destino.exists():
        return None, "ya existe un archivo con ese nombre en el destino"
    return destino, ""


def organizar(base: Path, aplicar: bool = False) -> int:
    base = base.resolve()
    if not base.is_dir():
        print(f"No se encontró la carpeta de documentos: {base}")
        return 1
    # Solo archivos de la raíz; los documentos ya clasificados no se recorren.
    archivos = sorted(base.iterdir(), key=lambda p: p.name.lower())
    movidos = omitidos = previstos = errores = 0
    print("MOVIMIENTO DE ARCHIVOS" if aplicar else "VISTA PREVIA — no se moverá ningún archivo")
    for archivo in archivos:
        if archivo.name.casefold() == "ordenar.lnk":
            continue
        if not archivo.is_file():
            continue
        destino, motivo = destino_documento(archivo, base)
        if destino is None:
            print(f"Se conserva en la carpeta principal: {archivo.name} ({motivo})")
            omitidos += 1
            continue
        print(f"{archivo.name} -> {destino.relative_to(base)}")
        previstos += 1
        if aplicar:
            try:
                destino.parent.mkdir(parents=True, exist_ok=True)
                # Verificar otra vez las rutas y la existencia antes de mover.
                if not dentro(archivo, base) or not dentro(destino, base) or destino.exists():
                    raise OSError("El destino cambió o ya existe; no se movió el archivo")
                shutil.move(str(archivo), str(destino))
                movidos += 1
            except OSError as error:
                errores += 1
                print(f"No se pudo mover {archivo.name}: {error}")
    print(f"{'Movidos: ' + str(movidos) if aplicar else 'Para mover: ' + str(previstos)}. "
          f"Omitidos: {omitidos}. Errores: {errores}.")
    return 1 if errores else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--aplicar", action="store_true", help="Mover archivos; sin esta opción solo muestra la vista previa")
    argumentos = parser.parse_args()
    return organizar(BASE, argumentos.aplicar)


if __name__ == "__main__":
    raise SystemExit(main())
