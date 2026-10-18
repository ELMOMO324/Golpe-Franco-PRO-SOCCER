# Vídeo de ejemplo: dirección con mouse y dirección con WASD (dibujo 2D del campo).
import math
from PIL import Image, ImageDraw, ImageFont

W, H = 960, 540
FPS = 30
FB = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'
FR = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
f_big = ImageFont.truetype(FB, 40)
f_mid = ImageFont.truetype(FB, 24)
f_sm = ImageFont.truetype(FB, 18)
f_key = ImageFont.truetype(FB, 20)

# Campo: coordenadas del mundo 0..100 (x) y 0..60 (y), dibujadas con margen
PX0, PY0, PW, PH = 60, 70, 840, 380
def sx(x): return PX0 + x / 100 * PW
def sy(y): return PY0 + y / 60 * PH

AZUL = (29, 61, 143)
ROJO = (200, 16, 46)
BLANCO = (255, 255, 255)
AMARILLO = (242, 194, 48)
CESPED1, CESPED2 = (47, 125, 60), (41, 112, 52)

def fondo(d):
    d.rectangle([0, 0, W, H], fill=(8, 14, 24))
    # franjas del césped
    for i in range(0, PW, 84):
        d.rectangle([PX0 + i, PY0, PX0 + i + 42, PY0 + PH], fill=CESPED1)
        d.rectangle([PX0 + i + 42, PY0, PX0 + i + 84, PY0 + PH], fill=CESPED2)
    lw = 3
    d.rectangle([PX0, PY0, PX0 + PW, PY0 + PH], outline=(232, 245, 226), width=lw)
    d.line([PX0 + PW / 2, PY0, PX0 + PW / 2, PY0 + PH], fill=(232, 245, 226), width=2)
    r = 50
    d.ellipse([PX0 + PW / 2 - r, PY0 + PH / 2 - r, PX0 + PW / 2 + r, PY0 + PH / 2 + r], outline=(232, 245, 226), width=2)
    # portería derecha
    gy1, gy2 = sy(24), sy(36)
    d.rectangle([PX0 + PW, gy1, PX0 + PW + 14, gy2], outline=BLANCO, width=2)

def jugador(d, x, y, color, ang=None, num='', resalta=False):
    cx, cy = sx(x), sy(y)
    if resalta:
        d.ellipse([cx - 27, cy - 27, cx + 27, cy + 27], outline=AMARILLO, width=3)
    d.ellipse([cx - 17, cy - 17, cx + 17, cy + 17], fill=color, outline=BLANCO, width=2)
    if num:
        w = d.textlength(num, font=f_sm)
        d.text((cx - w / 2, cy - 11), num, font=f_sm, fill=BLANCO)
    if ang is not None:
        # flecha de orientación: indica hacia dónde mira el jugador
        tx, ty = cx + math.cos(ang) * 30, cy + math.sin(ang) * 30
        bx, by = cx + math.cos(ang) * 20, cy + math.sin(ang) * 20
        px, py = -math.sin(ang) * 6, math.cos(ang) * 6
        d.polygon([(tx, ty), (bx + px, by + py), (bx - px, by - py)], fill=AMARILLO)

def balon(d, x, y):
    cx, cy = sx(x), sy(y)
    d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=BLANCO, outline=(20, 20, 20), width=2)

def puntero(d, x, y):
    cx, cy = sx(x), sy(y)
    pts = [(cx, cy), (cx, cy + 22), (cx + 6, cy + 17), (cx + 11, cy + 26), (cx + 15, cy + 24), (cx + 10, cy + 15), (cx + 17, cy + 15)]
    d.polygon(pts, fill=BLANCO, outline=(0, 0, 0))

def linea(d, x0, y0, x1, y1, color=AMARILLO, ancho=4):
    # línea discontinua desde el jugador hasta el puntero
    ax, ay, bx, by = sx(x0), sy(y0), sx(x1), sy(y1)
    L = math.hypot(bx - ax, by - ay)
    if L < 1: return
    ux, uy = (bx - ax) / L, (by - ay) / L
    t = 0
    while t < L:
        seg = min(12, L - t)
        d.line([ax + ux * t, ay + uy * t, ax + ux * (t + seg), ay + uy * (t + seg)], fill=color, width=ancho)
        t += 22

def texto_centro(d, y, s, f, color=BLANCO):
    w = d.textlength(s, font=f)
    d.text(((W - w) / 2, y), s, font=f, fill=color)

def tecla(d, x, y, s, activa=False):
    w = 46
    d.rounded_rectangle([x, y, x + w, y + 40], radius=8, fill=(255, 255, 255) if activa else (40, 48, 62), outline=(255, 255, 255), width=2)
    tw = d.textlength(s, font=f_key)
    d.text((x + (w - tw) / 2, y + 8), s, font=f_key, fill=(20, 20, 20) if activa else BLANCO)

def cartel(d, s, sub=None):
    d.rounded_rectangle([60, 20, 900, 62], radius=10, fill=(0, 0, 0))
    texto_centro(d, 27, s, f_mid)
    if sub:
        d.rounded_rectangle([60, 470, 900, 504], radius=10, fill=(0, 0, 0))
        texto_centro(d, 477, sub, f_sm, AMARILLO)

def ease(t):
    return t * t * (3 - 2 * t)

def lerp(a, b, t):
    return a + (b - a) * t

# ---------------- Escenas ----------------
frames = []

def add(img, dur):
    for _ in range(int(dur * FPS)):
        frames.append(img)

def escena_titulo(titulo, sub):
    im = Image.new('RGB', (W, H), (8, 14, 24))
    d = ImageDraw.Draw(im)
    texto_centro(d, 200, titulo, f_big)
    texto_centro(d, 270, sub, f_mid, AMARILLO)
    add(im, 2.2)

# Ejemplo de pase a un compañero: el puntero se mueve sobre el compañero y el balón sale hacia él
def ejemplo_pase(dur_mover=1.1, dur_bola=1.0, mate=(63, 26), pase_al_espacio=False, rotulo=''):
    jug = (34, 30)
    if pase_al_espacio:
        objetivo = (66, 40)
    else:
        objetivo = mate
    ini = (46, 16)  # puntero inicial (lejos)
    n_mover = int(dur_mover * FPS)
    n_bola = int(dur_bola * FPS)
    n_pausa = int(0.5 * FPS)
    for i in range(n_mover + n_pausa):
        t = min(1, i / n_mover)
        px, py = lerp(ini[0], objetivo[0], ease(t)), lerp(ini[1], objetivo[1], ease(t))
        im = Image.new('RGB', (W, H))
        d = ImageDraw.Draw(im)
        fondo(d)
        ang = math.atan2(py - jug[1], px - jug[0]) if True else None
        mate_ang = math.atan2(jug[1] - mate[1], jug[0] - mate[0])
        jugador(d, *mate, ROJO, ang=mate_ang, num='9', resalta=(not pase_al_espacio and t >= 0.9))
        jugador(d, *jug, AZUL, ang=ang, num='10')
        linea(d, jug[0], jug[1], px, py)
        balon(d, jug[0] + 1.2, jug[1] - 0.2)
        puntero(d, px, py)
        cartel(d, rotulo, 'Mueve el puntero: la línea muestra hacia dónde irá el pase')
        frames.append(im)
    # pulsación del pase
    for i in range(int(0.45 * FPS)):
        im = Image.new('RGB', (W, H))
        d = ImageDraw.Draw(im)
        fondo(d)
        jugador(d, *mate, ROJO, ang=math.atan2(jug[1] - mate[1], jug[0] - mate[0]), num='9', resalta=not pase_al_espacio)
        jugador(d, *jug, AZUL, ang=math.atan2(objetivo[1] - jug[1], objetivo[0] - jug[0]), num='10')
        linea(d, jug[0], jug[1], objetivo[0], objetivo[1])
        balon(d, jug[0] + 1.2, jug[1] - 0.2)
        puntero(d, objetivo[0], objetivo[1])
        d.rounded_rectangle([W - 210, 430, W - 40, 470], radius=8, fill=(255, 255, 255))
        d.text((W - 200, 438), 'CLIC IZQ. · PASE', font=f_sm, fill=(20, 20, 20))
        cartel(d, rotulo, 'Mueve el puntero: la línea muestra hacia dónde irá el pase')
        frames.append(im)
    # el balón viaja hasta el destino
    for i in range(n_bola):
        t = min(1, i / n_bola)
        bx, by = lerp(jug[0] + 1.2, objetivo[0], ease(t)), lerp(jug[1] - 0.2, objetivo[1], ease(t))
        im = Image.new('RGB', (W, H))
        d = ImageDraw.Draw(im)
        fondo(d)
        jugador(d, *mate, ROJO, ang=math.atan2(jug[1] - mate[1], jug[0] - mate[0]), num='9', resalta=(not pase_al_espacio and t > 0.7))
        jugador(d, *jug, AZUL, ang=math.atan2(objetivo[1] - jug[1], objetivo[0] - jug[0]), num='10')
        linea(d, jug[0], jug[1], objetivo[0], objetivo[1], color=(255, 255, 255, 60) if False else AMARILLO, ancho=2)
        if pase_al_espacio:
            d.ellipse([sx(objetivo[0]) - 7, sy(objetivo[1]) - 7, sx(objetivo[0]) + 7, sy(objetivo[1]) + 7], outline=AMARILLO, width=2)
        balon(d, bx, by)
        cartel(d, rotulo, 'El balón sale en la dirección de la línea')
        frames.append(im)
    for i in range(int(0.8 * FPS)):
        im = Image.new('RGB', (W, H))
        d = ImageDraw.Draw(im)
        fondo(d)
        jugador(d, *mate, ROJO, ang=math.atan2(jug[1] - mate[1], jug[0] - mate[0]), num='9', resalta=not pase_al_espacio)
        jugador(d, *jug, AZUL, ang=math.atan2(objetivo[1] - jug[1], objetivo[0] - jug[0]), num='10')
        balon(d, objetivo[0], objetivo[1])
        cartel(d, rotulo, None)
        frames.append(im)

# Tiro: la línea apunta a la portería y el balón entra en el ángulo marcado
def ejemplo_tiro():
    jug = (70, 40)
    ini = (60, 20)
    dest = (100, 27)
    n_mover = int(1.1 * FPS)
    for i in range(n_mover + int(0.5 * FPS)):
        t = min(1, i / n_mover)
        px, py = lerp(ini[0], dest[0], ease(t)), lerp(ini[1], dest[1], ease(t))
        im = Image.new('RGB', (W, H))
        d = ImageDraw.Draw(im)
        fondo(d)
        jugador(d, *jug, AZUL, ang=math.atan2(py - jug[1], px - jug[0]), num='10')
        linea(d, jug[0], jug[1], px, py)
        balon(d, jug[0] + 1.2, jug[1] - 0.2)
        puntero(d, px, py)
        cartel(d, 'Tiro con el mouse: la línea marca el punto de la portería', 'Clic derecho (esquema alternativo) o E con el esquema clásico')
        frames.append(im)
    for i in range(int(0.6 * FPS)):
        im = Image.new('RGB', (W, H))
        d = ImageDraw.Draw(im)
        fondo(d)
        jugador(d, *jug, AZUL, ang=math.atan2(dest[1] - jug[1], dest[0] - jug[0]), num='10')
        linea(d, jug[0], jug[1], dest[0], dest[1])
        balon(d, jug[0] + 1.2, jug[1] - 0.2)
        puntero(d, dest[0], dest[1])
        cartel(d, 'Tiro con el mouse: la línea marca el punto de la portería', None)
        frames.append(im)
    # el balón recorre la línea y entra
    n = int(0.9 * FPS)
    for i in range(n):
        t = min(1, i / n)
        bx, by = lerp(jug[0] + 1.2, 101, ease(t)), lerp(jug[1] - 0.2, dest[1], ease(t))
        im = Image.new('RGB', (W, H))
        d = ImageDraw.Draw(im)
        fondo(d)
        jugador(d, *jug, AZUL, ang=math.atan2(dest[1] - jug[1], dest[0] - jug[0]), num='10')
        balon(d, bx, by)
        cartel(d, 'Tiro con el mouse: la línea marca el punto de la portería', None)
        frames.append(im)
    for i in range(int(0.7 * FPS)):
        im = Image.new('RGB', (W, H))
        d = ImageDraw.Draw(im)
        fondo(d)
        jugador(d, *jug, AZUL, ang=math.atan2(dest[1] - jug[1], dest[0] - jug[0]), num='10')
        balon(d, 101, dest[1])
        cartel(d, 'Tiro con el mouse: la línea marca el punto de la portería', None)
        frames.append(im)

# ---- WASD: el jugador se mueve con las teclas, sin línea; el pase va hacia donde se mueve
def ejemplo_wasd():
    jug = [30.0, 36.0]
    teclas = [('W', (0, -1)), ('D', (1, 0)), ('D', (1, 0)), ('S', (0, 1))]
    mate = (60, 22)
    pasos = []
    for k, (tecla_s, (dx, dy)) in enumerate(teclas):
        for i in range(int(0.9 * FPS)):
            pasos.append((tecla_s, dx, dy))
    for i in range(int(1.0 * FPS)):
        pasos.append(('space', 0, 0))
    ang = -math.pi / 2  # orientación inicial: hacia arriba (W)
    for idx, (tecla_s, dx, dy) in enumerate(pasos):
        im = Image.new('RGB', (W, H))
        d = ImageDraw.Draw(im)
        fondo(d)
        if tecla_s != 'space':
            jug[0] += dx * 0.23
            jug[1] += dy * 0.23
            ang = math.atan2(dy, dx)  # la flecha sigue la dirección del movimiento
        jugador(d, *mate, ROJO, num='9', ang=math.atan2(jug[1] - mate[1], jug[0] - mate[0]))
        jugador(d, jug[0], jug[1], AZUL, num='10', ang=ang)
        base_x, base_y = 110, 430
        for s_, (ox, oy) in [('W', (46, 0)), ('A', (0, 46)), ('S', (46, 46)), ('D', (92, 46))]:
            tecla(d, base_x + ox, base_y + oy - 46, s_, activa=(s_ == tecla_s))
        if tecla_s == 'space':
            t = (idx - (len(pasos) - int(1.0 * FPS))) / (int(1.0 * FPS))
            t = min(1, max(0, t))
            bx = lerp(jug[0] + 1.2, 64, t)
            by = lerp(jug[1] - 0.2, 42, t)
            balon(d, bx, by)
            tecla(d, base_x + 200, base_y, 'ESPACIO', activa=True)
            cartel(d, 'Con WASD, el pase va hacia donde te mueves', 'Sin línea ni dirección del mouse')
        else:
            balon(d, jug[0] + 1.2, jug[1] - 0.2)
            cartel(d, 'Con WASD te mueves; el pase va hacia donde te mueves', 'Sin línea ni dirección del mouse')
        frames.append(im)
    for i in range(int(0.6 * FPS)):
        im = Image.new('RGB', (W, H))
        d = ImageDraw.Draw(im)
        fondo(d)
        jugador(d, *mate, ROJO, num='9', ang=math.atan2(jug[1] - mate[1], jug[0] - mate[0]))
        jugador(d, jug[0], jug[1], AZUL, num='10', ang=ang)
        balon(d, 64, 42)
        cartel(d, 'Con WASD te mueves; el pase va hacia donde te mueves', 'Sin línea ni dirección del mouse')
        frames.append(im)

# ---- Montaje
escena_titulo('DIRECCIÓN CON MOUSE', 'Pases y tiros hacia donde apuntas')
ejemplo_pase(rotulo='Ejemplo 1: pase a un compañero', mate=(63, 26))
ejemplo_pase(rotulo='Ejemplo 2: pase al espacio', pase_al_espacio=True)
ejemplo_tiro()
escena_titulo('DIRECCIÓN CON WASD', 'Te mueves con WASD: sin línea de guía')
ejemplo_wasd()

print('fotogramas', len(frames), 'duración', round(len(frames) / FPS, 1), 's')
import sys
for i, im in enumerate(frames):
    im.save(f'/home/claude/video/f{i:05d}.png') if False else None

# Escritura directa a mp4 con ffmpeg (tubería de imágenes en bruto)
import subprocess
p = subprocess.Popen(['ffmpeg', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '26', '-preset', 'medium', '-movflags', '+faststart',
                      '/home/claude/video/controles.mp4'], stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
for im in frames:
    p.stdin.write(im.tobytes())
p.stdin.close(); p.wait()
print('ok mp4', p.returncode)
