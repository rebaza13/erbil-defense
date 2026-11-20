// ===== Language: English / کوردی (Sorani, ckb) =====
// Every string drawn with text()/wrapText() passes through tr(). Fixed strings use DICT,
// strings with numbers use PATTERNS. Digits become Kurdish/Arabic-Indic numerals.
const LANG = { cur: 'en' };
const CKB = {
  // title & menus
  'QELAY HEWLÊR': 'قەڵای هەولێر',
  'Defenders of the Erbil Citadel  ·  1258': 'پارێزەرانی قەڵای هەولێر  ·  1258',
  'Campaign': 'هەڵمەت', 'The Story': 'چیرۆک', 'Armies': 'سوپاکان',
  'Music: On': 'مۆسیقا: هەیە', 'Music: Off': 'مۆسیقا: نییە', 'Sound: On': 'دەنگ: هەیە', 'Sound: Off': 'دەنگ: نییە', 'Effects: On': 'ئێفێکت: هەیە', 'Effects: Off': 'ئێفێکت: نییە',
  'Language: English': 'زمان: English', 'Beta 0.1 · art generated with Google Flow': 'بێتا 0.1 · وێنەکان بە Google Flow دروستکراون',
  'The Siege of Erbil': 'گەمارۆی هەولێر', '◀ Back': '◀ گەڕانەوە', '◀ Map': '◀ نەخشە', 'Map': 'نەخشە', 'Prepare ▶': 'ئامادەکاری ▶',
  'Prepare the Garrison': 'سوپاکەت ئامادە بکە', 'To Battle!': 'بۆ شەڕ!', 'Pick troops': 'سەرباز هەڵبژێرە',
  'Easy': 'ئاسان', 'Medium': 'مامناوەند', 'Hard': 'قورس',
  'Paused': 'وەستاوە', 'Resume': 'بەردەوامبوون', 'Restart': 'دەستپێکردنەوە', 'Retreat to Map': 'کشانەوە بۆ نەخشە', 'Change army': 'گۆڕینی سوپا',
  'The Citadel Stands!': 'قەڵا هێشتا ماوە!', 'The Gate Has Fallen': 'دەروازە کەوت', 'Continue': 'بەردەوامبە', 'Try Again': 'دووبارە هەوڵبدەوە',
  'Defenders of Erbil': 'بەرگریکارانی هەولێر', 'The Army of Hulagu': 'سوپای هۆلاکۆ', 'Mongols ▶': 'مەغۆل ▶', '◀ Kurds': '◀ کورد',
  'Endless waves': 'شەپۆلی بێکۆتا', 'Defend!': 'بەرگری!',
  // HUD
  '◉ Auto camera': '◉ کامێرای خۆکار', '○ Auto camera': '○ کامێرای خۆکار', '◀ Citadel': '◀ قەڵا', 'Camp ▶': 'ئۆردوگا ▶',
  '⛨ Defend': '⛨ بەرگری', '» Rush! 15': '» ڕاکردن! 15', 'RUSH!': 'ڕاکردن!', '■ Hold': '■ بوەستە', '⚔ Attack': '⚔ هێرش', 'II': 'II',
  'HULAGU’S CAMP': 'ئۆردوگای هۆلاکۆ', 'NOYAN': 'نۆیان', 'Mongol war drums: +25%': 'دەهۆڵی جەنگی مەغۆل: +25%',
  'Touch the sky or the citadel and PULL BACK like a slingshot to fire  ·  tap cards to send troops  ·  drag the open field to look around':
    'ئاسمان یان قەڵا بگرە و وەک قۆچەقانی بۆ دواوە ڕایبکێشە بۆ تەقاندن  ·  کارتەکان دابگرە بۆ ناردنی سەرباز  ·  مەیدان ڕابکێشە بۆ سەیرکردن',
  'Tap troops to choose up to 6 for the battle, and 2 skills. Skills are not on a timer: kill Mongols to fill XÎRET, then unleash them.':
    'تا 6 جۆر سەرباز و 2 توانا هەڵبژێرە. تواناکان کاتیان نییە: مەغۆل بکوژە بۆ پڕکردنی غیرەت، ئینجا بەکاریان بهێنە.',
  // banners & callouts
  'Wave cleared': 'شەپۆلەکە پاککرایەوە', 'For Erbil!': 'بۆ هەولێر!', 'Advance!': 'پێشڕەوی!', 'Fall back to the gate!': 'بگەڕێنەوە بۆ دەروازە!', 'Hold the line!': 'هێڵەکە ڕابگرن!',
  'The Mongols flee... or is it a trap?': 'مەغۆلەکان هەڵدێن... یان داوە؟', 'The camp sounds the alarm!': 'ئۆردوگا زەنگی مەترسی لێدەدات!',
  'The Mongol camp is burning!': 'ئۆردوگای مەغۆل دەسووتێت!', 'The Noyan has fallen!': 'نۆیان کوژرا!', 'Noyan Kara-Tümen enters the field!': 'نۆیان قەرە-تومەن دێتە مەیدان!',
  'Siege tower at the walls!': 'بورجی گەمارۆ گەیشتە شوورە!', 'The field is full': 'مەیدان پڕە', 'Not enough XÎRET - kill more Mongols': 'غیرەت بەش ناکات - مەغۆلی زیاتر بکوژە',
  'Arrow Storm!': 'زریانی تیر!', 'Naphtha Rain!': 'بارانی نەوت!', 'Mountain Stones!': 'بەردی چیا!', 'Prayer of the Mound': 'دوعای گردەکە', 'Riders of the mountains!': 'سوارانی چیا!',
  'CHARGE!': 'هێرش!', 'MONGOL VOLLEY!': 'تیربارانی مەغۆل!', 'WAR DRUMS!': 'دەهۆڵی جەنگ!', 'FIRE ARROWS ON THE WALLS!': 'تیری ئاگرین بۆ شوورە!', 'MANGONEL BARRAGE!': 'بارانی مەنجەنیق!',
  // units
  'Militia Spearman': 'ڕمبەدەست', 'Shield Swordsman': 'شمشێرزەن', 'Archer': 'تیرهاوێژ', 'Crossbowman': 'کەوانەدار', 'Javelineer': 'نیزەهاوێژ',
  'Mailed Guard': 'پاسەوانی زرێپۆش', 'Axe Brute': 'تەورزەن', 'Kurdish Rider': 'سواری کورد', 'Naphtha Thrower': 'نەوتهاوێژ', 'Banner Drummer': 'دەهۆڵژەن',
  'Levy Conscript': 'سەربازی زۆرەملێ', 'Steppe Spearman': 'ڕمبەدەستی دەشت', 'Horse Archer': 'سوارە تیرهاوێژ', 'Heavy Lancer': 'سوارەی قورس', 'Shield Bearer': 'قەڵغاندار',
  'Sabre Raider': 'تاڵانچی شمشێرزەن', 'Battering Ram': 'دارکوت', 'Trebuchet': 'مەنجەنیق', 'Ballista': 'بالیستا', 'Siege Tower': 'بورجی گەمارۆ', 'Noyan Kara-Tümen': 'نۆیان قەرە-تومەن',
  'Great Spear': 'ڕمی گەورە', 'Naphtha Pot': 'گۆزەی نەوت', 'Citadel Stone': 'بەردی قەڵا',
  'Arrow Storm': 'زریانی تیر', 'Rally Horn': 'شەیپووری کۆبوونەوە', 'Naphtha Rain': 'بارانی نەوت', 'Mountain Stones': 'بەردی چیا', 'Mountain Riders': 'سوارانی چیا',
  // unit & skill descriptions
  'Cheap townsfolk with long spears. Reach beats short blades.': 'خەڵکی شار بە ڕمی درێژ. ڕم لە شمشێری کورت باشترە.',
  'Round sun-shield blocks 40% of arrows from the front.': 'قەڵغانی خڕ ٤٠٪ی تیرەکان لە پێشەوە دەگرێتەوە.',
  'Long-range archer: high arcing volleys that lead moving targets. Weak up close.': 'تیرهاوێژی دووربڕ: تیری کەوانەیی بەرز، پێشبینی جووڵە دەکات. لە نزیکەوە لاوازە.',
  'Slow, flat, armor-piercing bolts that knock men back.': 'تیری قورس و ڕاست کە زرێ کون دەکات.',
  'Javelins skewer light troops and carry them off their feet.': 'نیزە سەربازی سووک لە شیش دەدات و هەڵیاندەگرێت.',
  'A walking wall. Pavise stops most missiles; hard to push back.': 'شوورەیەکی ڕۆیشتوو. قەڵغانی گەورە زۆربەی تیرەکان ڕادەگرێت.',
  'Cleaves everyone in reach and sends light troops flying.': 'هەموو کەسێکی نزیک دەبڕێت و سەربازی سووک هەڵدەدات.',
  'Fast. The first lance strike of a charge hits triple and bowls men over.': 'خێرا. یەکەم لێدانی هێرش سێ هێندە بەهێزە و پیاوان دەخات.',
  'Clay pots of burning naphtha. Fire spreads in dry weather, steams out in rain.': 'گۆزەی نەوتی سووتاو. لە وشکیدا ئاگر بڵاودەبێتەوە، لە باراندا دەکوژێتەوە.',
  'Stays behind the line. Nearby defenders +30% damage, +20% speed.': 'لە دواوە دەمێنێت. بەرگریکارانی نزیک +٣٠٪ هێز و +٢٠٪ خێرایی.',
  'Forty arrows, some burning, rain on the spot you tap.': 'چل تیر، هەندێکیان ئاگرین، دەبارێنە سەر ئەو شوێنەی دەستی لێدەدەیت.',
  'Defenders +30% damage and speed for 10s; light enemies near the gate flinch. +2 Berxwedan.': 'بەرگریکاران +٣٠٪ هێز و خێرایی بۆ ١٠ چرکە؛ دوژمنی سووک دەترسێت. +٢ بەرخودان.',
  'Six burning pots fall on the spot you tap. Weak in rain.': 'شەش گۆزەی ئاگرین دەکەونە سەر ئەو شوێنە. لە باراندا لاوازە.',
  'Boulders crash down from the citadel heights: huge knockback, wrecks siege engines.': 'تاوێر لە بەرزایی قەڵاوە دەکەوێت: پاڵنانی گەورە، ئامێری گەمارۆ تێکدەشکێنێت.',
  'Heals every defender by 60% and repairs the citadel.': 'هەموو بەرگریکاران ٦٠٪ چاک دەکاتەوە و قەڵا نۆژەن دەکاتەوە.',
  'Three free Kurdish riders thunder out of the gate at full charge.': 'سێ سواری کورد بەخۆڕایی بە هێرشی تەواو لە دەروازە دەردەچن.',
  'STRONG vs cavalry (x1.8). Sprints into battle.': 'بەهێز دژی سوارە (×1.8). بە ڕاکردن دەچێتە شەڕ.', 'Holds the line; shield raised against blows.': 'هێڵەکە ڕادەگرێت؛ قەڵغان بەرز دەکاتەوە.',
  'STRONG vs shields & heavy armour (x1.45). Sprints into battle.': 'بەهێز دژی قەڵغان و زرێی قورس (×1.45). بە ڕاکردن دەچێتە شەڕ.', 'STRONG vs archers (x1.6); devastating charge. WEAK vs spearmen.': 'بەهێز دژی تیرهاوێژ (×1.6)؛ هێرشی وێرانکەر. لاواز دژی ڕمبەدەست.',
  'STRONG vs light infantry. WEAK vs cavalry.': 'بەهێز دژی پیادەی سووک. لاواز دژی سوارە.', 'Pierces armour.': 'زرێ کون دەکات.', 'All-rounder with a shield. Sprints into battle.': 'هەمەلایەنە بە قەڵغانەوە. بە ڕاکردن دەچێتە شەڕ.',
  'Skewers light troops.': 'سەربازی سووک لە شیش دەدات.', 'Area fire.': 'ئاگری ناوچەیی.', 'Buffs nearby allies.': 'هاوڕێیانی نزیک بەهێز دەکات.',
  // missions
  'The Lower Town Burns': 'شاری خوارەوە دەسووتێت', 'Dust from the East': 'تۆز لە ڕۆژهەڵاتەوە', 'Rain on the Ramparts': 'باران لەسەر شوورەکان',
  'Night of the Fire Pots': 'شەوی گۆزە ئاگرینەکان', 'The Storm Siege': 'گەمارۆی زریان', 'The Noyan\'s Assault': 'هێرشی نۆیان', 'Endless Siege': 'گەمارۆی بێکۆتا',
  'Spring 1258. Smoke rises from the lower town. Hulagu\'s outriders test the gate of the citadel. Hold them at the foot of the mound.':
    'بەهاری 1258. دووکەڵ لە شاری خوارەوە بەرز دەبێتەوە. پێشەنگەکانی هۆلاکۆ دەروازەی قەڵا تاقی دەکەنەوە. لە بنی گردەکە ڕایانبگرە.',
  'A brown wall of dust rolls off the plain. Inside it ride the horse archers. The wind will bend your spears - aim into it.':
    'دیوارێکی قاوەیی لە تۆز لە دەشتەوە دێت. سوارە تیرهاوێژەکان لەناویدان. با ڕمەکانت لادەدات - بەرەو ڕووی با نیشانە بگرە.',
  'Autumn rains. The Mongols wheel a ram up the road under wet hides. Fire steams and dies in this weather; trust iron.':
    'بارانی پاییز. مەغۆلەکان دارکوتێک بە پێستی تەڕەوە بەرەو ژوور دەهێنن. ئاگر لەم کەشەدا دەکوژێتەوە؛ پشت بە ئاسن ببەستە.',
  'They come in the dark to spare themselves our arrows. Light the night with naphtha.':
    'لە تاریکیدا دێن بۆ ئەوەی لە تیرەکانمان ڕزگاریان بێت. شەو بە نەوت ڕووناک بکەرەوە.',
  'Engineers from the south have built them trebuchets. Thunder and stone together. Break the engines before they break the wall.':
    'ئەندازیارانی باشوور مەنجەنیقیان بۆ دروستکردوون. هەورەتریشقە و بەرد پێکەوە. ئامێرەکان بشکێنە پێش ئەوەی شوورە بشکێنن.',
  'Summer 1259. The siege tower is finished. Noyan Kara-Tümen leads the last assault himself. Every man of Erbil to the walls.':
    'هاوینی 1259. بورجی گەمارۆ تەواو بوو. نۆیان قەرە-تومەن خۆی دوا هێرش سەرکردایەتی دەکات. هەموو پیاوێکی هەولێر بۆ سەر شوورە.',
  'How long can the citadel stand? Waves never stop, weather never rests.': 'قەڵا تا کەی بەرگە دەگرێت؟ شەپۆلەکان ناوەستن، کەش ئارام نابێت.',
  // story
  'Erbil, 1258.\nThe citadel has stood on its mound for six thousand years. Assyrians, Persians and Atabegs ruled from its walls.':
    'هەولێر، 1258.\nقەڵاکە شەش هەزار ساڵە لەسەر گردەکەی وەستاوە. ئاشووری و فارس و ئەتابەگەکان لە شوورەکانیەوە فەرمانڕەوایییان کردووە.',
  'In February, Hulagu, grandson of Genghis Khan, sacked Baghdad and ended the Abbasid Caliphate. The whole land between the rivers trembled.':
    'لە شوباتدا، هۆلاکۆی نەوەی جەنگیز خان، بەغدای تاڵانکرد و کۆتایی بە خەلافەتی عەباسی هێنا. هەموو خاکی نێوان دوو ڕووبارەکە لەرزی.',
  'Mosul bowed to the Khan. Erbil\'s lower town opened its gates.\nBut the Kurdish garrison climbed into the citadel and refused.':
    'مووسڵ کڕنۆشی بۆ خان برد. شاری خوارەوەی هەولێر دەروازەکانی کردەوە.\nبەڵام پاسەوانە کوردەکان چوونە ناو قەڵاوە و ڕازی نەبوون.',
  'They were few. The Mongols were many, and they had engineers, rams and patience.\nThe siege would last for months.':
    'ئەوان کەم بوون. مەغۆلەکان زۆر بوون و ئەندازیار و دارکوت و ئارامییان هەبوو.\nگەمارۆکە چەند مانگێک درێژەی کێشا.',
  'On the tallest tower stands their captain, called AZ by his men, with a great ballista and a quiver of iron spears.\nThis is his stand.':
    'لەسەر بەرزترین بورج فەرماندەکەیان وەستاوە کە پیاوەکانی پێی دەڵێن AZ، لەگەڵ بالیستایەکی گەورە و تیردانێک ڕمی ئاسنین.\nئەمە بەرگرییەکەی ئەوە.',
  'History remembers that the citadel of Erbil held out against the Mongols for about six months.':
    'مێژوو لەبیری ماوە کە قەڵای هەولێر نزیکەی شەش مانگ بەرگەی مەغۆلەکانی گرت.',
  'In 1259 it finally passed into Mongol hands. But the songs remember the summer the mound would not kneel.':
    'لە 1259 لە کۆتاییدا کەوتە دەست مەغۆل. بەڵام گۆرانییەکان ئەو هاوینە لەبیر دەکەن کە گردەکە چۆکی دانەدا.',
  'Captain AZ and Noyan Kara-Tümen are legends of this game, not of the chronicles. The courage of the garrison is real.':
    'فەرماندە AZ و نۆیان قەرە-تومەن ئەفسانەی ئەم یارییەن، نەک مێژوو. بەڵام ئازایەتی پاسەوانەکان ڕاستییە.',
  'The Mongol camp is in flames and Hulagu’s men flee into the plain. Erbil breathes again.': 'ئۆردوگای مەغۆل دەسووتێت و پیاوانی هۆلاکۆ بەرەو دەشت هەڵدێن. هەولێر دووبارە هەناسە دەداتەوە.',
  'Noyan Kara-Tümen\'s great assault is broken. For one more season, the mound does not kneel.': 'هێرشە گەورەکەی نۆیان قەرە-تومەن شکا. بۆ وەرزێکی تر، گردەکە چۆک دانادات.',
  'The Mongols pull back to their camp, dragging their dead. They will return.': 'مەغۆلەکان بە کوژراوەکانیانەوە دەگەڕێنەوە ئۆردوگا. دەگەڕێنەوە.',
  'Smoke over the mound. But the story of Erbil is not over - rally the garrison and try again.': 'دووکەڵ بەسەر گردەکەوە. بەڵام چیرۆکی هەولێر تەواو نەبووە - پاسەوانەکان کۆبکەرەوە و دووبارە هەوڵبدەوە.',
};
const WORDS = { Night: 'شەو', Dawn: 'بەرەبەیان', Day: 'ڕۆژ', Dusk: 'ئێوارە', clear: 'ساماڵ', cloudy: 'هەوری', rain: 'باران', storm: 'زریان', dust: 'تۆز', wind: 'با', changing: 'گۆڕاو', waves: 'شەپۆل' };
const PATTERNS = [
  [/^Wave (\d+) \/ (\d+)  ·  (\w+)$/, (m, a, b, c) => `شەپۆل ${a} / ${b}  ·  ${CKB[c] || c}`],
  [/^Wave (\d+)  ·  (\w+)$/, (m, a, c) => `شەپۆل ${a}  ·  ${CKB[c] || c}`],
  [/^Wave (\d+) - The Noyan rides!$/, (m, a) => `شەپۆل ${a} - نۆیان دێت!`],
  [/^Wave (\d+)$/, (m, a) => `شەپۆل ${a}`],
  [/^Citadel (\d+)$/, (m, a) => `قەڵا ${a}`],
  [/^Mongol Camp (\d+)$/, (m, a) => `ئۆردوگای مەغۆل ${a}`],
  [/^Next wave in (\d+)$/, (m, a) => `شەپۆلی داهاتوو لە ${a}`],
  [/^BERXWEDAN (\d+)(.*)$/, (m, a, r) => `بەرخودان ${a}` + (r ? '   ×1.5 دوا بەرگری' : '')],
  [/^XÎRET (\d+)  \(from kills\)$/, (m, a) => `غیرەت ${a}  (لە کوشتنەوە)`],
  [/^KHAN'S WRATH (\d+)$/, (m, a) => `تووڕەیی خان ${a}`],
  [/^SKEWERED x(\d+)!$/, (m, a) => `لە شیش دران ×${a}!`], [/^CRUSHED x(\d+)!$/, (m, a) => `پانکرانەوە ×${a}!`], [/^TRAMPLED x(\d+)!$/, (m, a) => `پێشێلکران ×${a}!`],
  [/^TROOPS  (\d+) \/ (\d+)$/, (m, a, b) => `سەربازەکان  ${a} / ${b}`],
  [/^SKILLS  (\d+) \/ (\d+).*$/, (m, a, b) => `تواناکان  ${a} / ${b}   (بە غیرەتی کوشتن پڕ دەبێتەوە)`],
  [/^cost (\d+)   HP (\d+)$/, (m, a, b) => `نرخ ${a}   ژیان ${b}`],
  [/^(\d+) xîret$/, (m, a) => `${a} غیرەت`],
  [/^Speed: (\d)x$/, (m, a) => `خێرایی: ${a}x`],
  [/^Best: wave (\d+)$/, (m, a) => `باشترین: شەپۆل ${a}`],
  [/^(\d+) \/ (\d+)   ·   tap to continue$/, (m, a, b) => `${a} / ${b}   ·   دەست لێبدە بۆ بەردەوامبوون`],
  [/^Tap the battlefield: (.+)$/, (m, a) => `دەست لە مەیدان بدە: ${CKB[a] || a}`],
  [/^Waves survived: (\d+)    Enemies slain: (\d+)$/, (m, a, b) => `شەپۆلی بەرگەگیراو: ${a}    دوژمنی کوژراو: ${b}`],
  [/^(\d+) waves  ·  (.*)$/, (m, a, r) => `${a} شەپۆل  ·  ` + r.replace(/[A-Za-z]+/g, w => WORDS[w] || w)],
  [/^☠ .*$/, m => m.replace(/[A-Za-z]+/g, w => WORDS[w] || w)],
];
const KDIG = '٠١٢٣٤٥٦٧٨٩';
const trCache = new Map();
function tr(s) {
  if (LANG.cur !== 'ckb' || !s) return s;
  let r = trCache.get(s); if (r !== undefined) return r;
  r = CKB[s];
  if (r === undefined) { r = s; for (const [re, fn] of PATTERNS) if (re.test(s)) { r = s.replace(re, fn); break; } }
  r = r.replace(/[0-9]/g, d => KDIG[d]);
  if (trCache.size > 3000) trCache.clear();
  trCache.set(s, r); return r;
}
function setLang(l) { LANG.cur = l; trCache.clear(); Save.data.lang = l; Save.save(); document.documentElement.lang = l === 'ckb' ? 'ckb' : 'en'; }
// short label for cards: last English word, or the full Kurdish name
function shortName(name) { return LANG.cur === 'ckb' ? tr(name) : name.split(' ').slice(-1)[0]; }
// largest font size (<= max) at which a label fits in width w
function fitSize(s, w, max) { ctx.font = 'bold ' + max + 'px ' + FONT; const m = ctx.measureText(tr(s)).width; return m <= w ? max : Math.max(9, Math.floor(max * w / m)); }
