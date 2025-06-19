// FUNCIÓN PARA N8N - NODO "CODE" 
// Coloca este nodo ANTES del AI Agent para pre-calcular todo

// Procesar datos de Google Sheets y calcular totales
const fedexData = $('FEDEX').all();
const nuevoData = $('proveedor nuevo').all();

// Función para calcular ganancias de un dataset
function calcularGanancias(data, nombreProveedor) {
  let totalGanancia = 0;
  let totalRegistros = 0;
  let gananciaPorZona = {};
  let mejoresZonas = [];
  
  data.forEach(item => {
    const zona = parseInt(item.json.zona) || 0;
    const precio_venta = parseFloat(item.json.precio_venta) || 0;
    const costo_venta = parseFloat(item.json.costo_venta) || 0;
    const cantidad = parseInt(item.json.cantidad_envios) || 0;
    
    // Cálculo preciso
    const ganancia = Math.round((precio_venta - costo_venta) * cantidad * 100) / 100;
    
    totalGanancia += ganancia;
    totalRegistros++;
    
    // Acumular por zona
    if (!gananciaPorZona[zona]) {
      gananciaPorZona[zona] = 0;
    }
    gananciaPorZona[zona] += ganancia;
  });
  
  // Top 5 zonas más rentables
  mejoresZonas = Object.entries(gananciaPorZona)
    .map(([zona, ganancia]) => ({
      zona: parseInt(zona),
      ganancia: Math.round(ganancia * 100) / 100
    }))
    .sort((a, b) => b.ganancia - a.ganancia)
    .slice(0, 5);
  
  return {
    proveedor: nombreProveedor,
    total_ganancia: Math.round(totalGanancia * 100) / 100,
    total_registros: totalRegistros,
    ganancia_por_zona: gananciaPorZona,
    top_zonas: mejoresZonas,
    promedio_ganancia: Math.round((totalGanancia / totalRegistros) * 100) / 100
  };
}

// Calcular para ambos proveedores
const resultadoFedex = calcularGanancias(fedexData, 'FEDEX');
const resultadoNuevo = calcularGanancias(nuevoData, 'Nuevo Proveedor');

// Comparación
const diferencia = Math.round((resultadoNuevo.total_ganancia - resultadoFedex.total_ganancia) * 100) / 100;
const porcentajeMejora = resultadoFedex.total_ganancia > 0 ? 
  Math.round((diferencia / resultadoFedex.total_ganancia) * 10000) / 100 : 0;

// Respuesta ultra-compacta para la IA (solo ~500 tokens)
const resumenFinal = {
  mensaje_usuario: $('Webhook').json.body.message || '',
  
  // DATOS PRE-CALCULADOS (lo que necesita la IA)
  fedex: {
    total: resultadoFedex.total_ganancia,
    registros: resultadoFedex.total_registros,
    top_zonas: resultadoFedex.top_zonas
  },
  
  nuevo: {
    total: resultadoNuevo.total_ganancia,  
    registros: resultadoNuevo.total_registros,
    top_zonas: resultadoNuevo.top_zonas
  },
  
  comparacion: {
    diferencia: diferencia,
    porcentaje_mejora: porcentajeMejora,
    mejor_proveedor: diferencia > 0 ? 'Nuevo Proveedor' : 'FEDEX',
    recomendacion: diferencia > 0 ? 'CAMBIAR' : 'MANTENER FEDEX'
  },
  
  // Datos adicionales útiles
  analytics: {
    ahorro_potencial: Math.abs(diferencia),
    impacto: porcentajeMejora > 10 ? 'ALTO' : porcentajeMejora > 5 ? 'MEDIO' : 'BAJO'
  }
};

// Retornar solo el resumen (¡NO los datos completos!)
return [{ json: resumenFinal }]; 