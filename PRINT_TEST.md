# 📄 Guía de Prueba de Impresión

## ✅ Elementos que DEBEN aparecer en la impresión:

1. **Título del horario** (Nombre del teacher/grado/aula)
2. **Tabla completa del horario**
   - Días de la semana (Lunes - Viernes)
   - Horas (TIME column)
   - Todas las clases con:
     - Nombre del grado (si aplica)
     - Nombre de la materia
     - Nombre del teacher (si no es vista de teacher)
     - Notas adicionales (ej: "12:30-1:30")
     - Colores de fondo de las clases
3. **Bloques especiales** (Registration, Break, Lunch)
4. **Firmas** (Coordinación Académica / Dirección General)

## ❌ Elementos que NO deben aparecer en la impresión:

1. **Botones de acción:**
   - "+ Add New"
   - "Intelligent Generator"
   - "Schedule Viewer"
   - "Transferir Clases"
   - "Ver Conflictos"
   - "Print"
   - "PDF"
   - "Word"
   - "Image"

2. **Controles de navegación:**
   - Selector de "View Type" (Teacher/Grade/Room)
   - Dropdown de selección
   - Filtros de nivel/día

3. **Botones dentro de las celdas:**
   - Botón "+" para agregar clases
   - Iconos de conflicto (⚠️)
   - Tooltips

4. **Resumen de horas** (Total semanal)

5. **Header y Footer** de la página

## 🧪 Cómo Probar:

1. **Abre el Schedule Viewer**
2. **Selecciona un teacher/grado/aula**
3. **Click en el botón "Print"**
4. **Verifica en la vista previa:**
   - ✅ Solo aparece la tabla del horario
   - ✅ Los colores se mantienen
   - ✅ El texto es legible (tamaño 8px)
   - ✅ Cabe en una página A4 horizontal
   - ❌ No aparecen botones ni controles

## 📋 Configuración Actual:

- **Tamaño de página:** A4 Landscape
- **Márgenes:** 8mm (arriba/abajo), 6mm (izquierda/derecha)
- **Tamaño de fuente:** 8px
- **Colores:** Preservados con `print-color-adjust: exact`

## 🔧 Clases CSS Importantes:

- `.no-print` - Oculta elementos en impresión
- `print:hidden` - Utility de Tailwind para ocultar
- `print:text-[8px]` - Reduce tamaño de fuente
- `print:p-0.5` - Reduce padding

## 📝 Notas:

- Los estilos de impresión están en `src/app/schedule/page.tsx` (líneas 346-388)
- El componente ScheduleGrid tiene estilos inline para impresión
- Los colores de las clases se preservan automáticamente
