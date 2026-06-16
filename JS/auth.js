// auth.js — Guardián de páginas protegidas
// Se enlaza EN PRIMER LUGAR (antes que otros scripts) en todas
// las páginas internas: inicioU, reportarU, gestionA, verReportesAd
// Cada página le dice a este script qué rol espera mediante


 (function () {

  const token = sessionStorage.getItem('token');
  const rol   = sessionStorage.getItem('rol');
  const rolRequerido = document.body.dataset.rolRequerido;

  // ─── Mapeo de rol → página de login correspondiente ─────────
  const loginPorRol = {
    usuario:       '../USUARIO/loginU.html',
    autoridad:     '../AUTORIDAD/loginA.html',
    administrador: '../ADMINISTRADOR/loginAd.html'
  };

  // ─── Mapeo de rol → página de inicio correspondiente ────────
  const iniciosPorRol = {
    usuario:       '../USUARIO/inicioU.html',
    autoridad:     '../AUTORIDAD/inicioA.html',
    administrador: '../ADMINISTRADOR/inicioAd.html'
  };

  // 1. ¿No hay sesión activa? → Expulsar al login de este módulo
  if (!token || !rol) {
    window.location.href = loginPorRol[rolRequerido] || '../index.html';
    return; // detener ejecución, no mostrar nada de la página
  }

  // 2. ¿El rol de la sesión no coincide con el de esta página?
  //    Ej: un "usuario" intentando abrir gestionA.html directamente
  if (rolRequerido && rol !== rolRequerido) {
    // Lo regresamos a SU propio inicio, no al login
    window.location.href = iniciosPorRol[rol] || '../index.html';
    return;
  }

  // 3. Todo correcto — mostrar el nombre del usuario si existe el elemento
  //    Cualquier página puede tener <span id="nombre-usuario-sesion"></span>
  document.addEventListener('DOMContentLoaded', () => {
    const elNombre = document.getElementById('nombre-usuario-sesion');
    if (elNombre) {
      elNombre.textContent = sessionStorage.getItem('nombre_usuario') || '';
    }
  });

})();


// ─── Función global de cerrar sesión ──────────────────────────
// Cualquier página puede llamar a cerrarSesion() desde un botón:
// <button onclick="cerrarSesion()">Cerrar sesión</button>
function cerrarSesion() {
  const rol = sessionStorage.getItem('rol');

  const loginPorRol = {
    usuario:       '../USUARIO/loginU.html',
    autoridad:     '../AUTORIDAD/loginA.html',
    administrador: '../ADMINISTRADOR/loginAd.html'
  };

  sessionStorage.clear(); // borra token, rol, nombre, id

  window.location.href = loginPorRol[rol] || '../index.html';
}
