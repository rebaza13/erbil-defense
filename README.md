# Qelay Hewlêr: Defenders of the Erbil Citadel (Beta 0.1)

A 2D side-view castle-defense game. The Erbil Citadel stands on the left, and Hulagu's Mongol army attacks wave after wave from the right.
Every character is a stickman built from separately generated parts: helmets, torsos, weapons, shields, horse limbs and boss armor.
All art came from Google Flow (Nano Banana 2.1) at 1K original quality.

**APK:** `android/app/build/outputs/apk/debug/app-debug.apk` (debug-signed; install with "allow unknown apps")

---

## The story (short)

> **Erbil, 1258.** The citadel has stood on its mound for thousands of years. Assyrians, Persians and Atabegs all ruled from its walls.
>
> In February, Hulagu, grandson of Genghis Khan, sacked Baghdad and ended the Abbasid Caliphate. Mosul's ruler, Badr al-Din Lu'lu', had already bowed to the Mongols.
> Erbil's lower town gave way, but the Kurdish garrison withdrew into the citadel and refused to surrender.
>
> They were few. The Mongols were many, and they had engineers, rams, trebuchets and patience. On the tallest tower stands the garrison captain, called **AZ** by his men,
> beside a great ballista and a rack of iron spears. Through dust storms, autumn rain, night raids and thunder, AZ holds the gate,
> until **Noyan Kara-Tümen** rides out at the head of the final assault, with a siege tower behind him.
>
> History records that the citadel held out for about six months before it passed into Mongol hands in 1259.
> The songs remember the summer the mound would not kneel.

**History vs. fiction:**
- **Real:** the Mongols raided Erbil's lower town earlier, in 1237, and withdrew when a caliphal army approached. After Baghdad fell in 1258 they returned and took the citadel after a siege of about six months. Hulagu then appointed a Christian governor. Badr al-Din Lu'lu' of Mosul was a Mongol vassal who supplied Hulagu's army, and he died in 1259.
- **Fiction:** Captain AZ, Noyan Kara-Tümen, the mission events and the battle details. The garrison's courage is the true part.

Sources: [Citadel of Erbil (Wikipedia)](https://en.wikipedia.org/wiki/Citadel_of_Erbil), [Badr al-Din Lu'lu' (Wikipedia)](https://en.wikipedia.org/wiki/Badr_al-Din_Lu%27lu%27), [Kings and Generals: Hulagu and the sack of Baghdad](https://kingsandgenerals.libsyn.com/229-history-of-the-mongols-hulagu-and-the-sack-of-baghdad)

---

## How to play
- **Before each battle** choose up to **6 troop types** and **2 skills** on the *Prepare the Garrison* screen. Your choice is remembered.
- **Two bases:** your Citadel (left) and **Hulagu's Mongol camp** (right) both have HP. Burn the camp to win at once, or survive every wave. The camp has its own archers, and at half HP it sounds the alarm and sends out extra defenders.
- **Berxwedan** (deploy resource) refills over time: 1x normally, **1.5x during the LAST STAND**.
- **XÎRET** (zeal) is earned **only by killing**. It pays for AZ's ballista shots (Spear 6, Pot 14, Stone 20) and your 2 skills. You start each battle with 30.
- **Skills:** Arrow Storm, Rally Horn, Naphtha Rain, Mountain Stones, Prayer of the Mound, Mountain Riders.
- **The enemy plays by the same rule:** **KHAN'S WRATH** fills when Mongols kill your troops or damage the citadel. The AI spends it on a Mongol Volley, War Drums, Fire Arrows on the Walls or a Mangonel Barrage, aimed at your thickest group.
- **AZ's ballista:** touch the sky or the citadel, **pull back** like a slingshot, and release.
- **Camera:** drag the ground and flick to glide with momentum. You can also drag or tap the minimap, use the mouse wheel or arrow keys, or press **◀ Citadel / Camp ▶**. *Auto camera* follows the front line until you drag.
- **Archery:** archers shoot about 780 px in high arcs, lead moving targets, and get less accurate with distance. Arrows leave a visible streak.

## Animation
- **Soldiers:** feet are planted in a real gait. The stance foot is locked to the ground while the body passes over it, the swing foot arcs forward, knees bend forward and arms swing against the legs. Walk speed and step rate are tied together, so there is no sliding or moonwalking. Units also accelerate and brake smoothly.
- **Horses:** the body, head and tail use the Flow art, and the legs are procedural. They walk, trot (diagonal pairs) or gallop (rotary footfall) depending on speed, with hooves locked to the ground. Riders sit astride.

## Shaders (WebGL post-processing)
- Bloom, heat haze over fires, shockwave ripples from stones and explosions, chromatic split on heavy hits.
- Sun glow with rays, weather and time-of-day colour grading, lightning flash, vignette and film grain.
- Toggle with *Effects* on the title screen. Phones without WebGL fall back to plain 2D automatically.


## Latest additions
- **Kurdish (Sorani / کوردی):** a language button on the title screen translates the whole game into right-to-left Kurdish text with Kurdish digits.
- **Kurdistan flag:** waves over the citadel and AZ's tower, appears on the title screen and HUD, and is carried by the Banner Drummer.
- **Army orders:** Defend, Hold and Attack, plus **» Rush!** (15 XÎRET), which sends all infantry sprinting.
- **Sprinters:** spearmen, swordsmen and axe brutes sprint into battle on their own, as do Mongol raiders, levies and spearmen. They use a real running gait and hit harder on arrival.
- **Counters:** spears deal x1.8 to cavalry, cavalry x1.6 to archers, axes x1.45 to shields and armour.
- **Combat feel:**
  - Missiles barely push anyone now; crossbows no longer launch men.
  - Heavy blows freeze the frame for an instant (hit-stop), a solid hit interrupts a wind-up, and blades bounce off raised shields.
  - Bodies flash on impact, swords leave swoosh arcs, and blood pools and scorch marks stay on the ground.
- **Mongol feigned retreat:** from wave 2, Mongol cavalry may flee while shooting back (the Parthian shot), then wheel around and charge your pursuers. Ordering *Defend* stops your men from chasing.
- **Music:** an original generative Kurdish-style score, built from a modelled tembûr pluck, daf drum and drone. It uses maqam Kurd in the menus and Hijaz in battle, and speeds up in the last stand. Toggle it with *Music* on the title screen.
- **Wind:** no longer uses a 2-second loop, which caused the pulsing glitch; it plays as a long, seamless bed with slow gusts.

## Rosters (10 vs 10)
| Erbil defenders | Cost | Special |
|---|---|---|
| Militia Spearman | 2 | long reach |
| Shield Swordsman | 3 | blocks 40% of frontal missiles |
| Archer | 3 | arcing arrows |
| Crossbowman | 4 | armor-piercing bolts with knockback |
| Javelineer | 3 | skewers light troops and carries them |
| Mailed Guard | 5 | pavise blocks 75%; heavy, hard to push |
| Axe Brute | 4 | cleave + launches light troops |
| Kurdish Rider | 5 | fast; charge hit x3 + bowls men over |
| Naphtha Thrower | 5 | fire pots, burning, weather-dependent |
| Banner Drummer | 4 | aura: +30% damage, +20% speed |

| Hulagu's army | Special |
|---|---|
| Levy Conscript | weak swarm |
| Steppe Spearman | basic infantry |
| Horse Archer | fast, kites away from melee |
| Heavy Lancer | armored charge, big knockback |
| Shield Bearer | wicker shield blocks 75% of missiles |
| Sabre Raider | fast melee |
| Battering Ram | rams the gate; crew pushes defenders away |
| Trebuchet | stops at long range, hurls boulders at the wall and your troops |
| Ballista | bolts pierce 3 defenders and pin them |
| Siege Tower | docks at the wall, damages it continuously and unloads raiders |
| **Boss: Noyan Kara-Tümen** | cutout-rigged armored general from separate Flow parts |

## Sound
No musical beeps. Everything is synthesized from shaped noise: arrow whooshes, wood and iron impacts, a ballista thunk, rain, wind, thunder, a low battlefield murmur, and a distant war horn.

## Living sky
Real-time day/night cycle (the sun rises in the east, behind the Mongol camp), a moon with stars, and drifting volumetric clouds.
Weather states are clear, cloudy, rain (streaks, splashes, ground mist, steam from fires), storm (lightning bolts, flashes, delayed thunder, strong wind) and dust storm (haze, flying grit).
Wind affects every projectile, the rain angle, grass, banners and smoke. At night, torches, fires and explosions cut light into the darkness.
Missions 6 and 7 change weather dynamically.

## Missions
1. The Lower Town Burns (dawn) · 2. Dust from the East (dust storm) · 3. Rain on the Ramparts (rain, rams) · 4. Night of the Fire Pots (night) ·
5. The Storm Siege (storm, trebuchets) · 6. The Noyan's Assault (10 waves, 2 bosses, siege tower) · ∞ Endless Siege

## Project layout
- `www/`: the game (plain JavaScript + Canvas 2D, plus a WebGL post-processing pass in `js/fx.js`). `js/data.js` holds units, missions and story; `core.js` holds engine, input and synthesized audio; `sky.js` holds weather; `battle.js` holds units, ragdolls, projectiles, siege and waves; `ui.js` holds screens and HUD.
- `assets_src/flow_raw/`: the 18 original Google Flow images (1K).
- `assets_src/sliced/`: every sheet cut into separate transparent parts (`<sheet>/NN.png`), plus labeled `_preview_*.jpg` sheets.
- `www/assets/`: 138 named, game-ready WebP parts.
- `tools/slice_assets.py`, `tools/pack_assets.py`, `tools/make_icons.py`: the asset pipeline.

## Rebuild
```powershell
# after editing www/
npx cap sync android
$env:JAVA_HOME="$env:USERPROFILE\.jdks\jdk-21.0.13+9"   # Android Studio's bundled JDK 25 is too new for Gradle 8.11
cd android; .\gradlew.bat assembleDebug
```
Test in a browser: `python -m http.server 8765 --directory www`, then open http://127.0.0.1:8765
"# erbil-defense" 
