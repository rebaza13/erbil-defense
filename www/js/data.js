// ===== Game data: units, missions, story =====
// armor: 0 light (pierceable / pinnable), 1 medium, 2 heavy (knocked back, never pierced), 3 siege
window.UNITS = {
  // ---------------- ERBIL DEFENDERS (side +1, move right) ----------------
  k_spear: { rush: true, side: 1, name: 'Militia Spearman', cost: 2, hp: 70, armor: 0, speed: 53, mass: 1, dmg: 12, range: 50, cd: 0.9,
    look: { torso: 'kt_linen', helm: 'k_headwrap', weapon: 'k_spear', grip: 'spear' }, portrait: 'pk_0',
    desc: 'Cheap townsfolk with long spears. Reach beats short blades.' },
  k_sword: { rush: true, side: 1, name: 'Shield Swordsman', cost: 3, hp: 125, armor: 1, speed: 50, mass: 1.2, dmg: 16, range: 32, cd: 0.8, block: 0.4,
    look: { torso: 'kt_gambeson', helm: 'k_helm_turban', weapon: 'k_sabre', shield: 'k_shield_round', grip: 'blade' }, portrait: 'pk_1',
    desc: 'Round sun-shield blocks 40% of arrows from the front.' },
  k_archer: { side: 1, name: 'Archer', cost: 3, hp: 55, armor: 0, speed: 48, mass: 1, dmg: 11, range: 780, cd: 1.5, proj: 'arrow',
    look: { torso: 'kt_archer', helm: 'k_felt_cap', weapon: 'k_bow', grip: 'bow' }, portrait: 'pk_2',
    desc: 'Long-range archer: high arcing volleys that lead moving targets. Weak up close.' },
  k_xbow: { side: 1, name: 'Crossbowman', cost: 4, hp: 75, armor: 1, speed: 45, mass: 1.1, dmg: 36, range: 700, cd: 2.6, proj: 'bolt',
    look: { torso: 'kt_lamellar', helm: 'k_kettle_hat', weapon: 'k_crossbow', grip: 'xbow' }, portrait: 'pk_3',
    desc: 'Slow, flat, armor-piercing bolts that knock men back.' },
  k_jav: { side: 1, name: 'Javelineer', cost: 3, hp: 65, armor: 0, speed: 56, mass: 1, dmg: 26, range: 320, cd: 1.8, proj: 'javelin',
    look: { torso: 'kt_vest', helm: 'k_hood', weapon: 'k_javelin', grip: 'spear' }, portrait: 'pk_4',
    desc: 'Javelins skewer light troops and carry them off their feet.' },
  k_guard: { side: 1, name: 'Mailed Guard', cost: 5, hp: 400, armor: 2, speed: 36, mass: 3, dmg: 18, range: 34, cd: 1.1, block: 0.75, size: 1.12,
    look: { torso: 'kt_heavy', helm: 'k_helm_nasal', weapon: 'k_sword', shield: 'k_pavise', grip: 'blade' }, portrait: 'pk_5',
    desc: 'A walking wall. Pavise stops most missiles; hard to push back.' },
  k_axe: { rush: true, side: 1, name: 'Axe Brute', cost: 4, hp: 180, armor: 1, speed: 48, mass: 2, dmg: 30, range: 40, cd: 1.3, cleave: true, knock: 300, size: 1.15,
    look: { torso: 'kt_mail', helm: 'k_helm_mail', weapon: 'k_axe', grip: 'heavy' }, portrait: 'pk_6',
    desc: 'Cleaves everyone in reach and sends light troops flying.' },
  k_horse: { side: 1, name: 'Kurdish Rider', cost: 5, hp: 210, armor: 1, speed: 123, mass: 4, dmg: 24, range: 46, cd: 1.0, charge: 3, knock: 380, horse: true,
    look: { torso: 'kt_mail', helm: 'k_helm_turban', weapon: 'k_spear', grip: 'lance' }, portrait: 'pk_7',
    desc: 'Fast. The first lance strike of a charge hits triple and bowls men over.' },
  k_naft: { side: 1, name: 'Naphtha Thrower', cost: 5, hp: 60, armor: 0, speed: 45, mass: 1, dmg: 12, range: 340, cd: 3.2, proj: 'firepot',
    look: { torso: 'kt_gambeson', helm: 'k_hood', weapon: 'fx_pot', grip: 'pot' }, portrait: 'pk_8',
    desc: 'Clay pots of burning naphtha. Fire spreads in dry weather, steams out in rain.' },
  k_drum: { side: 1, name: 'Banner Drummer', cost: 4, hp: 90, armor: 0, speed: 48, mass: 1, dmg: 6, range: 30, cd: 1.0, aura: 230, support: true,
    look: { torso: 'kt_cloak', helm: 'k_helm_turban', weapon: 'az_banner', grip: 'banner' }, portrait: 'pk_9',
    desc: 'Stays behind the line. Nearby defenders +30% damage, +20% speed.' },

  // ---------------- HULAGU'S ARMY (side -1, move left) ----------------
  m_levy: { rush: true, side: -1, name: 'Levy Conscript', value: 1, hp: 45, armor: 0, speed: 56, mass: 0.9, dmg: 8, range: 40, cd: 1.0,
    look: { torso: 'mt_ragged', helm: 'm_felt_hat', weapon: 'm_axe', grip: 'blade' }, portrait: 'pm_0', bounty: 1 },
  m_spear: { rush: true, side: -1, name: 'Steppe Spearman', value: 2, hp: 80, armor: 0, speed: 52, mass: 1, dmg: 12, range: 50, cd: 0.9,
    look: { torso: 'mt_deel_blue', helm: 'm_fur_hat', weapon: 'm_lance', grip: 'spear' }, portrait: 'pm_1', bounty: 1 },
  m_hasr: { side: -1, name: 'Horse Archer', value: 4, hp: 110, armor: 0, speed: 112, mass: 4, dmg: 10, range: 640, cd: 1.3, proj: 'arrow', horse: true, kite: true,
    look: { torso: 'mt_archer', helm: 'm_leather_cap', weapon: 'm_bow', grip: 'bow' }, portrait: 'pm_2', bounty: 2 },
  m_lancer: { side: -1, name: 'Heavy Lancer', value: 6, hp: 320, armor: 2, speed: 106, mass: 5, dmg: 22, range: 48, cd: 1.1, charge: 3, knock: 420, horse: true,
    look: { torso: 'mt_lancer', helm: 'm_helm_tassel', weapon: 'm_lance', grip: 'lance' }, portrait: 'pm_3', bounty: 3 },
  m_shield: { side: -1, name: 'Shield Bearer', value: 4, hp: 340, armor: 2, speed: 35, mass: 3, dmg: 12, range: 34, cd: 1.0, block: 0.75, size: 1.1,
    look: { torso: 'mt_iron_lam', helm: 'm_lamellar_hood', weapon: 'm_sabre', shield: 'm_shield_wicker', grip: 'blade' }, portrait: 'pm_4', bounty: 2 },
  m_raider: { rush: true, side: -1, name: 'Sabre Raider', value: 3, hp: 90, armor: 1, speed: 73, mass: 1.1, dmg: 15, range: 32, cd: 0.7,
    look: { torso: 'mt_leather_lam', helm: 'm_helm_tassel', weapon: 'm_sabre', shield: 'm_shield_leather', grip: 'blade' }, portrait: 'pm_5', bounty: 2 },
  m_ram: { side: -1, name: 'Battering Ram', value: 7, hp: 750, armor: 3, speed: 15, mass: 50, dmg: 60, range: 10, cd: 2.2, siege: 'ram', portrait: 'pm_6', bounty: 4 },
  m_treb: { side: -1, name: 'Trebuchet', value: 8, hp: 380, armor: 3, speed: 16, mass: 40, dmg: 70, range: 950, cd: 5.5, siege: 'treb', portrait: 'pm_7', bounty: 5 },
  m_ballista: { side: -1, name: 'Ballista', value: 6, hp: 300, armor: 3, speed: 18, mass: 30, dmg: 60, range: 720, cd: 4.0, siege: 'ballista', portrait: 'pm_8', bounty: 4 },
  m_tower: { side: -1, name: 'Siege Tower', value: 10, hp: 1400, armor: 3, speed: 12, mass: 80, dmg: 14, range: 10, cd: 1.0, siege: 'tower', portrait: 'pm_9', bounty: 6 },
  m_boss: { side: -1, name: 'Noyan Kara-Tümen', value: 0, hp: 2800, armor: 2, speed: 34, mass: 9, dmg: 48, range: 70, cd: 1.6, cleave: true, knock: 650, size: 1.65, boss: true, portrait: 'pm_3', bounty: 15 },
};
window.K_ROSTER = ['k_spear', 'k_sword', 'k_archer', 'k_xbow', 'k_jav', 'k_guard', 'k_axe', 'k_horse', 'k_naft', 'k_drum'];
window.M_ROSTER = ['m_levy', 'm_spear', 'm_hasr', 'm_lancer', 'm_shield', 'm_raider', 'm_ram', 'm_treb', 'm_ballista', 'm_tower'];

// General AZ's ammunition for the wall ballista (drag & release)
window.AMMO = {
  spear: { name: 'Great Spear', cost: 10, cd: 3.5, icon: 'fx_big_bolt', desc: 'Pierces up to 7 light troops and pins them.' },
  fire: { name: 'Naphtha Pot', cost: 20, cd: 6, icon: 'fx_pot_fire', desc: 'Bursts into a burning pool.' },
  stone: { name: 'Citadel Stone', cost: 28, cd: 8, icon: 'fx_boulder', desc: 'Huge knockback, shatters siege engines.' },
};
// Skills: charged by XÎRET (zeal), which is earned only by killing enemies. Pick 2 before battle.
window.SKILLS = {
  storm:  { name: 'Arrow Storm', cost: 40, icon: 'fx_fire_arrow', target: true, desc: 'Forty arrows, some burning, rain on the spot you tap.' },
  horn:   { name: 'Rally Horn', cost: 35, icon: 'm_drum', desc: 'Defenders +30% damage and speed for 10s; light enemies near the gate flinch. +2 Berxwedan.' },
  naft:   { name: 'Naphtha Rain', cost: 50, icon: 'fx_pot_fire', target: true, desc: 'Six burning pots fall on the spot you tap. Weak in rain.' },
  stones: { name: 'Mountain Stones', cost: 60, icon: 'fx_boulder', target: true, desc: 'Boulders crash down from the citadel heights: huge knockback, wrecks siege engines.' },
  prayer: { name: 'Prayer of the Mound', cost: 45, icon: 'az_banner', desc: 'Heals every defender by 60% and repairs the citadel.' },
  riders: { name: 'Mountain Riders', cost: 70, icon: 'pk_7', desc: 'Three free Kurdish riders thunder out of the gate at full charge.' },
};
// Hulagu's own kill-charged powers (the AI uses them when its KHAN'S WRATH meter is full enough)
window.M_SKILLS = {
  volley: { name: 'Mongol Volley', cost: 35 },
  drums:  { name: 'War Drums', cost: 30 },
  fire:   { name: 'Fire Arrows on the Walls', cost: 40 },
  stones: { name: 'Mangonel Barrage', cost: 55 },
};
// Difficulty: scales Hulagu's army (HP, damage, wave size, Khan's Wrath gain, camp HP) and your starting Berxwedan
window.DIFFS = {
  easy:   { name: 'Easy',   hp: 0.75, dmg: 0.75, budget: 0.75, wrath: 0.6, camp: 0.8, res: 7, ai: 2.0 },
  medium: { name: 'Medium', hp: 1.15, dmg: 1.1,  budget: 1.2,  wrath: 1.0, camp: 1.0, res: 5, ai: 1.4 },
  hard:   { name: 'Hard',   hp: 1.5,  dmg: 1.35, budget: 1.55, wrath: 1.4, camp: 1.3, res: 4, ai: 0.9 },
};
window.COUNTER_TXT = {
  k_spear: 'STRONG vs cavalry (x1.8). Sprints into battle.', k_guard: 'Holds the line; shield raised against blows.', k_axe: 'STRONG vs shields & heavy armour (x1.45). Sprints into battle.',
  k_horse: 'STRONG vs archers (x1.6); devastating charge. WEAK vs spearmen.', k_archer: 'STRONG vs light infantry. WEAK vs cavalry.',
  k_xbow: 'Pierces armour.', k_sword: 'All-rounder with a shield. Sprints into battle.', k_jav: 'Skewers light troops.', k_naft: 'Area fire.', k_drum: 'Buffs nearby allies.',
};
window.SKILL_LIST = ['storm', 'horn', 'naft', 'stones', 'prayer', 'riders'];
window.DECK_MAX = 6; window.SKILL_MAX = 2;

// time: 0=midnight .25=dawn .5=noon .75=dusk ; weather: clear|cloudy|rain|storm|dust
window.MISSIONS = [
  { id: 0, name: 'The Lower Town Burns', waves: 3, camp: 3500, time: 0.27, weather: 'clear', pool: ['m_levy', 'm_spear', 'm_raider'], mx: 0.36, my: 0.40,
    brief: 'Spring 1258. Smoke rises from the lower town. Hulagu\'s outriders test the gate of the citadel. Hold them at the foot of the mound.' },
  { id: 1, name: 'Dust from the East', waves: 4, camp: 4500, time: 0.5, weather: 'dust', pool: ['m_levy', 'm_spear', 'm_raider', 'm_hasr', 'm_shield'], mx: 0.52, my: 0.36,
    brief: 'A brown wall of dust rolls off the plain. Inside it ride the horse archers. The wind will bend your spears - aim into it.' },
  { id: 2, name: 'Rain on the Ramparts', waves: 5, camp: 5500, time: 0.7, weather: 'rain', pool: ['m_levy', 'm_spear', 'm_raider', 'm_hasr', 'm_shield', 'm_ram'], mx: 0.58, my: 0.55,
    brief: 'Autumn rains. The Mongols wheel a ram up the road under wet hides. Fire steams and dies in this weather; trust iron.' },
  { id: 3, name: 'Night of the Fire Pots', waves: 5, camp: 6500, time: 0.9, weather: 'clear', pool: ['m_spear', 'm_raider', 'm_hasr', 'm_shield', 'm_lancer', 'm_ram', 'm_ballista'], mx: 0.70, my: 0.30,
    brief: 'They come in the dark to spare themselves our arrows. Light the night with naphtha.' },
  { id: 4, name: 'The Storm Siege', waves: 6, camp: 7500, time: 0.6, weather: 'storm', pool: ['m_spear', 'm_raider', 'm_hasr', 'm_shield', 'm_lancer', 'm_ram', 'm_treb', 'm_ballista'], mx: 0.45, my: 0.70,
    brief: 'Engineers from the south have built them trebuchets. Thunder and stone together. Break the engines before they break the wall.' },
  { id: 5, name: 'The Noyan\'s Assault', waves: 10, camp: 9000, time: 0.62, weather: 'cloudy', pool: ['m_levy', 'm_spear', 'm_raider', 'm_hasr', 'm_shield', 'm_lancer', 'm_ram', 'm_treb', 'm_ballista', 'm_tower'], mx: 0.80, my: 0.52, dynamicWeather: true,
    brief: 'Summer 1259. The siege tower is finished. Noyan Kara-Tümen leads the last assault himself. Every man of Erbil to the walls.' },
  { id: 6, name: 'Endless Siege', waves: 0, camp: 15000, time: 0.4, weather: 'cloudy', pool: null, mx: 0.88, my: 0.78, dynamicWeather: true, endless: true,
    brief: 'How long can the citadel stand? Waves never stop, weather never rests.' },
];

window.STORY = {
  prologue: [
    'Erbil, 1258.\nThe citadel has stood on its mound for six thousand years. Assyrians, Persians and Atabegs ruled from its walls.',
    'In February, Hulagu, grandson of Genghis Khan, sacked Baghdad and ended the Abbasid Caliphate. The whole land between the rivers trembled.',
    'Mosul bowed to the Khan. Erbil\'s lower town opened its gates.\nBut the Kurdish garrison climbed into the citadel and refused.',
    'They were few. The Mongols were many, and they had engineers, rams and patience.\nThe siege would last for months.',
    'On the tallest tower stands their captain, called AZ by his men, with a great ballista and a quiver of iron spears.\nThis is his stand.',
  ],
  epilogue: [
    'History remembers that the citadel of Erbil held out against the Mongols for about six months.',
    'In 1259 it finally passed into Mongol hands. But the songs remember the summer the mound would not kneel.',
    'Captain AZ and Noyan Kara-Tümen are legends of this game, not of the chronicles. The courage of the garrison is real.',
  ],
};
