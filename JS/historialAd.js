// historialAd.js — Auditoría global de reportes (Administrador)

const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', async () => {
  await cargarAlcaldiasAuditoria();
  await cargarReportesAuditoria();

  document.getElementById('btn-filtrar-admin').addEventListener('click', cargarReportesAuditoria);
});

// ─── Cargar alcaldías para el filtro ────────────────────────
async function cargarAlcaldiasAuditoria() {
  try {
    const respuesta = await fetch(`${API_URL}/reportes/catalogos/alcaldias`);
    const datos     = await respuesta.json();
    const select    = document.getElementById('filtro-alcaldia');

    datos.data.forEach(a => {
      const opt = document.createElement('option');
      opt.value       = a.nombre_alcaldia;
      opt.textContent = a.nombre_alcaldia;
      select.appendChild(opt);
    });
  } catch (error) {
    console.error('Error al cargar alcaldías:', error);
  }
}

// ─── Cargar reportes con filtros ────────────────────────────
async function cargarReportesAuditoria() {
  const lista       = document.getElementById('lista-auditoria');
  const cargando    = document.getElementById('cargando-auditoria');
  const sinReportes = document.getElementById('sin-reportes-auditoria');

  lista.style.display       = 'none';
  sinReportes.style.display = 'none';
  cargando.style.display    = 'block';
  cargando.textContent      = 'Cargando reportes...';

  const estado   = document.getElementById('filtro-estado').value;
  const alcaldia = document.getElementById('filtro-alcaldia').value;
  const fecha    = document.getElementById('filtro-fecha').value;

  const params = new URLSearchParams();
  if (estado)   params.append('estado',   estado);
  if (alcaldia) params.append('alcaldia', alcaldia);
  if (fecha)    params.append('desde',    fecha);

  try {
    const respuesta = await fetch(`${API_URL}/reportes/todos?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
    });

    const datos = await respuesta.json();
    cargando.style.display = 'none';

    if (!datos.data || datos.data.length === 0) {
      sinReportes.style.display = 'block';
      return;
    }

    lista.innerHTML     = datos.data.map(r => crearTarjetaAuditoria(r)).join('');
    lista.style.display = 'block';

    // Conectar los botones de eliminar generados
    document.querySelectorAll('.btn-eliminar-root').forEach(btn => {
      btn.addEventListener('click', () => eliminarReporte(btn.dataset.id));
    });

  } catch (error) {
    cargando.textContent = 'No se pudo conectar con el servidor.';
    console.error('Error al cargar reportes:', error);
  }
}

// ─── Tarjeta de auditoría ────────────────────────────────────
function crearTarjetaAuditoria(r) {
  const fecha = new Date(r.fecha_creacion).toLocaleDateString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
  const claseEstado = obtenerClaseEstado(r.estado);

  return `
    <div class="tarjeta-auditoria" id="tarjeta-${r.id_reporte}">
      <div class="info-auditoria">
        <div class="encabezado-tarjeta">
          <span class="id-reporte">#${String(r.folio).padStart(4, '0')}</span>
          <span class="estado ${claseEstado}">${r.estado}</span>
        </div>
        <div class="detalles-texto">
          <h3>${r.tipo_problema}</h3>
          <p class="ubicacion-reporte">📍 ${r.nombre_alcaldia}, Col. ${r.nombre_colonia}</p>
          <p class="fecha-reporte">📅 Registrado: ${fecha}</p>
        </div>
      </div>
      <div class="acciones-auditoria">
        <a href="verReportesAd.html?id=${r.id_reporte}" class="btn-ver-reporte">👁️ Ver Detalles</a>
        <button type="button" class="btn-eliminar-root" data-id="${r.id_reporte}">🗑️ Eliminar Registro</button>
      </div>
    </div>
  `;
}

// ─── Eliminar reporte (con confirmación) ────────────────────
async function eliminarReporte(id) {
  const confirmado = confirm(
    `ATENCIÓN: ¿Estás seguro de eliminar permanentemente el reporte #${String(id).padStart(4, '0')} del sistema?`
  );
  if (!confirmado) return;

  try {
    const respuesta = await fetch(`${API_URL}/reportes/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      alert(datos.message || 'No se pudo eliminar el reporte.');
      return;
    }

    // Quitar la tarjeta de la vista sin recargar todo
    const tarjeta = document.getElementById(`tarjeta-${id}`);
    if (tarjeta) tarjeta.remove();

  } catch (error) {
    alert('No se pudo conectar con el servidor.');
    console.error('Error al eliminar reporte:', error);
  }
}

function obtenerClaseEstado(estado) {
  switch (estado) {
    case 'Pendiente':  return 'pendiente';
    case 'En proceso': return 'revision';
    case 'Resuelto':   return 'reparada';
    case 'Rechazado':  return 'rechazado';
    default:           return 'pendiente';
  }
}