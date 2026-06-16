// personalAd.js — Consola de Personal (Administrador)
// Crear cuentas de autoridad/admin, listar usuarios, banear,
// quitar marcas de reporte y eliminar cuentas.

const API_URL = 'http://localhost:3000/api';

let usuariosCache = []; // guardamos la lista completa para filtrar sin re-pedir

document.addEventListener('DOMContentLoaded', async () => {
  await cargarUsuarios();

  document.getElementById('form-nueva-cuenta').addEventListener('submit', crearCuenta);

  // Filtros — cada cambio vuelve a pintar la tabla con la caché
  document.getElementById('filtro-rol-personal').addEventListener('change', renderTabla);
  document.getElementById('filtro-estado-personal').addEventListener('change', renderTabla);
  document.getElementById('filtro-reportados').addEventListener('change', renderTabla);
});


// ============================================================
// Cargar usuarios desde el backend
// ============================================================
async function cargarUsuarios() {
  const cargando      = document.getElementById('cargando-personal');
  const tablaWrapper  = document.getElementById('contenedor-tabla-personal');
  const sinResultados = document.getElementById('sin-resultados-personal');

  cargando.style.display      = 'block';
  tablaWrapper.style.display  = 'none';
  sinResultados.style.display = 'none';

  try {
    const respuesta = await fetch(`${API_URL}/usuarios`, {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      cargando.textContent = datos.message || 'Error al cargar las cuentas.';
      return;
    }

    usuariosCache = datos.data;
    cargando.style.display = 'none';
    renderTabla();

  } catch (error) {
    cargando.textContent = 'No se pudo conectar con el servidor.';
    console.error('Error al cargar usuarios:', error);
  }
}


// ============================================================
// Pintar la tabla aplicando los filtros activos
// ============================================================
function renderTabla() {
  const tablaWrapper  = document.getElementById('contenedor-tabla-personal');
  const sinResultados = document.getElementById('sin-resultados-personal');
  const tbody         = document.getElementById('tbody-personal');
  const contador      = document.getElementById('contador-personal');

  const filtroRol        = document.getElementById('filtro-rol-personal').value;
  const filtroEstado     = document.getElementById('filtro-estado-personal').value;
  const soloReportados   = document.getElementById('filtro-reportados').checked;

  const idPropio = parseInt(sessionStorage.getItem('id_usuario'));

  const filtrados = usuariosCache.filter(u => {
    if (filtroRol && u.rol !== filtroRol) return false;
    if (filtroEstado === 'activo'  && !u.activo) return false;
    if (filtroEstado === 'baneado' && u.activo)  return false;
    if (soloReportados && !u.reportado) return false;
    return true;
  });

  contador.textContent = `${filtrados.length} de ${usuariosCache.length}`;

  if (filtrados.length === 0) {
    tablaWrapper.style.display  = 'none';
    sinResultados.style.display = 'block';
    return;
  }

  sinResultados.style.display = 'none';
  tablaWrapper.style.display  = 'block';

  tbody.innerHTML = filtrados.map(u => crearFila(u, idPropio)).join('');

  // Conectar eventos de los botones generados
  tbody.querySelectorAll('.btn-banear, .btn-reactivar').forEach(btn => {
    btn.addEventListener('click', () => toggleBaneo(btn.dataset.id));
  });

  tbody.querySelectorAll('.btn-quitar-marca').forEach(btn => {
    btn.addEventListener('click', () => quitarMarca(btn.dataset.id));
  });

  tbody.querySelectorAll('.btn-eliminar-personal').forEach(btn => {
    btn.addEventListener('click', () => eliminarCuenta(btn.dataset.id, btn.dataset.nombre));
  });
}


// ============================================================
// Generar una fila de la tabla
// ============================================================
function crearFila(u, idPropio) {
  const esPropio   = u.id_usuario === idPropio;
  const claseFila  = [
    !u.activo ? 'fila-baneada' : '',
    u.reportado ? 'fila-reportada' : ''
  ].join(' ').trim();

  const idFormateado = `U-${String(u.id_usuario).padStart(3, '0')}`;

  const estadoHtml = u.activo
    ? `<span class="estado-cuenta"><span class="dot activo"></span> Activa</span>`
    : `<span class="estado-cuenta"><span class="dot baneado"></span> Suspendida</span>`;

  const alertaHtml = u.reportado
    ? `<span class="badge-reportado" title="${escaparTexto(u.motivo_reporte || 'Sin motivo especificado')}">🚩 Reportado</span>`
    : `<span class="sin-alertas">—</span>`;

  // Botón banear/reactivar — deshabilitado para la propia cuenta
  const btnBaneo = u.activo
    ? `<button class="btn-accion-personal btn-banear" data-id="${u.id_usuario}" ${esPropio ? 'disabled' : ''}>Suspender</button>`
    : `<button class="btn-accion-personal btn-reactivar" data-id="${u.id_usuario}" ${esPropio ? 'disabled' : ''}>Reactivar</button>`;

  // Botón quitar marca — solo si está reportado
  const btnMarca = u.reportado
    ? `<button class="btn-accion-personal btn-quitar-marca" data-id="${u.id_usuario}">Quitar marca</button>`
    : '';

  // Botón eliminar — deshabilitado para la propia cuenta
  const btnEliminar =
    `<button class="btn-accion-personal btn-eliminar-personal" data-id="${u.id_usuario}" data-nombre="${escaparTexto(u.nombre_usuario)}" ${esPropio ? 'disabled' : ''}>Eliminar</button>`;

  return `
    <tr class="${claseFila}">
      <td><span class="id-sistema">${idFormateado}</span></td>
      <td>${escaparTexto(u.nombre_usuario)}${esPropio ? ' <em>(tú)</em>' : ''}</td>
      <td>${escaparTexto(u.correo_usuario)}</td>
      <td><span class="badge-rol ${u.rol}">${u.rol}</span></td>
      <td>${estadoHtml}</td>
      <td>${alertaHtml}</td>
      <td>
        <div class="acciones-personal">
          ${btnBaneo}
          ${btnMarca}
          ${btnEliminar}
        </div>
      </td>
    </tr>
  `;
}


// ============================================================
// Crear nueva cuenta de autoridad/administrador
// ============================================================
async function crearCuenta(e) {
  e.preventDefault();

  limpiarErroresPersonal();

  const nombre     = document.getElementById('nombre-personal').value.trim();
  const correo     = document.getElementById('correo-personal').value.trim();
  const telefono   = document.getElementById('telefono-personal').value.trim();
  const rol        = document.getElementById('rol-personal').value;
  const contrasena = document.getElementById('contrasena-personal').value;
  const confirmar  = document.getElementById('confirmar-personal').value;

  if (!validarFormularioPersonal(nombre, correo, telefono, rol, contrasena, confirmar)) return;

  const btn = document.getElementById('btn-crear-personal');
  btn.disabled    = true;
  btn.textContent = 'Creando...';

  try {
    const respuesta = await fetch(`${API_URL}/usuarios`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({
        nombre_usuario:     nombre,
        correo_usuario:     correo,
        telefono_usuario:   telefono,
        contrasena_usuario: contrasena,
        rol
      })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      mostrarErrorPersonal('error-general-personal', datos.message);
      return;
    }

    // Éxito — limpiar formulario y recargar tabla
    document.getElementById('form-nueva-cuenta').reset();
    await cargarUsuarios();
    alert(datos.message);

  } catch (error) {
    mostrarErrorPersonal('error-general-personal', 'No se pudo conectar con el servidor.');
    console.error('Error al crear cuenta:', error);

  } finally {
    btn.disabled    = false;
    btn.textContent = 'Crear Cuenta';
  }
}

function validarFormularioPersonal(nombre, correo, telefono, rol, contrasena, confirmar) {
  let valido = true;

  if (!nombre || nombre.length < 2) {
    mostrarErrorPersonal('error-nombre-personal', 'Mínimo 2 caracteres');
    valido = false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!correo || !emailRegex.test(correo)) {
    mostrarErrorPersonal('error-correo-personal', 'Correo no válido');
    valido = false;
  }

  if (!telefono || !/^[0-9]{10}$/.test(telefono)) {
    mostrarErrorPersonal('error-telefono-personal', 'Debe tener 10 dígitos');
    valido = false;
  }

  if (!rol) {
    mostrarErrorPersonal('error-rol-personal', 'Selecciona un rol');
    valido = false;
  }

  if (!contrasena || contrasena.length < 8) {
    mostrarErrorPersonal('error-contrasena-personal', 'Mínimo 8 caracteres');
    valido = false;
  }

  if (contrasena !== confirmar) {
    mostrarErrorPersonal('error-confirmar-personal', 'No coinciden');
    valido = false;
  }

  return valido;
}


// ============================================================
// Banear / Reactivar cuenta
// ============================================================
async function toggleBaneo(id) {
  const usuario = usuariosCache.find(u => u.id_usuario == id);
  const accion  = usuario.activo ? 'suspender' : 'reactivar';

  const confirmado = confirm(`¿Seguro que quieres ${accion} la cuenta de "${usuario.nombre_usuario}"?`);
  if (!confirmado) return;

  try {
    const respuesta = await fetch(`${API_URL}/usuarios/${id}/baneo`, {
      method:  'PUT',
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      alert(datos.message);
      return;
    }

    await cargarUsuarios();

  } catch (error) {
    alert('No se pudo conectar con el servidor.');
    console.error('Error al cambiar estado:', error);
  }
}


// ============================================================
// Quitar marca de reportado
// ============================================================
async function quitarMarca(id) {
  const confirmado = confirm('¿Quitar la marca de reporte de esta cuenta?');
  if (!confirmado) return;

  try {
    const respuesta = await fetch(`${API_URL}/usuarios/${id}/quitar-reporte`, {
      method:  'PUT',
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      alert(datos.message);
      return;
    }

    await cargarUsuarios();

  } catch (error) {
    alert('No se pudo conectar con el servidor.');
    console.error('Error al quitar marca:', error);
  }
}


// ============================================================
// Eliminar cuenta permanentemente
// ============================================================
async function eliminarCuenta(id, nombre) {
  const confirmado = confirm(
    `ATENCIÓN: Esto eliminará permanentemente la cuenta de "${nombre}". ¿Continuar?`
  );
  if (!confirmado) return;

  try {
    const respuesta = await fetch(`${API_URL}/usuarios/${id}`, {
      method:  'DELETE',
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      alert(datos.message);
      return;
    }

    await cargarUsuarios();

  } catch (error) {
    alert('No se pudo conectar con el servidor.');
    console.error('Error al eliminar cuenta:', error);
  }
}


// ============================================================
// Helpers
// ============================================================
function mostrarErrorPersonal(idElemento, mensaje) {
  const el = document.getElementById(idElemento);
  if (el) el.textContent = mensaje;
}

function limpiarErroresPersonal() {
  document.querySelectorAll('#form-nueva-cuenta .error').forEach(el => el.textContent = '');
}

// Evita que nombres/correos rompan el HTML si tienen < > & etc.
function escaparTexto(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}