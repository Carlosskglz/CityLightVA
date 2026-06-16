// registro.js — Frontend
// Se enlaza en registroU.html
 
document.addEventListener('DOMContentLoaded', () => {
 
  const form       = document.getElementById('form-registro');
  const btnGuardar = document.getElementById('btn-registro');
 
  // ─── Validaciones ───────────────────────────────────────────
  function validarFormulario(nombre, correo, telefono, contrasena, confirmar) {
    let valido = true;
    limpiarErrores();
 
    if (!nombre || nombre.trim().length < 2) {
      mostrarError('error-nombre', 'El nombre debe tener mínimo 2 caracteres');
      valido = false;
    }
 
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
 
    if (!telefono || telefono.trim() === '') {
      mostrarError('error-telefono', 'El teléfono es obligatorio');
      valido = false;
    } else {
      // Solo números, exactamente 10 dígitos
      const telRegex = /^[0-9]{10}$/;
      if (!telRegex.test(telefono.trim())) {
        mostrarError('error-telefono', 'El teléfono debe tener exactamente 10 dígitos');
        valido = false;
      }
    }
 
    if (!contrasena || contrasena.length < 8) {
      mostrarError('error-contrasena', 'La contraseña debe tener mínimo 8 caracteres');
      valido = false;
    }
 
    if (contrasena !== confirmar) {
      mostrarError('error-confirmar', 'Las contraseñas no coinciden');
      valido = false;
    }
 
    return valido;
  }
 
  // ─── Submit ─────────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
 
    const nombre     = document.getElementById('nombre-registro').value.trim();
    const correo     = document.getElementById('correo-registro').value.trim();
    const telefono   = document.getElementById('telefono-registro').value.trim();
    const contrasena = document.getElementById('contrasena-registro').value;
    const confirmar  = document.getElementById('confirmar-registro').value;
 
    if (!validarFormulario(nombre, correo, telefono, contrasena, confirmar)) return;
 
    btnGuardar.disabled    = true;
    btnGuardar.textContent = 'Registrando...';
 
    try {
      const respuesta = await fetch('http://localhost:3000/api/auth/registro', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_usuario:       nombre,
          correo_usuario:       correo,
          telefono_usuario:     telefono,
          contrasena_usuario:   contrasena,
          confirmar_contrasena: confirmar
        })
      });
 
      const datos = await respuesta.json();
 
      if (!respuesta.ok) {
        mostrarError('error-general', datos.message);
        return;
      }
 
      // Éxito — guardar mensaje y redirigir al login
      sessionStorage.setItem('mensaje-registro', '¡Cuenta creada! Ya puedes iniciar sesión.');
      window.location.href = 'loginU.html';
 
    } catch (error) {
      mostrarError('error-general', 'No se pudo conectar con el servidor. Verifica que esté corriendo.');
      console.error('Error en registro:', error);
 
    } finally {
      btnGuardar.disabled    = false;
      btnGuardar.textContent = 'Registrarse';
    }
  });
 
  // ─── Helpers ────────────────────────────────────────────────
  function mostrarError(idElemento, mensaje) {
    const el = document.getElementById(idElemento);
    if (el) el.textContent = mensaje;
  }
 
  function limpiarErrores() {
    ['error-nombre', 'error-correo', 'error-telefono',
     'error-contrasena', 'error-confirmar', 'error-general'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
  }
 
});