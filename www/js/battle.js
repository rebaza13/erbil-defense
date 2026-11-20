// ===== Battle: units, ragdolls, projectiles, siege, waves, player ballista =====
const GRAV = 1500;
const INK = '#24180f';
const SKIN = '#c98f62';

// darkened sprite copies for far-side limbs
const DARK = {};
function darkOf(name) {
  if (DARK[name]) return DARK[name];
  const im = IMG[name]; if (!im || !im.width) return im;
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(20,12,6,0.45)'; g.fillRect(0, 0, c.width, c.height);
  return (DARK[name] = c);
}
// draw a rigged part using original sheet scale k; anchor (ax,ay) normalized
function part(name, x, y, k, rot, ax, ay, dark) {
  const m = ASSET_LIST[name]; const im = dark ? darkOf(name) : IMG[name];
  if (!m || !im) return;
  const w = m.ow * k, h = m.oh * k;
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
  ctx.drawImage(sized(im, w, h), -w * ax, -h * ay, w, h); ctx.restore();
}
// local point of a part after rotation, used to chain joints
function jointPos(name, x, y, k, rot, ax, ay, jx, jy) {
  const m = ASSET_LIST[name]; const w = m.ow * k, h = m.oh * k;
  const dx = (jx - ax) * w, dy = (jy - ay) * h, c = Math.cos(rot), s = Math.sin(rot);
  return [x + dx * c - dy * s, y + dx * s + dy * c];
}
// angle a sprite's long axis points to (for diagonal projectile art)
const NATIVE_ANG = { fx_arrow: -Math.PI / 4, fx_fire_arrow: -Math.PI / 4, fx_javelin: -Math.PI / 4, fx_big_bolt: -Math.PI / 4, az_spear: -Math.PI / 2, s_bolt: Math.PI };

function ik(sx, sy, tx, ty, l1, l2, bendSign) {
  let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy);
  const maxd = l1 + l2 - 0.01; if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; }
  const a = Math.atan2(dy, dx);
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const ang = a + bendSign * Math.acos(cosA);
  return [sx + Math.cos(ang) * l1, sy + Math.sin(ang) * l1, sx + dx, sy + dy];
}

// ================= Battle state =================
const B = {
  units: [], projs: [], rags: [], parts: [], fires: [], stuck: [],
  camX: 0, camV: 0, mission: null, wave: 0, phase: 'wave', waveT: 0, waveDur: 50, queue: [], breakT: 0,
  castleHP: 3000, castleMax: 3000, res: 5, resMax: 10, lastStand: false, kills: 0, speed: 1,
  ammo: 'spear', cds: { spear: 0, fire: 0, stone: 0, rain: 0, horn: 0 }, aiming: false, aimX: 0, aimY: 0, pendingPower: null,
  hornT: 0, banner: null, bannerT: 0, shake: 0, deployCD: 0, bossAlive: false,
  campHP: 2000, campMax: 2000, zeal: 0, zealMax: 100, deck: [], skills: [], camT: 0, follow: true,
};
let castle = { x0: 0, w: 0, h: 0, top: 0 };

function DIFF() { return DIFFS[Save.data.diff] || DIFFS.medium; }
function battleInit(mission) {
  Object.assign(B, { units: [], projs: [], rags: [], parts: [], fires: [], stuck: [], camX: 0, camV: 0, mission, wave: 0, phase: 'break', breakT: 3,
    castleHP: 3000, castleMax: 3000, res: DIFF().res, lastStand: false, kills: 0, aiming: false, pendingPower: null, hornT: 0, banner: null, bannerT: 0, shake: 0, deployCD: 0, speed: B.speed || 1,
    order: 'attack', hitStop: 0, hitStopCD: 0, decals: [], feintDone: 0,
    campHP: (mission.camp || 3000) * DIFF().camp, campMax: (mission.camp || 3000) * DIFF().camp, campAlarm: false, zeal: 30, wrath: 0, wrathMax: 100, wrathT: 2, mDrumT: 0, hitK: 0, camT: 0, follow: true, bossAlive: false, slowT: 0,
    deck: (Save.data.deck || K_ROSTER.slice(0, DECK_MAX)).slice(0, DECK_MAX), skills: (Save.data.skills || ['storm', 'horn']).slice(0, SKILL_MAX) });
  for (const k in B.cds) B.cds[k] = 0;
  Sky.set(mission.time, mission.weather, mission.dynamicWeather);
  const ch = 430, cw = ch * ASSET_LIST.citadel.w / ASSET_LIST.citadel.h;
  castle = { w: cw, h: ch, x0: CASTLE_FRONT - cw * 0.985, top: GROUND + 12 - ch };
  castle.gateX = castle.x0 + cw * 0.84;
  castle.pivotX = castle.x0 + cw * 0.84; castle.pivotY = castle.top + ch * 0.545 - 62;
  // decorative wall defenders
  castle.guards = [0.22, 0.3, 0.42, 0.55, 0.68, 0.76].map((f, i) => ({ x: castle.x0 + cw * f, y: castle.top + ch * (i % 2 ? 0.505 : 0.53), p: Math.random() * 6 }));
  showBanner(mission.name, 3);
}
function showBanner(t, dur = 2.5) { B.banner = t; B.bannerT = dur; }

// ================= Units =================
let UID = 1;
class Unit {
  constructor(type, x) {
    const d = UNITS[type];
    this.id = UID++; this.type = type; this.d = d; this.side = d.side; this.f = d.side;
    this.x = x; this.lane = rand(0, 34); this.y = GROUND + this.lane; this.hp = d.hp; this.max = d.hp;
    this.vx = 0; this.vy = 0; this.air = false; this.stun = 0; this.cdT = rand(0.2, 0.8); this.atkT = 0; this.walk = rand(0, 6);
    this.size = (d.size || 1) * rand(0.95, 1.05); this.S = 88 * this.size; this.cs = 0; this.mvB = 0; this.burn = 0; this.buff = 0; this.charge = !!d.charge;
    this.moving = false; this.drawT = 0; this.flash = 0; this.siegeState = 0; this.spawnT = 0; this.hitT = 0;
    if (d.siege) this.lane = 22, this.y = GROUND + 22;
    if (this.side === -1) { this.hp *= DIFF().hp; this.max = this.hp; }
    this.guard = 0; this.guardT = 0; this.engaged = false;
  }
  get w() { return this.d.siege ? (this.d.siege === 'tower' ? 70 : 60) : this.d.horse ? 40 : this.d.boss ? 30 : 14; }
  get h() { return this.d.siege === 'tower' ? 300 : this.d.siege ? 110 : this.d.horse ? this.S * 1.9 : this.S; }
}

function spawnUnit(type, x) { const u = new Unit(type, x); B.units.push(u); return u; }

function deploy(type) {
  const d = UNITS[type];
  if (B.res < d.cost || B.deployCD > 0 || B.phase === 'won' || B.phase === 'lost') return false;
  if (B.units.filter(u => u.side === 1).length >= 45) { showBanner('The field is full', 1); return false; }
  B.res -= d.cost; B.deployCD = 0.25;
  spawnUnit(type, castle.gateX + rand(-10, 10));
  Audio2.play('deploy');
  return true;
}

// gait phase per pixel walked: keeps planted feet/hooves locked to the ground
function stepK(u, sp) { return u.d.horse ? horsePhaseK(sp, u.S) : u.rushing > 0 ? Math.PI * 2 * RUN_DUTY / (RUN_K * u.S) : Math.PI / (STEP_K * u.S); }

// unit counters: spears break cavalry, cavalry runs down archers, axes split shields & armour
function counterMul(a, v) {
  const ad = a.d, vd = v.d; let m = 1;
  if ((ad.look || {}).grip === 'spear' && !ad.horse && vd.horse) m *= 1.8;
  if (ad.horse && vd.proj) m *= 1.6;
  if (ad.cleave && (vd.block || vd.armor >= 2)) m *= 1.45;
  if (ad.proj === 'arrow' && vd.armor === 0 && !vd.horse) m *= 1.15;
  return m;
}
function hitStop(t) { if (B.hitStopCD > 0) return; B.hitStop = Math.max(B.hitStop, t); B.hitStopCD = 0.3; }

function enemiesOf(u) { return B.units.filter(o => o.side !== u.side && o.hp > 0); }

function auraBuff(u) {
  if (u.side !== 1) return (B.mDrumT > 0 ? 1.25 : 1) * DIFF().dmg;
  let b = B.hornT > 0 ? 1.3 : 1;
  for (const o of B.units) if (o.d.aura && o.side === 1 && o !== u && Math.abs(o.x - u.x) < o.d.aura) { b = Math.max(b, 1.3); break; }
  return b;
}

function updateUnit(u, dt) {
  const d = u.d;
  u.flash = Math.max(0, u.flash - dt * 4); u.hitT = Math.max(0, u.hitT - dt); u.slashT = Math.max(0, (u.slashT || 0) - dt);
  // burning
  if (u.burn > 0) {
    u.burn -= dt * (Sky.isWet() ? 3 : 1);
    hurt(u, 14 * dt, { kind: 'fire', silent: true });
    if (Math.random() < dt * 12) addPart('ember', u.x + rand(-8, 8), u.y - rand(10, u.h * 0.8), rand(-20, 20), rand(-90, -40), 0.6);
    if (Sky.isWet() && Math.random() < dt * 6) addPart('steam', u.x, u.y - u.h * 0.6, rand(-10, 10), -40, 1.2);
    if (u.hp <= 0) return;
  }
  // knockback & airborne physics
  if (u.air) {
    u.vy += GRAV * dt; u.x += u.vx * dt; u.y += u.vy * dt;
    if (u.y >= GROUND + u.lane) { u.y = GROUND + u.lane; u.air = false; u.vy = 0; u.vx *= 0.3; u.stun = Math.max(u.stun, 0.6); dustPuff(u.x, u.y, 0.7); Audio2.play('thud', 0.4); }
    return;
  }
  if (Math.abs(u.vx) > 2) { u.x += u.vx * dt; u.vx *= Math.exp(-7 * dt); if (Math.random() < dt * 20) addPart('dust', u.x, u.y, -u.vx * 0.1, -10, 0.5, 18); }
  u.x = clamp(u.x, castle.x0 + castle.w * 0.6, u.side === 1 ? CAMP_FRONT : WW - 60);
  if (u.stun > 0) { u.stun -= dt; u.moving = false; u.cs = 0; u.mvB = Math.max(0, u.mvB - dt * 6); return; }
  if (d.siege) return updateSiege(u, dt);

  // feigned retreat (classic steppe tactic): cavalry flees, shooting back, then wheels and charges the pursuers
  if (u.feint > 0) {
    u.feint -= dt; u.f = -u.side;
    const dd = d.speed * 1.05 * dt; u.x = Math.min(WW - 120, u.x - u.side * dd); u.walk += dd * stepK(u, d.speed); u.cs = d.speed; u.moving = true; u.mvB = 1; u.kiting = false;
    u.cdT -= dt; if (d.proj && u.cdT <= 0) { const t2 = B.units.find(o => o.side !== u.side && Math.abs(o.x - u.x) < d.range); if (t2) { shootAt(u, t2); u.cdT = d.cd * 1.3; } }
    if (u.feint <= 0) { u.charge = !!d.charge; u.chargeCD = 0; u.f = u.side; }
    return;
  }
  const buff = auraBuff(u);
  u.cdT -= dt * (buff > 1 ? 1.15 : 1);
  if (u.atkT > 0) u.atkT = Math.max(0, u.atkT - dt * 2.6);

  // targeting: nearest enemy in front (or just behind)
  let tgt = null, best = 1e9;
  for (const o of B.units) {
    if (o.side === u.side || o.hp <= 0) continue;
    const dx = (o.x - u.x) * u.side;
    if (dx < -30) continue;
    const dd = Math.abs(o.x - u.x);
    if (dd < best) { best = dd; tgt = o; }
  }
  u.f = u.side;
  const reach = d.range + (tgt ? tgt.w : 0) + u.w * 0.5;
  u.engaged = !!(tgt && best <= reach + 30 && !d.proj);
  if (d.block) { // shield bearers raise the shield against incoming blows and missiles
    const want = u.guardT > 0 || (tgt && best < reach + 50 && tgt.atkT > 0.15) ? 1 : u.engaged ? 0.45 : 0;
    u.guard += (want - u.guard) * Math.min(1, dt * (want > u.guard ? 14 : 4)); u.guardT = Math.max(0, u.guardT - dt);
  }
  let move = true;

  if (d.support) {
    // drummer stays behind the front-most ally
    let front = -1e9 * u.side;
    for (const o of B.units) if (o.side === 1 && o !== u && !o.d.support && o.x > front) front = o.x;
    const want = front > 0 ? front - 140 : castle.gateX + 120;
    move = u.x < want - 10;
    if (tgt && best < 45) { move = false; meleeAttack(u, tgt, buff); }
    if (!move && Math.random() < dt * 1.2) Audio2.play('drum', 0.25);
  } else if (d.proj) {
    if (tgt && best <= d.range) {
      move = false;
      if (d.kite && best < 160) { u.f = -u.side; const dd = d.speed * 0.8 * dt; u.x -= u.side * dd; u.walk += dd * stepK(u, d.speed * 0.8); u.kiting = true; }
      if (u.cdT <= 0) { shootAt(u, tgt); u.cdT = d.cd * rand(0.9, 1.1); u.atkT = 1; }
    } else if (!tgt && u.side === -1 && u.x - CASTLE_FRONT < d.range * 0.7) {
      move = false;
      if (u.cdT <= 0) { shootAt(u, null); u.cdT = d.cd; u.atkT = 1; }
    } else if (u.side === 1 && B.campHP > 0 && CAMP_FRONT - u.x < d.range * 0.75 && !(tgt && best < d.range * 1.3)) {
      move = false;   // in range of the Mongol camp: shoot at the palisade
      if (u.cdT <= 0) { shootAt(u, null); u.cdT = d.cd; u.atkT = 1; }
    }
  } else {
    if (tgt && best <= reach) { move = false; if (u.cdT <= 0) meleeAttack(u, tgt, buff); }
  }
  // army orders: DEFEND (line up before the gate), HOLD (stay put), ATTACK (advance)
  if (u.side === 1 && !(tgt && best <= (d.proj ? d.range : reach))) {
    let limit = 1e9;
    if (B.order === 'defend') limit = castle.gateX + (d.proj ? 140 : d.support ? 180 : 300);
    else if (B.order === 'hold') limit = u.holdX != null ? u.holdX : u.x;
    else if (d.proj || d.support) { // ranged troops never lead: stay behind the foremost melee man
      let front = -1e9; for (const o of B.units) if (o.side === 1 && !o.d.proj && !o.d.support && o.x > front) front = o.x;
      if (front > -1e9) limit = front - 110;
    }
    if (u.x >= limit) move = false;
    else if (B.order === 'defend' && u.x > limit + 30) { u.f = -1; }
  }
  if (u.side === 1 && B.order === 'defend' && u.x > castle.gateX + 340 && !(tgt && best <= reach)) {
    // fall back toward the gate
    u.f = -1; const dd = d.speed * dt; u.x -= dd; u.walk += dd * stepK(u, d.speed); u.kiting = true;
  }
  // Mongols hit the gate
  if (u.side === -1 && u.x <= CASTLE_FRONT + 14 + (d.boss ? 30 : 0)) {
    move = false; u.x = Math.max(u.x, CASTLE_FRONT + 4);
    if (u.cdT <= 0 && !d.proj) { u.cdT = d.cd; u.atkT = 1; damageCastle(d.dmg * (d.boss ? 2 : 1), u.x - 10, u.y - 40); }
  }
  // Kurds assault the Mongol camp
  if (u.side === 1 && !d.proj && u.x >= CAMP_FRONT - 8 - (d.horse ? 20 : 0) && !(tgt && best <= reach)) {
    move = false;
    if (B.campHP > 0 && u.cdT <= 0) { u.cdT = d.cd; u.atkT = 1; damageCamp(d.dmg * buff * (d.cleave ? 1.6 : 1) * (d.horse ? 1.3 : 1), CAMP_FRONT + rand(5, 40), u.y - rand(30, 70)); Audio2.play(Math.random() < 0.5 ? 'hit' : 'thud', 0.35); }
  }

  // charge reset: when no enemy near, mounted units regain charge
  u.chargeCD = Math.max(0, (u.chargeCD || 0) - dt);
  if (d.charge && u.chargeCD <= 0 && (!tgt || best > 300)) u.charge = true;
  // lower the lance and gallop flat out once an enemy is in charge distance
  u.charging = !!(d.charge && u.charge && tgt && best < 480 && best > reach * 0.6 && move);
  if (u.charging && Math.random() < dt * 30) addPart('dust', u.x - u.side * rand(20, 50), u.y + rand(-2, 4), -u.side * rand(40, 90), rand(-40, -10), 0.8, rand(22, 40));
  if (u.charging && !u.chargeHorn) { u.chargeHorn = true; if (u.side === 1 || Math.random() < 0.5) callout('CHARGE!', u.x, u.y - u.h - 30, false); }

  // RUSH: some infantry sprint the last stretch and crash into the enemy line
  u.rushCD = Math.max(0, (u.rushCD || 0) - dt);
  if (d.rush && !(u.rushing > 0) && u.rushCD <= 0 && tgt && best < 420 && best > reach + 50 && move && !(u.side === 1 && B.order !== 'attack')) {
    u.rushing = 2.4; u.rushCD = rand(8, 11);
  }
  if (u.rushing > 0) {
    u.rushing -= dt;
    if (tgt && best <= reach + 4) { u.rushing = 0; u.rushHit = true; }
    if (Math.random() < dt * 14) addPart('dust', u.x - u.side * 10, u.y, -u.side * 40, -15, 0.5, 18);
  }
  // smooth acceleration / braking instead of instant start-stop
  const want = move && u.atkT < 0.3 ? d.speed * (buff > 1 ? 1.2 : 1) * (u.charging ? 1.8 : 1) * (u.rushing > 0 ? 2.2 : 1) : 0;
  if (u.kiting) { u.kiting = false; u.cs = d.speed * 0.8; u.mvB = Math.min(1, u.mvB + dt * 6); u.moving = true; return; }
  u.cs += (want - u.cs) * Math.min(1, dt * (want > u.cs ? (u.charging || u.rushing > 0 ? 5 : 2.5) : 7));
  if (want === 0 && u.cs < 3) u.cs = 0;
  u.moving = u.cs > 1;
  u.mvB += ((u.cs > 1 ? Math.min(1, u.cs / (d.speed * 0.5)) : 0) - u.mvB) * Math.min(1, dt * 8);
  if (u.cs > 0) {
    const dd = u.cs * dt;
    u.x += u.side * dd; u.walk += dd * stepK(u, u.cs);
    if (d.horse && u.cs > 30 && Math.random() < dt * 8) addPart('dust', u.x - u.side * 30, u.y, -u.side * 20, -15, 0.7, 26);
  }
}

function meleeAttack(u, tgt, buff) {
  const d = u.d;
  u.cdT = d.cd * rand(0.9, 1.1); u.atkT = 1;
  let dmg = d.dmg * buff * rand(0.85, 1.15);
  let knock = d.knock || 60;
  if (u.rushHit) { u.rushHit = false; dmg *= 1.4; knock *= 1.6; Audio2.play('thud', 0.5); B.shake = Math.max(B.shake, 3); for (let i = 0; i < 3; i++) addPart('dust', u.x + u.side * 20, u.y, u.side * rand(30, 90), rand(-40, -10), 0.7, 26); }
  let victims = d.cleave ? B.units.filter(o => o.side !== u.side && o.hp > 0 && Math.abs(o.x - u.x) <= d.range + o.w + 20) : [tgt];
  if (d.charge && u.charge) {
    // impact: the lance and the horse's weight smash through everyone in the way
    const fast = u.cs > d.speed * 1.3;
    dmg *= d.charge * (fast ? 1.2 : 1); knock *= fast ? 2.2 : 1.6; u.charge = false; u.charging = false; u.chargeHorn = false; u.chargeCD = 4;
    victims = B.units.filter(o => o.side !== u.side && o.hp > 0 && !o.d.siege && (o.x - u.x) * u.side > -20 && (o.x - u.x) * u.side < d.range + 70);
    Audio2.play('thud', 0.9); Audio2.play('crash', 0.35); B.shake = Math.max(B.shake, 7); B.hitK = Math.max(B.hitK || 0, 0.6);
    FX.shock(u.x + u.side * 40, u.y - 40, 0.45);
    for (let i = 0; i < 6; i++) addPart('dust', u.x + u.side * rand(10, 60), u.y, u.side * rand(20, 120), rand(-60, -10), 1, rand(30, 55));
    if (victims.length >= 2) callout(`TRAMPLED x${victims.length}!`, u.x + u.side * 40, u.y - u.h - 40, victims.length >= 4 && u.side === 1);
    u.cs *= 0.35;
  }
  for (const v of victims) {
    const cm = counterMul(u, v), dd = dmg * cm;
    hurt(v, dd, { kind: 'melee', x: u.x, knock: knock * u.side * (cm > 1.3 ? 1.3 : 1), src: u, cut: d.cleave });
    if (cm >= 1.45 && Math.random() < 0.5) addPart('num', v.x, v.y - v.h - 10, 0, -60, 0.9, 20, 'x' + cm.toFixed(1));
    for (let i = 0; i < 4; i++) addPart('spark', v.x - u.side * 6, v.y - v.h * rand(0.4, 0.7), 0, 0, 0.18, rand(14, 24));
  }
  if (dmg >= 30 || (d.charge && victims.length > 1)) hitStop(d.charge ? 0.09 : 0.05);
  u.slashT = 0.22;
  Audio2.play(Math.random() < 0.5 ? 'hit' : 'clang', 0.5);
}

function shootAt(u, tgt) {
  const d = u.d;
  const sx = u.x + u.side * 14, sy = u.y - u.S * (d.horse ? 1.55 : 0.7);
  let tx, ty;
  if (tgt) { tx = tgt.x + tgt.d.speed * (tgt.moving ? tgt.side : 0) * 0.6; ty = tgt.y - tgt.h * 0.55; }
  else if (u.side === 1) { tx = CAMP_FRONT + rand(20, 260); ty = GROUND - rand(20, 130); }
  else { tx = CASTLE_FRONT - rand(40, 200); ty = castle.top + castle.h * rand(0.45, 0.8); }
  const type = d.proj;
  const speed = type === 'bolt' ? 1350 : type === 'arrow' ? 1080 : type === 'javelin' ? 720 : 600;
  const far = Math.abs(tx - sx);
  // lead a moving target by the flight time, then add spread that grows with distance
  if (tgt && tgt.moving) { const ft = far / (speed * (type === 'bolt' ? 0.95 : 0.55)); tx += tgt.side * (tgt.cs || tgt.d.speed) * ft; }
  tx += rand(-1, 1) * far * (type === 'bolt' ? 0.02 : 0.045);
  const lob = type !== 'bolt' && (type !== 'arrow' || far > 260);
  const [vx, vy] = solveBallistic(sx, sy, tx, ty, speed, lob);
  fireProj(type, sx, sy, vx, vy, u.side, d.dmg * auraBuff(u), u);
  Audio2.play('bow', 0.35);
}

// returns velocity to hit (tx,ty) at given speed; lob = high arc
function solveBallistic(sx, sy, tx, ty, v, lob) {
  const dx = tx - sx, dy = -(ty - sy), g = GRAV * 0.6;
  const v2 = v * v, disc = v2 * v2 - g * (g * dx * dx + 2 * dy * v2);
  let ang;
  if (disc < 0) ang = Math.PI / 4 * Math.sign(dx || 1);
  else {
    const r = Math.sqrt(disc);
    ang = Math.atan2(v2 + (lob ? r : -r), g * Math.abs(dx));
  }
  const s = Math.sign(dx || 1);
  return [Math.cos(ang) * v * s, -Math.sin(ang) * v];
}

function hurt(u, dmg, o) {
  if (u.hp <= 0) return;
  const d = u.d;
  // shields block missiles from the front
  if (d.block && o.kind === 'melee' && o.src && Math.sign(o.src.x - u.x) === u.side && u.guard > 0.5) {
    dmg *= 1 - d.block * 0.65; o = { ...o, knock: (o.knock || 0) * 0.5 }; u.guardT = 0.6;
    if (!o.src.d.horse && !o.src.d.boss) { o.src.vx -= o.src.side * 90; o.src.hitT = 0.15; } // blade bounces off: attacker rocks back
    Audio2.play('clang', 0.45); addPart('spark', u.x + u.side * 16, u.y - u.S * 0.6, 0, 0, 0.2, 24);
  }
  if (d.block && o.kind === 'missile' && o.vx && Math.sign(o.vx) === -u.side && !o.heavy && Math.random() < Math.min(0.95, d.block * (0.55 + 0.6 * u.guard))) {
    u.guardT = 0.8;
    Audio2.play('clang', 0.4); addPart('spark', u.x + u.side * 12, u.y - u.S * 0.55, 0, 0, 0.25, 28); return 'blocked';
  }
  if (d.armor === 2 && o.kind === 'missile' && !o.ap) dmg *= 0.55;
  if (d.armor === 3 && o.kind === 'fire') dmg *= 2.2;
  u.hp -= dmg; u.flash = 1;
  if (o.kind === 'melee' && u.atkT > 0.55 && dmg > 8 && !d.boss && !d.siege) { u.atkT = 0; u.cdT = Math.max(u.cdT, 0.35); } // a solid hit interrupts the wind-up
  if (!o.silent && dmg > 3) { addBlood(u.x, u.y - u.h * 0.6, o.knock || 0, dmg > 40 ? 10 : 4, d.siege); }
  if (o.knock && !d.siege) {
    const imp = o.knock / d.mass;
    u.vx += imp; u.hitT = 0.25;
    if (Math.abs(imp) > 220 && d.armor < 2) { u.air = true; u.vy = -Math.abs(imp) * 0.9; }
    else if (Math.abs(imp) > 120) u.stun = Math.max(u.stun, 0.35);
  }
  if (u.hp <= 0) die(u, o);
}

function addDecal(x, y, r, kind) { B.decals.push({ x, y, r, kind, t: 45 }); if (B.decals.length > 140) B.decals.shift(); }
function die(u, o) {
  u.hp = 0;
  if (!u.d.siege) addDecal(u.x + rand(-10, 10), u.y + 2, rand(14, 24) * u.size, 'blood');
  const idx = B.units.indexOf(u); if (idx >= 0) B.units.splice(idx, 1);
  if (u.side === 1) B.wrath = Math.min(B.wrathMax, B.wrath + (u.d.cost || 2) * 4 * DIFF().wrath);
  if (u.side === -1) { B.kills++; B.res = Math.min(B.resMax, B.res + 0.12 * (u.d.bounty || 1)); B.zeal = Math.min(B.zealMax, B.zeal + (u.d.boss ? 60 : (u.d.bounty || 1) * 4)); }
  if (u.d.siege) return destroySiege(u);
  if (u.d.boss) { B.bossAlive = false; showBanner('The Noyan has fallen!', 3); B.slowT = 1.2; Audio2.play('horn'); B.shake = 14; }
  const rag = makeRagdoll(u, (o.knock || 0) / Math.max(1, u.d.mass) * 0.9 + (o.vx || 0) * 0.15, (o.vy || 0) * 0.1 - (o.knock ? 220 : 60));
  if (o.cut && Math.random() < 0.5 && u.d.armor < 2) rag.cut = true;
  if (o.pin) { rag.pin = o.pin; o.pin.proj.pinned.push(rag); }
  if (u.d.horse) {
    // the horse runs off riderless
    B.parts.push({ type: 'horse', x: u.x, y: u.y, vx: u.side * 130, f: u.side, life: 3, max: 3, walk: u.walk, S: u.S });
  }
}

// ================= Ragdolls (Verlet) =================
const RAG_LINKS = [[0, 1], [1, 2], [1, 3], [3, 4], [1, 5], [5, 6], [2, 7], [7, 8], [2, 9], [9, 10], [0, 2], [3, 5]];
function makeRagdoll(u, vx, vy) {
  const P = unitPose(u);
  const pts = [P.head, P.neck, P.hip, P.elbF, P.handF, P.elbB, P.handB, P.kneeF, P.footF, P.kneeB, P.footB].map(p => {
    const x = u.x + p[0] * u.f, y = p[1] + u.y;
    const jv = rand(0.8, 1.2);
    return { x, y, ox: x - vx * jv / 60, oy: y - vy * jv / 60 };
  });
  // spin: upper body moves faster
  pts[0].ox -= vx / 60 * 0.4; pts[1].ox -= vx / 60 * 0.3;
  const rest = RAG_LINKS.map(([a, b]) => Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y));
  const r = { pts, rest, look: u.d.look, side: u.side, S: u.S, life: 16, pin: null, cut: false, burn: u.burn > 0 ? 3 : 0, gy: GROUND + u.lane, horse: false };
  B.rags.push(r);
  if (B.rags.length > 70) { const i = B.rags.findIndex(q => !q.pin); B.rags.splice(i >= 0 ? i : 0, 1); }
  return r;
}
function updateRag(r, dt) {
  r.life -= dt;
  const g = GRAV * dt * dt;
  for (const p of r.pts) {
    const vx = (p.x - p.ox) * 0.995, vy = (p.y - p.oy) * 0.995;
    p.ox = p.x; p.oy = p.y; p.x += vx + Sky.wind * 0.02; p.y += vy + g;
  }
  for (let it = 0; it < 4; it++) {
    RAG_LINKS.forEach(([a, b], i) => {
      if (r.cut && i === 1) return;
      const A = r.pts[a], C = r.pts[b];
      const dx = C.x - A.x, dy = C.y - A.y, dd = Math.hypot(dx, dy) || 0.001, diff = (dd - r.rest[i]) / dd * 0.5;
      A.x += dx * diff; A.y += dy * diff; C.x -= dx * diff; C.y -= dy * diff;
    });
    if (r.pin) {
      const pr = r.pin.proj, a = pr.rot, o = r.pin.off;
      const px = pr.x + Math.cos(a) * o, py = pr.y + Math.sin(a) * o;
      const n = r.pts[1], hp = r.pts[2];
      n.x = px; n.y = py;
      // keep torso roughly perpendicular (hanging) - hip pulled toward below
      hp.x += (px - hp.x) * 0.05;
    }
    for (const p of r.pts) {
      if (p.y > r.gy) { p.y = r.gy; const vx = p.x - p.ox; p.ox = p.x - vx * 0.5; }
    }
  }
  if (r.burn > 0) { r.burn -= dt; if (Math.random() < dt * 8) addPart('ember', r.pts[2].x, r.pts[2].y - 5, rand(-15, 15), rand(-80, -30), 0.6); }
}

// ================= Pose & drawing of a stickman =================
// Foot-planted gait: each foot spends half the cycle on the ground moving backward
// exactly as fast as the body moves forward (no sliding), and half the cycle swinging
// forward through an arc. Knees always point forward, elbows back.
function gaitFoot(s, L, lift, duty) {
  if (s < duty) return [L * 0.5 - L * (s / duty), 0];
  const q = (s - duty) / (1 - duty), e = q * q * (3 - 2 * q);
  return [-L * 0.5 + L * e, -lift * Math.sin(Math.PI * q)];
}
const STEP_K = 0.30; // stride (fraction of height) covered per half cycle
const RUN_K = 0.46, RUN_DUTY = 0.38; // running: longer stride, shorter ground contact (a flight phase)
// returns joint positions in local space (facing right, feet at y=0)
function unitPose(u) {
  const S = u.S, d = u.d, look = d.look || {};
  const thigh = S * 0.25, shin = S * 0.25, torso = S * 0.31, R = S * 0.095, up = S * 0.17, low = S * 0.17;
  const t = performance.now() / 1000;
  const mv = u.mvB != null ? u.mvB : (u.moving ? 1 : 0);
  const atk = u.atkT, swing = atk > 0 ? Math.sin((1 - atk) * Math.PI) : 0;
  const ph = (((u.walk || 0) / (Math.PI * 2)) % 1 + 1) % 1;
  const run = u.rushing > 0 ? 1 : 0;
  const L = S * (run ? RUN_K : STEP_K) * mv, lift = S * (run ? 0.15 : 0.085) * mv;
  // body rises over the planted leg (mid-stance) and dips at each heel strike
  const bob = mv * S * 0.022 * (1 - Math.cos(ph * Math.PI * 4)) / 2;
  const fight = u.engaged && mv < 0.5 ? 1 : 0, guard = u.guard || 0;
  // ready stance: knees bent, weight shifting; guard crouches behind the shield
  let hipY = -(thigh + shin) * 0.94 - bob + (1 - mv) * Math.sin(t * 2 + u.id) * 0.6 + fight * (S * 0.035 + Math.sin(t * 4 + u.id) * S * 0.008) + guard * S * 0.03;
  let lean = 0.03 + mv * 0.09 + mv * Math.sin(ph * Math.PI * 4) * 0.015;
  if (u.hitT > 0) lean -= u.hitT * 1.6;
  if (u.charging) lean += 0.22;
  if (run) lean += 0.24;
  if (look.grip === 'heavy' || look.grip === 'blade') lean += swing * 0.22;
  if (look.grip === 'spear' || look.grip === 'lance') lean += swing * 0.14;
  const hip = [mv * S * 0.01 + swing * S * 0.07 + guard * S * 0.02, hipY];
  // idle stance: feet apart; walking: planted gait
  const feet = [0, 0.5].map((o, i) => {
    const f = gaitFoot((ph + o) % 1, L, lift, run ? RUN_DUTY : 0.5);
    const idle = (i ? -S * 0.07 : S * 0.08) * (1 + fight * 0.6 + guard * 0.4) + (i ? 0 : swing * S * 0.08);
    return [f[0] * mv + idle * (1 - mv), f[1]];
  });
  const legs = feet.map(f => { const k = ik(hip[0], hip[1], f[0], f[1], thigh, shin, -1); return [[k[0], k[1]], [k[2], k[3]]]; });
  const neck = [hip[0] + Math.sin(lean) * torso, hip[1] - Math.cos(lean) * torso];
  const head = [neck[0] + Math.sin(lean) * R * 1.3, neck[1] - Math.cos(lean) * R * 1.3];
  const sh = [neck[0] - Math.sin(lean) * S * 0.03, neck[1] + S * 0.03];
  // arms swing against the legs of the same side
  let hF, hB; const aF0 = -feet[0][0] * (run ? 1.3 : 0.75), aB0 = -feet[1][0] * (run ? 1.3 : 0.75);
  switch (look.grip) {
    case 'spear': case 'lance': {
      const thrust = swing * S * 0.24, carry = Math.sin(ph * Math.PI * 4) * S * 0.01 * mv;
      hF = [S * 0.19 + thrust, sh[1] + S * 0.17 + carry]; hB = [S * 0.0 + thrust * 0.8, sh[1] + S * 0.19 + carry];
      if (look.grip === 'lance' && u.charging) { hF = [S * 0.24, sh[1] + S * 0.2]; hB = [S * 0.02, sh[1] + S * 0.12]; } // couched lance, point down-forward
      break; }
    case 'blade': case 'heavy': {
      // wind-up over the shoulder, then a fast downward cut
      const k = 1 - atk, a = atk > 0 ? (k < 0.35 ? lerp(-0.9, -2.6, k / 0.35) : lerp(-2.6, 1.0, Math.min(1, (k - 0.35) / 0.3))) : -0.85 + Math.sin(t * 2 + u.id) * 0.05;
      hF = [sh[0] + Math.cos(a) * S * 0.3, sh[1] + Math.sin(a) * S * 0.3];
      hB = [sh[0] + aB0 - S * 0.03, sh[1] + S * 0.3]; break; }
    case 'bow': { const draw = clamp(1 - u.cdT / (d.cd || 1), 0, 1); hF = [S * 0.33, sh[1] + S * 0.02]; hB = [S * 0.33 - S * 0.28 * draw - S * 0.05, sh[1] + S * 0.02]; break; }
    case 'xbow': hF = [S * 0.28, sh[1] + S * 0.1]; hB = [S * 0.08, sh[1] + S * 0.12]; break;
    case 'pot': { const a = atk > 0 ? lerp(-2.8, 0.2, 1 - atk) : 0.9; hF = [sh[0] + Math.cos(a) * S * 0.32, sh[1] + Math.sin(a) * S * 0.32]; hB = [aB0 - S * 0.03, sh[1] + S * 0.28]; break; }
    case 'banner': hF = [S * 0.14, sh[1] + S * 0.12]; hB = [S * 0.18, sh[1] + S * 0.22 + Math.abs(Math.sin(t * 6)) * S * 0.06]; break;
    default: hF = [sh[0] + aF0, sh[1] + S * 0.3]; hB = [sh[0] + aB0, sh[1] + S * 0.3];
  }
  if (look.shield) { // shield on the off-hand, held across the body; raised to cover head & chest on guard
    const pav = look.shield === 'k_pavise';
    const lowP = [S * 0.2, sh[1] + S * (pav ? 0.24 : 0.18)], highP = [S * 0.23, sh[1] + S * (pav ? 0.1 : -0.01)];
    hB = [lerp(lowP[0], highP[0], guard) + swing * S * 0.04, lerp(lowP[1], highP[1], guard)];
  }
  const aF = ik(sh[0], sh[1], hF[0], hF[1], up, low, 1), aB = ik(sh[0], sh[1], hB[0], hB[1], up, low, 1);
  return { guard, hip, neck, head, sh, R, lean, swing, kneeF: legs[0][0], footF: legs[0][1], kneeB: legs[1][0], footB: legs[1][1],
    elbF: [aF[0], aF[1]], handF: [aF[2], aF[3]], elbB: [aB[0], aB[1]], handB: [aB[2], aB[3]] };
}

function limb(a, b, c, w, col) {
  // dark outline then cloth colour: reads cleaner than a flat stick
  ctx.strokeStyle = '#140d07'; ctx.lineWidth = w + 2.4; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
}
// draw body parts shared by live units and ragdolls; all coords local, facing right
function drawFigure(P, look, side, S, lw, burnt) {
  const nat = side; // native facing of side's art: Kurdish right(+1), Mongol left(-1)
  const pants = side === 1 ? '#4b3b27' : '#2e2d3a', sleeve = side === 1 ? '#6b5236' : '#3b3a52';
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  limb(P.hip, P.kneeB, P.footB, lw, burnt ? '#111' : '#2a2018');
  limb(P.sh, P.elbB, P.handB, lw * 0.85, burnt ? '#111' : '#3a2c20');
  // weapon behind front arm for long weapons
  drawWeapon(P, look, nat, S);
  // torso sprite
  if (look.torso) {
    const tx = (P.neck[0] + P.hip[0]) / 2, ty = (P.neck[1] + P.hip[1]) / 2 + S * 0.02;
    const ang = Math.atan2(P.neck[0] - P.hip[0], P.hip[1] - P.neck[1]);
    ctx.save(); ctx.translate(tx, ty); ctx.rotate(ang); if (nat === -1) ctx.scale(-1, 1);
    const im = IMG[look.torso]; const th = S * 0.46, tw = th * im.width / im.height;
    ctx.drawImage(sized(burnt ? darkOf(look.torso) : im, tw, th), -tw / 2, -th / 2, tw, th); ctx.restore();
  } else limb(P.hip, P.neck, P.neck, lw * 1.4, INK);
  limb(P.hip, P.kneeF, P.footF, lw, burnt ? '#111' : pants);
  // boots
  ctx.fillStyle = '#2b1a10';
  for (const f of [P.footF, P.footB]) { ctx.beginPath(); ctx.ellipse(f[0] + S * 0.03, f[1] - 1, S * 0.055, S * 0.03, 0, 0, 7); ctx.fill(); }
  // head
  ctx.fillStyle = burnt ? '#2a1a12' : SKIN; ctx.beginPath(); ctx.arc(P.head[0], P.head[1], P.R, 0, 7); ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke();
  if (look.helm) {
    const ang = Math.atan2(P.head[0] - P.neck[0], P.neck[1] - P.head[1]);
    ctx.save(); ctx.translate(P.head[0], P.head[1]); ctx.rotate(ang); if (nat === -1) ctx.scale(-1, 1);
    const im = IMG[look.helm]; const hh = P.R * 3.1, hw = hh * im.width / im.height;
    ctx.drawImage(sized(im, hw, hh), -hw * 0.5, -hh * 0.5, hw, hh); ctx.restore();
  }
  if (look.shield) {
    const pav = look.shield === 'k_pavise', big = pav || look.shield === 'm_shield_wicker';
    const sh = S * (pav ? 0.66 : big ? 0.46 : 0.4), g = P.guard || 0;
    // strapped to the forearm: centre just in front of the off-hand, tilting up as it is raised
    spr(look.shield, P.handB[0] + S * 0.04, P.handB[1] - S * (pav ? 0.12 : 0.03), sh, -0.12 * g + (pav ? 0 : 0.05), 1, 0.5, 0.5);
  }
  limb(P.sh, P.elbF, P.handF, lw * 0.85, burnt ? '#111' : sleeve);
  ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(P.handF[0], P.handF[1], lw * 0.55, 0, 7); ctx.fill();
}
function drawWeapon(P, look, nat, S) {
  if (!look.weapon) return;
  const w = look.weapon, hF = P.handF, hB = P.handB;
  const flip = nat === -1 ? -1 : 1; // mongol horizontal weapons point left natively
  switch (look.grip) {
    case 'spear': case 'lance': {
      const ang = Math.atan2(hF[1] - hB[1], hF[0] - hB[0]);
      const L = S * (look.grip === 'lance' ? 1.25 : 1.05);
      ctx.save(); ctx.translate(hF[0], hF[1]); ctx.rotate(ang); if (flip === -1) ctx.scale(-1, 1);
      const im = IMG[w]; const h = L * im.height / im.width;
      const back = look.grip === 'lance' ? 0.38 : 0.75; // lances are gripped near the butt so the point reaches far forward
      ctx.drawImage(sized(im, L, h), flip === -1 ? -L * (1 - back) : -L * back, -h / 2, L, h); ctx.restore(); break; }
    case 'blade': case 'heavy': {
      const ang = Math.atan2(hF[1] - P.sh[1], hF[0] - P.sh[0]) - 1.2;
      const L = S * (look.grip === 'heavy' ? 0.62 : 0.55);
      ctx.save(); ctx.translate(hF[0], hF[1]); ctx.rotate(ang); if (flip === -1) ctx.scale(-1, 1);
      const im = IMG[w]; const h = L * im.height / im.width;
      ctx.drawImage(sized(im, L, h), flip === -1 ? -L * 0.88 : -L * 0.12, -h / 2, L, h); ctx.restore(); break; }
    case 'bow': {
      const im = IMG[w]; const h = S * 0.62;
      if (w === 'k_bow') spr(w, hF[0], hF[1], h, Math.PI / 2, 1, 0.5, 0.5, 1, true); // horizontal art -> vertical
      else spr(w, hF[0], hF[1], h, 0, 1, 0.5, 0.5);
      ctx.strokeStyle = 'rgba(240,230,200,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hF[0] - 2, hF[1] - h * 0.45); ctx.lineTo(hB[0], hB[1]); ctx.lineTo(hF[0] - 2, hF[1] + h * 0.45); ctx.stroke();
      break; }
    case 'xbow': spr(w, (hF[0] + hB[0]) / 2 + S * 0.08, hF[1], S * 0.5, 0, 1, 0.5, 0.5, 1, true); break;
    case 'pot': spr(w, hF[0], hF[1] - S * 0.06, S * 0.2, 0, 1, 0.5, 0.5); break;
    case 'banner': if (nat === 1) { ctx.save(); if (ctx.getTransform().a < 0) { ctx.translate(hF[0], 0); ctx.scale(-1, 1); ctx.translate(-hF[0], 0); } drawKurdFlag(hF[0], hF[1] - S * 0.95, S * 0.62, S * 1.05, performance.now() / 1000 + hF[0] * 0.01, -1); ctx.restore(); } else spr(w, hF[0], hF[1] - S * 0.45, S * 1.3, Math.sin(performance.now() / 600) * 0.04, 1, 0.12, 0.5); break;
  }
}

// ---------- horse: Flow body/head/tail art + procedural legs with a real gait ----------
// Gallop/canter footfall (rotary): far hind, near hind, far fore, near fore.  Walk: 4-beat lateral.
// Trot: diagonal pairs together.
const HORSE_LEGS = [
  // [root x, root y (normalized on torso art, art faces left), fore?, near?, phase: [gallop, trot, walk]]
  [0.76, 0.80, false, false, [0.00, 0.5, 0.50]],
  [0.36, 0.84, true, false, [0.45, 0.0, 0.75]],
  [0.80, 0.80, false, true, [0.12, 0.0, 0.00]],
  [0.40, 0.84, true, true, [0.57, 0.5, 0.25]],
];
function horseGait(speed, S) {
  if (speed > 100) return { g: 0, duty: 0.38, L: S * 0.48, lift: S * 0.2 };
  if (speed > 30) return { g: 1, duty: 0.5, L: S * 0.36, lift: S * 0.15 };
  return { g: 2, duty: 0.62, L: S * 0.28, lift: S * 0.1 };
}
// phase advance per unit of distance, so hooves never slide
function horsePhaseK(speed, S) { const G = horseGait(speed, S); return Math.PI * 2 * G.duty / G.L; }
// ---------- Kurdistan flag: red / white / green with the golden 21-ray sun, waving ----------
let KFLAG = null;
function kurdFlagTex() {
  if (KFLAG) return KFLAG;
  const w = 240, h = 160, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = '#ED2024'; g.fillRect(0, 0, w, h / 3); g.fillStyle = '#FFFFFF'; g.fillRect(0, h / 3, w, h / 3); g.fillStyle = '#278E43'; g.fillRect(0, h * 2 / 3, w, h / 3 + 1);
  const cx = w / 2, cy = h / 2, r1 = h * 0.15, r2 = h * 0.27; g.fillStyle = '#FEBD11'; g.beginPath();
  for (let i = 0; i < 42; i++) { const a = -Math.PI / 2 + i * Math.PI / 21, r = i % 2 ? r1 : r2; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  g.closePath(); g.fill(); g.beginPath(); g.arc(cx, cy, r1 * 0.95, 0, 7); g.fill();
  return (KFLAG = c);
}
function drawKurdFlag(x, y, w, poleH, t, dir = 1) {
  const tex = kurdFlagTex(), h = w * 2 / 3, n = 20, sw = tex.width / n, dw = w / n;
  ctx.strokeStyle = '#3a2614'; ctx.lineWidth = Math.max(2, w * 0.05); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y + poleH); ctx.lineTo(x, y - 4); ctx.stroke();
  ctx.fillStyle = '#d8b04a'; ctx.beginPath(); ctx.arc(x, y - 5, Math.max(2, w * 0.045), 0, 7); ctx.fill();
  const wind = 0.6 + Math.abs(Sky.wind || 0.3);
  for (let i = 0; i < n; i++) {
    const f = i / n, wave = Math.sin(t * 5 * wind - f * 6) * h * 0.09 * f, shade = 0.85 + 0.15 * Math.cos(t * 5 * wind - f * 6);
    const xx = dir > 0 ? x + i * dw : x - (i + 1) * dw;
    ctx.globalAlpha = 1; ctx.drawImage(tex, (dir > 0 ? i : n - 1 - i) * sw, 0, sw + 0.5, tex.height, xx, y + wave + f * h * 0.04, dw + 0.6, h);
    if (shade < 0.97) { ctx.fillStyle = `rgba(0,0,0,${(1 - shade) * 1.5})`; ctx.fillRect(xx, y + wave + f * h * 0.04, dw + 0.6, h); }
  }
}

// a limb segment as an outlined, tapering quad with rounded ends
function taper(x1, y1, x2, y2, w1, w2, col) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const a = [x1 + nx * w1 / 2, y1 + ny * w1 / 2], b = [x2 + nx * w2 / 2, y2 + ny * w2 / 2], c = [x2 - nx * w2 / 2, y2 - ny * w2 / 2], d = [x1 - nx * w1 / 2, y1 - ny * w1 / 2];
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(x1, y1, w1 / 2, 0, 7); ctx.arc(x2, y2, w2 / 2, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(30,18,8,0.7)'; ctx.lineWidth = 1.3; ctx.beginPath();
  ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.moveTo(d[0], d[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
}
function drawHorse(x, y, f, S, walk, moving, speed) {
  const tw = S * 1.22, k = tw / ASSET_LIST.h_torso.ow, th = ASSET_LIST.h_torso.oh * k;
  const legL = S * 0.5;
  const ph = ((walk / (Math.PI * 2)) % 1 + 1) % 1, mv = moving ? 1 : 0;
  const G = horseGait(speed || 80, S), gallop = G.g === 0, trot = G.g === 1;
  const duty = G.duty, L = mv * G.L, lift = mv * G.lift;
  const bob = mv * (gallop ? Math.sin(ph * Math.PI * 2 + 0.6) * S * 0.035 : trot ? Math.abs(Math.cos(ph * Math.PI * 2)) * S * 0.025 : Math.abs(Math.sin(ph * Math.PI * 2)) * S * 0.012);
  const pitch = mv * (gallop ? Math.sin(ph * Math.PI * 2 - 0.4) * 0.03 : 0);
  ctx.save(); ctx.translate(x, y); ctx.scale(-f, 1); // native-left space: forward is -x
  const rootY = -legL - bob;
  const ty0 = rootY - th * 0.82, tx0 = -tw / 2;
  const at = (nx, ny) => [tx0 + nx * tw, ty0 + ny * th];
  const coat = ['#5c3a1f', '#8c5a31'];
  const drawLeg = (Lg) => {
    const [nx, ny, fore, near, phs] = Lg;
    const s = ((ph + phs[G.g]) % 1 + 1) % 1;
    let fx, fy;
    if (s < duty) { fx = -L * 0.5 + L * (s / duty); fy = 0; }                    // planted: hoof slides back with the ground
    else { const q = (s - duty) / (1 - duty), e = q * q * (3 - 2 * q); fx = L * 0.5 - L * e; fy = -lift * Math.sin(Math.PI * q) * (fore ? 1 : 0.8); }
    if (!mv) fx = fore ? (near ? -S * 0.03 : S * 0.02) : (near ? S * 0.02 : -S * 0.02);
    // rotate the root by body pitch around the torso centre
    let [rx, ry] = at(nx, ny);
    const cy = ty0 + th / 2; const c = Math.cos(pitch), sn = Math.sin(pitch);
    [rx, ry] = [rx * c - (ry - cy) * sn, cy + rx * sn + (ry - cy) * c];
    const footX = rx + fx + (fore ? -S * 0.02 : S * 0.03), footY = fy - S * 0.03;
    const l1 = legL * 0.55, l2 = legL * 0.52;
    const j = ik(rx, ry, footX, footY, l1, l2, -1); // joint (knee/hock) points back toward the tail
    const col = coat[near ? 1 : 0];
    // upper leg (forearm / gaskin): thick and tapering, cannon bone: slim; outlined like the art
    taper(rx, ry - S * 0.05, j[0], j[1], S * (fore ? 0.15 : 0.19), S * 0.065, col);
    taper(j[0], j[1], j[2], j[3] - S * 0.02, S * 0.065, S * 0.045, col);
    // fetlock + hoof
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(j[2], j[3] - S * 0.025, S * 0.03, 0, 7); ctx.fill();
    ctx.fillStyle = near ? '#2b1c12' : '#160e08';
    ctx.beginPath(); ctx.moveTo(j[2] - S * 0.035, j[3] + S * 0.015); ctx.lineTo(j[2] - S * 0.025, j[3] - S * 0.02); ctx.lineTo(j[2] + S * 0.03, j[3] - S * 0.02); ctx.lineTo(j[2] + S * 0.04, j[3] + S * 0.015); ctx.closePath(); ctx.fill();
  };
  for (const Lg of HORSE_LEGS) if (!Lg[3]) drawLeg(Lg);
  ctx.save(); ctx.translate(0, ty0 + th / 2); ctx.rotate(pitch); ctx.translate(0, -(ty0 + th / 2));
  const [tlx, tly] = at(0.97, 0.36);
  part('h_tail', tlx, tly, k * 0.9, (mv ? Math.sin(ph * Math.PI * 2) * 0.25 - 0.35 * (gallop ? 1 : 0.3) : 0.05) - 0.1 + Sky.wind * 0.2 * f, 0.18, 0.04);
  for (const Lg of HORSE_LEGS) if (Lg[3]) drawLeg(Lg);
  part('h_torso', 0, ty0 + th / 2, k, 0, 0.5, 0.5);
  const [hx, hy] = at(0.12, 0.3);
  const nod = mv ? (gallop ? Math.sin(ph * Math.PI * 2 + 1.2) * 0.12 : Math.sin(ph * Math.PI * 4) * 0.05) : Math.sin(performance.now() / 900) * 0.04;
  part('h_head', hx, hy, k * 0.95, nod, 0.84, 0.78);
  ctx.restore();
  ctx.restore();
  return ty0 + th * 0.14; // saddle height (relative y)
}

function drawUnit(u) {
  const d = u.d;
  if (d.siege) return drawSiege(u);
  ctx.save(); ctx.translate(u.x - B.camX, u.y);
  if (d.boss) { drawBoss(u); ctx.restore(); return; }
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(0, 2, u.w * 1.4, 4, 0, 0, 7); ctx.fill();
  if (d.horse) {
    const sp = u.kiting ? u.d.speed * 0.8 : Math.max(u.cs, 1);
    if (u.charging) { ctx.strokeStyle = 'rgba(255,240,210,0.35)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < 5; i++) { const yy = -u.S * (0.3 + i * 0.22), x0 = -u.f * (u.S * 0.7 + ((performance.now() / 4 + i * 37) % 60)); ctx.moveTo(x0, yy); ctx.lineTo(x0 - u.f * u.S * 0.5, yy); }
      ctx.stroke(); }
    const sy = drawHorse(0, 0, u.f, u.S, u.walk, u.moving || u.air, sp);
    const save = u.mvB; u.mvB = 0; const P = unitPose(u); u.mvB = save; // rider: upper body only
    ctx.translate(0, sy - P.hip[1] + u.S * 0.02);
    // rider sits astride: thigh forward along the saddle, shin hanging down the horse's flank
    const S = u.S, rise = u.moving ? Math.max(0, Math.sin(u.walk)) * S * 0.02 : 0;
    P.hip = [P.hip[0], P.hip[1] - rise];
    P.kneeF = [P.hip[0] + S * 0.17, P.hip[1] + S * 0.1]; P.footF = [P.hip[0] + S * 0.1, P.hip[1] + S * 0.3];
    P.kneeB = [P.hip[0] + S * 0.04, P.hip[1] + S * 0.02]; P.footB = [P.hip[0] + S * 0.06, P.hip[1] + S * 0.04]; // far leg is behind the horse's body
    ctx.scale(u.f, 1);
    drawFigure(P, d.look, u.side, u.S, u.S * 0.075, false);
  } else {
    ctx.scale(u.f, 1);
    const P = unitPose(u);
    drawFigure(P, d.look, u.side, u.S, u.S * 0.075, false);
    if (u.flash > 0.55) { // hit flash: a brief bright pass over the figure
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (u.flash - 0.55) * 1.2;
      drawFigure(P, d.look, u.side, u.S, u.S * 0.075, false);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    const g = (d.look || {}).grip;
    if ((g === 'blade' || g === 'heavy') && (u.slashT || 0) > 0) { // swoosh arc of the blade
      const k = u.slashT / 0.22, r = u.S * (g === 'heavy' ? 0.62 : 0.55);
      const grad = ctx.createLinearGradient(P.sh[0], P.sh[1] - r, P.sh[0] + r, P.sh[1] + r);
      grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(1, `rgba(255,250,230,${0.55 * k})`);
      ctx.strokeStyle = grad; ctx.lineWidth = u.S * 0.07 * k; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(P.sh[0], P.sh[1], r, -2.4, 0.9); ctx.stroke();
    }
  }
  ctx.restore();
  if (u.flash > 0.5) { /* hit flash via red tint particles handled by blood */ }
  // hp bar when hurt
  if (u.hp < u.max) {
    const x = u.x - B.camX, y = u.y - u.h - 14, w = 30 * (u.d.armor >= 2 ? 1.4 : 1);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - w / 2, y, w, 4);
    ctx.fillStyle = u.side === 1 ? '#5fbf4a' : '#d64b3a'; ctx.fillRect(x - w / 2, y, w * u.hp / u.max, 4);
  }
  if (u.burn > 0) B.lightsTmp.push({ x: u.x, y: u.y - 30, r: 90, i: 0.6 });
}

function drawRag(r) {
  const p = r.pts, cx = -B.camX;
  const L = i => [p[i].x + cx, p[i].y];
  const S = r.S, alpha = clamp(r.life / 3, 0, 1);
  ctx.save(); ctx.globalAlpha = alpha;
  const P = { head: L(0), neck: L(1), hip: L(2), elbF: L(3), handF: L(4), elbB: L(5), handB: L(6), kneeF: L(7), footF: L(8), kneeB: L(9), footB: L(10), sh: L(1), R: S * 0.09 };
  if (r.cut) {
    // severed: draw a short bloody stump between the halves
    ctx.strokeStyle = '#6a0f0a'; ctx.lineWidth = S * 0.08; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(P.neck[0], P.neck[1]); ctx.lineTo(lerp(P.neck[0], P.hip[0], 0.25), lerp(P.neck[1], P.hip[1], 0.25)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(P.hip[0], P.hip[1]); ctx.lineTo(lerp(P.hip[0], P.neck[0], 0.2), lerp(P.hip[1], P.neck[1], 0.2)); ctx.stroke();
    drawFigure(P, { ...r.look, torso: null, weapon: null, shield: null }, r.side, S, S * 0.075, r.burn > 0);
  } else drawFigure(P, { ...r.look, weapon: r.pin ? null : r.look.weapon, grip: r.look.grip }, r.side, S, S * 0.075, r.burn > 0);
  ctx.restore();
}

// ---------- boss: full cutout rig from the Flow parts (art faces left) ----------
function drawBoss(u) {
  const k = u.S * 1.25 / 758, t = performance.now() / 1000;
  const mv = u.moving, p = u.walk, atk = u.atkT;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 2, 50, 7, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.scale(-u.f, 1); // native left
  const thighL = 173 * k * 0.85, shinL = 179 * k * 0.92;
  const hipY = -(thighL + shinL) + (mv ? -Math.abs(Math.sin(p)) * 3 : 0);
  const legAng = i => mv ? Math.sin(p + i * Math.PI) * 0.45 : (i ? 0.12 : -0.1);
  const drawLeg = (i, dark) => {
    const a = -legAng(i);
    part('boss_thigh', 0, hipY, k, a, 0.5, 0.08, dark);
    const [kx, ky] = jointPos('boss_thigh', 0, hipY, k, a, 0.5, 0.08, 0.45, 0.92);
    part('boss_shin', kx, ky, k, a + (mv ? Math.max(0, Math.cos(p + i * Math.PI)) * 0.5 : 0), 0.45, 0.06, dark);
  };
  const lean = -(mv ? 0.08 : 0.02) - (atk > 0 ? Math.sin((1 - atk) * Math.PI) * 0.2 : 0);
  const torsoH = 285 * k;
  const [nx, ny] = [Math.sin(lean) * torsoH * 0.9, hipY - Math.cos(lean) * torsoH * 0.9];
  // back banner & cape
  part('boss_banner', -Math.sin(lean) * 10 + 22 * k * 6, hipY - torsoH * 0.35, k, 0.08 + Math.sin(t * 2) * 0.03 - Sky.wind * 0.1, 0.1, 0.92);
  part('boss_cape', nx + 18 * k * 5, ny + 10, k, 0.12 + (mv ? Math.sin(p) * 0.06 : 0) + Sky.wind * -0.12, 0.15, 0.04);
  drawLeg(1, true);
  // back arm holds glaive
  const swing = atk > 0 ? lerp(-2.3, 0.6, 1 - atk) : -0.25 + Math.sin(t * 1.5) * 0.04;
  part('boss_torso', (nx + 0) / 2, (ny + hipY) / 2, k, lean, 0.5, 0.5);
  drawLeg(0, false);
  const [hx, hy] = [nx, ny];
  part('boss_head', hx - 4 * k * 5, hy + 6, k, lean * 0.6, 0.45, 0.9);
  // front arm + glaive
  const shx = nx - 6, shy = ny + 30 * k * 2.5;
  const armA = swing;
  const [gx, gy] = jointPos('boss_arm', shx, shy, k, armA, 0.5, 0.06, 0.22, 0.93);
  part('boss_glaive', gx, gy, k, armA - 0.5, 0.5, 0.55);
  part('boss_arm', shx, shy, k, armA, 0.5, 0.06);
  ctx.restore();
  // hp bar
  const w = 120; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(-w / 2, hipY - torsoH - 70, w, 8);
  ctx.fillStyle = '#e04030'; ctx.fillRect(-w / 2, hipY - torsoH - 70, w * u.hp / u.max, 8);
  text('NOYAN', 0, hipY - torsoH - 84, 16, '#ffd27a');
}

// ================= Siege engines =================
function updateSiege(u, dt) {
  const d = u.d, kind = d.siege;
  u.cdT -= dt;
  const stopX = kind === 'treb' ? CASTLE_FRONT + 820 : kind === 'ballista' ? CASTLE_FRONT + 560 : CASTLE_FRONT + (kind === 'tower' ? 30 : 8);
  // engines are blocked by defenders standing in front (except ranged engines that stop far away)
  let blocked = false;
  if (kind === 'ram' || kind === 'tower') for (const o of B.units) if (o.side === 1 && o.x < u.x && u.x - o.x < u.w + 10) blocked = true;
  u.moving = u.x > stopX && !blocked;
  if (u.moving) { u.x -= d.speed * dt; u.walk += dt * 3; if (Math.random() < dt * 4) addPart('dust', u.x + rand(-40, 40), u.y, rand(-10, 10), -10, 0.8, 22); }
  if (kind === 'ram') {
    if (blocked && u.cdT <= 0) { u.cdT = d.cd; u.atkT = 1; for (const o of B.units) if (o.side === 1 && o.x < u.x && u.x - o.x < u.w + 14) hurt(o, d.dmg * 0.6, { kind: 'melee', knock: -260, x: u.x }); }
    else if (!u.moving && !blocked && u.cdT <= 0) { u.cdT = d.cd; u.atkT = 1; damageCastle(d.dmg, CASTLE_FRONT, u.y - 40); B.shake = Math.max(B.shake, 6); Audio2.play('crash', 0.6); }
    u.atkT = Math.max(0, u.atkT - dt * 1.4);
  } else if (kind === 'treb' || kind === 'ballista') {
    if (!u.moving && u.cdT <= 0) {
      u.cdT = d.cd * rand(0.9, 1.15); u.atkT = 1;
      let tgt = null; const ks = B.units.filter(o => o.side === 1 && u.x - o.x < d.range && u.x > o.x);
      if (ks.length && Math.random() < 0.65) tgt = pick(ks);
      const sx = u.x - (kind === 'treb' ? 40 : 50), sy = u.y - (kind === 'treb' ? 160 : 70);
      const tx = tgt ? tgt.x : CASTLE_FRONT - rand(60, 300), ty = tgt ? tgt.y - 20 : castle.top + castle.h * rand(0.35, 0.7);
      if (kind === 'treb') { const [vx, vy] = solveBallistic(sx, sy, tx, ty, 900, true); fireProj('boulder', sx, sy, vx, vy, -1, d.dmg, u); Audio2.play('ballista', 0.6); }
      else { const [vx, vy] = solveBallistic(sx, sy, tx, ty, 1300, false); fireProj('mbolt', sx, sy, vx, vy, -1, d.dmg, u); Audio2.play('ballista', 0.5); }
    }
    u.atkT = Math.max(0, u.atkT - dt * 1.2);
  } else if (kind === 'tower') {
    if (!u.moving && !blocked) {
      if (!u.docked) { u.docked = true; showBanner('Siege tower at the walls!', 2); Audio2.play('horn', 0.6); }
      damageCastle(d.dmg * dt, CASTLE_FRONT - 20, castle.top + castle.h * 0.5, true);
      u.spawnT -= dt; if (u.spawnT <= 0) { u.spawnT = 6; const s = spawnUnit(pick(['m_raider', 'm_levy', 'm_spear']), u.x + 20); s.y -= 0; }
    }
  }
}
function drawSiege(u) {
  const kind = u.d.siege, x = u.x - B.camX, y = u.y, t = performance.now() / 1000;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(0, 2, u.w * 1.3, 6, 0, 0, 7); ctx.fill();
  if (kind === 'ram') {
    const sw = u.atkT > 0 ? Math.sin((1 - u.atkT) * Math.PI) * -26 : Math.sin(t * 1.5) * 2;
    // crew legs under the shed
    ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) { const lx = -45 + i * 28, ph = u.walk * 2 + i; ctx.beginPath(); ctx.moveTo(lx, -38); ctx.lineTo(lx + Math.sin(ph) * 7, -2); ctx.stroke(); }
    spr('s_ram_shed', 0, 0, 120, 0, 1, 0.5, 1);
    spr('s_ram_log', -48 + sw, -44, 40, 0, 1, 0.5, 0.5, 1);
  } else if (kind === 'treb') {
    const a = u.atkT > 0 ? lerp(0.9, -0.9, Math.min(1, (1 - u.atkT) * 3)) : 0.55;
    spr('s_mangonel', 0, 0, 150, 0, -1, 0.5, 1);
    ctx.save(); ctx.translate(2, -138); ctx.rotate(-a); ctx.scale(-1, 1); spr('s_treb_arm', 0, 0, 105, 0, 1, 0.31, 0.37); ctx.restore();
  } else if (kind === 'ballista') {
    spr('s_ballista', 0, 0, 100, u.atkT > 0 ? -0.04 : 0, 1, 0.5, 1);
    ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(50, -5); ctx.lineTo(48, -40); ctx.lineTo(60, -60); ctx.stroke();
    ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(62, -68, 6, 0, 7); ctx.fill(); spr('m_fur_hat', 62, -71, 16, 0, 1);
  } else if (kind === 'tower') {
    spr('s_tower', 0, 0, 300, Math.sin(u.walk) * 0.01, 1, 0.5, 1);
    if (u.docked) { ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-60, -215); ctx.lineTo(-110, -205); ctx.stroke(); }
  }
  ctx.restore();
  const w = 70; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - w / 2, y - u.h - 18, w, 5);
  ctx.fillStyle = '#d64b3a'; ctx.fillRect(x - w / 2, y - u.h - 18, w * u.hp / u.max, 5);
}
function destroySiege(u) {
  Audio2.play('crash'); B.shake = Math.max(B.shake, 10); FX.shock(u.x, u.y - 60, 0.9); B.hitK = 1;
  for (let i = 0; i < 14; i++) addPart('debris', u.x + rand(-40, 40), u.y - rand(20, u.h * 0.8), rand(-260, 260), rand(-650, -200), rand(2, 4), rand(16, 34), 'fx_splinters');
  for (let i = 0; i < 5; i++) addPart('dust', u.x + rand(-60, 60), u.y - rand(0, 60), rand(-40, 40), rand(-40, -10), 1.6, rand(60, 110));
  addPart('explosion', u.x, u.y - u.h * 0.4, 0, 0, 0.5, 140);
  // crew thrown out
  for (let i = 0; i < 2; i++) {
    const c = new Unit(pick(['m_levy', 'm_spear']), u.x + rand(-30, 30));
    makeRagdoll(c, rand(-300, 300), rand(-700, -400));
  }
  B.fires.push({ x: u.x, y: u.y, r: 50, t: 6, max: 6, dps: 0 });
}

// ================= Projectiles =================
function fireProj(type, x, y, vx, vy, side, dmg, owner) {
  const p = { type, x, y, vx, vy, side, dmg, owner, rot: Math.atan2(vy, vx), spin: 0, life: 8, stuck: false, pinned: [], pierce: 0, hitIds: new Set(), dead: false };
  if (type === 'spear') p.pierce = 7;
  if (type === 'javelin') p.pierce = 1;
  if (type === 'mbolt') p.pierce = 3;
  if (type === 'stone' || type === 'boulder' || type === 'firepot' || type === 'potbig') p.spin = rand(-8, 8);
  B.projs.push(p); return p;
}
const PROJ_INFO = {
  arrow: { g: 0.6, wind: 90, spr: 'fx_arrow', len: 46, trail: 'rgba(240,230,200,0.35)' },
  firearrow: { g: 0.6, wind: 90, spr: 'fx_fire_arrow', len: 48, trail: 'rgba(255,170,60,0.55)' },
  bolt: { g: 0.35, wind: 40, spr: 'fx_arrow', len: 34, trail: 'rgba(240,230,200,0.4)' },
  javelin: { g: 0.6, wind: 90, spr: 'fx_javelin', len: 52 },
  spear: { g: 0.55, wind: 70, spr: 'bl_bolt', len: 130 },
  mbolt: { g: 0.35, wind: 30, spr: 's_bolt', len: 110 },
  firepot: { g: 0.6, wind: 30, spr: 'fx_pot_fire', len: 22 },
  potbig: { g: 0.6, wind: 25, spr: 'fx_pot_fire', len: 34 },
  stone: { g: 0.6, wind: 10, spr: 'fx_boulder', len: 46 },
  boulder: { g: 0.6, wind: 10, spr: 'fx_stone', len: 40 },
};
function updateProj(p, dt) {
  const info = PROJ_INFO[p.type];
  if (p.stuck) { p.life -= dt; if (p.host && p.host.hp > 0) { p.x = p.host.x + p.hx; p.y = p.host.y + p.hy; } else if (p.host) p.host = null; return; }
  const steps = Math.max(1, Math.ceil(Math.hypot(p.vx, p.vy) * dt / 12));
  const sdt = dt / steps;
  for (let s = 0; s < steps && !p.stuck && !p.dead; s++) {
    p.vy += GRAV * info.g * sdt;
    p.vx += Sky.wind * info.wind * sdt;
    p.x += p.vx * sdt; p.y += p.vy * sdt;
    if (p.spin) p.rot += p.spin * sdt; else p.rot = Math.atan2(p.vy, p.vx);
    // fire arrows / pots light the night
    if ((p.type === 'firepot' || p.type === 'potbig' || p.type === 'firearrow') && Math.random() < 0.5) addPart('ember', p.x, p.y, rand(-20, 20), rand(-20, 20), 0.4);
    // tip position
    const tipX = p.x + Math.cos(p.rot) * info.len * 0.45 * (p.spin ? 0 : 1), tipY = p.y + Math.sin(p.rot) * info.len * 0.45 * (p.spin ? 0 : 1);
    // unit hits
    for (const u of B.units.slice()) {
      if (u.side === p.side || u.hp <= 0 || p.hitIds.has(u.id)) continue;
      const hw = u.w + (p.spin ? info.len * 0.4 : 4);
      if (Math.abs(tipX - u.x) < hw && tipY > u.y - u.h && tipY < u.y + 4) { p.hitIds.add(u.id); hitUnit(p, u); if (p.dead || p.stuck) break; }
    }
    if (p.dead || p.stuck) break;
    // castle hit by mongol missiles
    if (p.side === -1 && p.x < CASTLE_FRONT - 10 && p.y > castle.top + castle.h * 0.3) { hitCastle(p); break; }
    // Mongol camp hit by Kurdish missiles
    if (p.side === 1 && B.campHP > 0 && tipX > CAMP_FRONT + 10 && tipY > GROUND - 150) { hitCamp(p); break; }
    // ground
    if (tipY >= GROUND + 18) { hitGround(p); break; }
    if (p.x < -200 || p.x > WW + 200) { p.dead = true; break; }
  }
}
function hitUnit(p, u) {
  const t = p.type, armor = u.d.armor;
  if (p.owner && p.owner.d) p.dmg *= counterMul(p.owner, u) / (p.cm || 1), p.cm = counterMul(p.owner, u);
  const base = { kind: 'missile', vx: p.vx, vy: p.vy, x: p.x };
  if (t === 'spear') {
    if (armor <= 1 && !u.d.boss) {
      const off = 50 - p.pinned.length * 18;
      const r = hurt(u, 999, { ...base, heavy: true, knock: p.vx * 0.4, pin: { proj: p, off } });
      Audio2.play('hit', 0.9); addBlood(u.x, u.y - u.h * 0.6, p.vx * 0.3, 10);
      p.vx *= 0.9; p.vy *= 0.92; p.pierce--;
      p.kills = (p.kills || 0) + 1; if (p.kills >= 2) callout(`SKEWERED x${p.kills}!`, u.x, u.y - 120, p.kills >= 4);
      if (p.pierce <= 0) { p.vx *= 0.5; }
    } else if (armor === 3) {
      hurt(u, 150, { ...base, heavy: true }); stickInto(p, u); Audio2.play('thud');
    } else {
      hurt(u, u.d.boss ? 170 : 140, { ...base, heavy: true, knock: Math.sign(p.vx) * (u.d.boss ? 900 : 1400) });
      Audio2.play('clang'); addPart('spark', p.x, p.y, 0, 0, 0.3, 40); B.shake = Math.max(B.shake, 5);
      p.vx *= -0.25; p.vy = -350; p.spin = rand(-10, 10); p.side = 0; // deflected, harmless
    }
    return;
  }
  if (t === 'stone' || t === 'boulder') return explodeStone(p, u);
  if (t === 'firepot' || t === 'potbig') return explodePot(p);
  if (t === 'mbolt') {
    if (armor <= 1) { hurt(u, p.dmg * 2, { ...base, heavy: true, knock: p.vx * 0.3, pin: { proj: p, off: 30 - p.pinned.length * 16 } }); p.pierce--; p.vx *= 0.88; if (p.pierce <= 0) p.vx *= 0.5; }
    else { hurt(u, p.dmg, { ...base, heavy: true, knock: p.vx * 0.6 }); stickInto(p, u); }
    Audio2.play('hit', 0.7); return;
  }
  if (t === 'javelin' && armor === 0 && u.hp <= p.dmg * 1.1) {
    hurt(u, p.dmg * 1.1, { ...base, knock: p.vx * 0.5, pin: { proj: p, off: 8 } }); p.vx *= 0.8; return;
  }
  const res = hurt(u, p.dmg, { ...base, ap: t === 'bolt', knock: Math.sign(p.vx) * (t === 'bolt' ? 22 : 10) }); // missiles barely nudge
  if (t === 'firearrow') u.burn = Math.max(u.burn, 2.5);
  Audio2.play('hit', 0.35);
  if (res === 'blocked') { p.vx *= -0.2; p.vy = -150; p.spin = 12; p.side = 0; return; }
  if (u.hp > 0) stickInto(p, u); else p.dead = true;
}
function stickInto(p, u) { p.stuck = true; p.host = u; p.hx = p.x - u.x; p.hy = p.y - u.y; p.life = 6; }
function hitGround(p) {
  const t = p.type;
  if (t === 'stone' || t === 'boulder') return explodeStone(p, null);
  if (t === 'firepot' || t === 'potbig') return explodePot(p);
  p.stuck = true; p.life = p.pinned.length ? 25 : 7; p.y = Math.min(p.y, GROUND + 18);
  dustPuff(p.x, GROUND + 15, t === 'spear' ? 1 : 0.3);
  if (t === 'spear' || t === 'mbolt') { Audio2.play('thud', 0.6); B.shake = Math.max(B.shake, 3); }
}
function hitCastle(p) {
  const t = p.type;
  if (t === 'boulder') { damageCastle(p.dmg, p.x, p.y); Audio2.play('crash', 0.7); B.shake = Math.max(B.shake, 8); for (let i = 0; i < 8; i++) addPart('debris', p.x, p.y, rand(-200, 150), rand(-400, -100), 2, rand(10, 22), 'fx_rubble'); addPart('dust', p.x, p.y, 0, -20, 1.2, 90); p.dead = true; return; }
  damageCastle(p.dmg * (t === 'mbolt' ? 0.8 : 0.3), p.x, p.y); p.stuck = true; p.life = 5;
}
function explodeStone(p, direct) {
  const big = p.type === 'stone';
  const R = big ? 120 : 90, dmg = big ? 120 : p.dmg;
  p.dead = true; addDecal(p.x, GROUND + 16, big ? 70 : 50, 'crater'); hitStop(big ? 0.07 : 0.04); Audio2.play('crash', big ? 1 : 0.6); B.shake = Math.max(B.shake, big ? 12 : 6); FX.shock(p.x, GROUND - 20, big ? 1 : 0.6); B.hitK = Math.max(B.hitK, big ? 1 : 0.5);
  for (const u of B.units.slice()) {
    if (u.side === p.side) continue;
    const dd = Math.abs(u.x - p.x); if (dd > R + u.w) continue;
    const f = 1 - dd / (R + u.w);
    const dir = Math.sign(u.x - p.x) || Math.sign(p.vx);
    hurt(u, dmg * (0.4 + f * 0.8) * (u.d.siege ? 2.2 : 1), { kind: 'blast', knock: dir * 1300 * f + p.vx * 0.3, cut: big && f > 0.6, vy: -600 });
    if (u.hp > 0 && !u.d.siege && u.d.armor < 2) { u.air = true; u.vy = -500 * f - 150; }
  }
  const before = B.kills;
  setTimeout(() => { const k = B.kills - before; if (k >= 2 && p.side === 1) callout(`CRUSHED x${k}!`, p.x, GROUND - 160, k >= 4); }, 0);
  for (const r of B.rags) { if (Math.abs(r.pts[2].x - p.x) < R && !r.pin) for (const q of r.pts) { q.ox -= Math.sign(q.x - p.x) * 8; q.oy += 10; } }
  for (let i = 0; i < 10; i++) addPart('debris', p.x, GROUND + 10, rand(-300, 300), rand(-600, -200), 2.5, rand(8, 20), 'fx_rubble');
  addPart('dust', p.x, GROUND, 0, -30, 1.4, big ? 170 : 120);
}
function explodePot(p) {
  p.dead = true; const big = p.type === 'potbig'; FX.shock(p.x, GROUND - 20, big ? 0.6 : 0.3); addDecal(p.x, GROUND + 14, big ? 90 : 60, 'scorch');
  Audio2.play('fire', 1); addPart('explosion', p.x, Math.min(p.y, GROUND), 0, 0, 0.5, big ? 150 : 90);
  const wet = Sky.isWet();
  const R = (big ? 110 : 70) * (wet ? 0.6 : 1) * (Sky.cur.dust > 0.5 ? 1.25 : 1);
  B.fires.push({ x: p.x, y: GROUND + 16, r: R, t: wet ? 3 : big ? 9 : 6, max: wet ? 3 : big ? 9 : 6, dps: big ? 45 : 28, side: p.side });
  for (const u of B.units.slice()) if (u.side !== p.side && Math.abs(u.x - p.x) < R + u.w) { hurt(u, big ? 60 : p.dmg * 1.5, { kind: 'fire', knock: Math.sign(u.x - p.x) * 200 }); u.burn = 4; }
  if (wet) for (let i = 0; i < 6; i++) addPart('steam', p.x + rand(-R, R), GROUND, rand(-10, 10), rand(-60, -30), 2, rand(40, 80));
}
function drawProj(p) {
  const info = PROJ_INFO[p.type]; const x = p.x - B.camX;
  if (x < -200 || x > VW + 200) return;
  const nat = NATIVE_ANG[info.spr] || 0;
  const im = IMG[info.spr]; if (!im) return;
  ctx.save(); ctx.translate(x, p.y); ctx.rotate(p.rot - nat);
  if (p.life < 1) ctx.globalAlpha = p.life;
  const diag = nat === -Math.PI / 4;
  const len = info.len;
  let w, h;
  if (diag) { const s = len / Math.hypot(im.width, im.height); w = im.width * s; h = im.height * s; }
  else if (nat === -Math.PI / 2) { h = len; w = len * im.width / im.height; }
  else if (nat === Math.PI) { w = len; h = len * im.height / im.width; }
  else { w = len; h = len * im.height / im.width; }
  ctx.drawImage(sized(im, w, h), -w / 2, -h / 2, w, h);
  ctx.restore();
  if (info.trail && !p.stuck) { // streak behind the arrow: reads as speed at a glance
    const sp = Math.hypot(p.vx, p.vy) || 1, tl = Math.min(70, sp * 0.05);
    ctx.strokeStyle = info.trail; ctx.lineWidth = 1.6; ctx.beginPath();
    ctx.moveTo(x - p.vx / sp * len * 0.4, p.y - p.vy / sp * len * 0.4); ctx.lineTo(x - p.vx / sp * (len * 0.4 + tl), p.y - p.vy / sp * (len * 0.4 + tl)); ctx.stroke();
  }
}

// ================= Fires, castle, particles =================
function damageCastle(dmg, x, y, silent) {
  dmg *= DIFF().dmg; B.castleHP = Math.max(0, B.castleHP - dmg); B.wrath = Math.min(B.wrathMax, B.wrath + dmg / 60 * DIFF().wrath);
  if (!silent) { addPart('debris', x, y, rand(-150, 100), rand(-300, -100), 1.5, rand(8, 16), 'fx_rubble'); addPart('dust', x, y, 0, -15, 0.9, 50); }
}
// ================= The Mongol camp (enemy base) =================
function hitCamp(p) {
  const t = p.type;
  const dmg = t === 'spear' ? 140 : t === 'stone' ? 0 : t === 'potbig' ? 90 : t === 'firepot' ? p.dmg * 2 : t === 'boulder' ? 0 : p.dmg * (t === 'bolt' ? 1 : 0.7);
  if (dmg) damageCamp(dmg, p.x, p.y);
  if (t === 'stone') { damageCamp(220, p.x, p.y); return explodeStone(p, null); }
  if (t === 'firepot' || t === 'potbig') { campFire(p.x); return explodePot(p); }
  p.stuck = true; p.life = 5; Audio2.play('thud', 0.3);
}
function campFire(x) { if (B.fires.length < 40) B.fires.push({ x: clamp(x, CAMP_FRONT + 30, WW - 80), y: GROUND + 10, r: 40, t: 7, max: 7, dps: 0 }); }
function damageCamp(dmg, x, y) {
  if (B.campHP <= 0 || B.phase === 'lost') return;
  B.campHP = Math.max(0, B.campHP - dmg); B.campHit = 0.25;
  if (Math.random() < 0.35) addPart('debris', x, y, rand(-80, 160), rand(-300, -100), 1.5, rand(8, 16), 'fx_splinters');
  if (B.campHP <= 0) return campDestroyed();
  if (!B.campAlarm && B.campHP < B.campMax * 0.5) {
    B.campAlarm = true; showBanner('The camp sounds the alarm!', 2); Audio2.play('horn', 0.8);
    for (let i = 0; i < 4 + (B.mission.id | 0); i++) spawnUnit(pick(['m_raider', 'm_spear', 'm_levy', 'm_shield']), SPAWN_X + rand(-60, 160));
  }
  if (Math.random() < dmg / 600) campFire(rand(CAMP_FRONT + 40, WW - 120));
}
function campDestroyed() {
  showBanner('The Mongol camp is burning!', 3); Audio2.play('crash'); Audio2.play('horn', 0.8);
  B.shake = 16; B.slowT = 1.2;
  for (let i = 0; i < 8; i++) setTimeout(() => {
    const x = rand(CAMP_FRONT + 40, WW - 60);
    addPart('explosion', x, GROUND - rand(20, 120), 0, 0, 0.6, rand(120, 200)); campFire(x); FX.shock(x, GROUND - 60, 1);
    for (let k = 0; k < 6; k++) addPart('debris', x, GROUND - 60, rand(-300, 300), rand(-700, -250), 2.5, rand(14, 30), 'fx_splinters');
  }, i * 160);
  B.queue = [];
  for (const u of B.units) if (u.side === -1) u.rout = true;
  B.phase = 'won'; endBattle(true);
}
function drawCampHP() {
  if (B.campHP <= 0) return;
  const x = (CAMP_FRONT + WW) / 2 - 60 - B.camX, y = GROUND - 330;
  if (x < -200 || x > VW + 200) return;
  const w = 220, f = B.campHP / B.campMax;
  ctx.fillStyle = 'rgba(20,10,5,0.7)'; ctx.fillRect(x - w / 2 - 3, y - 3, w + 6, 16);
  ctx.fillStyle = (B.campHit || 0) > 0 ? '#ffd0a0' : '#c8402c'; ctx.fillRect(x - w / 2, y, w * f, 10);
  text('HULAGU’S CAMP', x, y - 16, 18, '#ffd9a0');
}

function addPart(type, x, y, vx, vy, life, size = 10, sprName) {
  if (B.parts.length > 380 && type !== 'heal') return;
  B.parts.push({ type, x, y, vx, vy, life, max: life, size, rot: rand(0, 6), vr: rand(-6, 6), spr: sprName });
}
function callout(txt, x, y, big) {
  B.parts.push({ type: 'text', x, y, vx: 0, vy: -40, life: 1.6, max: 1.6, size: big ? 46 : 34, rot: 0, vr: 0, spr: txt });
  if (big) { B.slowT = Math.max(B.slowT || 0, 0.7); B.shake = Math.max(B.shake, 8); }
}
function addBlood(x, y, kx, n, wood) {
  for (let i = 0; i < n; i++) addPart(wood ? 'chip' : 'blood', x + rand(-5, 5), y + rand(-8, 8), rand(-120, 120) + kx * 0.3, rand(-260, -40), rand(0.5, 1), rand(2, 4));
}
function dustPuff(x, y, s) { for (let i = 0; i < 3; i++) addPart('dust', x + rand(-15, 15), y, rand(-40, 40), rand(-30, -5), 0.9 * s + 0.3, 40 * s + 15); }
function updateParts(dt) {
  for (let i = B.parts.length - 1; i >= 0; i--) {
    const p = B.parts[i]; p.life -= dt;
    if (p.life <= 0) { B.parts.splice(i, 1); continue; }
    if (p.type === 'horse') { p.x += p.vx * dt; p.walk += Math.abs(p.vx) * dt * horsePhaseK(Math.abs(p.vx), p.S); continue; }
    const grav = p.type === 'blood' || p.type === 'debris' || p.type === 'chip' ? GRAV * 0.9 : p.type === 'ember' ? -40 : p.type === 'steam' ? -30 : 0;
    p.vy += grav * dt; p.x += (p.vx + (p.type === 'dust' || p.type === 'steam' || p.type === 'ember' ? Sky.wind * 60 : 0)) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    if ((p.type === 'blood' || p.type === 'debris' || p.type === 'chip') && p.y > GROUND + 20) { p.y = GROUND + 20; p.vy *= -0.25; p.vx *= 0.5; p.vr *= 0.5; }
    if (p.type === 'dust' || p.type === 'steam') { p.vx *= 0.97; p.vy *= 0.97; }
  }
}
function drawParts() {
  const cx = B.camX;
  for (const p of B.parts) {
    const x = p.x - cx; if (x < -200 || x > VW + 200) continue;
    const a = p.life / p.max;
    switch (p.type) {
      case 'blood': ctx.fillStyle = `rgba(110,10,8,${Math.min(1, a * 2)})`; ctx.fillRect(x, p.y, p.size, p.size); break;
      case 'chip': ctx.fillStyle = `rgba(120,80,40,${a})`; ctx.fillRect(x, p.y, p.size + 2, p.size); break;
      case 'num': ctx.globalAlpha = Math.min(1, a * 2); text(p.spr, x, p.y, 20, '#ffcf6a'); ctx.globalAlpha = 1; break;
      case 'heal': ctx.fillStyle = `rgba(150,255,140,${a})`; ctx.fillRect(x - 2, p.y - 6, 4, 12); ctx.fillRect(x - 6, p.y - 2, 12, 4); break;
      case 'ember': ctx.fillStyle = `rgba(255,${(150 + 100 * a) | 0},60,${a})`; ctx.fillRect(x, p.y, 3, 3); break;
      case 'dust': spr('fx_dust', x, p.y, p.size * (1.6 - a * 0.6), p.rot * 0.1, 1, 0.5, 0.6, a * 0.55); break;
      case 'steam': spr('fx_steam', x, p.y, p.size * (1.8 - a), 0, 1, 0.5, 0.6, a * 0.6); break;
      case 'spark': spr('fx_spark', x, p.y, p.size * (1.3 - a * 0.3), p.rot, 1, 0.5, 0.5, a); break;
      case 'explosion': spr('fx_explosion', x, p.y, p.size * (1.3 - a * 0.5), 0, 1, 0.5, 0.6, Math.min(1, a * 1.5)); B.lightsTmp.push({ x: p.x, y: p.y, r: 170 * a, i: a * 0.7 }); break;
      case 'debris': spr(p.spr || 'fx_splinters', x, p.y, p.size, p.rot, 1, 0.5, 0.5, Math.min(1, a * 2)); break;
      case 'text': { const sc = 1 + Math.max(0, p.life - p.max + 0.2) * 3; ctx.globalAlpha = Math.min(1, a * 2);
        text(p.spr, x, p.y, p.size * sc, p.size > 40 ? '#ffcf4a' : '#fff0c0'); ctx.globalAlpha = 1; break; }
      case 'horse': ctx.save(); ctx.globalAlpha = Math.min(1, a); drawHorse(x, p.y, p.f, p.S, p.walk, true, Math.abs(p.vx)); ctx.restore(); break;
    }
  }
}
function updateFires(dt) {
  for (let i = B.fires.length - 1; i >= 0; i--) {
    const f = B.fires[i]; f.t -= dt * (Sky.isWet() ? 2 : 1);
    if (f.t <= 0) { B.fires.splice(i, 1); continue; }
    if (f.dps) for (const u of B.units) if (u.side !== f.side && Math.abs(u.x - f.x) < f.r && !u.air) { hurt(u, f.dps * dt, { kind: 'fire', silent: true }); u.burn = Math.max(u.burn, 1.5); }
    if (Math.random() < dt * 25) addPart('ember', f.x + rand(-f.r, f.r) * 0.8, f.y - 5, rand(-15, 15), rand(-120, -50), rand(0.5, 1.1));
    if (Sky.isWet() && Math.random() < dt * 5) addPart('steam', f.x + rand(-f.r, f.r) * 0.7, f.y - 10, 0, rand(-50, -25), 1.6, rand(30, 60));
    else if (Math.random() < dt * 3) addPart('dust', f.x + rand(-f.r, f.r) * 0.5, f.y - 30, 0, -50, 1.6, 50);
  }
}
function drawFires() {
  const t = performance.now() / 1000;
  const frames = IMG.fl_0 && IMG.fl_0.width;
  for (const f of B.fires) {
    const x = f.x - B.camX, a = clamp(f.t / f.max * 2, 0, 1);
    if (x < -f.r - 50 || x > VW + f.r + 50) continue;
    B.lightsTmp.push({ x: f.x, y: f.y - 30, r: f.r * 1.8 + 40, i: a * 0.55 });
    const n = Math.max(2, Math.min(7, (f.r / 16) | 0));
    for (let i = 0; i < n; i++) {
      const fx = x + (n === 1 ? 0 : (i / (n - 1) - 0.5) * f.r * 1.5);
      const hgt = (38 + (i % 3) * 10) * (0.6 + a * 0.4) * (f.r > 60 ? 1.25 : 1);
      if (frames) spr('fl_' + (((t * 12) | 0) + i * 3) % 8, fx, f.y + 6, hgt, 0, i % 2 ? -1 : 1, 0.5, 1, a);
      else { const fl = 0.75 + Math.sin(t * 9 + i * 1.7) * 0.25; ctx.globalAlpha = a; ctx.drawImage(FLAME, fx - 16, f.y + 4 - hgt * fl, 32, hgt * fl); ctx.globalAlpha = 1; }
    }
  }
}

// ================= Waves =================
function buildWave(n) {
  const m = B.mission; const pool = m.pool || M_ROSTER;
  const avail = pool.filter(t => !UNITS[t].siege || n >= 2 || m.id >= 3);
  let budget = (8 + n * 7 + m.id * 5 + (m.endless ? n * n * 0.6 : 0)) * DIFF().budget;
  const dur = 38 + n * 3.5;
  const q = [];
  let t = 2;
  while (budget > 0) {
    const cand = avail.filter(k => UNITS[k].value <= budget + 1);
    if (!cand.length) break;
    // weighted: cheap units common, siege rare
    const ty = (() => { const w = cand.map(k => 1 / Math.pow(UNITS[k].value, 0.6) * (UNITS[k].siege ? 0.6 : 1)); let r = Math.random() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < cand.length; i++) { r -= w[i]; if (r <= 0) return cand[i]; } return cand[0]; })();
    const group = UNITS[ty].siege ? 1 : 1 + ((Math.random() * (UNITS[ty].value <= 2 ? 4 : 2)) | 0);
    for (let g = 0; g < group && budget > 0; g++) { q.push({ t: t + g * 0.7, type: ty }); budget -= UNITS[ty].value; }
    t += rand(2, 5) * (dur / 50);
  }
  if (n % 5 === 0) q.push({ t: dur * 0.45, type: 'm_boss' });
  const maxT = Math.max(...q.map(e => e.t));
  q.forEach(e => e.t = e.t / maxT * dur * 0.9);
  q.sort((a, b) => a.t - b.t);
  return { q, dur };
}
function startWave() {
  B.wave++; const w = buildWave(B.wave);
  B.queue = w.q; B.waveDur = w.dur; B.waveT = 0; B.phase = 'wave'; B.lastStand = false;
  showBanner(B.wave % 5 === 0 ? `Wave ${B.wave} - The Noyan rides!` : `Wave ${B.wave}`, 2.2);
  Audio2.play('horn', 0.7);
}
function updateWaves(dt) {
  if (B.phase === 'break') { B.breakT -= dt; if (B.breakT <= 0) startWave(); return; }
  if (B.phase !== 'wave') return;
  B.waveT += dt;
  while (B.queue.length && B.queue[0].t <= B.waveT) {
    const e = B.queue.shift();
    const u = spawnUnit(e.type, SPAWN_X + rand(0, 120));
    if (e.type === 'm_boss') { B.bossAlive = true; showBanner('Noyan Kara-Tümen enters the field!', 3); Audio2.play('drum'); }
  }
  B.lastStand = B.waveT > B.waveDur * 0.72 || B.bossAlive;
  const left = B.units.some(u => u.side === -1);
  if (!B.queue.length && !left) {
    const total = B.mission.waves;
    if (total && B.wave >= total) { B.phase = 'won'; endBattle(true); }
    else { B.phase = 'break'; B.breakT = 6; B.castleHP = Math.min(B.castleMax, B.castleHP + B.castleMax * 0.04); showBanner('Wave cleared', 2); }
  }
}

// ================= Player: AZ's ballista & powers =================
function ballistaPivot() { return [castle.pivotX, castle.pivotY]; }
// slingshot: pull vector = where the finger started minus where it is now
function aimVelocity(px, py) {
  const dx = B.aimSX - px, dy = B.aimSY - py, d = Math.hypot(dx, dy);
  const power = clamp(d / 230, 0, 1);
  if (d < 1) return [0, 0, 0];
  const sp = 330 + power * 900;
  return [dx / d * sp, dy / d * sp, power];
}
function canStartAim(x, y) {
  const [bx, by] = ballistaPivot();
  if (y > H - 128 || y < 120) return false;
  return dist(x, y, bx - B.camX, by) < 170 || x < CASTLE_FRONT - B.camX + 30 || y < GROUND - 300;
}
function railTip() {
  const [bx, by] = ballistaPivot(); const a = B.aimAng || -0.12;
  return [bx + Math.cos(a) * 60 + Math.sin(a) * 12, by + Math.sin(a) * 60 - Math.cos(a) * 12];
}
function ammoReady(a) { return B.cds[a] <= 0 && B.zeal >= AMMO[a].cost; }
function fireAmmo(px, py) {
  const [vx, vy, power] = aimVelocity(px, py);
  if (power < 0.12) return;
  const a = B.ammo; if (!ammoReady(a)) { if (B.zeal < AMMO[a].cost) { showBanner('Not enough XÎRET - kill more Mongols', 1.2); Audio2.play('click'); } return; }
  B.zeal -= AMMO[a].cost;
  const [tx, ty] = railTip();
  const type = a === 'spear' ? 'spear' : a === 'fire' ? 'potbig' : 'stone';
  fireProj(type, tx, ty, vx, vy, 1, a === 'spear' ? 200 : 80, null);
  B.cds[a] = AMMO[a].cd; Audio2.play('ballista'); B.shake = Math.max(B.shake, 3);
  B.recoil = 1;
}
function previewPath(px, py) {
  const [vx0, vy0, power] = aimVelocity(px, py);
  if (power < 0.12) return [];
  const info = PROJ_INFO[B.ammo === 'spear' ? 'spear' : B.ammo === 'fire' ? 'potbig' : 'stone'];
  let [x, y] = railTip(); let vx = vx0, vy = vy0; const pts = [];
  for (let i = 0; i < 80; i++) {
    const dt = 1 / 30;
    vy += GRAV * info.g * dt; vx += Sky.wind * info.wind * dt; x += vx * dt; y += vy * dt;
    if (i % 2 === 0) pts.push([x, y]);
    if (y > GROUND + 18) break;
  }
  return pts;
}
// ---------- skills: paid with XÎRET (zeal) earned from kills ----------
function canCast(k) { return B.zeal >= SKILLS[k].cost && B.phase !== 'won' && B.phase !== 'lost'; }
function castSkill(k, wx) {
  if (!canCast(k)) return false;
  B.zeal -= SKILLS[k].cost;
  const later = (fn, ms) => setTimeout(() => { if (state === 'battle' && B.phase !== 'lost') fn(); }, ms);
  if (k === 'storm') {
    Audio2.play('horn', 0.5); showBanner('Arrow Storm!', 1.2);
    for (let i = 0; i < 42; i++) later(() => {
      const sx = castle.pivotX - rand(0, 200), sy = castle.top + rand(30, 120), tx = wx + rand(-150, 150);
      const [vx, vy] = solveBallistic(sx, sy, tx, GROUND, 1000, true);
      fireProj(Math.random() < 0.4 ? 'firearrow' : 'arrow', sx, sy, vx, vy, 1, 22, null);
      if (i % 5 === 0) Audio2.play('bow', 0.5);
    }, i * 35);
  } else if (k === 'horn') {
    B.hornT = 10; B.res = Math.min(B.resMax, B.res + 2);
    Audio2.play('horn', 1); Audio2.play('drum', 0.8); showBanner('For Erbil!', 1.6);
    for (const u of B.units) if (u.side === -1 && u.d.armor === 0 && u.x < castle.gateX + 700) u.stun = Math.max(u.stun, 1.2);
  } else if (k === 'naft') {
    showBanner('Naphtha Rain!', 1.2); Audio2.play('fire', 0.6);
    for (let i = 0; i < 6; i++) later(() => fireProj('firepot', wx + rand(-170, 170), -60, rand(-60, 60), rand(250, 380), 1, 40, null), i * 160);
  } else if (k === 'stones') {
    showBanner('Mountain Stones!', 1.2); Audio2.play('crash', 0.5); B.shake = 6;
    for (let i = 0; i < 5; i++) later(() => fireProj('stone', wx + rand(-200, 200), -80, rand(-80, 80), rand(300, 450), 1, 120, null), i * 260);
  } else if (k === 'prayer') {
    showBanner('Prayer of the Mound', 1.6); Audio2.play('drum', 0.6);
    for (const u of B.units) if (u.side === 1) { u.hp = Math.min(u.max, u.hp + u.max * 0.6); u.burn = 0; for (let n = 0; n < 4; n++) addPart('heal', u.x + rand(-12, 12), u.y - rand(10, u.h), 0, rand(-70, -40), 1.1, 6); }
    B.castleHP = Math.min(B.castleMax, B.castleHP + B.castleMax * 0.12);
  } else if (k === 'riders') {
    showBanner('Riders of the mountains!', 1.6); Audio2.play('horn', 0.9);
    for (let i = 0; i < 3; i++) later(() => { const r = spawnUnit('k_horse', castle.gateX - 40); r.cs = 120; r.charge = true; r.lane = i * 12; r.y = GROUND + r.lane; }, i * 300);
  }
  Audio2.play('click');
  return true;
}
// ---------- Hulagu's skills: charged by KHAN'S WRATH (his kills + damage to the citadel) ----------
// the camp's own archers defend it (like a fortified base)
function updateFeint(dt) {
  if (B.phase !== 'wave' || B.wave < 2 || (B.feintDone || 0) >= B.wave) return;
  const cav = B.units.filter(u => u.side === -1 && u.d.horse && !u.feint);
  if (cav.length < 3) return;
  const kurdFront = Math.max(-1e9, ...B.units.filter(u => u.side === 1).map(u => u.x));
  if (!cav.some(c => c.x - kurdFront < 260)) return;
  B.feintDone = B.wave;
  for (const c of cav) c.feint = rand(2.4, 3.2);
  showBanner('The Mongols flee... or is it a trap?', 2.5); Audio2.play('horn', 0.6);
}
function updateCampDefense(dt) {
  if (B.campHP <= 0) return;
  B.campShotT = (B.campShotT || 0) - dt; if (B.campShotT > 0) return;
  B.campShotT = 0.9;
  const ks = B.units.filter(u => u.side === 1 && CAMP_FRONT - u.x < 650);
  if (!ks.length) return;
  for (let i = 0; i < 2; i++) {
    const tg = pick(ks), sx = CAMP_FRONT + rand(60, 260), sy = GROUND - rand(110, 150);
    const [vx, vy] = solveBallistic(sx, sy, tg.x - (tg.cs || 0) * 0.5, tg.y - 30, 1000, true);
    fireProj('arrow', sx, sy, vx + rand(-30, 30), vy, -1, 12, null);
  }
  Audio2.play('bow', 0.25);
}
function updateEnemySkills(dt) {
  if (B.phase !== 'wave' && B.phase !== 'break') return;
  B.wrathT -= dt; if (B.wrathT > 0) return;
  B.wrathT = DIFF().ai;
  const ks = B.units.filter(u => u.side === 1 && !u.d.siege);
  // pick the most useful power that is affordable
  let k = null;
  if (ks.length >= 4 && B.wrath >= M_SKILLS.stones.cost && Math.random() < 0.5) k = 'stones';
  else if (ks.length >= 3 && B.wrath >= M_SKILLS.volley.cost) k = 'volley';
  else if (B.units.filter(u => u.side === -1).length >= 6 && B.wrath >= M_SKILLS.drums.cost) k = 'drums';
  else if (B.wrath >= M_SKILLS.fire.cost && B.units.some(u => u.side === -1 && u.x < CASTLE_FRONT + 500)) k = 'fire';
  if (!k) return;
  B.wrath -= M_SKILLS[k].cost;
  // aim at the densest group of defenders
  let wx = CASTLE_FRONT + 250, best = -1;
  for (const a of ks) { let n = 0; for (const b of ks) if (Math.abs(a.x - b.x) < 160) n++; if (n > best) { best = n; wx = a.x; } }
  const later = (fn, ms) => setTimeout(() => { if (state === 'battle' && B.phase !== 'won' && B.phase !== 'lost') fn(); }, ms);
  callout(M_SKILLS[k].name.toUpperCase() + '!', Math.min(B.camX + VW * 0.75, WW - 200), GROUND - 260, false);
  if (k === 'volley') {
    Audio2.play('horn', 0.5);
    for (let i = 0; i < 32; i++) later(() => {
      const sx = Math.max(wx + 750, CAMP_FRONT) + rand(0, 200), sy = GROUND - rand(60, 120);
      const [vx, vy] = solveBallistic(sx, sy, wx + rand(-140, 140), GROUND, 1100, true);
      fireProj('arrow', sx, sy, vx, vy, -1, 16, null); if (i % 6 === 0) Audio2.play('bow', 0.4);
    }, i * 40);
  } else if (k === 'drums') {
    B.mDrumT = 10; Audio2.play('drum', 1); Audio2.play('drum', 0.7);
  } else if (k === 'fire') {
    for (let i = 0; i < 14; i++) later(() => {
      const sx = CASTLE_FRONT + rand(500, 900), sy = GROUND - 80, tx = CASTLE_FRONT - rand(60, 380), ty = castle.top + castle.h * rand(0.4, 0.75);
      const [vx, vy] = solveBallistic(sx, sy, tx, ty, 1150, true);
      fireProj('firearrow', sx, sy, vx, vy, -1, 40, null);
    }, i * 70);
    later(() => { for (let i = 0; i < 3; i++) B.fires.push({ x: CASTLE_FRONT - rand(80, 380), y: castle.top + castle.h * 0.52, r: 26, t: 6, max: 6, dps: 0 }); }, 1100);
  } else if (k === 'stones') {
    Audio2.play('ballista', 0.6);
    for (let i = 0; i < 3; i++) later(() => {
      const sx = WW + 100, sy = GROUND - 200, [vx, vy] = solveBallistic(sx, sy, wx + rand(-120, 120), GROUND, 1500, true);
      fireProj('boulder', sx, sy, vx, vy, -1, 90, null);
    }, i * 450);
  }
}
function routUnit(u, dt) {
  // after the battle: the beaten side flees, the winners stand and cheer
  u.atkT = Math.max(0, u.atkT - dt * 2.6); u.air = false; u.y = GROUND + u.lane;
  if (u.rout && !u.d.siege) {
    u.f = 1; u.cs = u.d.speed * 1.4; u.x += u.cs * dt; u.walk += u.cs * dt * stepK(u, u.cs); u.moving = true; u.mvB = 1;
    if (u.x > WW + 80) { const i = B.units.indexOf(u); if (i >= 0) B.units.splice(i, 1); }
  } else { u.cs = 0; u.moving = false; u.mvB = Math.max(0, u.mvB - dt * 5); }
}

// ================= Update & draw =================
function updateBattle(dt) {
  if (B.phase === 'won' || B.phase === 'lost') { Sky.update(dt, B.camX); updateParts(dt); updateFires(dt); for (const r of B.rags) updateRag(r, dt); for (const u of B.units.slice()) routUnit(u, dt); updateCamera(dt); B.shake = Math.max(0, B.shake - dt * 30); B.hitK = Math.max(0, (B.hitK || 0) - dt * 2.5); B.bannerT -= dt; return; }
  B.hitStopCD = Math.max(0, B.hitStopCD - dt);
  if (B.hitStop > 0) { B.hitStop -= dt; updateCamera(dt); return; } // freeze-frame on heavy impacts
  if (B.slowT > 0) { B.slowT -= dt; dt *= 0.3; }
  Audio2.battle = clamp(B.units.length / 30, 0, 1);
  Sky.update(dt, B.camX);
  const rate = B.lastStand ? 1.5 : 1;
  B.res = Math.min(B.resMax, B.res + dt * rate / 2.8);
  for (const k in B.cds) B.cds[k] = Math.max(0, B.cds[k] - dt);
  B.deployCD = Math.max(0, B.deployCD - dt); B.hornT = Math.max(0, B.hornT - dt); B.bannerT -= dt;
  B.shake = Math.max(0, B.shake - dt * 30); B.hitK = Math.max(0, (B.hitK || 0) - dt * 2.5); B.mDrumT = Math.max(0, (B.mDrumT || 0) - dt);
  updateEnemySkills(dt); updateCampDefense(dt); updateFeint(dt); B.recoil = Math.max(0, (B.recoil || 0) - dt * 3);
  updateWaves(dt);
  for (const u of B.units.slice()) if (u.hp > 0) updateUnit(u, dt);
  for (const p of B.projs) {
    if (p.stuck || !p.side) continue;
    for (const u of B.units) if (u.d.block && u.side !== p.side && Math.abs(u.x - p.x) < 280 && Math.sign(u.x - p.x) === Math.sign(p.vx)) u.guardT = Math.max(u.guardT, 0.5);
  }
  for (const p of B.projs) updateProj(p, dt);
  for (let i = B.projs.length - 1; i >= 0; i--) {
    const p = B.projs[i];
    if (p.dead || p.life <= 0 || (p.stuck && p.life <= 0)) {
      for (const r of p.pinned) { r.pin = null; }
      B.projs.splice(i, 1);
    } else if (!p.stuck) p.life -= dt;
  }
  for (let i = B.rags.length - 1; i >= 0; i--) { const r = B.rags[i]; updateRag(r, dt); if (r.life <= 0 && !r.pin) B.rags.splice(i, 1); else if (r.pin && r.life < 3) r.life = 3; }
  updateFires(dt); updateParts(dt);
  for (let i = B.decals.length - 1; i >= 0; i--) if ((B.decals[i].t -= dt) <= 0) B.decals.splice(i, 1);
  updateCamera(dt);
  B.campHit = Math.max(0, (B.campHit || 0) - dt);
  if (B.castleHP <= 0 && B.phase !== 'lost') { B.phase = 'lost'; endBattle(false); }
}

// ---------- camera: drag with momentum, smooth glide, optional follow-the-front ----------
function frontFocus() {
  let mf = 1e9, kf = -1e9;
  for (const u of B.units) { if (u.side === -1 && !u.d.siege) mf = Math.min(mf, u.x); else if (u.side === 1) kf = Math.max(kf, u.x); }
  if (mf === 1e9) for (const u of B.units) if (u.side === -1) mf = Math.min(mf, u.x);
  let focus;
  if (mf < 1e9 && kf > -1e9) focus = (Math.min(mf, kf + 500) + kf) / 2;
  else if (mf < 1e9) focus = Math.max(mf - 150, CASTLE_FRONT + 200);
  else if (kf > -1e9) focus = kf;
  else focus = CASTLE_FRONT;
  return focus - VW * 0.5;
}
function updateCamera(dt) {
  const dragging = typeof panStart !== 'undefined' && panStart;
  if (B.follow && !dragging && !B.aiming) B.camT = frontFocus();
  if (!dragging) { B.camT += B.camV * dt; B.camV *= Math.exp(-3 * dt); if (Math.abs(B.camV) < 4) B.camV = 0; }
  B.camT = clamp(B.camT, 0, Math.max(0, WW - VW));
  B.camX += (B.camT - B.camX) * Math.min(1, dt * (dragging ? 20 : B.follow ? 2.5 : 8));
  B.camX = clamp(B.camX, 0, Math.max(0, WW - VW));
}

function drawGround() {
  const cx = B.camX;
  // far landscape parallax (bg already has transparent sky)
  if (!B.bgCache) {
    const bg = IMG.bg_field, bh = 560, bw = Math.round(bh * bg.width / bg.height);
    const c = document.createElement('canvas'); c.width = bw * 2; c.height = bh;
    const g = c.getContext('2d'); g.drawImage(bg, 0, 0, bw, bh); g.translate(bw * 2, 0); g.scale(-1, 1); g.drawImage(bg, 0, 0, bw, bh);
    B.bgCache = c;
  }
  const c = B.bgCache, py = GROUND - c.height * 0.80;
  const off = -(cx * 0.35) % c.width;
  for (let x = off; x < VW; x += c.width) ctx.drawImage(c, x, py);
  // near ground band
  const g = ctx.createLinearGradient(0, GROUND - 20, 0, H);
  g.addColorStop(0, '#9a7a45'); g.addColorStop(0.25, '#80623a'); g.addColorStop(1, '#4e3a22');
  ctx.fillStyle = g; ctx.fillRect(0, GROUND - 6, VW, H - GROUND + 6);
  // grass tufts swaying with wind (deterministic per world x)
  ctx.strokeStyle = '#6b5a2a'; ctx.lineWidth = 2; ctx.beginPath();
  const t = performance.now() / 1000, sway = Sky.wind * 6;
  const start = Math.floor(cx / 23) * 23;
  for (let wx = start; wx < cx + VW + 23; wx += 23) {
    const h = 7 + ((wx * 7919) % 11), x = wx - cx, y = GROUND - 4 + ((wx * 31) % 9);
    const s = sway + Math.sin(t * 2 + wx * 0.05) * 2;
    ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * 0.5, y - h * 0.6, x + s, y - h);
    ctx.moveTo(x + 4, y); ctx.quadraticCurveTo(x + 4 + s * 0.4, y - h * 0.4, x + 6 + s, y - h * 0.8);
  }
  ctx.stroke();
  if (Sky.isWet()) { ctx.fillStyle = 'rgba(40,50,70,0.18)'; ctx.fillRect(0, GROUND - 6, VW, H - GROUND + 6); }
}

function drawCastle() {
  const x = castle.x0 - B.camX;
  if (x > VW || x + castle.w < 0) return;
  ctx.drawImage(IMG.citadel, x, castle.top, castle.w, castle.h);
  // damage: smoke & fires on the walls when weak
  const hpF = B.castleHP / B.castleMax, t = performance.now() / 1000;
  if (hpF < 0.6 && Math.random() < 0.15) addPart('dust', castle.x0 + castle.w * rand(0.3, 0.9), castle.top + castle.h * rand(0.3, 0.5), 0, -30, 2.5, rand(40, 80));
  if (hpF < 0.35) { const fx = castle.x0 + castle.w * 0.62; B.fires.length < 30 && Math.random() < 0.02 && B.fires.push({ x: fx + rand(-150, 150), y: castle.top + castle.h * 0.52, r: 25, t: 5, max: 5, dps: 0 }); }
  // torches at night
  if (Sky.night() > 0.2 || Sky.cur.storm > 0.5) for (const f of [0.3, 0.5, 0.7, 0.86]) {
    const tx = castle.x0 + castle.w * f, ty = castle.top + castle.h * 0.5;
    B.lightsTmp.push({ x: tx, y: ty, r: 160, i: 0.75 + Math.sin(t * 7 + f * 9) * 0.1 });
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(tx - B.camX, ty - 6 + Math.sin(t * 9 + f) * 1.5, 4, 0, 7); ctx.fill();
  }
  // wall guards (stickmen with spears)
  for (const gd of castle.guards) {
    ctx.save(); ctx.translate(gd.x - B.camX, gd.y);
    const fake = { S: 34, d: UNITS.k_spear, walk: 0, moving: false, atkT: Math.max(0, Math.sin(t * 1.3 + gd.p) - 0.9) * 8, hitT: 0, cdT: 1, id: gd.p * 10 };
    drawFigure(unitPose(fake), UNITS.k_spear.look, 1, 34, 2.6, false); ctx.restore();
  }
  // the flag of Kurdistan over the citadel
  drawKurdFlag(castle.x0 + castle.w * 0.36 - B.camX, castle.top + castle.h * 0.02, 70, 70, t);
  drawKurdFlag(castle.pivotX - 120 - B.camX, castle.pivotY - 120, 54, 110, t + 1.3);
  // general AZ with his great ballista on the tower: static base, rotating top
  const [bx, by] = ballistaPivot();
  let ang = B.aimAng == null ? -0.12 : B.aimAng, power = 0;
  if (B.aiming) { const [vx, vy, pw] = aimVelocity(B.aimX, B.aimY); if (pw > 0.02) { ang = Math.atan2(vy, vx); power = pw; } }
  ang = clamp(ang, -1.25, 0.55); B.aimAng = ang;
  const rx = bx - B.camX, rec = (B.recoil || 0) * 10;
  const K = 0.21, RAIL = -0.178;              // sheet scale; rail tilt in the art
  spr('az_full', rx - 70, by + 64, 100, 0, 1, 0.5, 1);
  part('bl_base', rx, by, K, 0, 0.496, 0.128);
  ctx.save(); ctx.translate(rx - Math.cos(ang) * rec, by - Math.sin(ang) * rec); ctx.rotate(ang);
  const pull = power * 26;
  // loaded ammo sits on the rail and slides back as you pull
  if (ammoReady(B.ammo)) {
    if (B.ammo === 'spear') spr('bl_bolt', 12 - pull, -12, 100, 0, 1, 0.5, 0.5, 1, true);
    else spr(B.ammo === 'fire' ? 'fx_pot_fire' : 'fx_boulder', 26 - pull, -22, 26);
  }
  part('bl_top', 0, 0, K, -RAIL, 0.557, 0.608);
  if (power > 0.02) { // extra taut string drawn back toward the winch
    ctx.strokeStyle = 'rgba(225,205,160,0.95)'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(44, -40); ctx.lineTo(-10 - pull, -12); ctx.lineTo(42, 22); ctx.stroke();
  }
  ctx.restore();
  // aim ring hint
  if (!B.aiming && (B.phase === 'wave' || B.phase === 'break')) {
    ctx.strokeStyle = `rgba(255,220,120,${0.35 + Math.sin(t * 4) * 0.15})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(bx - B.camX, by, 48, 0, 7); ctx.stroke();
  }
}

function drawCamp() {
  const im = IMG.camp, w = 760, h = w * im.height / im.width, x = WW - w + 80 - B.camX;
  if (x > VW) return;
  const f = B.campHP / B.campMax;
  if (f <= 0) { ctx.filter = 'brightness(0.35) sepia(0.6)'; }
  else if (f < 0.5) ctx.filter = `brightness(${0.65 + f * 0.7})`;
  ctx.drawImage(im, x, GROUND + 14 - h, w, h);
  ctx.filter = 'none';
  // palisade line at the camp front
  if (f > 0) { // sharpened stakes at the camp front
    ctx.fillStyle = '#5a3a1c'; ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) { const px = CAMP_FRONT - B.camX + i * 12, hh = 62 + (i % 3) * 9, by = GROUND + 18 + (i % 2) * 6;
      ctx.beginPath(); ctx.moveTo(px - 5, by); ctx.lineTo(px - 5, by - hh); ctx.lineTo(px, by - hh - 12); ctx.lineTo(px + 5, by - hh); ctx.lineTo(px + 5, by); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }
  if (f < 0.6 && f > 0 && Math.random() < 0.12) addPart('dust', rand(CAMP_FRONT + 60, WW - 60), GROUND - rand(60, 140), 0, -30, 2.5, rand(50, 90));
}

function drawMinimap() {
  const w = Math.min(640, VW * 0.4), x0 = VW / 2 - w / 2, y0 = 92, h = 20, sx = w / WW;
  B.mini = { x: x0, y: y0 - 6, w, h: h + 12 };
  ctx.fillStyle = 'rgba(25,15,8,0.75)'; ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = '#c8a46a'; ctx.fillRect(x0, y0, CASTLE_FRONT * sx, h);            // citadel
  ctx.fillStyle = '#7a3a2a'; ctx.fillRect(x0 + CAMP_FRONT * sx, y0, (WW - CAMP_FRONT) * sx, h * Math.max(0.15, B.campHP / B.campMax));   // mongol camp (shrinks with its HP)
  for (const u of B.units) {
    ctx.fillStyle = u.side === 1 ? '#7fe06a' : u.d.boss ? '#ffd23a' : '#ff5a40';
    const r = u.d.siege || u.d.boss ? 4 : 2.2;
    ctx.fillRect(x0 + u.x * sx - r, y0 + h / 2 - r + (u.side === 1 ? -4 : 4), r * 2, r * 2);
  }
  ctx.strokeStyle = '#fff3d0'; ctx.lineWidth = 2; ctx.strokeRect(x0 + B.camX * sx, y0 - 2, VW * sx, h + 4);
}

function drawBattle() {
  B.lightsTmp = [];
  const sh = B.shake;
  ctx.save();
  if (sh > 0) { const a = Math.min(sh, sh * sh / 9); ctx.translate(rand(-a, a), rand(-a, a) * 0.6); }
  Sky.drawBack(B.camX);
  drawGround();
  drawCamp();
  drawCastle();
  // ground decals
  for (let i = B.decals.length - 1; i >= 0; i--) {
    const dc = B.decals[i], x = dc.x - B.camX; if (x < -120 || x > VW + 120) continue;
    const a = Math.min(1, dc.t / 10);
    ctx.fillStyle = dc.kind === 'blood' ? `rgba(90,8,6,${0.55 * a})` : dc.kind === 'scorch' ? `rgba(20,12,6,${0.5 * a})` : `rgba(60,40,22,${0.55 * a})`;
    ctx.beginPath(); ctx.ellipse(x, dc.y, dc.r, dc.r * 0.22, 0, 0, 7); ctx.fill();
  }
  // stuck projectiles behind units
  for (const p of B.projs) if (p.stuck && !p.host) drawProj(p);
  for (const r of B.rags) drawRag(r);
  const order = B.units.slice().sort((a, b) => a.y - b.y);
  for (const u of order) drawUnit(u);
  for (const p of B.projs) if (!p.stuck || p.host) drawProj(p);
  drawFires();
  drawParts();
  drawCampHP();
  // aim trajectory
  if (B.aiming) {
    const pts = previewPath(B.aimX, B.aimY);
    ctx.fillStyle = ammoReady(B.ammo) ? 'rgba(255,240,190,0.9)' : 'rgba(200,200,200,0.45)';
    pts.forEach(([x, y], i) => { ctx.beginPath(); ctx.arc(x - B.camX, y, Math.max(1.5, 5 - i * 0.08), 0, 7); ctx.fill(); });
    // pull band from touch start to finger, plus power ring
    const [, , pw] = aimVelocity(B.aimX, B.aimY);
    ctx.strokeStyle = 'rgba(255,230,160,0.55)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(B.aimSX, B.aimSY); ctx.lineTo(B.aimX, B.aimY); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,230,160,0.8)'; ctx.beginPath(); ctx.arc(B.aimSX, B.aimSY, 7, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgb(255,${(220 - pw * 160) | 0},60)`; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(B.aimX, B.aimY, 22, -Math.PI / 2, -Math.PI / 2 + pw * Math.PI * 2); ctx.stroke();
  }
  Sky.lights = B.lightsTmp;
  Sky.drawFront(B.camX);
  ctx.restore();
}
