"""Copy chosen sliced parts into www/assets with game names, resized for mobile.
Usage: python -I pack_assets.py <sliced_dir> <www_assets_dir>
Writes manifest.js (window.ASSET_LIST) listing every packed image + size."""
import sys, os, json
from PIL import Image

SRC, DST = sys.argv[1], sys.argv[2]
os.makedirs(DST, exist_ok=True)

NAMES = {
    "kurdish_headgear": ["k_helm_mail", "k_helm_turban", "k_helm_gilded", "k_headwrap", "k_felt_cap",
                          "k_helm_nasal", "k_kettle_hat", "k_hood", "k_head_base"],
    "kurdish_weapons": ["k_shield_round", "k_shield_kite", "k_pavise", "k_sword", "k_sabre", "k_spear",
                         "k_javelin", "k_bow", "k_crossbow", "k_mace", "k_axe", "k_sling"],
    "mongol_headgear": ["m_helm_tassel", "m_fur_hat", "m_leather_cap", "m_mask_helm", "m_general_helm",
                         "m_felt_hat", "m_lamellar_hood", "m_shaman_hat", "m_head_braids"],
    "mongol_weapons": ["m_shield_wicker", "m_shield_leather", "m_lance", "m_sabre", "m_quiver", "m_mace",
                        "m_bow", "m_axe", "m_lasso", "m_tug_banner", "m_flag", "m_drum"],
    "siege_engines": ["s_mangonel", "s_treb_arm", "s_trebuchet", "s_ballista", "s_bolt", "s_tower",
                       "s_ram_shed", "s_ram_log", "s_ladder"],
    "fx_projectiles": ["fx_big_bolt", "fx_arrow", "fx_fire_arrow", "fx_javelin", "fx_stone", "fx_boulder",
                        "fx_pot", "fx_pot_fire", "fx_splinters", "fx_rubble", "fx_dust", "fx_steam",
                        "fx_explosion", "fx_spark", "fx_raindrop", "fx_cloud"],
    "horse_parts": ["h_torso", "h_head", "h_full", "h_tail", "h_leg_front_up", "h_leg_back_up",
                     "h_leg_front_low", "h_leg_back_low"],
    "general_sheet_A": ["az_cape", "az_head", "az_crossbow", "az_arms_l", "az_torso_arms", "az_full",
                         "az_spear", "az_banner", "az_legs", "az_boot"],
    "general_sheet_B": ["boss_head", "boss_banner", "boss_torso", "boss_arm", "boss_upperarm", "boss_full",
                         "boss_forearm", "boss_glaive", "boss_thigh", "boss_cape", "boss_skirt_legs", "boss_shin"],
    "portraits_kurdish": [f"pk_{i}" for i in range(10)],
    "portraits_mongol": [f"pm_{i}" for i in range(10)],
    "kurdish_torsos": ["kt_linen", "kt_gambeson", "kt_mail", "kt_lamellar", "kt_archer", "kt_heavy",
                        "kt_vest", "kt_cloak"],
    "ballista_parts": ["bl_top", "bl_base", "bl_full", "bl_bolt"],
    "flame_frames": ["_x0", "fl_0", "fl_1", "fl_2", "fl_3", "_x1", "fl_4", "fl_5", "fl_6", "fl_7"],
    "mongol_torsos": ["mt_deel_blue", "mt_deel_fur", "mt_leather_lam", "mt_iron_lam", "mt_ragged",
                       "mt_silk", "mt_lancer", "mt_archer"],
}
MAXDIM = {"portraits_kurdish": 160, "portraits_mongol": 160, "siege_engines": 420, "horse_parts": 300,
          "general_sheet_A": 360, "general_sheet_B": 360, "fx_projectiles": 160, "ballista_parts": 300, "flame_frames": 120}
DEFAULT_MAX = 220

manifest = {}


def save(img, name, maxdim):
    w, h = img.size
    ow, oh = w, h
    s = min(1.0, maxdim / max(w, h))
    if s < 1:
        img = img.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    fn = name + ".webp"
    img.save(os.path.join(DST, fn), "WEBP", quality=88, method=6)
    manifest[name] = {"f": fn, "w": img.size[0], "h": img.size[1], "ow": ow, "oh": oh}


for sheet, names in NAMES.items():
    for i, n in enumerate(names):
        if n.startswith("_"):
            continue
        p = os.path.join(SRC, sheet, f"{i:02d}.png")
        if os.path.exists(p):
            save(Image.open(p).convert("RGBA"), n, MAXDIM.get(sheet, DEFAULT_MAX))
        else:
            print("missing", sheet, i)

save(Image.open(os.path.join(SRC, "erbil_citadel.png")), "citadel", 1292)
save(Image.open(os.path.join(SRC, "mongol_camp.png")), "camp", 1100)
save(Image.open(os.path.join(SRC, "battlefield_bg.png")), "bg_field", 1344)
for n in ["menu_art", "map_parchment"]:
    im = Image.open(os.path.join(SRC, n + ".jpg")).convert("RGB")
    im.save(os.path.join(DST, n + ".jpg"), quality=86)
    manifest[n] = {"f": n + ".jpg", "w": im.size[0], "h": im.size[1]}

with open(os.path.join(DST, "manifest.js"), "w") as f:
    f.write("window.ASSET_LIST=" + json.dumps(manifest) + ";\n")
total = sum(os.path.getsize(os.path.join(DST, v["f"])) for v in manifest.values())
print(len(manifest), "assets,", round(total / 1024), "KB")
