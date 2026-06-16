// gestionA.js — Bandeja de reportes para Autoridad

const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', async () => {
  await cargarAlcaldiasGestion();
  await cargarReportes();

  document.getElementById('btn-filtrar').addEventListener('click', cargarReportes);
});

// ─── Cargar alcaldías en el filtro ──────────────────────────
async function cargarAlcaldiasGestion() {
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
async function cargarReportes() {
  const lista       = document.getElementById('lista-gestion');
  const cargando    = document.getElementById('cargando-gestion');
  const sinReportes = document.getElementById('sin-reportes-gestion');

  lista.style.display       = 'none';
  sinReportes.style.display = 'none';
  cargando.style.display    = 'block';
  cargando.textContent      = 'Cargando reportes...';

  // Construir query con filtros
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

    lista.innerHTML    = datos.data.map(r => crearTarjetaAdmin(r)).join('');
    lista.style.display = 'block';

  } catch (error) {
    cargando.textContent = 'No se pudo conectar con el servidor.';
    console.error('Error al cargar reportes:', error);
  }
}

// ─── Tarjeta de reporte ──────────────────────────────────────
function crearTarjetaAdmin(r) {
  const fecha = new Date(r.fecha_creacion).toLocaleDateString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
  const claseEstado = obtenerClaseEstado(r.estado);

  return `
    <div class="tarjeta-reporte-admin">
      <div class="info-admin">
        <div class="encabezado-tarjeta">
          <span class="id-reporte">#${String(r.folio).padStart(4, '0')}</span>
          <span class="estado ${claseEstado}">${r.estado}</span>
        </div>
        <div class="detalles-texto">
          <h3>${r.tipo_problema}</h3>
          <p class="ubicacion-reporte">📍 ${r.nombre_alcaldia}, Col. ${r.nombre_colonia}, ${r.calle}</p>
          <p class="fecha-reporte">📅 Reportado: ${fecha} | ⏱️ ${r.tiempo_falla || 'No especificado'}</p>
        </div>
      </div>
      <div class="acciones-admin">
        <a href="revisarA.html?id=${r.id_reporte}" class="btn-revisar">Atender / Revisar 📋</a>
      </div>
    </div>
  `;
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