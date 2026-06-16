// catalogosAd.js — Control de Catálogos (Administrador)
// Permite agregar/eliminar alcaldías, colonias y tipos de falla

const API_URL = 'http://localhost:3000/api';

let alcaldiasCache = [];
let coloniasCache  = [];

document.addEventListener('DOMContentLoaded', async () => {
  await cargarAlcaldias();
  await cargarColonias();
  await cargarProblemas();

  document.getElementById('form-alcaldia').addEventListener('submit', agregarAlcaldia);
  document.getElementById('form-colonia').addEventListener('submit', agregarColonia);
  document.getElementById('form-problema').addEventListener('submit', agregarProblema);

  document.getElementById('filtro-alcaldia-colonias').addEventListener('change', renderColonias);
});


// ============================================================
// ALCALDÍAS
// ============================================================
async function cargarAlcaldias() {
  const cargando = document.getElementById('cargando-alcaldias');
  const tabla    = document.getElementById('contenedor-tabla-alcaldias');

  try {
    const respuesta = await fetch(`${API_URL}/catalogos/alcaldias`, {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
    });
    const datos = await respuesta.json();

    if (!respuesta.ok) {
      cargando.textContent = datos.message || 'Error al cargar alcaldías.';
      return;
    }

    alcaldiasCache = datos.data;
    cargando.style.display = 'none';
    tabla.style.display    = 'block';

    renderAlcaldias();
    llenarSelectsAlcaldia();

  } catch (error) {
    cargando.textContent = 'No se pudo conectar con el servidor.';
    console.error('Error:', error);
  }
}

function renderAlcaldias() {
  const tbody = document.getElementById('tbody-alcaldias');

  tbody.innerHTML = alcaldiasCache.map(a => `
    <tr>
      <td><span class="id-sistema">A-${String(a.id_alcaldia).padStart(3, '0')}</span></td>
      <td>${escaparTexto(a.nombre_alcaldia)}</td>
      <td><button class="btn-eliminar-catalogo" data-tipo="alcaldia" data-id="${a.id_alcaldia}">Eliminar</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.btn-eliminar-catalogo').forEach(btn => {
    btn.addEventListener('click', () => eliminarItem(btn.dataset.tipo, btn.dataset.id));
  });
}

// Llena el select del formulario de colonia y el filtro de la tabla de colonias
function llenarSelectsAlcaldia() {
  const selectForm   = document.getElementById('alcaldia-colonia-nueva');
  const selectFiltro = document.getElementById('filtro-alcaldia-colonias');

  const valorActualForm   = selectForm.value;
  const valorActualFiltro = selectFiltro.value;

  selectForm.innerHTML   = '<option value="" selected disabled>Selecciona alcaldía</option>';
  selectFiltro.innerHTML = '<option value="">Todas las alcaldías</option>';

  alcaldiasCache.forEach(a => {
    const opt1 = document.createElement('option');
    opt1.value = a.id_alcaldia;
    opt1.textContent = a.nombre_alcaldia;
    selectForm.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = a.id_alcaldia;
    opt2.textContent = a.nombre_alcaldia;
    selectFiltro.appendChild(opt2);
  });

  // Restaurar selección previa si sigue existiendo
  if (valorActualForm)   selectForm.value   = valorActualForm;
  if (valorActualFiltro) selectFiltro.value = valorActualFiltro;
}

async function agregarAlcaldia(e) {
  e.preventDefault();

  const input = document.getElementById('nombre-alcaldia-nueva');
  const error = document.getElementById('error-alcaldia');
  error.textContent = '';

  const nombre = input.value.trim();
  if (nombre.length < 2) {
    error.textContent = 'El nombre debe tener al menos 2 caracteres';
    return;
  }

  const btn = e.target.querySelector('button');
  btn.disabled = true;

  try {
    const respuesta = await fetch(`${API_URL}/catalogos/alcaldias`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ nombre_alcaldia: nombre })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      error.textContent = datos.message;
      return;
    }

    input.value = '';
    await cargarAlcaldias();

  } catch (err) {
    error.textContent = 'No se pudo conectar con el servidor.';
    console.error(err);
  } finally {
    btn.disabled = false;
  }
}


// ============================================================
// COLONIAS
// ============================================================
async function cargarColonias() {
  const cargando = document.getElementById('cargando-colonias');

  try {
    const respuesta = await fetch(`${API_URL}/catalogos/colonias`, {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
    });
    const datos = await respuesta.json();

    if (!respuesta.ok) {
      cargando.textContent = datos.message || 'Error al cargar colonias.';
      return;
    }

    coloniasCache = datos.data;
    cargando.style.display = 'none';
    renderColonias();

  } catch (error) {
    cargando.textContent = 'No se pudo conectar con el servidor.';
    console.error('Error:', error);
  }
}

function renderColonias() {
  const tabla       = document.getElementById('contenedor-tabla-colonias');
  const sinColonias = document.getElementById('sin-colonias');
  const tbody       = document.getElementById('tbody-colonias');
  const filtro      = document.getElementById('filtro-alcaldia-colonias').value;

  const filtradas = filtro
    ? coloniasCache.filter(c => c.id_alcaldia == filtro)
    : coloniasCache;

  if (filtradas.length === 0) {
    tabla.style.display       = 'none';
    sinColonias.style.display = 'block';
    return;
  }

  sinColonias.style.display = 'none';
  tabla.style.display       = 'block';

  tbody.innerHTML = filtradas.map(c => `
    <tr>
      <td><span class="id-sistema">C-${String(c.id_colonia).padStart(3, '0')}</span></td>
      <td>${escaparTexto(c.nombre_colonia)}</td>
      <td>${escaparTexto(c.nombre_alcaldia)}</td>
      <td><button class="btn-eliminar-catalogo" data-tipo="colonia" data-id="${c.id_colonia}">Eliminar</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.btn-eliminar-catalogo').forEach(btn => {
    btn.addEventListener('click', () => eliminarItem(btn.dataset.tipo, btn.dataset.id));
  });
}

async function agregarColonia(e) {
  e.preventDefault();

  const selectAlcaldia = document.getElementById('alcaldia-colonia-nueva');
  const inputNombre    = document.getElementById('nombre-colonia-nueva');
  const error          = document.getElementById('error-colonia');
  error.textContent = '';

  const idAlcaldia = selectAlcaldia.value;
  const nombre     = inputNombre.value.trim();

  if (!idAlcaldia) {
    error.textContent = 'Selecciona una alcaldía';
    return;
  }
  if (nombre.length < 2) {
    error.textContent = 'El nombre debe tener al menos 2 caracteres';
    return;
  }

  const btn = e.target.querySelector('button');
  btn.disabled = true;

  try {
    const respuesta = await fetch(`${API_URL}/catalogos/colonias`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ nombre_colonia: nombre, id_alcaldia: idAlcaldia })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      error.textContent = datos.message;
      return;
    }

    inputNombre.value = '';
    await cargarColonias();

  } catch (err) {
    error.textContent = 'No se pudo conectar con el servidor.';
    console.error(err);
  } finally {
    btn.disabled = false;
  }
}


// ============================================================
// TIPOS DE FALLA
// ============================================================
async function cargarProblemas() {
  const cargando = document.getElementById('cargando-problemas');
  const tabla    = document.getElementById('contenedor-tabla-problemas');

  try {
    const respuesta = await fetch(`${API_URL}/catalogos/problemas`, {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
    });
    const datos = await respuesta.json();

    if (!respuesta.ok) {
      cargando.textContent = datos.message || 'Error al cargar tipos de falla.';
      return;
    }

    cargando.style.display = 'none';
    tabla.style.display    = 'block';

    const tbody = document.getElementById('tbody-problemas');
    tbody.innerHTML = datos.data.map(p => `
      <tr>
        <td><span class="id-sistema">P-${String(p.id_problema).padStart(3, '0')}</span></td>
        <td>${escaparTexto(p.tipo_problema)}</td>
        <td><button class="btn-eliminar-catalogo" data-tipo="problema" data-id="${p.id_problema}">Eliminar</button></td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-eliminar-catalogo').forEach(btn => {
      btn.addEventListener('click', () => eliminarItem(btn.dataset.tipo, btn.dataset.id));
    });

  } catch (error) {
    cargando.textContent = 'No se pudo conectar con el servidor.';
    console.error('Error:', error);
  }
}

async function agregarProblema(e) {
  e.preventDefault();

  const input = document.getElementById('nombre-problema-nuevo');
  const error = document.getElementById('error-problema');
  error.textContent = '';

  const nombre = input.value.trim();
  if (nombre.length < 3) {
    error.textContent = 'El nombre debe tener al menos 3 caracteres';
    return;
  }

  const btn = e.target.querySelector('button');
  btn.disabled = true;

  try {
    const respuesta = await fetch(`${API_URL}/catalogos/problemas`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ tipo_problema: nombre })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      error.textContent = datos.message;
      return;
    }

    input.value = '';
    await cargarProblemas();

  } catch (err) {
    error.textContent = 'No se pudo conectar con el servidor.';
    console.error(err);
  } finally {
    btn.disabled = false;
  }
}


// ============================================================
// ELIMINAR (genérico para los 3 catálogos)
// ============================================================
async function eliminarItem(tipo, id) {
  const nombresPlural = {
    alcaldia: 'alcaldías',
    colonia:  'colonias',
    problema: 'problemas'
  };
  const endpoint = `${tipo}s`; // alcaldia -> alcaldias, colonia -> colonias, problema -> problemas

  const confirmado = confirm(`¿Eliminar este registro de ${nombresPlural[tipo]}? Esta acción no se puede deshacer.`);
  if (!confirmado) return;

  try {
    const respuesta = await fetch(`${API_URL}/catalogos/${endpoint}/${id}`, {
      method:  'DELETE',
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      alert(datos.message);
      return;
    }

    // Recargar el catálogo correspondiente
    if (tipo === 'alcaldia') await cargarAlcaldias();
    if (tipo === 'colonia')  await cargarColonias();
    if (tipo === 'problema') await cargarProblemas();

    // Si se eliminó una alcaldía, las colonias también deben refrescarse
    if (tipo === 'alcaldia') await cargarColonias();

  } catch (error) {
    alert('No se pudo conectar con el servidor.');
    console.error('Error al eliminar:', error);
  }
}


// ─── Helper ───────────────────────────────────────────────
function escaparTexto(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}