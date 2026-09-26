// Sample data shaped after senpai-backend: SquadPlayerView (src/cronogol/dto/player-view.dto.ts),
// FORMATION_SLOTS (src/cronogol/ig-xi-formations.ts), abbreviateClub (src/cronogol/club-abbreviation.ts).
// Stats are event-derived only (goals, assists, cards) — no appearances/minutes exist upstream. null = not available.

export const FORMATION_IDS = ['4-3-3','4-2-3-1','4-4-2','4-1-4-1','4-3-2-1','4-5-1','3-4-3','3-5-2','3-4-2-1','5-3-2','5-4-1'];

export const FORMATION_SLOTS = {
  '4-3-3':   ['GK','LB','LCB','RCB','RB','LCM','CM','RCM','LW','ST','RW'],
  '4-2-3-1': ['GK','LB','LCB','RCB','RB','LDM','RDM','LM','AM','RM','ST'],
  '4-4-2':   ['GK','LB','LCB','RCB','RB','LM','LCM','RCM','RM','LST','RST'],
  '4-1-4-1': ['GK','LB','LCB','RCB','RB','DM','LM','LCM','RCM','RM','ST'],
  '4-3-2-1': ['GK','LB','LCB','RCB','RB','LCM','CM','RCM','LAM','RAM','ST'],
  '4-5-1':   ['GK','LB','LCB','RCB','RB','LM','LCM','CM','RCM','RM','ST'],
  '3-4-3':   ['GK','LCB','CB','RCB','LM','LCM','RCM','RM','LW','ST','RW'],
  '3-5-2':   ['GK','LCB','CB','RCB','LM','LCM','CM','RCM','RM','LST','RST'],
  '3-4-2-1': ['GK','LCB','CB','RCB','LM','LCM','RCM','RM','LAM','RAM','ST'],
  '5-3-2':   ['GK','LWB','LCB','CB','RCB','RWB','LCM','CM','RCM','LST','RST'],
  '5-4-1':   ['GK','LWB','LCB','CB','RCB','RWB','LM','LCM','RCM','RM','ST'],
};

const LANES = { 1:[50], 2:[34,66], 3:[19,50,81], 4:[12,37,63,88], 5:[9,29.5,50,70.5,91] };

// Slot geometry: x 0–100 left→right, y 0–100 own goal→attack. Keeper first, deepest band first (the wire order).
export function geometry(formation) {
  const bands = formation.split('-').map(Number);
  const ids = FORMATION_SLOTS[formation];
  const out = [{ id: 'GK', x: 50, y: 9 }];
  let i = 1;
  bands.forEach((n, b) => {
    const y = bands.length === 1 ? 55 : 26 + (b * (90 - 26)) / (bands.length - 1);
    LANES[n].forEach((x) => { out.push({ id: ids[i++], x, y }); });
  });
  return out;
}

export function bandOf(slot) {
  if (slot === 'GK') return 'GK';
  if (slot.endsWith('B')) return 'DEF';
  if (slot.endsWith('M')) return 'MID';
  return 'FWD';
}

// [shirt, shortName, position, nationality alpha-3, age, seasonGoals, seasonAssists, seasonYellows, careerGoals, careerAssists, careerYellows]
// null = the backend holds no number (coverage floor / no events) — render an em dash, never 0.
const P = (r) => ({ shirt: r[0], shortName: r[1], position: r[2], nat: r[3], age: r[4],
  season: { goals: r[5], assists: r[6], yellows: r[7] }, career: { goals: r[8], assists: r[9], yellows: r[10] } });

export const CLUBS = [
  { slug: 'real-madrid', name: 'Real Madrid', abbr: 'RMA', league: 'LaLiga', ucl: true,
    kit: { primary: '#ffffff', secondary: '#1b2a6b', ring: '#c9a227', tint: '#1b2a6b' },
    predicted: { formation: '4-3-3', shirts: { GK: 1, LB: 18, LCB: 24, RCB: 3, RB: 12, LCM: 6, CM: 14, RCM: 8, LW: 7, ST: 10, RW: 15 } },
    players: [
      [1,'Courtois','GK','BEL',34,0,0,0,0,0,4],[13,'Lunin','GK','UKR',27,0,0,0,0,0,1],
      [2,'Carvajal','DEF','ESP',34,0,1,1,9,42,71],[3,'Militão','DEF','BRA',28,1,0,1,8,3,29],[4,'Alaba','DEF','AUT',34,0,0,0,3,5,12],
      [12,'Trent','DEF','ENG',27,0,2,0,null,null,null],[17,'Asencio','DEF','ESP',23,0,0,2,0,1,9],[18,'Carreras','DEF','ESP',23,0,1,1,null,null,null],
      [20,'Fran García','DEF','ESP',27,0,0,0,2,9,14],[22,'Rüdiger','DEF','DEU',33,0,0,1,4,2,31],[23,'Mendy','DEF','FRA',31,0,0,0,5,8,27],[24,'Huijsen','DEF','ESP',21,0,0,1,null,null,null],
      [5,'Bellingham','MID','ENG',23,1,2,1,36,22,17],[6,'Camavinga','MID','FRA',23,0,0,2,3,8,26],[8,'Valverde','MID','URY',28,2,1,0,30,29,33],
      [14,'Tchouaméni','MID','FRA',26,0,0,1,6,4,29],[15,'Güler','MID','TUR',21,1,3,0,12,11,6],[19,'Ceballos','MID','ESP',30,0,0,0,7,15,22],
      [7,'Vini Jr.','FWD','BRA',26,2,3,1,104,78,24],[9,'Endrick','FWD','BRA',20,0,0,0,7,1,2],[10,'Mbappé','FWD','FRA',27,6,1,0,52,7,5],
      [11,'Rodrygo','FWD','BRA',25,1,1,0,68,51,11],[16,'Gonzalo','FWD','ESP',21,1,0,0,null,null,null],[21,'Brahim','FWD','MAR',27,0,1,0,26,22,7],[30,'Mastantuono','FWD','ARG',19,0,1,0,null,null,null],
    ] },
  { slug: 'atletico-madrid', name: 'Atlético de Madrid', abbr: 'ATM', league: 'LaLiga', ucl: true,
    kit: { primary: '#cb3524', secondary: '#ffffff', ring: '#cb3524', tint: '#cb3524' },
    predicted: { formation: '4-4-2', shirts: { GK: 13, LB: 17, LCB: 24, RCB: 2, RB: 16, LM: 11, LCM: 8, RCM: 6, RM: 14, LST: 7, RST: 19 } },
    players: [
      [13,'Oblak','GK','SVN',33,0,0,0,0,0,3],[1,'Musso','GK','ARG',32,0,0,0,0,0,1],
      [2,'Giménez','DEF','URY',31,0,0,2,9,4,58],[3,'Ruggeri','DEF','ITA',24,0,0,1,null,null,null],[15,'Lenglet','DEF','FRA',31,0,0,1,1,1,13],
      [16,'Molina','DEF','ARG',28,0,1,1,5,11,22],[17,'Hancko','DEF','SVK',28,0,0,0,null,null,null],[21,'Javi Galán','DEF','ESP',31,0,1,0,2,8,17],
      [23,'Pubill','DEF','ESP',23,0,0,0,null,null,null],[24,'Le Normand','DEF','FRA',29,1,0,1,3,1,14],
      [6,'Koke','MID','ESP',34,0,1,1,54,102,88],[8,'Barrios','MID','ESP',23,1,0,1,5,6,19],[14,'Llorente','MID','ESP',31,1,1,0,38,32,21],
      [20,'Giuliano','MID','ARG',23,1,2,1,6,7,9],[22,'Cardoso','MID','ESP',24,0,0,0,null,null,null],[11,'Almada','MID','ARG',25,1,0,0,null,null,null],
      [10,'Baena','MID','ESP',25,0,2,1,17,29,15],
      [7,'Griezmann','FWD','FRA',35,2,1,0,196,92,31],[9,'Sørloth','FWD','NOR',30,3,0,1,42,9,10],[19,'Julián','FWD','ARG',26,4,2,0,40,18,7],
      [12,'Raspadori','FWD','ITA',26,1,0,0,null,null,null],[18,'Nico González','FWD','ESP',24,0,1,0,3,2,4],
    ] },
  { slug: 'fc-barcelona', name: 'FC Barcelona', abbr: 'BAR', league: 'LaLiga', ucl: true,
    kit: { primary: '#a50044', secondary: '#004d98', ring: '#a50044', tint: '#004d98' },
    predicted: { formation: '4-2-3-1', shirts: { GK: 1, LB: 3, LCB: 2, RCB: 4, RB: 23, LDM: 8, RDM: 21, LM: 11, AM: 20, RM: 10, ST: 9 } },
    players: [
      [1,'Joan García','GK','ESP',24,0,0,0,null,null,null],[25,'Szczęsny','GK','POL',36,0,0,0,0,0,2],
      [2,'Cubarsí','DEF','ESP',19,0,0,1,1,3,8],[3,'Balde','DEF','ESP',22,0,2,1,2,12,17],[4,'Araújo','DEF','URY',27,1,0,1,10,3,35],
      [23,'Koundé','DEF','FRA',27,0,1,0,7,17,20],[24,'Eric García','DEF','ESP',25,0,0,1,4,2,15],[15,'Christensen','DEF','DNK',30,0,0,0,3,1,11],
      [35,'Gerard Martín','DEF','ESP',24,0,0,0,0,1,3],
      [6,'Gavi','MID','ESP',22,0,0,1,7,11,44],[8,'Pedri','MID','ESP',23,1,1,0,25,26,16],[16,'Fermín','MID','ESP',23,1,0,1,18,7,9],
      [17,'Casadó','MID','ESP',23,0,0,1,0,4,6],[20,'Olmo','MID','ESP',28,1,1,0,13,7,4],[21,'De Jong','MID','NLD',29,0,1,1,19,23,42],
      [22,'Bernal','MID','ESP',19,0,0,0,0,0,1],
      [7,'Ferran','FWD','ESP',26,2,0,0,49,19,14],[9,'Lewandowski','FWD','POL',38,3,0,0,109,21,10],[10,'Yamal','FWD','ESP',19,2,3,1,27,41,9],
      [11,'Raphinha','FWD','BRA',29,2,2,1,58,52,17],[14,'Rashford','FWD','ENG',28,1,2,0,null,null,null],[19,'Roony','FWD','SWE',20,0,0,0,null,null,null],
    ] },
  { slug: 'arsenal', name: 'Arsenal', abbr: 'ARS', league: 'Premier League', ucl: true,
    kit: { primary: '#ef0107', secondary: '#ffffff', ring: '#ef0107', tint: '#ef0107' },
    predicted: { formation: '4-3-3', shirts: { GK: 1, LB: 33, LCB: 6, RCB: 2, RB: 12, LCM: 41, CM: 22, RCM: 8, LW: 11, ST: 9, RW: 7 } },
    players: [
      [1,'Raya','GK','ESP',31,0,0,0,0,0,5],[13,'Kepa','GK','ESP',32,0,0,0,0,0,3],
      [2,'Saliba','DEF','FRA',25,0,0,1,4,2,19],[3,'Mosquera','DEF','ESP',22,0,0,0,null,null,null],[4,'White','DEF','ENG',29,0,1,1,3,15,22],
      [6,'Gabriel','DEF','BRA',28,1,0,1,20,4,31],[12,'Timber','DEF','NLD',25,0,1,2,2,3,12],[15,'Lewis-Skelly','DEF','ENG',20,0,0,1,1,2,7],
      [33,'Calafiori','DEF','ITA',24,1,0,1,3,2,9],[49,'Hincapié','DEF','ECU',24,0,0,0,null,null,null],
      [8,'Ødegaard','MID','NOR',27,0,2,0,41,52,14],[10,'Eze','MID','ENG',28,1,1,0,null,null,null],[20,'Nørgaard','MID','DNK',32,0,0,1,null,null,null],
      [22,'Zubimendi','MID','ESP',27,1,0,1,null,null,null],[23,'Merino','MID','ESP',30,1,0,1,9,3,11],[41,'Rice','MID','ENG',27,1,1,1,17,26,20],[47,'Nwaneri','MID','ENG',19,0,0,0,4,2,1],
      [7,'Saka','FWD','ENG',25,2,2,0,64,60,9],[9,'Gyökeres','FWD','SWE',28,4,0,1,null,null,null],[11,'Martinelli','FWD','BRA',25,1,1,0,45,29,14],
      [14,'Havertz','FWD','DEU',27,1,0,0,29,13,12],[19,'Trossard','FWD','BEL',31,1,1,0,29,26,4],[30,'Madueke','FWD','ENG',24,0,1,0,null,null,null],
    ] },
  { slug: 'manchester-city', name: 'Manchester City', abbr: 'MCI', league: 'Premier League', ucl: true,
    kit: { primary: '#6cabdd', secondary: '#1c2c5b', ring: '#6cabdd', tint: '#6cabdd' },
    predicted: { formation: '4-2-3-1', shirts: { GK: 25, LB: 7, LCB: 24, RCB: 3, RB: 27, LDM: 16, RDM: 4, LM: 11, AM: 47, RM: 14, ST: 9 } },
    players: [
      [25,'Donnarumma','GK','ITA',27,0,0,0,null,null,null],[13,'Trafford','GK','ENG',24,0,0,0,null,null,null],
      [3,'Rúben Dias','DEF','PRT',29,0,0,1,6,5,27],[5,'Stones','DEF','ENG',32,0,0,0,10,4,18],[6,'Aké','DEF','NLD',31,0,0,1,9,3,14],
      [7,'Aït-Nouri','DEF','DZA',25,0,2,1,null,null,null],[24,'Gvardiol','DEF','HRV',24,1,0,0,9,4,12],[27,'Nunes','DEF','PRT',28,0,1,1,3,9,15],
      [33,'Khusanov','DEF','UZB',22,0,0,1,0,0,4],
      [4,'Reijnders','MID','NLD',28,1,1,0,null,null,null],[8,'Kovačić','MID','HRV',32,0,0,0,7,7,29],[16,'Rodri','MID','ESP',30,0,1,1,22,23,41],
      [19,'Nico González','MID','ESP',24,0,0,1,1,1,6],[20,'Bernardo','MID','PRT',32,0,2,0,64,66,22],[47,'Foden','MID','ENG',26,1,1,0,71,52,12],[52,"O'Reilly",'MID','ENG',21,0,1,0,3,4,3],
      [9,'Haaland','FWD','NOR',26,7,1,0,124,20,9],[10,'Marmoush','FWD','EGY',27,1,1,0,8,4,3],[11,'Doku','FWD','BEL',24,1,2,1,10,17,8],
      [14,'Cherki','FWD','FRA',23,1,1,0,null,null,null],[26,'Savinho','FWD','BRA',22,0,1,0,3,13,5],[21,'Bobb','FWD','NOR',22,0,0,0,3,3,1],
    ] },
  { slug: 'liverpool', name: 'Liverpool', abbr: 'LIV', league: 'Premier League', ucl: true,
    kit: { primary: '#c8102e', secondary: '#00b2a9', ring: '#c8102e', tint: '#c8102e' },
    predicted: { formation: '4-2-3-1', shirts: { GK: 1, LB: 6, LCB: 4, RCB: 5, RB: 12, LDM: 38, RDM: 10, LM: 18, AM: 7, RM: 11, ST: 9 } },
    players: [
      [1,'Alisson','GK','BRA',34,0,0,0,0,1,4],[25,'Mamardashvili','GK','GEO',26,0,0,0,null,null,null],
      [2,'Gomez','DEF','ENG',29,0,0,0,1,3,17],[4,'van Dijk','DEF','NLD',35,1,0,1,26,8,35],[5,'Konaté','DEF','FRA',27,0,0,2,7,1,24],
      [6,'Kerkez','DEF','HUN',22,0,1,1,null,null,null],[12,'Frimpong','DEF','NLD',25,0,2,0,null,null,null],[26,'Robertson','DEF','SCO',32,0,1,1,11,64,39],[30,'Bradley','DEF','ENG',23,0,1,1,1,7,12],
      [3,'Endo','MID','JPN',33,0,0,0,2,1,10],[8,'Szoboszlai','MID','HUN',26,1,2,1,17,18,13],[10,'Mac Allister','MID','ARG',27,1,1,1,12,14,20],
      [17,'Jones','MID','ENG',25,0,1,0,12,9,8],[38,'Gravenberch','MID','NLD',24,0,0,1,4,6,15],[7,'Wirtz','MID','DEU',23,1,3,0,null,null,null],
      [9,'Isak','FWD','SWE',27,2,0,0,null,null,null],[11,'Salah','FWD','EGY',34,3,2,0,247,116,12],[14,'Ekitiké','FWD','FRA',24,4,1,1,null,null,null],
      [18,'Gakpo','FWD','NLD',27,2,1,0,41,17,6],[20,'Chiesa','FWD','ITA',29,1,0,0,3,2,2],[22,'Ngumoha','FWD','ENG',17,1,0,0,1,0,0],
    ] },
].map((c) => ({ ...c, players: c.players.map((r) => ({ ...P(r), id: c.slug + '-' + r[0], name: r[1] })) }));

export const STRINGS = {
  en: { season: 'Season 2026/27', formation: 'Formation', squad: 'Squad', lineups: 'Lineups', search: 'Search squad',
    save: 'Save lineup', saved: 'Saved', lineupName: 'Lineup name', bench: 'Bench', predicted: 'Predicted XI', mine: 'My XI',
    clear: 'Clear pitch', mirror: 'Mirror', rotate: 'Rotate', ready: 'Ready', noGk: 'No goalkeeper', of11: 'of 11',
    seasonStats: 'Season', career: 'Career', goals: 'Goals', assists: 'Assists', yellows: 'Yellows', age: 'Age',
    sample: 'Sample data', onPitch: 'On pitch', onBench: 'Bench', hint: 'Drag a player onto the GK slot to begin', hintDrop: 'Drop here',
    noLineups: 'No saved lineups yet', pickClub: 'Pick a club', diff: 'Not in my XI', coverage: 'Season coverage',
    GK: 'Goalkeepers', DEF: 'Defenders', MID: 'Midfielders', FWD: 'Forwards', delete: 'Delete', load: 'Load',
    orbit: 'Drag the pitch to orbit', lockTilt: 'Lock angle', unlockTilt: 'Unlock angle', flat: 'Flat', viewFlat: 'Flat pitch', view3d: 'Back to 3D', full: 'Bench full', predictedNote: 'Predicted by the backend from recent lineups. Highlighted players are not in your XI.' },
  es: { season: 'Temporada 2026/27', formation: 'Formación', squad: 'Plantilla', lineups: 'Alineaciones', search: 'Buscar jugador',
    save: 'Guardar alineación', saved: 'Guardada', lineupName: 'Nombre de la alineación', bench: 'Banquillo', predicted: 'XI previsto', mine: 'Mi XI',
    clear: 'Vaciar campo', mirror: 'Espejo', rotate: 'Girar', ready: 'Lista', noGk: 'Sin portero', of11: 'de 11',
    seasonStats: 'Temporada', career: 'Carrera', goals: 'Goles', assists: 'Asistencias', yellows: 'Amarillas', age: 'Edad',
    sample: 'Datos de muestra', onPitch: 'En el campo', onBench: 'Banquillo', hint: 'Arrastra un jugador al hueco de portero para empezar', hintDrop: 'Suelta aquí',
    noLineups: 'Aún no hay alineaciones guardadas', pickClub: 'Elige un club', diff: 'No está en mi XI', coverage: 'Cobertura de la temporada',
    GK: 'Porteros', DEF: 'Defensas', MID: 'Centrocampistas', FWD: 'Delanteros', delete: 'Borrar', load: 'Cargar',
    orbit: 'Arrastra el campo para girarlo', lockTilt: 'Bloquear ángulo', unlockTilt: 'Desbloquear ángulo', flat: 'Plano', viewFlat: 'Campo plano', view3d: 'Volver a 3D', full: 'Banquillo completo', predictedNote: 'Previsto por el backend a partir de las últimas alineaciones. Los resaltados no están en tu XI.' },
};

// abbreviateClub (src/cronogol/club-abbreviation.ts), transcribed.
export function abbreviate(name) {
  const fold = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const words = (name || '').split(/\s+/).map(fold).filter(Boolean);
  if (!words.length) return 'FC';
  if (words.length === 1) return words[0].slice(0, 3);
  if (words.length === 2) return (words[0][0] + words[1].slice(0, 2)).slice(0, 3);
  return words.slice(0, 3).map((w) => w[0]).join('');
}
