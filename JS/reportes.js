// reportes.js — Frontend
// Se enlaza en reportarU.html (y más adelante en historialU, gestionA, etc.)

const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {

  // Si este script se carga en reportarU.html, inicializamos el formulario
  const formReporte = document.getElementById('form-reporte');
  if (formReporte) {
    inicializarFormularioReporte();
  }

});


// ============================================================
// FORMULARIO DE REPORTE (reportarU.html)
// ============================================================
async function inicializarFormularioReporte() {

  const form          = document.getElementById('form-reporte');
  const selectAlcaldia = document.getElementById('alcaldia-reporte');
  const selectColonia  = document.getElementById('colonia-reporte');
  const selectProblema = document.getElementById('problema-reporte');
  const inputImagen    = document.getElementById('imagen-reporte');
  const nombreArchivo  = document.getElementById('nombre-archivo');
  const btnReportar    = document.getElementById('btn-reportar');

  // ─── 1. Cargar catálogos al iniciar ─────────────────────────
  await cargarAlcaldias();
  await cargarProblemas();

  // ─── 2. Cuando cambia la alcaldía, cargar sus colonias ──────
  selectAlcaldia.addEventListener('change', async () => {
    const idAlcaldia = selectAlcaldia.value;

    if (!idAlcaldia) {
      selectColonia.disabled = true;
      selectColonia.innerHTML = '<option value="" selected>Selecciona primero una alcaldía</option>';
      return;
    }

    await cargarColonias(idAlcaldia);
  });

  // ─── 3. Mostrar el nombre del archivo seleccionado ──────────
  inputImagen.addEventListener('change', () => {
    if (inputImagen.files.length > 0) {
      nombreArchivo.textContent = inputImagen.files[0].name;
    } else {
      nombreArchivo.textContent = '';
    }
  });

  // ─── 4. Envío del formulario ─────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validarFormularioReporte()) return;

    btnReportar.disabled    = true;
    btnReportar.textContent = 'Enviando...';

    try {
      // FormData permite enviar archivos junto con texto
      const formData = new FormData(form);

      const respuesta = await fetch(`${API_URL}/reportes`, {
        method: 'POST',
        headers: {
          // NO poner 'Content-Type' aquí — el navegador lo
          // configura automáticamente con el boundary correcto
          // cuando se usa FormData
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: formData
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        mostrarError('error-general', datos.message);
        return;
      }

      // Éxito — avisar y redirigir al historial
      alert(`¡Reporte enviado! Tu folio es: ${datos.data.folio}`);
      window.location.href = 'historialU.html';

    } catch (error) {
      mostrarError('error-general', 'No se pudo conectar con el servidor.');
      console.error('Error al enviar reporte:', error);

    } finally {
      btnReportar.disabled    = false;
      btnReportar.textContent = 'Enviar Reporte';
    }
  });

  // ─── Funciones de carga de catálogos ────────────────────────

  async function cargarAlcaldias() {
    try {
      const respuesta = await fetch(`${API_URL}/reportes/catalogos/alcaldias`);
      const datos     = await respuesta.json();

      datos.data.forEach(alcaldia => {
        const option = document.createElement('option');
        option.value = alcaldia.id_alcaldia;
        option.textContent = alcaldia.nombre_alcaldia;
        selectAlcaldia.appendChild(option);
      });
    } catch (error) {
      console.error('Error al cargar alcaldías:', error);
      mostrarError('error-general', 'No se pudieron cargar las alcaldías.');
    }
  }

  async function cargarColonias(idAlcaldia) {
    try {
      selectColonia.disabled = true;
      selectColonia.innerHTML = '<option value="" selected>Cargando colonias...</option>';

      const respuesta = await fetch(`${API_URL}/reportes/catalogos/colonias/${idAlcaldia}`);
      const datos     = await respuesta.json();

      selectColonia.innerHTML = '<option value="" selected>Selecciona tu colonia</option>';

      if (datos.data.length === 0) {
        selectColonia.innerHTML = '<option value="" selected>No hay colonias registradas</option>';
        return;
      }

      datos.data.forEach(colonia => {
        const option = document.createElement('option');
        option.value = colonia.id_colonia;
        option.textContent = colonia.nombre_colonia;
        selectColonia.appendChild(option);
      });

      selectColonia.disabled = false;

    } catch (error) {
      console.error('Error al cargar colonias:', error);
      selectColonia.innerHTML = '<option value="" selected>Error al cargar colonias</option>';
    }
  }

  async function cargarProblemas() {
    try {
      const respuesta = await fetch(`${API_URL}/reportes/catalogos/problemas`);
      const datos     = await respuesta.json();

      datos.data.forEach(problema => {
        const option = document.createElement('option');
        option.value = problema.id_problema;
        option.textContent = problema.tipo_problema;
        selectProblema.appendChild(option);
      });
    } catch (error) {
      console.error('Error al cargar tipos de problema:', error);
      mostrarError('error-general', 'No se pudieron cargar los tipos de falla.');
    }
  }

  // ─── Validación del formulario ──────────────────────────────
  function validarFormularioReporte() {
    let valido = true;
    limpiarErroresReporte();

    if (!selectAlcaldia.value) {
      mostrarError('error-alcaldia', 'Selecciona una alcaldía');
      valido = false;
    }
    if (!selectColonia.value) {
      mostrarError('error-colonia', 'Selecciona una colonia');
      valido = false;
    }

    const calle = document.getElementById('calle-reporte').value.trim();
    if (!calle) {
      mostrarError('error-calle', 'La calle es obligatoria');
      valido = false;
    }

    const numero = document.getElementById('numero-reporte').value.trim();
    if (!numero) {
      mostrarError('error-numero', 'El número es obligatorio (usa S/N si no tiene)');
      valido = false;
    }

    if (!selectProblema.value) {
      mostrarError('error-problema', 'Selecciona el tipo de falla');
      valido = false;
    }

    const comentarios = document.getElementById('comentarios-reporte').value.trim();
    if (comentarios.length < 5) {
      mostrarError('error-comentarios', 'Describe la falla con al menos 5 caracteres');
      valido = false;
    }

    // Validar imagen si se seleccionó una
    if (inputImagen.files.length > 0) {
      const archivo = inputImagen.files[0];
      const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

      if (!tiposPermitidos.includes(archivo.type)) {
        mostrarError('error-imagen', 'Solo se permiten imágenes JPG, PNG o WEBP');
        valido = false;
      }

      if (archivo.size > 5 * 1024 * 1024) {
        mostrarError('error-imagen', 'La imagen no debe pesar más de 5MB');
        valido = false;
      }
    }

    return valido;
  }

  function limpiarErroresReporte() {
    document.querySelectorAll('#form-reporte .error').forEach(el => el.textContent = '');
  }
}


// ─── Helper global de errores ──────────────────────────────
function mostrarError(idElemento, mensaje) {
  const el = document.getElementById(idElemento);
  if (el) el.textContent = mensaje;
}