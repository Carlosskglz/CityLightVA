// login.js — Frontend
// Mismo archivo para los 3 portales (loginU, loginA, loginAd)
// pero cada HTML le dice qué rol espera mediante un atributo data-*

document.addEventListener('DOMContentLoaded', () => {

  const form     = document.getElementById('form-login');
  const btnLogin = document.getElementById('btn-login');

  // ─── Detectar qué portal es este ───────────────────────────
  // Leemos un atributo data-rol-esperado en el <form>
  // Si no existe, significa "cualquier rol puede entrar" (no se usa, pero por seguridad)
  const rolEsperado = form.dataset.rolEsperado || null;

  // ─── Validación del formulario ─────────────────────────────
  function validarFormulario(correo, contrasena) {
    let valido = true;
    limpiarErrores();

    if (!correo || correo.trim() === '') {
      mostrarError('error-correo', 'El correo es obligatorio');
      valido = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correo)) {
        mostrarError('error-correo', 'Formato de correo inválido');
        valido = false;
      }
    }

    if (!contrasena || contrasena.trim() === '') {
      mostrarError('error-contrasena', 'La contraseña es obligatoria');
      valido = false;
    }

    return valido;
  }

  // ─── Evento submit ──────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const correo     = document.getElementById('correo-login').value.trim();
    const contrasena = document.getElementById('contrasena-login').value;

    if (!validarFormulario(correo, contrasena)) return;

    btnLogin.disabled    = true;
    btnLogin.textContent = 'Iniciando sesión...';

    try {
      const respuesta = await fetch('http://localhost:3000/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correo_usuario:     correo,
          contrasena_usuario: contrasena
        })
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        mostrarError('error-general', datos.message);
        return;
      }

      // ─── VALIDACIÓN DE PORTAL ────────────────────────────────
      // Si este formulario espera un rol específico y el rol
      // devuelto por el servidor NO coincide, se rechaza el acceso
      // aunque la contraseña sea correcta.
      if (rolEsperado && datos.data.rol !== rolEsperado) {
        mostrarError(
          'error-general',
          'Esta cuenta no tiene permisos para acceder a este portal.'
        );
        return; // no se guarda token, no se redirige
      }

      // Login exitoso y rol correcto — guardar sesión
      sessionStorage.setItem('token',          datos.data.token);
      sessionStorage.setItem('id_usuario',     datos.data.id_usuario);
      sessionStorage.setItem('nombre_usuario', datos.data.nombre_usuario);
      sessionStorage.setItem('rol',            datos.data.rol);

      redirigirSegunRol(datos.data.rol);

    } catch (error) {
      mostrarError('error-general', 'No se pudo conectar con el servidor. Verifica que esté corriendo.');
      console.error('Error en login:', error);

    } finally {
      btnLogin.disabled    = false;
      btnLogin.textContent = 'Iniciar sesión';
    }
  });

  // ─── Redirigir según rol ────────────────────────────────────
  function redirigirSegunRol(rol) {
    switch (rol) {
      case 'usuario':
        window.location.href = '../USUARIO/inicioU.html';
        break;
      case 'autoridad':
        window.location.href = '../AUTORIDAD/inicioA.html';
        break;
      case 'administrador':
        window.location.href = '../ADMINISTRADOR/inicioAd.html';
        break;
      default:
        mostrarError('error-general', 'Rol no reconocido, contacta al administrador');
    }
  }

  // ─── Helpers ────────────────────────────────────────────────
  function mostrarError(idElemento, mensaje) {
    const el = document.getElementById(idElemento);
    if (el) el.textContent = mensaje;
  }

  function limpiarErrores() {
    ['error-correo', 'error-contrasena', 'error-general'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
  }

});