// ================= CONTENT: worlds, enemies, bosses, weapons, ship parts, shop, modes =================
const hx = s => typeof s === 'number' ? s : parseInt(String(s).replace('#', ''), 16);
const hex = n => '#' + ('000000' + (n >>> 0).toString(16)).slice(-6);

// ---------- worlds ----------
// bk = backdrop kind, hz = hazard, ro = enemy roster (unlock order), el = elite id, A/B = level-name words
const WORLDS = [
  { nm: 'Aetheria Skylines', sub: 'Storm decks above the old capital', col: ['#030712', '#0f172a', '#1e1b4b'], ac: '#38bdf8', bk: 'sky', hz: null, ro: ['jet', 'drone', 'sniper', 'mine'], el: 'vanguard', A: ['Cloud', 'Gale', 'Storm', 'Thunder', 'Zephyr', 'Jet'], B: ['Run', 'Line', 'Rift', 'Deck', 'Gate', 'Stream'] },
  { nm: 'Emerald Ravines', sub: 'The hive grows in the green dark', col: ['#022c22', '#064e3b', '#0f172a'], ac: '#10b981', bk: 'jungle', hz: null, ro: ['wasp', 'spore', 'spitter', 'beetle'], el: 'hiveguard', A: ['Spore', 'Moss', 'Glow', 'Vine', 'Hive', 'Bloom'], B: ['Path', 'Cavern', 'Hollow', 'Gorge', 'Edge', 'Pit'] },
  { nm: 'Rust Dunes of Mars', sub: 'Scrap winds and iron canyons', col: ['#451a03', '#7c2d12', '#0f172a'], ac: '#f59e0b', bk: 'dunes', hz: 'wind', ro: ['gearling', 'driller', 'crawler', 'scrapper'], el: 'hauler', A: ['Dust', 'Rust', 'Dune', 'Scrap', 'Red', 'Iron'], B: ['Flats', 'Canyon', 'Sea', 'Basin', 'Mesa', 'Ridge'] },
  { nm: 'Deep Cosmos Nebula', sub: 'Where the void learns to look back', col: ['#311042', '#581c87', '#090d16'], ac: '#c084fc', bk: 'nebula', hz: 'fog', ro: ['wisp', 'shard', 'warper', 'rift'], el: 'sentinel', A: ['Nebula', 'Star', 'Void', 'Crystal', 'Dark', 'Echo'], B: ['Veil', 'Drift', 'Lane', 'Reef', 'Current', 'Field'] },
  { nm: 'Event Horizon', sub: 'Light bends. Time does not.', col: ['#180000', '#450a0a', '#030712'], ac: '#f43f5e', bk: 'hole', hz: 'bhole', ro: ['ember', 'lens', 'comet', 'flare'], el: 'warden', A: ['Ash', 'Warp', 'Grav', 'Photon', 'Tidal', 'Dying'], B: ['Belt', 'Scar', 'Wake', 'Ring', 'Edge', 'Star'] },
  { nm: 'Frostbite Reach', sub: 'A frozen armada drifts in silence', col: ['#04121f', '#0c4a6e', '#082f49'], ac: '#7dd3fc', bk: 'ice', hz: 'ice', ro: ['flake', 'icicle', 'frostgun', 'yeti'], el: 'icecruiser', A: ['Frost', 'Glacier', 'Polar', 'Hail', 'Crystal', 'White'], B: ['Shelf', 'Crevasse', 'Drift', 'Spire', 'Fjord', 'Gale'] },
  { nm: 'Cinder Foundry', sub: 'A moon forged into a weapon', col: ['#1a0500', '#7c2d12', '#240a02'], ac: '#fb923c', bk: 'lava', hz: 'lava', ro: ['magma', 'anvil', 'salamander', 'smelter'], el: 'colossus', A: ['Cinder', 'Magma', 'Slag', 'Ember', 'Forge', 'Molten'], B: ['Vent', 'Works', 'Pit', 'Furnace', 'Quarry', 'Core'] },
  { nm: 'Abyssal Trench', sub: 'Pressure, lights, and teeth', col: ['#020617', '#042f3e', '#012a2a'], ac: '#2dd4bf', bk: 'deep', hz: 'current', ro: ['jelly', 'puffer', 'eel', 'lure'], el: 'kraken', A: ['Abyss', 'Brine', 'Pearl', 'Kelp', 'Midnight', 'Sunken'], B: ['Trench', 'Reef', 'Vent', 'Shelf', 'Current', 'Maw'] },
  { nm: 'Neon Mainframe', sub: 'The machine mind is awake', col: ['#05000f', '#1e0a3c', '#02130f'], ac: '#4ade80', bk: 'grid', hz: 'glitch', ro: ['glitch', 'bit', 'firewall', 'virus'], el: 'daemon', A: ['Packet', 'Kernel', 'Root', 'Cache', 'Buffer', 'Null'], B: ['Port', 'Stack', 'Node', 'Sector', 'Thread', 'Core'] },
  { nm: 'Chrono Spire', sub: 'The last hour of the last world', col: ['#1a1203', '#3b2a08', '#0b0b1a'], ac: '#fde047', bk: 'clock', hz: 'time', ro: ['cog', 'tick', 'phoenix', 'paradox'], el: 'chronowarden', A: ['Second', 'Minute', 'Hour', 'Epoch', 'Aeon', 'Zero'], B: ['Hand', 'Gear', 'Spire', 'Bell', 'Loop', 'Hour'] },
  { nm: 'Shattered Orbital Ring', sub: 'A wrecked ring station that still fights back', col: ['#05070f', '#172033', '#0b1220'], ac: '#cbd5e1', bk: 'ring', hz: 'wind', ro: ['scav', 'hullrat', 'welder', 'railturret'], el: 'salvager', A: ['Girder', 'Airlock', 'Spoke', 'Hangar', 'Docking', 'Debris'], B: ['Arc', 'Bay', 'Span', 'Ring', 'Hub', 'Truss'] },
  { nm: 'Crystal Archipelago', sub: 'Floating islands that sing when they break', col: ['#1f0a1a', '#4a1236', '#12071a'], ac: '#f9a8d4', bk: 'crystal', hz: 'fog', ro: ['shardling', 'prism', 'geode', 'refractor'], el: 'monolith', A: ['Prism', 'Facet', 'Quartz', 'Lattice', 'Shard', 'Opal'], B: ['Isle', 'Spire', 'Chime', 'Reef', 'Vault', 'Bloom'] },
  { nm: 'Tempest Gyre', sub: 'A storm the size of a world, still growing', col: ['#0b1405', '#26400f', '#0a0f0a'], ac: '#bef264', bk: 'gas', hz: 'bolt', ro: ['sprite', 'squall', 'zapper', 'gasbag'], el: 'cyclone', A: ['Squall', 'Thunder', 'Static', 'Cell', 'Gale', 'Eye'], B: ['Front', 'Wall', 'Band', 'Funnel', 'Surge', 'Gyre'] },
  { nm: 'Graveyard of Giants', sub: 'Where fleets and leviathans came to rest', col: ['#0c0a09', '#292524', '#06141a'], ac: '#99f6e4', bk: 'grave', hz: 'current', ro: ['specter', 'reaper', 'ossuary', 'leech'], el: 'lich', A: ['Bone', 'Pale', 'Hollow', 'Wraith', 'Ashen', 'Last'], B: ['Orchard', 'Wreck', 'Drift', 'Vigil', 'Keel', 'Rest'] },
  { nm: 'Heart of Aetheria', sub: 'Where every signal began', col: ['#031b24', '#0e4a5e', '#020617'], ac: '#67e8f9', bk: 'core', hz: 'pulse', ro: ['photon', 'construct', 'echo', 'sentry'], el: 'guardian', A: ['Origin', 'Signal', 'Pulse', 'Lumen', 'Prime', 'Genesis'], B: ['Lattice', 'Gate', 'Chamber', 'Stream', 'Node', 'Heart'] },
  { nm: 'The Glitch', sub: 'Reality is buffering. None of these places should exist.', col: ['#07000d', '#1a0b2e', '#000000'], ac: '#ff2bd6', bk: 'grid', hz: 'glitch', ro: ['gjet', 'gpod', 'gcube', 'gecho'], el: 'gadmin', A: ['Null', 'Corrupt', 'Lost', 'Broken', 'Hidden', 'Phantom'], B: ['Sector', 'Packet', 'Frame', 'Buffer', 'Loop', 'Patch'] },
  { nm: 'Aetheria Prime', sub: 'The first world. The one every signal was trying to reach.', col: ['#1c1206', '#78350f', '#0c0a09'], ac: '#fde047', bk: 'core', hz: 'pulse', ro: ['phoenix', 'refractor', 'reaper', 'paradox'], el: 'guardian', A: ['Dawn', 'Gold', 'First', 'Radiant', 'Crown', 'Zenith'], B: ['Spire', 'Halo', 'Gate', 'Throne', 'Light', 'Sky'] }
];
const NODE_PAT = ['c', 'c', 'c', 'e', 'c', 's', 'c', 'h', 'c', 'e', 'c', 's', 'B']; // 12 levels + boss
const LV = NODE_PAT.length;
const NODE_NAME = { c: 'COMBAT', e: 'ELITE AMBUSH', s: 'SUPPLY RUN', h: 'HAZARD ZONE', B: 'BOSS', g: 'TREASURE RUN', x: 'THE GAUNTLET' };
const lvName = (w, i) => { const W = WORLDS[w]; if (w === GLITCH_W && i < LV - 1) { const k = GLITCH_SECT[i], mp = MAPS.find(x => x.k === k); return (mp ? mp.nm : 'Null Sector') + (GLITCH_SECT.indexOf(k) === i ? '' : ' (Corrupted)'); } return i === LV - 1 ? BOSSES[w].nm : W.A[(i * 5 + 1) % 6] + ' ' + W.B[(i * 7 + w) % 6]; };

// ---------- enemies ----------
// m = model [archetype, opts]; w = on-screen length; hp base; sp speed; ai movement; f = fire {k kind, r rate(frames), s speed, n count}; sc score; cr core value; cost wave-budget
const EN = {
  // W1 skylines
  jet: { nm: 'Skyjet', m: ['dart', { c: 0x475569, e: 0xf43f5e }], w: 62, hp: 10, sp: 2.6, ai: 'sine', f: { k: 'aim', r: 120, s: 4.2 }, sc: 100, cr: 2, cost: 1 },
  drone: { nm: 'Recon Drone', m: ['saucer', { c: 0x2a3344, e: 0xf43f5e }], w: 70, hp: 8, sp: 2.2, ai: 'zig', f: { k: 'line', r: 100, s: 4.6 }, sc: 90, cr: 2, cost: 1 },
  sniper: { nm: 'Sniper', m: ['sniper', { c: 0x334155, e: 0xf87171 }], w: 84, hp: 16, sp: 1.2, ai: 'hover', f: { k: 'aimfast', r: 140, s: 7.5 }, sc: 220, cr: 4, cost: 2 },
  mine: { nm: 'Aero Mine', m: ['pod', { c: 0x1e293b, e: 0xfbbf24, n: 10 }], w: 50, hp: 14, sp: 1.2, ai: 'drift', burst: 8, sc: 120, cr: 3, cost: 1 },
  vanguard: { nm: 'Vanguard Cruiser', m: ['elite', { c: 0x3b2f55, e: 0xc084fc }], w: 130, hp: 130, sp: 1.2, ai: 'hover', f: { k: 'fan', r: 70, s: 4.4, n: 5 }, sc: 800, cr: 25, cost: 6, elite: 1 },
  // W2 ravines
  wasp: { nm: 'Hive Wasp', m: ['dart', { c: 0x365314, e: 0xfacc15, n: 5, k: 1.3 }], w: 54, hp: 8, sp: 3.4, ai: 'sine', sc: 90, cr: 2, cost: 1, ram: 24 },
  spore: { nm: 'Spore Pod', m: ['pod', { c: 0x14532d, e: 0xbef264, n: 7 }], w: 58, hp: 18, sp: 1.3, ai: 'drift', burst: 10, sc: 130, cr: 3, cost: 1 },
  spitter: { nm: 'Acid Spitter', m: ['jelly', { c: 0x166534, e: 0x84cc16 }], w: 76, hp: 26, sp: 1.3, ai: 'hover', f: { k: 'aim3', r: 100, s: 4, n: 3 }, sc: 200, cr: 4, cost: 2 },
  beetle: { nm: 'Armor Beetle', m: ['crab', { c: 0x3f6212, e: 0xa3e635 }], w: 88, hp: 60, sp: 1.6, ai: 'charge', sc: 260, cr: 5, cost: 3, ram: 28 },
  hiveguard: { nm: 'Hive Guard', m: ['crab', { c: 0x14532d, e: 0xfacc15, k: 1.6 }], w: 138, hp: 160, sp: 1.1, ai: 'hover', f: { k: 'fan', r: 80, s: 4, n: 7 }, summon: 'wasp', sc: 900, cr: 28, cost: 6, elite: 1 },
  // W3 dunes
  gearling: { nm: 'Gearling', m: ['gear', { c: 0x78350f, e: 0xf59e0b }], w: 60, hp: 14, sp: 3.2, ai: 'line', sc: 100, cr: 2, cost: 1, ram: 26 },
  driller: { nm: 'Driller', m: ['dart', { c: 0x92400e, e: 0xfbbf24, n: 4, drill: 1 }], w: 70, hp: 20, sp: 2, ai: 'charge', sc: 150, cr: 3, cost: 2, ram: 30 },
  crawler: { nm: 'Dune Crawler', m: ['tank', { c: 0x7c2d12, e: 0xf97316 }], w: 90, hp: 40, sp: 1.3, ai: 'turret', f: { k: 'fan', r: 90, s: 4.2, n: 3 }, sc: 220, cr: 4, cost: 2 },
  scrapper: { nm: 'Scrapper', m: ['crab', { c: 0x57534e, e: 0xf59e0b }], w: 82, hp: 34, sp: 1.8, ai: 'bomber', f: { k: 'mine', r: 110, s: 0 }, sc: 200, cr: 4, cost: 2 },
  hauler: { nm: 'Scrap Hauler', m: ['tank', { c: 0x78350f, e: 0xfb923c, k: 1.5 }], w: 150, hp: 190, sp: 1.1, ai: 'hover', f: { k: 'ring', r: 90, s: 3.4, n: 12 }, sc: 950, cr: 30, cost: 7, elite: 1 },
  // W4 nebula
  wisp: { nm: 'Void Wisp', m: ['ringeye', { c: 0x6b21a8, e: 0xe879f9 }], w: 48, hp: 10, sp: 2.4, ai: 'orbit', f: { k: 'aim', r: 130, s: 3.8 }, sc: 110, cr: 2, cost: 1 },
  shard: { nm: 'Shard Caster', m: ['crystal', { c: 0x7e22ce, e: 0xf0abfc }], w: 70, hp: 24, sp: 2, ai: 'zig', f: { k: 'burst', r: 110, s: 5, n: 3 }, sc: 170, cr: 3, cost: 2 },
  warper: { nm: 'Warper', m: ['saucer', { c: 0x4c1d95, e: 0xc084fc }], w: 76, hp: 28, sp: 1.2, ai: 'blink', f: { k: 'aim3', r: 90, s: 4.4, n: 3 }, sc: 210, cr: 4, cost: 2 },
  rift: { nm: 'Rift Manta', m: ['manta', { c: 0x581c87, e: 0xd946ef }], w: 96, hp: 52, sp: 1.4, ai: 'hover', f: { k: 'ring', r: 150, s: 3.2, n: 9 }, sc: 280, cr: 5, cost: 3 },
  sentinel: { nm: 'Nebula Sentinel', m: ['ringeye', { c: 0x4c1d95, e: 0xf0abfc, k: 1.9 }], w: 140, hp: 200, sp: 1.1, ai: 'orbit', f: { k: 'spiral', r: 6, s: 3.6 }, sc: 1000, cr: 32, cost: 7, elite: 1 },
  // W5 horizon
  ember: { nm: 'Ember', m: ['pod', { c: 0x7f1d1d, e: 0xfb7185, n: 6 }], w: 44, hp: 12, sp: 2, ai: 'seeker', sc: 120, cr: 3, cost: 1, ram: 26 },
  lens: { nm: 'Lensing Eye', m: ['ringeye', { c: 0x450a0a, e: 0xfbbf24 }], w: 64, hp: 30, sp: 1.2, ai: 'orbit', f: { k: 'aim3', r: 100, s: 4.6, n: 3 }, sc: 200, cr: 4, cost: 2 },
  comet: { nm: 'Comet', m: ['dart', { c: 0x9f1239, e: 0xfde047, n: 3, k: .6 }], w: 66, hp: 22, sp: 3.8, ai: 'dive', f: { k: 'line', r: 80, s: 5.4 }, sc: 180, cr: 3, cost: 2 },
  flare: { nm: 'Solar Flare', m: ['crystal', { c: 0xb91c1c, e: 0xfde047 }], w: 74, hp: 42, sp: 1.5, ai: 'hover', f: { k: 'fan', r: 80, s: 4.6, n: 5 }, sc: 260, cr: 5, cost: 3 },
  warden: { nm: 'Horizon Warden', m: ['gear', { c: 0x7f1d1d, e: 0xfb7185, k: 1.5 }], w: 140, hp: 220, sp: 1.1, ai: 'hover', f: { k: 'ring', r: 55, s: 3.8, n: 14 }, sc: 1100, cr: 34, cost: 7, elite: 1 },
  // W6 frost
  flake: { nm: 'Snowflake', m: ['crystal', { c: 0x7dd3fc, e: 0xe0f2fe }], w: 56, hp: 14, sp: 2.2, ai: 'orbit', f: { k: 'ring', r: 190, s: 3, n: 5 }, sc: 130, cr: 3, cost: 1 },
  icicle: { nm: 'Icicle', m: ['dart', { c: 0xbae6fd, e: 0x38bdf8, n: 4 }], w: 66, hp: 16, sp: 4, ai: 'drop', sc: 120, cr: 2, cost: 1, ram: 24 },
  frostgun: { nm: 'Frost Cannon', m: ['tank', { c: 0x0c4a6e, e: 0x7dd3fc }], w: 88, hp: 46, sp: 1.2, ai: 'turret', f: { k: 'aimice', r: 100, s: 4.8 }, sc: 240, cr: 5, cost: 3 },
  yeti: { nm: 'Ice Yeti', m: ['crab', { c: 0xe0f2fe, e: 0x38bdf8 }], w: 86, hp: 70, sp: 1.8, ai: 'charge', sc: 280, cr: 5, cost: 3, ram: 30 },
  icecruiser: { nm: 'Glacier Cruiser', m: ['elite', { c: 0x0c4a6e, e: 0x7dd3fc }], w: 140, hp: 240, sp: 1.2, ai: 'hover', f: { k: 'fan', r: 60, s: 4.6, n: 7 }, summon: 'flake', sc: 1200, cr: 36, cost: 7, elite: 1 },
  // W7 foundry
  magma: { nm: 'Magma Blob', m: ['pod', { c: 0xea580c, e: 0xfde047, n: 0 }], w: 66, hp: 30, sp: 1.6, ai: 'sine', split: 'magmalet', sc: 160, cr: 3, cost: 2 },
  magmalet: { nm: 'Magmalet', m: ['pod', { c: 0xea580c, e: 0xfde047, n: 0 }], w: 36, hp: 8, sp: 2.6, ai: 'seeker', sc: 40, cr: 1, cost: 0, ram: 18 },
  anvil: { nm: 'Anvil Bomber', m: ['tank', { c: 0x44403c, e: 0xfb923c }], w: 84, hp: 48, sp: 1.8, ai: 'bomber', f: { k: 'drop', r: 70, s: 4.4 }, sc: 220, cr: 4, cost: 2 },
  salamander: { nm: 'Salamander', m: ['worm', { c: 0xb45309, e: 0xfbbf24, n: 6 }], w: 110, hp: 54, sp: 2, ai: 'snake', f: { k: 'line', r: 90, s: 4.8 }, sc: 260, cr: 5, cost: 3 },
  smelter: { nm: 'Smelter', m: ['gear', { c: 0x78350f, e: 0xef4444 }], w: 86, hp: 60, sp: 1.2, ai: 'hover', f: { k: 'fan', r: 70, s: 4.4, n: 5 }, sc: 300, cr: 6, cost: 3 },
  colossus: { nm: 'Foundry Colossus', m: ['tank', { c: 0x7c2d12, e: 0xfb923c, k: 1.6 }], w: 156, hp: 260, sp: 1.1, ai: 'hover', f: { k: 'ring', r: 60, s: 4, n: 14 }, summon: 'magma', sc: 1300, cr: 38, cost: 7, elite: 1 },
  // W8 abyss
  jelly: { nm: 'Glow Jelly', m: ['jelly', { c: 0x0e7490, e: 0x5eead4 }], w: 70, hp: 24, sp: 1.4, ai: 'sine', f: { k: 'ring', r: 180, s: 3, n: 7 }, sc: 150, cr: 3, cost: 1 },
  puffer: { nm: 'Pufferbomb', m: ['pod', { c: 0xca8a04, e: 0xfde047, n: 14 }], w: 66, hp: 30, sp: 1.8, ai: 'charge', burst: 12, sc: 180, cr: 4, cost: 2, ram: 28 },
  eel: { nm: 'Electric Eel', m: ['worm', { c: 0x155e75, e: 0x67e8f9, n: 7 }], w: 120, hp: 50, sp: 2.2, ai: 'snake', f: { k: 'aim', r: 80, s: 5 }, sc: 240, cr: 5, cost: 3 },
  lure: { nm: 'Lure Angler', m: ['manta', { c: 0x083344, e: 0x5eead4, lure: 1 }], w: 94, hp: 56, sp: 1.3, ai: 'hover', f: { k: 'aim3', r: 90, s: 4.6, n: 3 }, sc: 280, cr: 5, cost: 3 },
  kraken: { nm: 'Kraken Sub', m: ['jelly', { c: 0x134e4a, e: 0x2dd4bf, k: 1.9, n: 10 }], w: 150, hp: 280, sp: 1.1, ai: 'hover', f: { k: 'spiral', r: 5, s: 3.8 }, summon: 'jelly', sc: 1400, cr: 40, cost: 7, elite: 1 },
  // W9 mainframe
  glitch: { nm: 'Glitch Cube', m: ['cube', { c: 0x14532d, e: 0x4ade80 }], w: 54, hp: 18, sp: 2, ai: 'blink', f: { k: 'aim', r: 90, s: 5 }, sc: 140, cr: 3, cost: 1 },
  bit: { nm: 'Bit Swarmer', m: ['dart', { c: 0x1e1b4b, e: 0xe879f9, n: 4, k: .7 }], w: 40, hp: 6, sp: 3.4, ai: 'zig', sc: 60, cr: 1, cost: 1, ram: 18 },
  firewall: { nm: 'Firewall', m: ['tank', { c: 0x7f1d1d, e: 0xf97316 }], w: 90, hp: 80, sp: 1.2, ai: 'turret', f: { k: 'wall', r: 120, s: 3.4 }, sc: 320, cr: 6, cost: 3 },
  virus: { nm: 'Virus', m: ['pod', { c: 0x3b0764, e: 0xa3e635, n: 9 }], w: 56, hp: 26, sp: 1.8, ai: 'seeker', burst: 6, sc: 200, cr: 4, cost: 2 },
  daemon: { nm: 'Daemon Core', m: ['cube', { c: 0x052e16, e: 0x4ade80, k: 2.2 }], w: 140, hp: 300, sp: 1.1, ai: 'blink', f: { k: 'ring', r: 55, s: 4, n: 16 }, summon: 'bit', sc: 1500, cr: 42, cost: 7, elite: 1 },
  // W10 chrono
  cog: { nm: 'Cog Drone', m: ['gear', { c: 0xa16207, e: 0xfde047 }], w: 58, hp: 20, sp: 2.4, ai: 'sine', f: { k: 'aim', r: 100, s: 4.6 }, sc: 150, cr: 3, cost: 1 },
  tick: { nm: 'Tick Bomber', m: ['clock', { c: 0x422006, e: 0xfbbf24 }], w: 64, hp: 26, sp: 2.2, ai: 'seeker', burst: 8, sc: 180, cr: 4, cost: 2, ram: 28 },
  phoenix: { nm: 'Phoenix', m: ['manta', { c: 0xb45309, e: 0xfde047, fire: 1 }], w: 100, hp: 64, sp: 3, ai: 'swoop', f: { k: 'fan', r: 70, s: 4.8, n: 5 }, sc: 320, cr: 6, cost: 3 },
  paradox: { nm: 'Paradox', m: ['ringeye', { c: 0xa16207, e: 0xffffff }], w: 70, hp: 56, sp: 1.2, ai: 'blink', f: { k: 'burst', r: 90, s: 5.2, n: 4 }, sc: 300, cr: 6, cost: 3 },
  chronowarden: { nm: 'Chronowarden', m: ['clock', { c: 0x713f12, e: 0xfde047, k: 2 }], w: 150, hp: 340, sp: 1.1, ai: 'hover', f: { k: 'spiral', r: 4, s: 4.2 }, summon: 'cog', sc: 1700, cr: 46, cost: 8, elite: 1 },
  // W11 orbital ring
  scav: { nm: 'Scav Skiff', m: ['dart', { c: 0x64748b, e: 0xfbbf24, n: 6, k: 1.1, drill: 1 }], w: 66, hp: 34, sp: 2.6, ai: 'zig', f: { k: 'aim', r: 110, s: 4.8 }, sc: 170, cr: 3, cost: 1 },
  hullrat: { nm: 'Hull Rat', m: ['pod', { c: 0x292524, e: 0xfb923c, n: 5 }], w: 46, hp: 14, sp: 3, ai: 'seeker', burst: 4, sc: 80, cr: 2, cost: 1, ram: 22 },
  welder: { nm: 'Arc Welder', m: ['crab', { c: 0x475569, e: 0x60a5fa }], w: 88, hp: 64, sp: 1.8, ai: 'charge', sc: 300, cr: 5, cost: 3, ram: 32 },
  railturret: { nm: 'Rail Turret', m: ['tank', { c: 0x334155, e: 0xf59e0b }], w: 92, hp: 72, sp: 1.1, ai: 'turret', f: { k: 'aimfast', r: 120, s: 7.2 }, sc: 330, cr: 6, cost: 3 },
  salvager: { nm: 'Salvage Colossus', m: ['elite', { c: 0x475569, e: 0xfbbf24 }], w: 150, hp: 420, sp: 1.1, ai: 'hover', f: { k: 'fan', r: 55, s: 4.8, n: 9 }, summon: 'hullrat', sc: 1800, cr: 48, cost: 8, elite: 1 },
  // W12 crystal archipelago
  shardling: { nm: 'Shardling', m: ['crystal', { c: 0xdb2777, e: 0xfbcfe8 }], w: 56, hp: 28, sp: 2.6, ai: 'orbit', f: { k: 'ring', r: 170, s: 3.2, n: 6 }, sc: 170, cr: 3, cost: 1 },
  prism: { nm: 'Prism Drone', m: ['saucer', { c: 0x9d174d, e: 0xf9a8d4 }], w: 72, hp: 42, sp: 1.6, ai: 'sine', f: { k: 'fan', r: 90, s: 4.6, n: 3 }, sc: 230, cr: 4, cost: 2 },
  geode: { nm: 'Geode Mine', m: ['pod', { c: 0x831843, e: 0xf472b6, n: 10 }], w: 64, hp: 48, sp: 1.4, ai: 'drift', split: 'shardlet', sc: 240, cr: 4, cost: 2 },
  shardlet: { nm: 'Shardlet', m: ['crystal', { c: 0xdb2777, e: 0xfbcfe8 }], w: 34, hp: 8, sp: 2.8, ai: 'seeker', sc: 40, cr: 1, cost: 0, ram: 18 },
  refractor: { nm: 'Refractor', m: ['ringeye', { c: 0x701a75, e: 0xe9d5ff }], w: 78, hp: 72, sp: 1.2, ai: 'blink', f: { k: 'burst', r: 90, s: 5.4, n: 5 }, sc: 350, cr: 6, cost: 3 },
  monolith: { nm: 'Crystal Monolith', m: ['crystal', { c: 0x9d174d, e: 0xf9a8d4 }], w: 150, hp: 440, sp: 1.1, ai: 'hover', f: { k: 'ring', r: 50, s: 4.2, n: 18 }, summon: 'shardling', sc: 1900, cr: 50, cost: 8, elite: 1 },
  // W13 tempest gyre
  sprite: { nm: 'Storm Sprite', m: ['jelly', { c: 0x3f6212, e: 0xd9f99d }], w: 64, hp: 36, sp: 2.4, ai: 'sine', f: { k: 'line', r: 100, s: 5 }, sc: 180, cr: 3, cost: 1 },
  squall: { nm: 'Squall Rider', m: ['manta', { c: 0x365314, e: 0xbef264 }], w: 98, hp: 62, sp: 3, ai: 'swoop', f: { k: 'fan', r: 80, s: 4.8, n: 5 }, sc: 330, cr: 6, cost: 3 },
  zapper: { nm: 'Arc Zapper', m: ['sniper', { c: 0x1a2e05, e: 0xa3e635 }], w: 90, hp: 48, sp: 1.2, ai: 'hover', f: { k: 'aimfast', r: 120, s: 7.5 }, sc: 280, cr: 5, cost: 2 },
  gasbag: { nm: 'Gas Bag', m: ['pod', { c: 0x4d7c0f, e: 0xecfccb, n: 0 }], w: 82, hp: 74, sp: 1.6, ai: 'drift', burst: 14, sc: 300, cr: 5, cost: 3, ram: 24 },
  cyclone: { nm: 'Cyclone Engine', m: ['gear', { c: 0x365314, e: 0xbef264, k: 1.6 }], w: 150, hp: 460, sp: 1.1, ai: 'hover', f: { k: 'ring', r: 50, s: 4.2, n: 16 }, summon: 'sprite', sc: 2000, cr: 52, cost: 8, elite: 1 },
  // W14 graveyard
  specter: { nm: 'Specter Skiff', m: ['dart', { c: 0xa8a29e, e: 0x99f6e4, n: 8, k: 1.2 }], w: 72, hp: 46, sp: 2.8, ai: 'blink', f: { k: 'aim', r: 90, s: 5.4 }, sc: 240, cr: 4, cost: 2 },
  reaper: { nm: 'Reaper Drone', m: ['saucer', { c: 0x292524, e: 0xef4444 }], w: 74, hp: 58, sp: 2, ai: 'orbit', f: { k: 'fan', r: 80, s: 5, n: 5 }, sc: 300, cr: 5, cost: 2 },
  ossuary: { nm: 'Bone Turret', m: ['tank', { c: 0xd6d3d1, e: 0x99f6e4 }], w: 92, hp: 92, sp: 1.1, ai: 'turret', f: { k: 'wall', r: 110, s: 3.8 }, sc: 360, cr: 6, cost: 3 },
  leech: { nm: 'Hull Leech', m: ['worm', { c: 0x44403c, e: 0x84cc16, n: 8 }], w: 112, hp: 68, sp: 2.2, ai: 'snake', f: { k: 'line', r: 80, s: 5 }, sc: 320, cr: 6, cost: 3 },
  lich: { nm: 'Dread Lich', m: ['elite', { c: 0x44403c, e: 0x99f6e4 }], w: 150, hp: 500, sp: 1.1, ai: 'hover', f: { k: 'spiral', r: 4, s: 4.2 }, summon: 'specter', sc: 2100, cr: 54, cost: 8, elite: 1 },
  // W15 heart of aetheria
  photon: { nm: 'Photon Wisp', m: ['crystal', { c: 0xe0f2fe, e: 0x22d3ee }], w: 58, hp: 42, sp: 2.8, ai: 'orbit', f: { k: 'ring', r: 150, s: 3.6, n: 7 }, sc: 260, cr: 4, cost: 2 },
  construct: { nm: 'Aether Construct', m: ['gear', { c: 0x0e7490, e: 0x67e8f9, k: 1.2 }], w: 82, hp: 84, sp: 1.4, ai: 'hover', f: { k: 'fan', r: 75, s: 4.8, n: 5 }, sc: 380, cr: 7, cost: 3 },
  echo: { nm: 'Memory Echo', m: ['ringeye', { c: 0xcffafe, e: 0xffffff }], w: 72, hp: 70, sp: 1.3, ai: 'blink', f: { k: 'burst', r: 80, s: 5.6, n: 5 }, sc: 350, cr: 6, cost: 3 },
  sentry: { nm: 'Core Sentry', m: ['tank', { c: 0x155e75, e: 0x22d3ee }], w: 94, hp: 104, sp: 1.1, ai: 'turret', f: { k: 'aim3', r: 95, s: 5, n: 3 }, sc: 420, cr: 7, cost: 4 },
  // W16 the glitch: corrupted copies of things you have fought
  gjet: { nm: 'Corrupted Skyjet', m: ['dart', { c: 0x0b0b12, e: 0xff2bd6 }], w: 66, hp: 46, sp: 2.9, ai: 'blink', f: { k: 'aim', r: 95, s: 5.6 }, sc: 280, cr: 5, cost: 1 },
  gpod: { nm: 'Packet Loss', m: ['pod', { c: 0x1a0b2e, e: 0x22d3ee, n: 9 }], w: 62, hp: 70, sp: 1.4, ai: 'drift', burst: 14, sc: 300, cr: 6, cost: 1 },
  gcube: { nm: 'Missing Texture', m: ['cube', { c: 0xff00ff, e: 0x111111 }], w: 74, hp: 96, sp: 1.3, ai: 'blink', f: { k: 'burst', r: 100, s: 5.2, n: 5 }, sc: 420, cr: 8, cost: 2 },
  gecho: { nm: 'Deja Vu', m: ['ringeye', { c: 0x0b0b12, e: 0x4ade80 }], w: 76, hp: 88, sp: 2.4, ai: 'orbit', f: { k: 'ring', r: 90, s: 3.9, n: 9 }, sc: 400, cr: 8, cost: 2 },
  gadmin: { nm: 'Admin Process', m: ['elite', { c: 0x1a0b2e, e: 0xff2bd6 }], w: 160, hp: 620, sp: 1.1, ai: 'hover', f: { k: 'spiral', r: 55, s: 4.6 }, summon: 'gjet', sc: 2800, cr: 62, cost: 9, elite: 1 },
  guardian: { nm: 'Aether Guardian', m: ['elite', { c: 0x0e7490, e: 0xe0f2fe }], w: 160, hp: 560, sp: 1.1, ai: 'hover', f: { k: 'ring', r: 45, s: 4.4, n: 20 }, summon: 'photon', sc: 2400, cr: 58, cost: 9, elite: 1 },
  // misc
  dummy: { nm: 'Target Drone', m: ['saucer', { c: 0x334155, e: 0x22d3ee }], w: 74, hp: 30, sp: .9, ai: 'line', sc: 10, cr: 1, cost: 0 },
  rock: { nm: 'Asteroid', m: ['rock', { c: 0x57534e, e: 0x000000 }], w: 60, hp: 22, sp: 2, ai: 'line', sc: 20, cr: 1, cost: 0, ram: 20, rock: 1 }
};
Object.keys(EN).forEach(k => EN[k].id = k);

// ---------- bosses ----------
// atk entries: k kind, r = cooldown frames after use. phases switch at hp fraction `at`.
const BOSSES = [
  { nm: 'Sky-Dominator Dreadnought', hp: 600, w: 250, c: '#38bdf8', rew: 500, mv: 'hover', ph: [
    { at: 1, mv: 'hover', atk: [{ k: 'fan', n: 7, sp: 1.1, s: 4.2, r: 70 }, { k: 'aim', n: 3, s: 5, r: 60 }] },
    { at: .5, mv: 'sweep', atk: [{ k: 'ring', n: 16, s: 3.4, r: 80 }, { k: 'fan', n: 9, sp: 1.4, s: 4.6, r: 50 }, { k: 'rain', n: 8, s: 4, r: 90 }] }] },
  { nm: 'Bio-Hive Overseer', hp: 850, w: 260, c: '#10b981', rew: 750, mv: 'hover', ph: [
    { at: 1, mv: 'hover', atk: [{ k: 'spiral', n: 40, s: 3.4, r: 120 }, { k: 'aim', n: 5, s: 4.6, r: 55 }] },
    { at: .66, mv: 'sweep', atk: [{ k: 'summon', id: 'wasp', n: 4, r: 100 }, { k: 'ring', n: 18, s: 3.2, r: 80 }] },
    { at: .33, mv: 'hover', atk: [{ k: 'spiral', n: 60, s: 4, r: 90 }, { k: 'summon', id: 'spore', n: 3, r: 120 }, { k: 'fan', n: 11, sp: 1.8, s: 4.4, r: 50 }] }] },
  { nm: 'Rust-Titan Excavator', hp: 1100, w: 280, c: '#f59e0b', rew: 1000, mv: 'hover', ph: [
    { at: 1, mv: 'hover', atk: [{ k: 'rain', n: 10, s: 4.4, r: 80 }, { k: 'fan', n: 7, sp: 1.2, s: 4.4, r: 60 }] },
    { at: .66, mv: 'charge', atk: [{ k: 'mines', n: 5, r: 100 }, { k: 'ring', n: 14, s: 3.6, r: 70 }] },
    { at: .33, mv: 'sweep', atk: [{ k: 'wall', n: 12, s: 3.4, r: 110 }, { k: 'rain', n: 14, s: 5, r: 60 }, { k: 'summon', id: 'gearling', n: 4, r: 130 }] }] },
  { nm: 'Void Leviathan', hp: 1400, w: 270, c: '#c084fc', rew: 1500, mv: 'orbit', ph: [
    { at: 1, mv: 'orbit', atk: [{ k: 'ring', n: 20, s: 3.2, r: 70 }, { k: 'aim', n: 5, s: 5.2, r: 50 }] },
    { at: .66, mv: 'orbit', atk: [{ k: 'spiral', n: 50, s: 3.8, r: 90 }, { k: 'homing', n: 3, s: 3, r: 90 }] },
    { at: .33, mv: 'sweep', atk: [{ k: 'beam', r: 150 }, { k: 'ring', n: 24, s: 3.6, r: 60 }, { k: 'summon', id: 'wisp', n: 4, r: 140 }] }] },
  { nm: 'Singularity Sovereign', hp: 2000, w: 300, c: '#f43f5e', rew: 3000, mv: 'hover', ph: [
    { at: 1, mv: 'hover', atk: [{ k: 'spiral', n: 60, s: 3.8, r: 80 }, { k: 'ring', n: 20, s: 3.4, r: 60 }] },
    { at: .75, mv: 'sweep', atk: [{ k: 'homing', n: 4, s: 3.2, r: 80 }, { k: 'fan', n: 13, sp: 2, s: 4.8, r: 45 }] },
    { at: .5, mv: 'orbit', atk: [{ k: 'beam', r: 140 }, { k: 'rain', n: 14, s: 5, r: 60 }, { k: 'ring', n: 26, s: 3.8, r: 70 }] },
    { at: .25, mv: 'charge', atk: [{ k: 'spiral', n: 90, s: 4.4, r: 70 }, { k: 'homing', n: 5, s: 3.6, r: 70 }, { k: 'wall', n: 14, s: 4, r: 100 }] }] },
  { nm: 'Permafrost Warden', hp: 2300, w: 280, c: '#7dd3fc', rew: 3400, mv: 'hover', ph: [
    { at: 1, mv: 'hover', atk: [{ k: 'rain', n: 12, s: 4.6, r: 60, ice: 1 }, { k: 'fan', n: 9, sp: 1.6, s: 4.6, r: 60 }] },
    { at: .66, mv: 'sweep', atk: [{ k: 'ring', n: 22, s: 3.4, r: 70, ice: 1 }, { k: 'summon', id: 'flake', n: 4, r: 120 }, { k: 'aim', n: 5, s: 5.4, r: 50 }] },
    { at: .33, mv: 'orbit', atk: [{ k: 'beam', r: 130 }, { k: 'spiral', n: 70, s: 4.2, r: 70 }, { k: 'wall', n: 14, s: 3.8, r: 100 }] }] },
  { nm: 'Forge Titan', hp: 2700, w: 300, c: '#fb923c', rew: 3800, mv: 'charge', ph: [
    { at: 1, mv: 'hover', atk: [{ k: 'mines', n: 6, r: 90 }, { k: 'fan', n: 9, sp: 1.5, s: 4.6, r: 55 }] },
    { at: .66, mv: 'charge', atk: [{ k: 'rain', n: 16, s: 5.2, r: 55 }, { k: 'ring', n: 20, s: 3.8, r: 70 }] },
    { at: .33, mv: 'sweep', atk: [{ k: 'beam', r: 120 }, { k: 'summon', id: 'magma', n: 3, r: 130 }, { k: 'wall', n: 14, s: 4.2, r: 90 }, { k: 'spiral', n: 80, s: 4.4, r: 70 }] }] },
  { nm: 'Abyssal Angler', hp: 3100, w: 300, c: '#2dd4bf', rew: 4200, mv: 'sweep', ph: [
    { at: 1, mv: 'sweep', atk: [{ k: 'homing', n: 3, s: 3.2, r: 80 }, { k: 'fan', n: 9, sp: 1.6, s: 4.4, r: 60 }] },
    { at: .66, mv: 'charge', atk: [{ k: 'ring', n: 24, s: 3.4, r: 70 }, { k: 'summon', id: 'jelly', n: 3, r: 120 }, { k: 'aim', n: 5, s: 5.6, r: 50 }] },
    { at: .33, mv: 'orbit', atk: [{ k: 'beam', r: 120 }, { k: 'spiral', n: 90, s: 4.4, r: 60 }, { k: 'rain', n: 16, s: 5, r: 55 }] }] },
  { nm: 'Overmind Mainframe', hp: 3600, w: 290, c: '#4ade80', rew: 4800, mv: 'hover', ph: [
    { at: 1, mv: 'hover', atk: [{ k: 'wall', n: 14, s: 3.8, r: 100 }, { k: 'aim', n: 6, s: 5.4, r: 50 }] },
    { at: .66, mv: 'sweep', atk: [{ k: 'summon', id: 'bit', n: 6, r: 110 }, { k: 'ring', n: 26, s: 3.8, r: 65 }, { k: 'beam', r: 130 }] },
    { at: .33, mv: 'orbit', atk: [{ k: 'homing', n: 5, s: 3.6, r: 70 }, { k: 'spiral', n: 100, s: 4.6, r: 60 }, { k: 'rain', n: 18, s: 5.4, r: 55 }, { k: 'wall', n: 16, s: 4.4, r: 90 }] }] },
  { nm: 'Chrono Archon', hp: 4500, w: 310, c: '#fde047', rew: 7000, mv: 'orbit', ph: [
    { at: 1, mv: 'orbit', atk: [{ k: 'spiral', n: 70, s: 4, r: 70 }, { k: 'ring', n: 22, s: 3.6, r: 60 }] },
    { at: .75, mv: 'sweep', atk: [{ k: 'homing', n: 4, s: 3.4, r: 70 }, { k: 'fan', n: 15, sp: 2.2, s: 5, r: 45 }, { k: 'summon', id: 'cog', n: 4, r: 120 }] },
    { at: .5, mv: 'charge', atk: [{ k: 'beam', r: 110 }, { k: 'rain', n: 20, s: 5.6, r: 50 }, { k: 'wall', n: 16, s: 4.6, r: 90 }] },
    { at: .25, mv: 'orbit', atk: [{ k: 'spiral', n: 120, s: 4.8, r: 55 }, { k: 'homing', n: 6, s: 4, r: 60 }, { k: 'ring', n: 30, s: 4, r: 55 }, { k: 'beam', r: 100 }] }] },
  { nm: 'Orbital Ring Sovereign', hp: 4800, w: 320, c: '#cbd5e1', rew: 8500, mv: 'orbit', ph: [
    { at: 1, mv: 'orbit', atk: [{ k: 'ring', n: 24, s: 3.6, r: 70 }, { k: 'aim', n: 5, s: 5.6, r: 50 }] },
    { at: .75, mv: 'sweep', atk: [{ k: 'wall', n: 16, s: 4, r: 100 }, { k: 'rain', n: 16, s: 5.4, r: 55 }, { k: 'summon', id: 'hullrat', n: 5, r: 120 }] },
    { at: .5, mv: 'charge', atk: [{ k: 'mines', n: 7, r: 90 }, { k: 'fan', n: 13, sp: 1.8, s: 5, r: 50 }, { k: 'beam', r: 120 }] },
    { at: .25, mv: 'orbit', atk: [{ k: 'spiral', n: 100, s: 4.6, r: 60 }, { k: 'ring', n: 30, s: 4, r: 55 }, { k: 'homing', n: 5, s: 3.8, r: 70 }] }] },
  { nm: 'Prism Hydra', hp: 5200, w: 320, c: '#f9a8d4', rew: 9500, mv: 'hover', ph: [
    { at: 1, mv: 'hover', atk: [{ k: 'fan', n: 11, sp: 1.8, s: 4.8, r: 55 }, { k: 'aim', n: 6, s: 5.6, r: 50 }] },
    { at: .75, mv: 'sweep', atk: [{ k: 'ring', n: 26, s: 3.8, r: 65 }, { k: 'summon', id: 'shardling', n: 5, r: 110 }, { k: 'rain', n: 16, s: 5.4, r: 55 }] },
    { at: .5, mv: 'orbit', atk: [{ k: 'beam', r: 110 }, { k: 'homing', n: 5, s: 3.6, r: 70 }, { k: 'spiral', n: 90, s: 4.6, r: 60 }] },
    { at: .25, mv: 'charge', atk: [{ k: 'fan', n: 17, sp: 2.2, s: 5.2, r: 45 }, { k: 'ring', n: 32, s: 4, r: 55 }, { k: 'beam', r: 100 }, { k: 'wall', n: 16, s: 4.4, r: 90 }] }] },
  { nm: 'Cyclone Tyrant', hp: 5600, w: 320, c: '#bef264', rew: 10500, mv: 'sweep', ph: [
    { at: 1, mv: 'sweep', atk: [{ k: 'rain', n: 16, s: 5.4, r: 55 }, { k: 'aim', n: 6, s: 5.8, r: 50 }] },
    { at: .75, mv: 'orbit', atk: [{ k: 'spiral', n: 90, s: 4.4, r: 65 }, { k: 'summon', id: 'sprite', n: 5, r: 110 }, { k: 'fan', n: 13, sp: 1.9, s: 5.2, r: 50 }] },
    { at: .5, mv: 'charge', atk: [{ k: 'beam', r: 105 }, { k: 'ring', n: 30, s: 4, r: 55 }, { k: 'wall', n: 16, s: 4.6, r: 85 }] },
    { at: .25, mv: 'sweep', atk: [{ k: 'spiral', n: 120, s: 5, r: 55 }, { k: 'homing', n: 6, s: 4, r: 60 }, { k: 'rain', n: 22, s: 6, r: 45 }, { k: 'beam', r: 95 }] }] },
  { nm: 'Grave Admiral', hp: 6000, w: 330, c: '#99f6e4', rew: 12000, mv: 'hover', ph: [
    { at: 1, mv: 'hover', atk: [{ k: 'wall', n: 16, s: 4, r: 90 }, { k: 'aim', n: 7, s: 5.8, r: 45 }] },
    { at: .75, mv: 'sweep', atk: [{ k: 'summon', id: 'specter', n: 5, r: 110 }, { k: 'ring', n: 30, s: 4, r: 60 }, { k: 'mines', n: 7, r: 90 }] },
    { at: .5, mv: 'orbit', atk: [{ k: 'beam', r: 100 }, { k: 'homing', n: 6, s: 3.8, r: 65 }, { k: 'spiral', n: 110, s: 4.8, r: 55 }] },
    { at: .25, mv: 'charge', atk: [{ k: 'fan', n: 19, sp: 2.2, s: 5.4, r: 42 }, { k: 'ring', n: 34, s: 4.2, r: 50 }, { k: 'wall', n: 18, s: 4.8, r: 80 }, { k: 'beam', r: 90 }] }] },
  { nm: 'The Aetheria Core', hp: 7500, w: 340, c: '#67e8f9', rew: 20000, mv: 'orbit', ph: [
    { at: 1, mv: 'orbit', atk: [{ k: 'ring', n: 28, s: 3.8, r: 65 }, { k: 'aim', n: 7, s: 5.8, r: 45 }] },
    { at: .8, mv: 'sweep', atk: [{ k: 'spiral', n: 100, s: 4.6, r: 60 }, { k: 'summon', id: 'photon', n: 5, r: 110 }, { k: 'fan', n: 15, sp: 2, s: 5.4, r: 48 }] },
    { at: .6, mv: 'charge', atk: [{ k: 'beam', r: 100 }, { k: 'rain', n: 22, s: 6, r: 45 }, { k: 'wall', n: 18, s: 4.8, r: 80 }] },
    { at: .4, mv: 'orbit', atk: [{ k: 'homing', n: 6, s: 4, r: 60 }, { k: 'ring', n: 36, s: 4.2, r: 50 }, { k: 'spiral', n: 130, s: 5, r: 50 }, { k: 'summon', id: 'echo', n: 4, r: 120 }] },
    { at: .2, mv: 'charge', atk: [{ k: 'beam', r: 85 }, { k: 'fan', n: 21, sp: 2.4, s: 5.6, r: 40 }, { k: 'ring', n: 40, s: 4.4, r: 45 }, { k: 'homing', n: 7, s: 4.2, r: 55 }, { k: 'rain', n: 26, s: 6.4, r: 40 }] }] },
  { nm: 'The Null Process', hp: 8600, w: 330, c: '#ff2bd6', rew: 26000, mv: 'orbit', ph: [
    { at: 1, mv: 'orbit', atk: [{ k: 'wall', n: 18, s: 4.2, r: 85 }, { k: 'aim', n: 7, s: 6, r: 45 }] },
    { at: .8, mv: 'sweep', atk: [{ k: 'summon', id: 'gjet', n: 5, r: 110 }, { k: 'spiral', n: 110, s: 4.8, r: 55 }, { k: 'mines', n: 7, r: 90 }] },
    { at: .6, mv: 'charge', atk: [{ k: 'beam', r: 95 }, { k: 'rain', n: 24, s: 6.2, r: 45 }, { k: 'ring', n: 34, s: 4.2, r: 50 }] },
    { at: .4, mv: 'orbit', atk: [{ k: 'summon', id: 'gcube', n: 3, r: 120 }, { k: 'homing', n: 7, s: 4.2, r: 55 }, { k: 'fan', n: 21, sp: 2.4, s: 5.6, r: 42 }, { k: 'wall', n: 20, s: 5, r: 75 }] },
    { at: .2, mv: 'charge', atk: [{ k: 'beam', r: 80 }, { k: 'spiral', n: 140, s: 5.2, r: 45 }, { k: 'ring', n: 42, s: 4.6, r: 42 }, { k: 'rain', n: 28, s: 6.6, r: 38 }, { k: 'summon', id: 'gecho', n: 3, r: 130 }] }] },
  { nm: 'Aetheria Prime, the First Signal', hp: 11000, w: 360, c: '#fde047', rew: 40000, mv: 'orbit', ph: [
    { at: 1, mv: 'hover', atk: [{ k: 'fan', n: 13, sp: 1.8, s: 5, r: 55 }, { k: 'aim', n: 7, s: 6, r: 45 }, { k: 'ring', n: 26, s: 3.8, r: 70 }] },
    { at: .84, mv: 'sweep', atk: [{ k: 'spiral', n: 120, s: 4.8, r: 55 }, { k: 'summon', id: 'phoenix', n: 4, r: 120 }, { k: 'homing', n: 6, s: 4, r: 60 }] },
    { at: .68, mv: 'orbit', atk: [{ k: 'beam', r: 90 }, { k: 'wall', n: 18, s: 4.8, r: 75 }, { k: 'ring', n: 36, s: 4.2, r: 50 }] },
    { at: .52, mv: 'charge', atk: [{ k: 'rain', n: 26, s: 6.4, r: 40 }, { k: 'fan', n: 21, sp: 2.4, s: 5.6, r: 40 }, { k: 'summon', id: 'refractor', n: 3, r: 120 }, { k: 'mines', n: 8, r: 85 }] },
    { at: .34, mv: 'orbit', atk: [{ k: 'spiral', n: 150, s: 5.2, r: 45 }, { k: 'homing', n: 8, s: 4.4, r: 50 }, { k: 'beam', r: 80 }, { k: 'ring', n: 44, s: 4.6, r: 42 }] },
    { at: .16, mv: 'charge', atk: [{ k: 'beam', r: 70 }, { k: 'wall', n: 22, s: 5.2, r: 65 }, { k: 'spiral', n: 160, s: 5.4, r: 40 }, { k: 'rain', n: 30, s: 6.8, r: 36 }, { k: 'fan', n: 25, sp: 2.6, s: 5.8, r: 36 }, { k: 'summon', id: 'guardian', n: 1, r: 260 }] }] }
];

// ---------- weapons ----------
// d damage, r fire interval (frames), s bullet speed, am ammo per shot (aux = free), k kind for visuals
const WORDER = ['twin', 'spread', 'lancer', 'ion', 'missile', 'orb', 'arc', 'rail'];
const WPN = {
  twin: { nm: 'Twin Pulse', ds: 'Reliable paired bolts. Balanced and cheap.', d: 5, r: 9, s: 12, am: 1, price: 0, c: '#22d3ee' },
  spread: { nm: 'Scatter Fan', ds: '5-way shotgun spread. Great up close.', d: 3.2, r: 17, s: 11, am: 2.2, price: 600, c: '#a3e635' },
  lancer: { nm: 'Piercing Lancer', ds: 'Heavy bolts that punch through everything.', d: 14, r: 22, s: 17, am: 2.4, price: 900, c: '#f472b6', pierce: 99 },
  ion: { nm: 'Ion Repeater', ds: 'Rapid-fire stream. Lower damage per shot.', d: 2.6, r: 4, s: 14, am: .5, price: 1300, c: '#fde047' },
  missile: { nm: 'Seeker Missiles', ds: 'Homing rockets with a blast radius.', d: 11, r: 28, s: 7, am: 3, price: 1800, c: '#fb923c', home: 1 },
  orb: { nm: 'Plasma Orb', ds: 'Slow giant orb that crushes bullets and enemies.', d: 30, r: 46, s: 5, am: 5, price: 2400, c: '#c084fc', pierce: 99, big: 1 },
  arc: { nm: 'Arc Caster', ds: 'Lightning that chains between nearby enemies.', d: 8, r: 16, s: 15, am: 2, price: 3000, c: '#93c5fd', chain: 1 },
  rail: { nm: 'Rail Cannon', ds: 'Piercing hypersonic slug. Slow, ruinous.', d: 55, r: 54, s: 30, am: 6, price: 4000, c: '#f8fafc', pierce: 99 }
};

// ---------- ship parts ----------
const PARTS = {
  hull: {
    falcon: { nm: 'Falcon', ds: 'All-rounder', p: 0, hp: 0, sp: 0, am: 0, dm: 0, rd: 0 },
    vanguard: { nm: 'Vanguard', ds: '+30 hull, a bit slower', p: 500, hp: 30, sp: -.2, am: 0, dm: 0, rd: 0 },
    phantom: { nm: 'Phantom', ds: '+12% speed, -15 hull', p: 700, hp: -15, sp: .35, am: 0, dm: 0, rd: 0 },
    titan: { nm: 'Titan', ds: '+60 hull, +30 plasma, slow', p: 1200, hp: 60, sp: -.4, am: 30, dm: 0, rd: 0 },
    nova: { nm: 'Nova', ds: '+15% damage, -25 hull', p: 1600, hp: -25, sp: 0, am: 0, dm: .15, rd: 0 },
    ronin: { nm: 'Ronin', ds: 'MELEE: a blade field cuts enemies and shots that get close. +20 hull, +12% speed, -20% gun damage', p: 1800, hp: 20, sp: .35, am: 0, dm: -.2, rd: 0 },
    hive: { nm: 'Hive', ds: 'CARRIER: launches with 2 extra wingmen. +40 hull, slow, -15% gun damage', p: 2000, hp: 40, sp: -.25, am: 0, dm: -.15, rd: 0 },
    longbow: { nm: 'Longbow', ds: 'SNIPER: +40% damage, -25% fire rate, -15 hull', p: 1900, hp: -15, sp: 0, am: 0, dm: .4, rd: -.25 },
    wraith: { nm: 'Wraith', ds: '+25% speed, +10% damage, -25 hull', p: 0, hp: -25, sp: .5, am: 0, dm: .1, rd: 0, secret: 1, hint: 'Rumour: pilots who are never touched may earn this.' },
    aegis: { nm: 'Aegis', ds: '+90 hull, +40 plasma, slow', p: 0, hp: 90, sp: -.5, am: 40, dm: 0, rd: 0, secret: 1, hint: 'Rumour: it waits at the end of a golden vault.' }
  },
  wings: {
    swept: { nm: 'Swept', ds: 'Balanced', p: 0, hp: 0, sp: 0, am: 0, dm: 0, rd: 0 },
    delta: { nm: 'Delta', ds: '+8% damage', p: 350, hp: 0, sp: 0, am: 0, dm: .08, rd: 0 },
    forward: { nm: 'Forward', ds: '+8% fire rate', p: 450, hp: 0, sp: 0, am: 0, dm: 0, rd: .08 },
    broad: { nm: 'Broad', ds: '+12 hull, +10 plasma', p: 550, hp: 12, sp: 0, am: 10, dm: 0, rd: 0 }
  },
  engine: {
    twin: { nm: 'Twin Jets', ds: 'Balanced', p: 0, hp: 0, sp: 0, am: 0, dm: 0, rd: 0 },
    quad: { nm: 'Quad Thrusters', ds: '+10% speed', p: 400, hp: 0, sp: .3, am: 0, dm: 0, rd: 0 },
    heavy: { nm: 'Heavy Drive', ds: '+20 hull', p: 500, hp: 20, sp: -.1, am: 0, dm: 0, rd: 0 },
    pods: { nm: 'Wing Pods', ds: '+15 plasma, +5% speed', p: 600, hp: 0, sp: .15, am: 15, dm: 0, rd: 0 }
  },
  canopy: {
    bubble: { nm: 'Bubble', ds: 'Classic', p: 0 },
    razor: { nm: 'Razor', ds: 'Sleek', p: 200 },
    dome: { nm: 'Dome', ds: 'Roomy', p: 250 },
    visor: { nm: 'Visor', ds: 'Armored band', p: 300 }
  }
};
const PAINTS = ['#94a3b8', '#e2e8f0', '#1e293b', '#ef4444', '#fb923c', '#facc15', '#4ade80', '#22d3ee', '#3b82f6', '#a78bfa', '#f472b6', '#7c2d12'];
const ACCENTS = ['#22d3ee', '#4ade80', '#facc15', '#fb923c', '#f43f5e', '#e879f9', '#818cf8', '#ffffff'];
const FINISHES = { chrome: { nm: 'Chrome', p: 0 }, matte: { nm: 'Matte', p: 150 }, pearl: { nm: 'Pearl', p: 250 }, neon: { nm: 'Neon', p: 350 }, carbon: { nm: 'Carbon', p: 400 } };

// ---------- shop upgrades (price rises every purchase) ----------
const UPG = {
  hp: { nm: 'Hull Plating', ds: '+20 max hull per level', b: 70, g: 1.22, max: 12, ic: 'hp' },
  sh: { nm: 'Shield Cell', ds: '+15 max shield per level', b: 80, g: 1.22, max: 12, ic: 'sh' },
  am: { nm: 'Plasma Tank', ds: '+20 max plasma per level', b: 60, g: 1.2, max: 12, ic: 'am' },
  dmg: { nm: 'Weapon Core', ds: '+8% damage per level', b: 110, g: 1.26, max: 12, ic: 'dmg' },
  rate: { nm: 'Fire Control', ds: '+5% fire rate per level', b: 100, g: 1.25, max: 10, ic: 'rate' },
  spd: { nm: 'Thruster Tune', ds: '+4% move speed per level', b: 90, g: 1.24, max: 10, ic: 'spd' },
  mag: { nm: 'Tractor Beam', ds: '+25% pickup magnet range per level', b: 60, g: 1.25, max: 8, ic: 'mag' },
  drn: { nm: 'Wingman Bay', ds: '+1 AI wingman drone per level. They fly with you and shoot on their own.', b: 420, g: 1.75, max: 3, ic: 'drn' },
  drd: { nm: 'Wingman Tuning', ds: '+25% wingman damage per level', b: 160, g: 1.34, max: 6, ic: 'drd' }
};
const upPrice = (k, lv) => Math.round(UPG[k].b * Math.pow(UPG[k].g, lv));

// ---------- modes ----------
const MODES = {
  expedition: { nm: 'Expedition', ds: 'The campaign. Fight through ' + WORLDS.length + ' worlds, 13 stages each, ending in a boss.', ic: 'map' },
  endless: { nm: 'Endless', ds: 'Survive escalating waves across every world. Chase the high score.', ic: 'inf' },
  rush: { nm: 'Boss Rush', ds: 'Every boss you have beaten, back to back. Repairs between fights.', ic: 'skull' },
  blitz: { nm: 'Blitz', ds: '90 seconds. Unlimited plasma. Kills add time. Combos multiply score.', ic: 'bolt' },
  training: { nm: 'Training', ds: 'No damage, no pressure. Test weapons on any world.', ic: 'target' },
  daily: { nm: 'Daily Challenge', ds: 'A new modifier every day. Same waves all day. Build a streak.', ic: 'clock', cat: 1 },
  defense: { nm: 'Station Defense', ds: 'Protect the station for 10 waves. Anything that slips past hurts it.', ic: 'sh', cat: 1 },
  nohit: { nm: 'No-Hit Run', ds: 'Two waves and a boss. A single hit ends the run.', ic: 'ring', cat: 1 },
  vault: { nm: 'The Vault', ds: 'Golden enemies and triple cores. A secret for sharp pilots.', ic: 'coin', cat: 1, secret: 1 }
};

// ---------- ship stats ----------
function shipStats(pl) {
  const c = pl.cfg, h = PARTS.hull[c.hull] || PARTS.hull.falcon, w = PARTS.wings[c.wings] || PARTS.wings.swept, e = PARTS.engine[c.engine] || PARTS.engine.twin, u = pl.up;
  const sum = k => (h[k] || 0) + (w[k] || 0) + (e[k] || 0);
  return {
    hp: Math.round(100 + sum('hp') + u.hp * 20), sh: Math.round(40 + u.sh * 15), am: Math.round(100 + sum('am') + u.am * 20),
    dmg: 1 + sum('dm') + u.dmg * .08, rate: 1 + sum('rd') + u.rate * .05, spd: (4.6 + sum('sp')) * (1 + u.spd * .04), mag: 1 + u.mag * .25
  };
}
const HULLK = { falcon: 1, vanguard: 1.08, phantom: .96, titan: 1.2, nova: 1, wraith: .94, aegis: 1.26, ronin: 1, hive: 1.22, longbow: 1.04 };

// ---------- level generation ----------
function levelSpec(w, i, tier, alt) {
  const t = alt && ALT_NODE[i] ? ALT_NODE[i] : NODE_PAT[i], d = 1.3 + w * .16 + i * .035 + (tier - 1) * .5;
  const rs = seeded(w * 977 + i * 131 + tier * 7919 + 13);
  return { w, i, tier, type: t, diff: d, seed: w * 977 + i * 131 + tier, name: lvName(w, i) + (t === 'g' ? ' - Treasure Run' : t === 'x' ? ' - Gauntlet' : ''), rs, waves: t === 'B' ? 2 : t === 's' ? 3 : t === 'x' ? 5 + Math.floor(i / 4) : 4 + Math.floor(i / 4), alt: !!(alt && ALT_NODE[i]) };
}
// roster allowed at this level index (unlocks gradually)
function rosterFor(w, i) { const r = WORLDS[w].ro, n = i < 2 ? 1 : i < 4 ? 2 : i < 7 ? 3 : 4; return r.slice(0, Math.max(2, n)); }

// ---- extra maps: endless survival runs on themed 3D maps ----
const MAPS = [
  { k: 'suburb', nm: 'Maple Grove', sub: 'A sleepy suburb on a golden afternoon - until the sky fills with ships', arena: 'suburb', mi: 15, seed: 211, ac: '#fbbf24' },
  { k: 'park', nm: 'Starlight Park', sub: 'A theme park at dusk: coasters, a Ferris wheel and fireworks', arena: 'park', mi: 16, seed: 223, ac: '#f472b6' },
  { k: 'backrooms', nm: 'The Backrooms', sub: 'Endless yellow rooms, buzzing lights, damp carpet. Nobody should be here', arena: 'backrooms', mi: 17, seed: 227, ac: '#facc15' },
  { k: 'blocks', nm: 'Blocklands', sub: 'A world built out of blocks, with blocky critters wandering the hills', arena: 'blocks', mi: 18, seed: 229, ac: '#4ade80' },
  { k: 'freeway', nm: 'Midnight Freeway', sub: 'Eight lanes of night traffic under orange lights', arena: 'freeway', mi: 19, seed: 233, ac: '#fb923c' },
  { k: 'school', nm: 'Hall Pass', sub: 'A high school hallway between classes', arena: 'school', mi: 20, seed: 239, ac: '#60a5fa' },
  { k: 'beach', nm: 'Boardwalk', sub: 'Sand, surf, a pier and a sunset', arena: 'beach', mi: 21, seed: 241, ac: '#38bdf8' },
  { k: 'vapor', nm: 'Vapor Grid', sub: 'A neon sunset over a grid that never ends', arena: 'vapor', mi: 22, seed: 251, ac: '#f472b6' },
  { k: 'glitchcore', nm: 'Null Sector', sub: 'Where the broken pieces of every world drift', arena: 'glitchcore', mi: 23, seed: 257, ac: '#ff2bd6', hidden: 1 }
];
// World 16 is the glitch: every sector drops you into a different place that should not be there
const GLITCH_W = 15;
const GLITCH_SECT = ['suburb', 'freeway', 'school', 'park', 'beach', 'backrooms', 'vapor', 'blocks', 'suburb', 'freeway', 'school', 'park', 'glitchcore'];
const glitchMap = lv => MAPS.find(m => m.k === GLITCH_SECT[lv | 0]) || MAPS[0];
