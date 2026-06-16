// detalleU.js — Detalle de un reporte específico

const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', async () => {

  // Leer el id del reporte desde la URL (?id=5)
  const params    = new URLSearchParams(window.location.search);
  const idReporte = params.get('id');

  if (!idReporte) {
    document.getElementById('cargando-detalle').textContent =
      'No se especificó un reporte. Vuelve al historial.';
    return;
  }

  await cargarDetalleReporte(idReporte);
});

async function cargarDetalleReporte(idReporte) {
  const cargando  = document.getElementById('cargando-detalle');
  const contenido = document.getElementById('contenido-detalle');

  try {
    const respuesta = await fetch(`${API_URL}/reportes/${idReporte}`, {
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      cargando.textContent = datos.message || 'No se pudo cargar el reporte.';
      return;
    }

    const r = datos.data;

    // ─── Llenar todos los campos ──────────────────────────────
    document.getElementById('titulo-folio').textContent =
      `#${String(r.folio).padStart(4, '0')}`;

    document.getElementById('detalle-tipo').textContent       = r.tipo_problema;
    document.getElementById('detalle-alcaldia').textContent   = r.nombre_alcaldia;
    document.getElementById('detalle-colonia').textContent    = r.nombre_colonia;
    document.getElementById('detalle-calle').textContent      = `${r.calle} #${r.numero_casa}`;
    document.getElementById('detalle-tiempo').textContent     = r.tiempo_falla || 'No especificado';
    document.getElementById('detalle-comentarios').textContent = r.desc_extra || 'Sin comentarios adicionales.';

    // ─── Estado con clase CSS ─────────────────────────────────
    const spanEstado = document.getElementById('detalle-estado');
    spanEstado.textContent = r.estado;
    spanEstado.classList.add(obtenerClaseEstado(r.estado));

    // ─── Fecha de actualización ───────────────────────────────
    const fechaEl = document.getElementById('detalle-fecha-actualizacion');
    if (r.fecha_actualizacion) {
      const fecha = new Date(r.fecha_actualizacion).toLocaleDateString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
      fechaEl.textContent = `Última actualización: ${fecha}`;
    } else {
      fechaEl.textContent = 'Sin actualizaciones aún';
    }

    // ─── Imagen de evidencia ──────────────────────────────────
    const contenedorFoto = document.getElementById('contenedor-foto');
    if (r.imagen) {
      contenedorFoto.innerHTML = `
        <img src="http://localhost:3000/${r.imagen}"
             alt="Evidencia de falla"
             style="max-width:100%; border-radius:8px;">
      `;
    } else {
      contenedorFoto.innerHTML = '<p class="sin-imagen">Sin imagen adjunta</p>';
    }

    // ─── Mostrar contenido ────────────────────────────────────
    cargando.style.display  = 'none';
    contenido.style.display = 'block';

  } catch (error) {
    cargando.textContent = 'No se pudo conectar con el servidor.';
    console.error('Error al cargar detalle:', error);
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