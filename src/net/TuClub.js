// «Tu Club»: tu identidad en el juego. Partes del equipo base (una plantilla real del juego, por
// ejemplo el PSG) y le das tu nombre de usuario, tu nombre de club y tu logo. La plantilla no cambia.
import { getTeam } from '../data/TeamsData.js';

export const LIMITES = { usuario: 20, nombre: 24 };

/** Ajustes por defecto para un club nuevo (el primero de la lista de clubes). */
export function ajustesPorDefecto(clubesDisponibles) {
  return { usuario: 'Jugador', base: clubesDisponibles[0] || null, nombre: '', logo: null };
}

/** Devuelve la lista de errores de los ajustes (vacía si son válidos). */
export function validarTuClub(a) {
  const errores = [];
  if (!a.usuario || !a.usuario.trim()) errores.push('Escribe un nombre de usuario.');
  if ((a.usuario || '').length > LIMITES.usuario) errores.push(`El usuario no puede tener más de ${LIMITES.usuario} caracteres.`);
  if (!a.base || !getTeam(a.base)) errores.push('Elige un club base.');
  if ((a.nombre || '').length > LIMITES.nombre) errores.push(`El nombre del club no puede tener más de ${LIMITES.nombre} caracteres.`);
  if (a.logo && !/^data:image\/(png|jpeg|webp);base64,/.test(a.logo)) errores.push('El logo no es una imagen válida.');
  return errores;
}

/**
 * Equipo final de «Tu Club»: la plantilla y los colores del club base, con tu nombre y tu logo.
 * Es lo que se mostrará en la sala y lo que enviará el anfitrión al jugar online.
 */
export function tuClubDefinicion(a) {
  const base = getTeam(a.base);
  const nombre = (a.nombre || '').trim() || base.name;
  return {
    ...base,
    id: 'tu-club',
    name: nombre,
    short: nombre.slice(0, 3).toUpperCase(),
    logo: a.logo || null,
    usuario: a.usuario.trim(),
    base: base.id,
  };
}
