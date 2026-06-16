// revisarA.js — Revisar y actualizar estado de un reporte

const API_URL = 'http://localhost:3000/api';
let idUsuarioReporte = null; // se llena al cargar el reporte

document.addEventListener('DOMContentLoaded', async () => {
  const params    = new URLSearchParams(window.location.search);
  const idReporte = params.get('id');

  if (!idReporte) {
    document.getElementById('cargando-revision').textContent =
      'No se especificó un reporte. Vuelve a la bandeja.';
    return;
  }

  await cargarReporte(idReporte);

  document.getElementById('btn-actualizar').addEventListener('click', () => {
    actualizarEstado(idReporte);
  });

  document.getElementById('btn-reportar-usuario').addEventListener('click', reportarUsuario);
});

// ─── Cargar datos del reporte ────────────────────────────────
async function cargarReporte(idReporte) {
  const cargando  = document.getElementById('cargando-revision');
  const contenido = document.getElementById('contenido-revision');

  try {
    const respuesta = await fetch(`${API_URL}/reportes/${idReporte}`, {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      cargando.textContent = datos.message || 'Error al cargar el reporte.';
      return;
    }

    const r = datos.data;
    idUsuarioReporte = r.id_usuario; // guardamos para el botón de reportar

    document.getElementById('titulo-folio').textContent  = `#${String(r.folio).padStart(4, '0')}`;
    document.getElementById('rev-tipo').textContent      = r.tipo_problema;
    document.getElementById('rev-tiempo').textContent    = r.tiempo_falla || 'No especificado';
    document.getElementById('rev-ubicacion').textContent =
      `📍 ${r.nombre_alcaldia}, Col. ${r.nombre_colonia}, ${r.calle} #${r.numero_casa}`;
    document.getElementById('rev-comentarios').textContent =
      `"${r.desc_extra || 'Sin comentarios adicionales.'}"`;

    // Estado actual
    const spanEstado = document.getElementById('rev-estado-actual');
    spanEstado.textContent = r.estado;
    spanEstado.className   = `badge-estado ${obtenerClaseEstado(r.estado)}`;

    // Imagen
    const foto = document.getElementById('rev-foto');
    foto.innerHTML = r.imagen
      ? `<img src="http://localhost:3000/${r.imagen}" alt="Evidencia" style="max-width:100%; border-radius:8px;">`
      : '<p class="sin-imagen">Sin imagen adjunta</p>';

    cargando.style.display  = 'none';
    contenido.style.display = 'block';

  } catch (error) {
    cargando.textContent = 'No se pudo conectar con el servidor.';
    console.error('Error:', error);
  }
}

// ─── Actualizar estado del reporte ──────────────────────────
async function actualizarEstado(idReporte) {
  const nuevoEstado = document.getElementById('nuevo-estado').value;
  const btnActualizar = document.getElementById('btn-actualizar');

  document.getElementById('error-estado').textContent = '';
  document.getElementById('error-general-rev').textContent = '';

  if (!nuevoEstado) {
    document.getElementById('error-estado').textContent = 'Selecciona un nuevo estado';
    return;
  }

  btnActualizar.disabled    = true;
  btnActualizar.textContent = 'Guardando...';

  try {
    const respuesta = await fetch(`${API_URL}/reportes/${idReporte}/estado`, {
      method:  'PUT',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ id_estado: nuevoEstado })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      document.getElementById('error-general-rev').textContent = datos.message;
      return;
    }

    alert('Estado actualizado correctamente');
    window.location.href = 'gestionA.html';

  } catch (error) {
    document.getElementById('error-general-rev').textContent =
      'No se pudo conectar con el servidor.';
    console.error('Error:', error);

  } finally {
    btnActualizar.disabled    = false;
    btnActualizar.textContent = 'Guardar Actualización';
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

// ─── Reportar al ciudadano emisor ────────────────────────────
async function reportarUsuario() {
  const motivo = document.getElementById('motivo-reporte-usuario').value.trim();
  const btn    = document.getElementById('btn-reportar-usuario');

  document.getElementById('error-reportar-usuario').textContent = '';

  if (motivo.length < 5) {
    document.getElementById('error-reportar-usuario').textContent =
      'Describe el motivo (mínimo 5 caracteres)';
    return;
  }

  if (!idUsuarioReporte) {
    document.getElementById('error-reportar-usuario').textContent =
      'No se pudo identificar al usuario de este reporte';
    return;
  }

  const confirmado = confirm('¿Marcar a este usuario para revisión del administrador?');
  if (!confirmado) return;

  btn.disabled    = true;
  btn.textContent = 'Reportando...';

  try {
    const respuesta = await fetch(`${API_URL}/usuarios/${idUsuarioReporte}/reportar`, {
      method:  'PUT',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ motivo })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      document.getElementById('error-reportar-usuario').textContent = datos.message;
      return;
    }

    alert('Usuario marcado correctamente para revisión del administrador.');
    document.getElementById('motivo-reporte-usuario').value = '';

  } catch (error) {
    document.getElementById('error-reportar-usuario').textContent = 'No se pudo conectar con el servidor.';
    console.error('Error:', error);

  } finally {
    btn.disabled    = false;
    btn.textContent = 'Reportar Ciudadano';
  }
}