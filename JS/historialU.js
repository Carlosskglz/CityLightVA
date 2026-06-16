// historialU.js — Historial de reportes del usuario

const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', async () => {
  await cargarMisReportes();
});

async function cargarMisReportes() {
  const lista        = document.getElementById('lista-reportes');
  const cargando     = document.getElementById('cargando-reportes');
  const sinReportes  = document.getElementById('sin-reportes');

  try {
    const respuesta = await fetch(`${API_URL}/reportes/mis-reportes`, {
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('token')}`
      }
    });

    const datos = await respuesta.json();

    // Ocultar mensaje de carga
    cargando.style.display = 'none';

    if (!respuesta.ok) {
      cargando.textContent = 'Error al cargar los reportes.';
      cargando.style.display = 'block';
      return;
    }

    // Sin reportes
    if (datos.data.length === 0) {
      sinReportes.style.display = 'block';
      return;
    }

    // Generar tarjetas con el mismo diseño que tenías
    lista.style.display = 'block';
    lista.innerHTML = datos.data.map(reporte => crearTarjeta(reporte)).join('');

  } catch (error) {
    cargando.textContent = 'No se pudo conectar con el servidor.';
    cargando.style.display = 'block';
    console.error('Error al cargar reportes:', error);
  }
}

// ─── Genera el HTML de cada tarjeta ─────────────────────────
function crearTarjeta(reporte) {
  const fecha = new Date(reporte.fecha_creacion).toLocaleDateString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  // Clase CSS según el estado (igual que tus clases actuales)
  const claseEstado = obtenerClaseEstado(reporte.estado);

  return `
    <div class="tarjeta-reporte">
      <div class="info-principal">
        <span class="id-reporte">#${String(reporte.folio).padStart(4, '0')}</span>
        <div class="detalles-texto">
          <h3>${reporte.tipo_problema}</h3>
          <p class="ubicacion-reporte">
            📍 ${reporte.nombre_alcaldia}, Col. ${reporte.nombre_colonia}, ${reporte.calle}
          </p>
          <p class="fecha-reporte">📅 Enviado el: ${fecha}</p>
        </div>
      </div>
      <div class="acciones-reporte">
        <span class="estado ${claseEstado}">${reporte.estado}</span>
        <a href="detalleU.html?id=${reporte.id_reporte}" class="btn-abrir">Abrir 👁️</a>
      </div>
    </div>
  `;
}

// ─── Mapea el estado de la BD a la clase CSS que ya tienes ──
function obtenerClaseEstado(estado) {
  switch (estado) {
    case 'Pendiente':   return 'pendiente';
    case 'En proceso':  return 'revision';
    case 'Resuelto':    return 'reparada';
    case 'Rechazado':   return 'rechazado';
    default:            return 'pendiente';
  }
}