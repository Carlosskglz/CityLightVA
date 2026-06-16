// estadisticasA.js — Estadísticas del Sistema (Autoridad/Admin)

const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', async () => {
  await cargarEstadisticas();
});

async function cargarEstadisticas() {
  const cargando = document.getElementById('cargando-estadisticas');
  const contenido = document.getElementById('contenido-estadisticas');

  try {
    const respuesta = await fetch(`${API_URL}/estadisticas`, {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      cargando.textContent = datos.message || 'No se pudieron cargar las estadísticas.';
      return;
    }

    const d = datos.data;

    // ─── Tarjetas resumen ─────────────────────────────────────
    document.getElementById('stat-total-reportes').textContent      = d.totalReportes;
    document.getElementById('stat-porcentaje-resueltos').textContent = `${d.porcentajeResueltos}%`;
    document.getElementById('stat-reportes-nuevos').textContent     = d.reportesNuevos;
    document.getElementById('stat-total-usuarios').textContent      = d.totalUsuarios;
    document.getElementById('stat-usuarios-nuevos').textContent     = d.usuariosNuevos;

    // ─── Barras: reportes por estado ──────────────────────────
    renderBarrasEstados(d.porEstado, d.totalReportes);

    // ─── Barras: top alcaldías ─────────────────────────────────
    renderBarrasAlcaldias(d.topAlcaldias);

    cargando.style.display  = 'none';
    contenido.style.display = 'block';

  } catch (error) {
    cargando.textContent = 'No se pudo conectar con el servidor.';
    console.error('Error al cargar estadísticas:', error);
  }
}

// ─── Barras de reportes por estado ──────────────────────────
// Cada barra muestra qué porcentaje del total representa ese estado
function renderBarrasEstados(porEstado, totalReportes) {
  const contenedor = document.getElementById('barras-estados');

  contenedor.innerHTML = porEstado.map(e => {
    const porcentaje = totalReportes > 0
      ? Math.round((e.total / totalReportes) * 100)
      : 0;

    const clase = obtenerClaseEstado(e.nombre_estado);

    return `
      <div class="fila-barra">
        <div class="fila-barra-encabezado">
          <span>${e.nombre_estado}</span>
          <span class="valor">${e.total} (${porcentaje}%)</span>
        </div>
        <div class="pista-barra">
          <div class="barra-relleno ${clase}" style="width: ${porcentaje}%;"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── Barras de top alcaldías ─────────────────────────────────
// Cada barra es relativa a la alcaldía con más reportes (la más larga = 100%)
function renderBarrasAlcaldias(topAlcaldias) {
  const contenedor = document.getElementById('barras-alcaldias');
  const sinDatos   = document.getElementById('sin-datos-alcaldias');

  if (!topAlcaldias || topAlcaldias.length === 0) {
    contenedor.innerHTML = '';
    sinDatos.style.display = 'block';
    return;
  }

  sinDatos.style.display = 'none';

  const maximo = Math.max(...topAlcaldias.map(a => a.total));

  contenedor.innerHTML = topAlcaldias.map(a => {
    const porcentaje = maximo > 0 ? Math.round((a.total / maximo) * 100) : 0;

    return `
      <div class="fila-barra">
        <div class="fila-barra-encabezado">
          <span>${a.nombre_alcaldia}</span>
          <span class="valor">${a.total} reportes</span>
        </div>
        <div class="pista-barra">
          <div class="barra-relleno" style="width: ${porcentaje}%;"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── Helper: mapear estado a clase CSS (igual que en otros archivos) ──
function obtenerClaseEstado(estado) {
  switch (estado) {
    case 'Pendiente':  return 'pendiente';
    case 'En proceso': return 'revision';
    case 'Resuelto':   return 'reparada';
    case 'Rechazado':  return 'rechazado';
    default:           return 'pendiente';
  }
}