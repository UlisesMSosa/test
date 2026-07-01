export class ScoreManager {
  constructor() {
    this.data = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem('arcspace_scores');
      if (raw) {
        const parsed = JSON.parse(raw);
        // Migrar formato antiguo (jugadores como dict) a array
        if (parsed.jugadores && !Array.isArray(parsed.jugadores)) {
          const old = parsed.jugadores;
          parsed.jugadores = Object.entries(old).map(([nombre, d]) => ({
            nombre, puntuacion_total: d.puntuacion_total,
            nivel_maximo: d.nivel_maximo,
            astros_descubiertos: d.astros_descubiertos,
            fecha_hora: d.fecha_hora, cantidad_partidas: d.cantidad_partidas,
          }));
        }
        return parsed;
      }
    } catch(e) {}
    return { jugadores: [], partidas: [], top_scores: [] };
  }

  _save() {
    try {
      localStorage.setItem('arcspace_scores', JSON.stringify(this.data));
    } catch(e) {
      console.warn('No se pudo guardar puntuaciones');
    }
  }

  registrarResultado(nombre, puntTotal, nivelMax, descubiertos) {
    const ahora = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const entry = {
      nombre, puntuacion_total: puntTotal,
      nivel_maximo: nivelMax, astros_descubiertos: descubiertos,
      fecha_hora: ahora,
    };
    this.data.jugadores.push(entry);
    this.data.partidas.push({ ...entry });
    const sorted = [...this.data.jugadores]
      .sort((a, b) => b.puntuacion_total - a.puntuacion_total);
    this.data.top_scores = sorted.map(e => ({ nombre: e.nombre, puntos: e.puntuacion_total }));
    this._save();
  }

  getJugadoresOrdenados() {
    return [...this.data.jugadores]
      .sort((a, b) => b.puntuacion_total - a.puntuacion_total);
  }
}
