#!/bin/bash
# =====================================================================
#  SCRIPT DE PUBLICACIÓN - App Gestión
#  Ejecutar desde la carpeta: P2/frontend/
#  Comando: bash publicar.sh
# =====================================================================

echo ""
echo "==========================================="
echo "  ¿Qué querés hacer?"
echo "==========================================="
echo ""
echo "  1) Generar APK para mandar a un cliente Android"
echo "     (primera instalación o nueva versión con cambios nativos)"
echo ""
echo "  2) Publicar actualización OTA"
echo "     (cambios en pantallas, diseño o lógica - sin reinstalar)"
echo ""
read -p "  Elegí una opción (1 o 2): " OPCION
echo ""

case $OPCION in

  1)
    echo ">>> Generando APK para Android..."
    echo "    (Esto tarda ~10 minutos en los servidores de Expo)"
    echo "    Al terminar te da un link para mandar al cliente."
    echo ""
    eas build --platform android --profile preview --non-interactive
    echo ""
    echo "==========================================="
    echo "  APK GENERADO"
    echo "==========================================="
    echo "  Copiá el link de arriba y mandáselo al cliente."
    echo "  El cliente abre el link desde su celular Android,"
    echo "  descarga el APK e instala. Listo."
    echo ""
    ;;

  2)
    echo ">>> Publicando actualización OTA..."
    echo "    Los celulares de tus clientes recibirán el update"
    echo "    automáticamente la próxima vez que abran la app."
    echo ""
    read -p "  Describí brevemente qué cambió (ej: 'mejora en pantalla de pedidos'): " DESCRIPCION
    echo ""
    eas update --branch production --message "$DESCRIPCION"
    echo ""
    echo "==========================================="
    echo "  ACTUALIZACIÓN PUBLICADA"
    echo "==========================================="
    echo "  Todos tus clientes recibirán el update automáticamente."
    echo "  No necesitan reinstalar nada."
    echo ""
    ;;

  *)
    echo "Opción inválida. Corré el script de nuevo y elegí 1 o 2."
    exit 1
    ;;

esac
