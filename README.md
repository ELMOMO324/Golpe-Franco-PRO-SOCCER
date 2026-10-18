# Golpe Franco [MOD: "PRO SOCCER"]

Mod hecho en base a la version original del videojuego "Golpe Franco" hecho por Mrpolfer

## Cómo jugar

Descomprime el .zip, entra en la carpeta dist y haz doble click en Jugar.html. ¡Eso es todo!

## ¿Qué incluye la version 1.6.6?

- Correcciones de bugs visuales
- Mejoras en gameplay
- Mejor soporte para dispositivos moviles.
- Refinacion del modo online.

## Personalización

En **PERSONALIZAR** puedes crear y editar jugadores (nombre, posición, dorsal,
apariencia y estadísticas), clubes (nombre, abreviatura, logo PNG, equipación,
formación, mentalidad, plantilla y once titular) y ligas (nombre, logo PNG y
clubes afiliados, mínimo cuatro). Los cambios se guardan en el navegador y se
aplican a los partidos y a las carreras. Los clubes y jugadores originales también
se pueden editar o borrar.

### Selecciones y torneos

En **PERSONALIZAR** hay dos secciones nuevas:

- **SELECCIONES:** igual que un club (nombre, abreviatura, bandera PNG, equipación, táctica y plantilla), pero un jugador puede pertenecer a un club y a una selección a la vez.
- **TORNEOS:** asistente en pasos. Eliges tipo (clubes o selecciones), nombre y logo, las ligas o selecciones participantes, el número de equipos, el reparto de cupos entre ligas (en torneos de clubes), y el formato: eliminatoria directa o grupos con eliminatoria, con los primeros de cada grupo y, si lo quieres, los mejores terceros. Los torneos se simulan completos desde la pantalla del torneo.

Pase: al mantener ESPACIO, el pase se dirige al compañero más alineado con la dirección que marcas (auto-apuntado) y sale con más fuerza.

## Novedades: partido, entrenamiento y filtros

- **Estadísticas en vivo** (tecla `T`): posesión, tiros, pases completados, córners, faltas y cambios usados, actualizadas cada cuarto de segundo.
- **Cambios** (tecla `G` o botón CAMBIOS en la pausa y en el descanso): hasta 5 cambios. Sale un jugador de campo y entra uno de la banca en su posición. Solo se cambia con el juego en marcha o en el descanso, no en saques preparados.
- **Mapa de calor** y **mejores jugadas** al terminar el partido: el mapa se puede ver por equipo o por jugador. Las jugadas (goles, tiros y paradas) se guardan y se reproducen a cámara lenta.
- **Entrenamiento** (menú principal): penaltis, tiros desde 22 m y pases largos, contra un portero de cinco niveles. Pasar a la siguiente prueba es con ENTER.
- **Filtros** en las listas de jugadores (posición, media, edad) y de clubes (media del club), que se combinan con el buscador y con el filtro por club o liga.

Tests: `node tools/nuevas.mjs` comprueba cambios, calor, jugadas y entrenamiento sin gráficos.

## Partido online 1 contra 1 (en pruebas)

- **Anfitrión:** Online → Partidos → Crear sala. Comparte el código y la contraseña.
- **Invitado:** Online → Partidos → Unirse, con el código y la contraseña.
- **Empezar:** cuando el invitado esté conectado, el anfitrión pulsa EMPEZAR PARTIDO.

El anfitrión simula el partido y envía el estado a 20 veces por segundo; el invitado
envía sus controles a 30 veces por segundo y ve el partido con interpolación.
Usa solo clubes originales, para que ambos tengan las mismas plantillas.

Limitaciones de esta versión: el invitado no puede pausar; si una de las dos partes se
desconecta, el partido no se da por perdido automáticamente; no hay revancha online.
