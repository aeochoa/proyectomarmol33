// ESTRATEGIA DE CHUNKING PARA DATASETS GRANDES
// Usar en nodo CODE antes del AI Agent

const allData = $('FEDEX').all();
const chunkSize = 50; // Procesar de a 50 filas
const chunks = [];

// Dividir datos en chunks
for (let i = 0; i < allData.length; i += chunkSize) {
  chunks.push(allData.slice(i, i + chunkSize));
}

// Procesar cada chunk y acumular resultados
let totalGanancia = 0;
let totalRegistros = 0;
let resultadosPorChunk = [];

chunks.forEach((chunk, index) => {
  let gananciaChunk = 0;
  
  chunk.forEach(item => {
    const precio = parseFloat(item.json.precio_venta) || 0;
    const costo = parseFloat(item.json.costo_venta) || 0;
    const cantidad = parseInt(item.json.cantidad_envios) || 0;
    
    const ganancia = (precio - costo) * cantidad;
    gananciaChunk += ganancia;
    totalRegistros++;
  });
  
  totalGanancia += gananciaChunk;
  
  resultadosPorChunk.push({
    chunk: index + 1,
    filas: chunk.length,
    ganancia: Math.round(gananciaChunk * 100) / 100
  });
});

// Enviar solo resumen a la IA
return [{
  json: {
    mensaje: $('Webhook').json.body.message,
    resumen: {
      total_ganancia: Math.round(totalGanancia * 100) / 100,
      total_registros: totalRegistros,
      chunks_procesados: resultadosPorChunk.length,
      promedio_por_chunk: Math.round((totalGanancia / resultadosPorChunk.length) * 100) / 100
    },
    chunks: resultadosPorChunk
  }
}]; 