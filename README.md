# Frontend — Tikb'al

Aplicación móvil para la gestión de pedidos, clientes, proveedores, pagos y gastos.

**Desarrollado por:** Vinicio Valdez  
**Tecnología:** React Native (Expo SDK 54)  
**Plataformas:** Android e iOS  
**Backend:** `https://pedidos-backend-4jbtgazerq-uc.a.run.app/api`

---

## Tecnologías

| Tecnología | Uso |
|---|---|
| Expo SDK 54 | Framework principal |
| React Native 0.81 | Base de la UI |
| React Navigation 6 | Navegación (bottom tabs + stacks) |
| Axios | Llamadas a la API |
| @expo/vector-icons | Iconografía (Ionicons) |
| expo-print + expo-sharing | Generación y compartir PDFs |
| expo-updates (EAS Update) | Actualizaciones OTA sin reinstalar |
| TypeScript | Tipado estático |

---

## Estructura del proyecto

```
src/
├── navegacion/
│   ├── Navegacion.tsx      # Configuración de tabs y stacks
│   └── tipos.ts            # Tipos TypeScript de todos los params de navegación
│
├── pantallas/
│   ├── Inicio.tsx          # Dashboard: ganancia neta, acciones rápidas, pedidos pendientes
│   ├── Inicio.estilos.ts   # Estilos de Inicio
│   │
│   ├── Personas/
│   │   ├── ListaPersonas.tsx       # Lista de clientes y proveedores con balance
│   │   ├── DetallePersona.tsx      # Perfil con resumen financiero y pedidos
│   │   └── CrearPersona.tsx        # Formulario para crear cliente o proveedor
│   │
│   ├── Pedidos/
│   │   ├── ListaPedidos.tsx            # Lista con filtros: todos, ventas, compras, sin pagar
│   │   ├── DetallePedido.tsx           # Hero card, ítems, pagos, PDF, registrar pago
│   │   ├── DetallePedido.estilos.ts    # Estilos de DetallePedido
│   │   ├── CrearPedido.tsx             # Formulario: tipo, persona, ítems, pago inicial
│   │   └── CrearPedido.estilos.ts      # Estilos de CrearPedido
│   │
│   └── Gastos/
│       ├── ListaGastos.tsx     # Gastos agrupados por mes con totales
│       └── CrearGasto.tsx      # Formulario con categorías visuales
│
├── componentes/
│   ├── FAB.tsx             # Botón flotante de acción (Floating Action Button)
│   ├── CampoTexto.tsx      # Input reutilizable con ícono y etiqueta
│   ├── BotonPrimario.tsx   # Botón con variante primaria y secundaria
│   ├── SelectorToggle.tsx  # Selector tipo tab (compra/venta, bien/servicio)
│   ├── EstadoBadge.tsx     # Badge de estado (pendiente/parcial/pagado)
│   ├── CargandoSpinner.tsx # Indicador de carga
│   ├── ErrorMensaje.tsx    # Mensaje de error con botón de reintento
│   └── FilaDetalle.tsx     # Fila etiqueta-valor para pantallas de detalle
│
├── hooks/
│   ├── usePersonas.ts      # Estado y operaciones de personas
│   ├── usePedidos.ts       # Estado, filtros y operaciones de pedidos
│   ├── useGastos.ts        # Estado y operaciones de gastos
│   └── useEstadisticas.ts  # Carga estadísticas financieras desde la API
│
├── servicios/
│   ├── api.ts                  # Configuración de Axios (URL base, interceptores)
│   ├── personas.servicio.ts    # Llamadas HTTP de personas
│   ├── pedidos.servicio.ts     # Llamadas HTTP de pedidos
│   ├── gastos.servicio.ts      # Llamadas HTTP de gastos
│   └── estadisticas.servicio.ts # Llamadas HTTP de estadísticas
│
├── tipos/
│   └── index.ts            # Interfaces TypeScript: Persona, Pedido, Item, Pago, Gasto, Estadísticas
│
├── estilos/
│   ├── colores.ts          # Paleta de colores de la app
│   └── tema.ts             # Tipografías, espaciados, radios, estilos comunes
│
└── utilidades/
    ├── formato.ts          # Formatear moneda, fechas, parsear números
    └── pdf.ts              # Generar y compartir PDF de un pedido
```

---

## Navegación

```
TabNavigator
├── InicioTab       → Inicio
├── PersonasTab     → ListaPersonas → CrearPersona
│                                  → DetallePersona → DetallePedido
├── PedidosTab      → ListaPedidos → CrearPedido
│                                 → DetallePedido
└── GastosTab       → ListaGastos → CrearGasto
```

---

## Conexión con el backend

El archivo `src/servicios/api.ts` define la URL base:

```typescript
// PRODUCCIÓN (Cloud Run activo)
const CLOUD_RUN_URL: string | null = 'https://pedidos-backend-4jbtgazerq-uc.a.run.app/api';

// DESARROLLO LOCAL (cuando CLOUD_RUN_URL = null)
const IP_LOCAL = '192.168.1.14'; // Cambiar si cambia la red Wi-Fi
```

Para volver a desarrollo local, cambiar `CLOUD_RUN_URL` a `null`.

---

## Correr en desarrollo

```bash
# Instalar dependencias
npm install --legacy-peer-deps

# Iniciar Expo
npx expo start

# Escanear el QR con la cámara del celular (requiere app Expo Go)
```

---

## Publicar para clientes

```bash
# Desde la carpeta frontend/
bash publicar.sh
```

- **Opción 1** — Genera APK para Android (primera instalación)
- **Opción 2** — Publica actualización OTA (cambios llegan solos a todos los celulares)

---

## Convenciones de código

| Concepto | Convención |
|----------|------------|
| Componentes | PascalCase (`ListaPersonas.tsx`) |
| Hooks | camelCase con prefijo `use` (`usePersonas.ts`) |
| Servicios | camelCase con sufijo `.servicio.ts` |
| Estilos | Archivo separado con sufijo `.estilos.ts` |
| Colores | Siempre desde `COLORES` en `estilos/colores.ts` |
| Tipografía | Siempre desde `FUENTE` en `estilos/tema.ts` |
| Íconos | Siempre `Ionicons` de `@expo/vector-icons` |

---

## Agregar una nueva pantalla

1. Crear el archivo en `src/pantallas/`
2. Crear su archivo de estilos `*.estilos.ts` si tiene más de 80 líneas de estilos
3. Agregar el tipo de parámetros en `src/navegacion/tipos.ts`
4. Registrar la pantalla en `src/navegacion/Navegacion.tsx`
5. Si necesita datos, crear un hook en `src/hooks/` y un servicio en `src/servicios/`

---

## Agregar un nuevo campo al backend

1. Actualizar el modelo en `backend/prisma/schema.prisma`
2. Correr `npx prisma migrate dev` en el backend
3. Actualizar la interfaz correspondiente en `src/tipos/index.ts`
4. Usar el nuevo campo en la pantalla que lo necesite

---

## Actualizaciones OTA (sin reinstalar)

Cualquier cambio en archivos `.tsx`, `.ts` o assets puede publicarse sin que el cliente reinstale:

```bash
bash publicar.sh  # elegir opción 2
```

Los cambios llegan automáticamente la próxima vez que el cliente abre la app.

---

## Compilación y distribución

| Perfil | Comando | Resultado |
|--------|---------|-----------|
| `preview` | `eas build --profile preview` | APK de Android para compartir por link |
| `production` | `eas build --profile production` | AAB para Google Play |

Cuenta EAS: `@vinival` en [expo.dev](https://expo.dev)
