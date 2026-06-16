// verReportesAd.js — Detalle de reporte con eliminación (Administrador)

const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', async () => {
  const params    = new URLSearchParams(window.location.search);
  const idReporte = params.get('id');

  if (!idReporte) {
    document.getElementById('cargando-detalle-admin').textContent =
      'No se especificó un reporte. Vuelve al historial.';
    return;
  }

  await cargarDetalleAdmin(idReporte);

  document.getElementById('btn-eliminar-definitivo')
    .addEventListener('click', () => eliminarDefinitivo(idReporte));
});

// ─── Cargar detalle del reporte ─────────────────────────────
async function cargarDetalleAdmin(idReporte) {
  const cargando  = document.getElementById('cargando-detalle-admin');
  const contenido = document.getElementById('contenido-detalle-admin');

  try {
    const respuesta = await fetch(`${API_URL}/reportes/${idReporte}`, {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      cargando.textContent = datos.message || 'No se pudo cargar el reporte.';
      return;
    }

    const r = datos.data;

    document.getElementById('ad-folio').textContent = `#${String(r.folio).padStart(4, '0')}`;

    const spanEstado = document.getElementById('ad-estado');
    spanEstado.textContent = r.estado;
    spanEstado.classList.add(obtenerClaseEstado(r.estado));

    const fechaCreacion = new Date(r.fecha_creacion).toLocaleString('es-MX');
    document.getElementById('ad-fecha-registro').textContent =
      `Registrado en el sistema: ${fechaCreacion}`;

    document.getElementById('ad-tipo').textContent      = r.tipo_problema;
    document.getElementById('ad-alcaldia').textContent  = r.nombre_alcaldia;
    document.getElementById('ad-colonia').textContent   = r.nombre_colonia;
    document.getElementById('ad-calle').textContent     = `${r.calle} #${r.numero_casa}`;
    document.getElementById('ad-descripcion').textContent =
      r.desc_extra || 'Sin descripción adicional.';
    document.getElementById('ad-tiempo').textContent =
      r.tiempo_falla || 'No especificado';

    document.getElementById('ad-actualizacion').textContent = r.fecha_actualizacion
      ? new Date(r.fecha_actualizacion).toLocaleString('es-MX')
      : 'No se han registrado movimientos.';

    // Imagen
    const foto = document.getElementById('ad-foto');
    foto.innerHTML = r.imagen
      ? `<img src="http://localhost:3000/${r.imagen}" alt="Evidencia" class="foto-evidencia">`
      : '<p class="sin-imagen">Sin imagen adjunta</p>';

    cargando.style.display  = 'none';
    contenido.style.display = 'block';

  } catch (error) {
    cargando.textContent = 'No se pudo conectar con el servidor.';
    console.error('Error:', error);
  }
}

// ─── Eliminar permanentemente ───────────────────────────────
async function eliminarDefinitivo(idReporte) {
  const folio = document.getElementById('ad-folio').textContent;

  const confirmado = confirm(
    `ATENCIÓN ROOT: ¿Confirmas la destrucción absoluta del reporte ${folio}?`
  );
  if (!confirmado) return;

  const btn = document.getElementById('btn-eliminar-definitivo');
  btn.disabled    = true;
  btn.textContent = 'Eliminando...';

  try {
    const respuesta = await fetch(`${API_URL}/reportes/${idReporte}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      document.getElementById('error-eliminar').textContent = datos.message;
      btn.disabled    = false;
      btn.textContent = '🗑️ Eliminar Reporte Permanentemente';
      return;
    }

    alert('Reporte eliminado correctamente.');
    window.location.href = 'historialAd.html';

  } catch (error) {
    document.getElementById('error-eliminar').textContent = 'No se pudo conectar con el servidor.';
    btn.disabled    = false;
    btn.textContent = '🗑️ Eliminar Reporte Permanentemente';
    console.error('Error:', error);
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