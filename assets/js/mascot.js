// ===== Comportamiento de la mascota =====
document.addEventListener('DOMContentLoaded', () => {
  const mascot = document.querySelector('.mascot-container');
  if (!mascot) return;

  // Interacción básica: efecto al pasar el mouse
  mascot.addEventListener('mouseenter', () => {
    mascot.style.transform = 'scale(1.1)';
  });

  mascot.addEventListener('mouseleave', () => {
    mascot.style.transform = 'scale(1)';
  });

  // Aquí podrías agregar más lógica, como seguir el mouse o diálogos aleatorios
  console.log("Mascota inicializada.");
});
