const OUTLETS_KEY = 'outlets';
const PUBLISHERS_KEY = 'publishers';

const TRUST_LEVELS = {
  warn:  { label: 'Warnung',       cssClass: 'badge-warn' },
  mixed: { label: 'Eingeschränkt', cssClass: 'badge-mixed' },
  hint:  { label: 'Hinweis',       cssClass: 'badge-hint' },
};
const TRUST_RANK = { hint: 1, mixed: 2, warn: 3 };

const COLORS = {
  warn:  { bg: '#fef2f2', border: '#dc2626', icon: '!',  text: '#991b1b' },
  mixed: { bg: '#fffbeb', border: '#d97706', icon: '!',  text: '#92400e' },
  hint:  { bg: '#eff6ff', border: '#2563eb', icon: 'i',  text: '#1e40af' },
};

function matchesHostname(pattern, hostname) {
  const p = pattern.toLowerCase();
  const h = hostname.toLowerCase();
  if (p.startsWith('*')) {
    const suffix = p.slice(1);
    return h === suffix || h.endsWith('.' + suffix);
  }
  return h === p;
}

function prettyUrl(url) {
  try {
    const u = new URL(url);
    return u.host + u.pathname.replace(/\/+$/, '') + u.search + u.hash;
  } catch {
    return url.replace(/^[a-z]+:\/\//i, '').replace(/\/+$/, '');
  }
}

function bestMatch(outlets, hostname) {
  const hits = outlets.filter(o => (o.urlPrefixes ?? []).some(p => matchesHostname(p, hostname)));
  if (!hits.length) return null;
  hits.sort((a, b) => (TRUST_RANK[b.trustLevel] ?? 0) - (TRUST_RANK[a.trustLevel] ?? 0));
  return hits[0];
}

const DEFAULT_OUTLETS = [
  {
    id: 'bild',
    name: 'Bild',
    parents: ['Axel Springer SE', 'Bild-Gruppe'],
    urlPrefixes: ['bild.de', '*computerbild.de', '*autobild.de'],
    trustLevel: 'warn',
    reason: 'Boulevard- und Verbrauchertitel der Axel Springer SE. Die Bild-Zeitung hat zahlreiche R\u00fcgen des Presserats wegen reisserischer Berichterstattung. Computer Bild und Auto Bild sind stark von Werbeinteressen gepr\u00e4gt.',
    sources: [
      'https://de.wikipedia.org/wiki/Bild_(Zeitung)',
      'https://de.wikipedia.org/wiki/Computer_Bild',
      'https://de.wikipedia.org/wiki/Auto_Bild',
      'https://www.presserat.de/ruegen-presse-uebersicht.html',
      'https://taz.de/Corona-Berichterstattung-der-Bild/!5809698/',
      'https://taz.de/Kontrolle-der-Presse/!6165351/',
    ],
  },
  {
    id: 'bz-berlin',
    name: 'B.Z.',
    parents: ['Axel Springer SE', 'Bild-Gruppe'],
    urlPrefixes: ['*bz-berlin.de'],
    trustLevel: 'warn',
    reason: 'Berliner Boulevardzeitung im Stil der Bild; wiederholt vom Presserat gerügt.',
    sources: [
      'https://de.wikipedia.org/wiki/B.Z.',
      'https://www.presserat.de/ruegen-presse-uebersicht.html',
      'https://taz.de/Beschwerden-beim-Presserat/!6157801/',
    ],
  },
  {
    id: 'welt',
    name: 'Welt',
    parents: ['Axel Springer SE'],
    urlPrefixes: ['www.welt.de', 'welt.de'],
    trustLevel: 'mixed',
    reason: 'Überregionale Tageszeitung; Meinungsspalten stark konservativ ausgerichtet, ansonsten konventioneller Journalismus.',
    sources: [
      'https://de.wikipedia.org/wiki/Die_Welt',
      'https://de.wikipedia.org/wiki/Axel_Springer_SE',
    ],
  },
  {
    id: 'businessinsider-de',
    name: 'Business Insider Deutschland',
    parents: ['Axel Springer SE'],
    urlPrefixes: ['*businessinsider.de'],
    trustLevel: 'mixed',
    reason: 'Wirtschafts- und Tech-Nachrichten; gemischte Qualität, viele Listicles und Übersetzungen.',
    sources: [
      'https://de.wikipedia.org/wiki/Business_Insider',
      'https://de.wikipedia.org/wiki/Axel_Springer_SE',
    ],
  },
  {
    id: 'politico-eu',
    name: 'Politico Europe',
    parents: ['Axel Springer SE'],
    urlPrefixes: ['*politico.eu'],
    trustLevel: 'mixed',
    reason: 'EU-Politik-Berichterstattung; seit 2021 vollständig im Springer-Konzern.',
    sources: [
      'https://de.wikipedia.org/wiki/Politico#Geschichte',
      'https://de.wikipedia.org/wiki/Axel_Springer_SE',
    ],
  },
  {
    id: 'focus-online',
    name: 'Focus Online',
    parents: ['Hubert Burda Media'],
    urlPrefixes: ['www.focus.de', 'focus.de'],
    trustLevel: 'mixed',
    reason: 'Nachrichtenportal mit dokumentierten Qualitätsproblemen (u. a. Falschnachrichten 2024) und starker Klickorientierung.',
    sources: [
      'https://de.wikipedia.org/wiki/Focus_Online',
      'https://uebermedien.de/100007/falschnachricht-ueber-die-spd-schmutzkampagne-bei-focus-online/',
    ],
  },
  {
    id: 'bunte',
    name: 'Bunte',
    parents: ['Hubert Burda Media'],
    urlPrefixes: ['*bunte.de'],
    trustLevel: 'warn',
    reason: 'People-Magazin mit häufigen Persönlichkeitsrechtsverletzungen und Presserats-Rügen.',
    sources: [
      'https://de.wikipedia.org/wiki/Bunte',
      'https://www.presserat.de/ruegen-presse-uebersicht.html',
      'https://taz.de/Beschwerden-beim-Presserat/!6157801/',
    ],
  },
  {
    id: 'chip',
    name: 'Chip',
    parents: ['Hubert Burda Media'],
    urlPrefixes: ['*chip.de'],
    trustLevel: 'hint',
    reason: 'Tech-Portal; Downloads und Tests teils stark durch Werbe- und Affiliate-Interessen geprägt.',
    sources: [
      'https://de.wikipedia.org/wiki/Chip_(Zeitschrift)',
      'https://de.wikipedia.org/wiki/Hubert_Burda_Media',
    ],
  },
  {
    id: 'closer',
    name: 'Closer',
    parents: ['Bauer Media Group'],
    urlPrefixes: ['*closer.de'],
    trustLevel: 'warn',
    reason: 'Promi-Magazin; regelmäßig Rügen des Presserats wegen Falschmeldungen und Persönlichkeitsrechtsverletzungen.',
    sources: [
      'https://de.wikipedia.org/wiki/Closer_(Zeitschrift)',
      'https://www.presserat.de/ruegen-presse-uebersicht.html',
      'https://taz.de/Beschwerden-beim-Presserat/!6157801/',
    ],
  },
  {
    id: 'intouch',
    name: 'InTouch',
    parents: ['Bauer Media Group'],
    urlPrefixes: ['*intouch.de', '*intouch.wunderweib.de'],
    trustLevel: 'warn',
    reason: 'Klatschmagazin mit wiederholten Presserats-Rügen.',
    sources: [
      'https://de.wikipedia.org/wiki/InTouch_(Zeitschrift)',
      'https://www.presserat.de/ruegen-presse-uebersicht.html',
      'https://taz.de/Beschwerden-beim-Presserat/!6157801/',
    ],
  },
  {
    id: 'waz',
    name: 'WAZ (Westdeutsche Allgemeine)',
    parents: ['Funke Mediengruppe'],
    urlPrefixes: ['*waz.de'],
    trustLevel: 'mixed',
    reason: 'Regionalzeitung; nach Sparmaßnahmen und Redaktionsschließungen Qualitätsverluste dokumentiert.',
    sources: [
      'https://de.wikipedia.org/wiki/Westdeutsche_Allgemeine_Zeitung',
      'https://de.wikipedia.org/wiki/Funke_Mediengruppe',
    ],
  },
  {
    id: 'berliner-morgenpost',
    name: 'Berliner Morgenpost',
    parents: ['Funke Mediengruppe'],
    urlPrefixes: ['*morgenpost.de'],
    trustLevel: 'mixed',
    reason: 'Berliner Tageszeitung; seit 2014 bei Funke, gemeinsame Mantelredaktion mit anderen Funke-Titeln.',
    sources: [
      'https://de.wikipedia.org/wiki/Berliner_Morgenpost',
      'https://de.wikipedia.org/wiki/Funke_Mediengruppe',
    ],
  },
  {
    id: 'hamburger-abendblatt',
    name: 'Hamburger Abendblatt',
    parents: ['Funke Mediengruppe'],
    urlPrefixes: ['*abendblatt.de'],
    trustLevel: 'mixed',
    reason: 'Hamburger Tageszeitung; gemeinsame Funke-Zentralredaktion, regionale Lokalberichterstattung unverändert.',
    sources: [
      'https://de.wikipedia.org/wiki/Hamburger_Abendblatt',
      'https://de.wikipedia.org/wiki/Funke_Mediengruppe',
    ],
  },
  {
    id: 'koelner-stadtanzeiger',
    name: 'Kölner Stadt-Anzeiger',
    parents: ['DuMont Mediengruppe'],
    urlPrefixes: ['*ksta.de'],
    trustLevel: 'hint',
    reason: 'Lokale Tageszeitung; vereinzelt Kritik an Verquickung von Anzeigen- und Redaktionsteil.',
    sources: [
      'https://de.wikipedia.org/wiki/K%C3%B6lner_Stadt-Anzeiger',
      'https://de.wikipedia.org/wiki/DuMont_Mediengruppe',
    ],
  },
  {
    id: 'express',
    name: 'Express',
    parents: ['DuMont Mediengruppe'],
    urlPrefixes: ['*express.de'],
    trustLevel: 'warn',
    reason: 'Kölner Boulevardzeitung; Presserats-Rügen wegen reißerischer Aufmachung.',
    sources: [
      'https://de.wikipedia.org/wiki/Express_(Zeitung)',
      'https://www.presserat.de/ruegen-presse-uebersicht.html',
      'https://taz.de/Beschwerden-beim-Presserat/!6157801/',
    ],
  },
  {
    id: 't-online',
    name: 'T-Online',
    parents: ['Ströer SE & Co. KGaA'],
    urlPrefixes: ['*t-online.de'],
    trustLevel: 'mixed',
    reason: 'Portalnachrichten mit zunehmender Boulevardisierung; eigenständige Redaktion bei Ströer seit 2015.',
    sources: [
      'https://de.wikipedia.org/wiki/T-Online',
      'https://de.wikipedia.org/wiki/Str%C3%B6er_(Unternehmen)',
    ],
  },
  {
    id: 'rt-de',
    name: 'Russia Today',
    parents: ['ANO TV-Novosti'],
    urlPrefixes: ['rt.com', '*rtde.tv', '*rtde.online', '*rtde.world'],
    trustLevel: 'warn',
    reason: 'Deutschsprachiger Ableger des russischen Staatssenders RT; seit März 2022 in der EU sanktioniert und gesperrt.',
    sources: [
      'https://de.wikipedia.org/wiki/RT_DE',
      'https://eur-lex.europa.eu/eli/dec/2022/351/oj',
      'https://taz.de/Russische-Propaganda-in-Europa/!5944595/',
    ],
  },
  {
    id: 'sputnik-de',
    name: 'SNA News (vormals Sputnik Deutschland)',
    parents: ['Rossiya Segodnya'],
    urlPrefixes: ['*snanews.de', '*sputniknews.com'],
    trustLevel: 'warn',
    reason: 'Russisches Staatsmedium; seit März 2022 EU-weit sanktioniert.',
    sources: [
      'https://de.wikipedia.org/wiki/Sputnik_(Nachrichtenagentur)',
      'https://eur-lex.europa.eu/eli/dec/2022/351/oj',
      'https://taz.de/Desinformationskampagne-Russlands/!6034158/',
    ],
  },
  {
    id: 'epoch-times-de',
    name: 'Epoch Times Deutschland',
    parents: ['Epoch Media Group'],
    urlPrefixes: ['*epochtimes.de'],
    trustLevel: 'warn',
    reason: 'Nahe der Falun-Gong-Bewegung; häufige Verbreitung verschwörungstheoretischer und einseitiger Inhalte.',
    sources: [
      'https://de.wikipedia.org/wiki/The_Epoch_Times',
      'https://de.wikipedia.org/wiki/Falun_Gong',
      'https://taz.de/!1257248/',
    ],
  },
  {
    id: 'junge-freiheit',
    name: 'Junge Freiheit',
    parents: ['Junge Freiheit Verlag'],
    urlPrefixes: ['*jungefreiheit.de'],
    trustLevel: 'warn',
    reason: 'Wochenzeitung der „Neuen Rechten"; jahrelang vom Verfassungsschutz NRW als Verdachtsfall geführt.',
    sources: [
      'https://de.wikipedia.org/wiki/Junge_Freiheit',
      'https://taz.de/Junge-Freiheit/!t5009714/',
    ],
  },
  {
    id: 'compact',
    name: 'Compact-Magazin',
    parents: ['COMPACT-Magazin GmbH'],
    urlPrefixes: ['*compact-online.de'],
    trustLevel: 'warn',
    reason: 'Vom Bundesinnenministerium 2024 als rechtsextremistisch eingestuft; verbreitet verschwörungsideologische Inhalte.',
    sources: [
      'https://de.wikipedia.org/wiki/Compact_(Magazin)',
      'https://www.bmi.bund.de/SharedDocs/pressemitteilungen/DE/2024/07/exekutive1.html',
      'https://www.spiegel.de/politik/deutschland/compact-verbot-des-rechtsextremen-magazins-wird-teilweise-ausgesetzt-a-aeead50d-ac9c-4eeb-9dfe-b0188ac385d4',
    ],
  },
  {
    id: 'tichys-einblick',
    name: 'Tichys Einblick',
    parents: ['Tichys Einblick GmbH'],
    urlPrefixes: ['*tichyseinblick.de'],
    trustLevel: 'warn',
    reason: 'Konservativ-libertäres Online-Magazin; mehrfach Gegendarstellungen und gerichtliche Auflagen wegen Falschbehauptungen.',
    sources: [
      'https://de.wikipedia.org/wiki/Tichys_Einblick',
      'https://de.wikipedia.org/wiki/Roland_Tichy',
      'https://taz.de/Tichys-Einblick-verliert-vor-Gericht/!5663133/',
    ],
  },
  {
    id: 'pi-news',
    name: 'PI-News',
    parents: ['Selbstverlag / Einzelpublikation'],
    urlPrefixes: ['*pi-news.net'],
    trustLevel: 'warn',
    reason: 'Islamfeindlicher Blog; vom Bayerischen Verfassungsschutz als rechtsextrem eingestuft.',
    sources: [
      'https://de.wikipedia.org/wiki/PI-News',
      'https://taz.de/Rechtsextremismus/!t5007723/',
    ],
  },
  {
    id: 'reitschuster',
    name: 'Reitschuster.de',
    parents: ['Selbstverlag / Einzelpublikation'],
    urlPrefixes: ['*reitschuster.de'],
    trustLevel: 'mixed',
    reason: 'Blog von Boris Reitschuster; während der Pandemie mehrfach mit Falschdarstellungen und einseitiger Auswahl auffällig.',
    sources: [
      'https://de.wikipedia.org/wiki/Boris_Reitschuster',
      'https://taz.de/Diskussion-um-BPK-Mitglied/!5863113/',
    ],
  },
  {
    id: 'nachdenkseiten',
    name: 'NachDenkSeiten',
    parents: ['Selbstverlag / Einzelpublikation'],
    urlPrefixes: ['*nachdenkseiten.de'],
    trustLevel: 'mixed',
    reason: 'Ursprünglich linkes Blog; seit 2022 zunehmend russlandfreundliche und verschwörungstheoretische Inhalte, mehrfach von Medien kritisiert.',
    sources: [
      'https://de.wikipedia.org/wiki/NachDenkSeiten',
      'https://de.wikipedia.org/wiki/Albrecht_M%C3%BCller_(Publizist)',
      'https://www.tagesspiegel.de/gesellschaft/medien/parallelwelten-bitte-weniger-verschworungstheoretisch-umformulieren-8882158.html',
    ],
  },
  {
    id: 'apolut',
    name: 'Apolut (ehemals KenFM)',
    parents: ['Selbstverlag / Einzelpublikation'],
    urlPrefixes: ['*apolut.net'],
    trustLevel: 'warn',
    reason: 'Nachfolgeplattform des KenFM-Portals; verbreitet wiederholt verschwörungsideologische Inhalte.',
    sources: [
      'https://de.wikipedia.org/wiki/KenFM',
      'https://taz.de/Desinformation-im-Netz/!5808930/',
      'https://correctiv.org/aktuelles/wirtschaft/2023/11/27/dieser-bank-vertrauen-extremisten/',
    ],
  },
  {
    id: 'nius',
    name: 'Nius',
    parents: ['Selbstverlag / Einzelpublikation'],
    urlPrefixes: ['*nius.de'],
    trustLevel: 'warn',
    reason: 'Rechtspopulistisches Online-Portal von Ex-Bild-Chefredakteur Julian Reichelt; finanziert vom IT-Unternehmer Frank Gotthardt. Mehrfach wegen einseitiger Berichterstattung und Desinformation kritisiert.',
    sources: [
      'https://de.wikipedia.org/wiki/Nius',
      'https://taz.de/Der-Onlinekanal-Nius/!6073595/',
      'https://www.spiegel.de/politik/deutschland/julia-kloeckner-vergleich-von-taz-und-nius-sorgt-fuer-kritik-a-b7687e90-cfb2-4103-9d3f-74aee2be5257',
      'https://www.tagesspiegel.de/politik/portal-von-reichelt-und-gotthardt-was-ist-nius--und-was-wird-den-machern-vorgeworfen-14208194.html',
    ],
  },
  {
    id: 'achgut',
    name: 'Achgut.com',
    parents: ['Selbstverlag / Einzelpublikation'],
    urlPrefixes: ['*achgut.com'],
    trustLevel: 'mixed',
    reason: 'Konservativ-libertäres Blog (Achse des Guten); regelmäßig Zuspitzung und polemische Darstellung politischer Themen.',
    sources: [
      'https://de.wikipedia.org/wiki/Achse_des_Guten',
      'https://de.wikipedia.org/wiki/Cora_Stephan',
    ],
  },
  {
    id: 'kopp-verlag',
    name: 'Kopp Verlag',
    parents: ['Selbstverlag / Einzelpublikation'],
    urlPrefixes: ['*kopp-verlag.de', '*kopp-report.de'],
    trustLevel: 'warn',
    reason: 'Einer der größten deutschen Verlage für Verschwörungstheorien und Pseudowissenschaft; mehrfach Gegenstand von Gerichtsverfahren.',
    sources: [
      'https://de.wikipedia.org/wiki/Kopp_Verlag',
      'https://taz.de/Kopp-Verlag/!t5350422/',
      'https://www.deutschlandfunkkultur.de/kopp-verlag-aufklaerung-mit-hetze-angst-und-100.html',
    ],
  },
  {
    id: 'manova',
    name: 'Manova (früher Rubikon)',
    parents: ['Selbstverlag / Einzelpublikation'],
    urlPrefixes: ['*manova.news'],
    trustLevel: 'warn',
    reason: 'Rechtspopulistisch-esoterisches Magazin; berichtet aus verschwörungsideologischer Perspektive.',
    sources: [
      'https://de.wikipedia.org/wiki/Manova',
    ],
  },
  {
    id: 'freilich',
    name: 'Freilich Magazin',
    parents: ['Selbstverlag / Einzelpublikation'],
    urlPrefixes: ['*freilich-magazin.de'],
    trustLevel: 'warn',
    reason: 'Rechtsextremes Online-Magazin aus dem Umfeld der Jungen Freiheit.',
    sources: [
      'https://de.wikipedia.org/wiki/Freilich_(Magazin)',
    ],
  },
  {
    id: 'cicero',
    name: 'Cicero',
    parents: ['Selbstverlag / Einzelpublikation'],
    urlPrefixes: ['*cicero.de'],
    trustLevel: 'mixed',
    reason: 'Konservatives Monatsmagazin; seit dem Management-Buy-out 2016 zunehmend rechte Positionen, wiederholt umstrittene Berichterstattung.',
    sources: [
      'https://de.wikipedia.org/wiki/Cicero_(Zeitschrift)',
      'https://taz.de/Rechtsruck-beim-Magazin-Cicero/!5315142/',
    ],
  },
  {
    id: 'kath-net',
    name: 'Kath.net',
    parents: ['Selbstverlag / Einzelpublikation'],
    urlPrefixes: ['*kath.net'],
    trustLevel: 'mixed',
    reason: 'Konservativ-katholisches Nachrichtenportal; grenzt teilweise an Verschwörungserzählungen und rechte Positionen.',
    sources: [
      'https://de.wikipedia.org/wiki/Kath.net',
      'https://www.katholisch.de/artikel/23952-zdk-praesident-sternberg-kritisiert-kathnet-und-die-tagespost',
    ],
  },
  {
    id: 'nrhz',
    name: 'NRhZ-Online',
    parents: ['Selbstverlag / Einzelpublikation'],
    urlPrefixes: ['*nrhz.de'],
    trustLevel: 'warn',
    reason: 'Linkes Online-Magazin; verbreitet teils antisemitische und verschwörungsideologische Inhalte.',
    sources: [
      'https://de.wikipedia.org/wiki/NRhZ-Online',
      'https://taz.de/Querfront-Preisverleihung-abgesagt/!5463066/',
    ],
  },
];

const DEFAULT_PUBLISHERS = [
  {
    path: ['Axel Springer SE'],
    reason: 'Größter Boulevardzeitungsverlag Europas. Mitarbeitende werden auf konzerneigene Grundsätze verpflichtet (u. a. Solidarität mit Israel, Bekenntnis zur transatlantischen Allianz und zur freien sozialen Marktwirtschaft). Mehrheitlich im Besitz von Friede Springer, CEO Mathias Döpfner und KKR.',
    sources: [
      'https://de.wikipedia.org/wiki/Axel_Springer_SE',
      'https://www.axelspringer.com/de/unternehmen/leitlinien',
    ],
  },
  {
    path: ['ANO TV-Novosti'],
    reason: 'Vom russischen Staat finanzierte Mediengruppe; betreibt RT und dessen fremdsprachige Ableger. Seit März 2022 EU-weit sanktioniert.',
    sources: [
      'https://en.wikipedia.org/wiki/ANO_TV-Novosti',
      'https://eur-lex.europa.eu/eli/dec/2022/351/oj',
    ],
  },
  {
    path: ['Rossiya Segodnya'],
    reason: 'Russisches staatliches Nachrichtenunternehmen; 2013 per Präsidialdekret aus RIA Novosti hervorgegangen. Betreibt Sputnik und ist seit März 2022 in der EU sanktioniert.',
    sources: ['https://en.wikipedia.org/wiki/Rossiya_Segodnya'],
  },
  {
    path: ['Funke Mediengruppe'],
    reason: 'Drittgrößtes Zeitungsverlagshaus Deutschlands. Hat seit 2014 mehrere Regionalredaktionen zentralisiert und übernommene Springer-Titel (u. a. Berliner Morgenpost, Hamburger Abendblatt) in die Mantelproduktion integriert.',
    sources: ['https://de.wikipedia.org/wiki/Funke_Mediengruppe'],
  },
  {
    path: ['Hubert Burda Media'],
    reason: 'Eines der größten Medienunternehmen in Deutschland (Focus, Bunte, Chip u. a.); im Besitz der Familie Burda.',
    sources: ['https://de.wikipedia.org/wiki/Hubert_Burda_Media'],
  },
  {
    path: ['Epoch Media Group'],
    reason: 'Internationaler Medienkonzern, der eng mit der Falun-Gong-Bewegung verbunden ist. Mehrere Recherchen dokumentieren systematische Verbreitung verschwörungsnaher Inhalte.',
    sources: [
      'https://de.wikipedia.org/wiki/The_Epoch_Times',
      'https://www.npr.org/2024/06/13/nx-s1-5005297/epoch-times-turmoil-money-laundering',
    ],
  },
  {
    path: ['Bauer Media Group'],
    reason: 'Internationaler Zeitschriftenverlag mit Sitz in Hamburg; publiziert u. a. Closer, InTouch, TV Movie. Wiederholt Rügen des Presserats gegen seine Boulevardtitel.',
    sources: [
      'https://de.wikipedia.org/wiki/Bauer_Media_Group',
      'https://www.presserat.de/ruegen-presse-uebersicht.html',
    ],
  },
  {
    path: ['DuMont Mediengruppe'],
    reason: 'Kölner Medien- und Verlagshaus (Kölner Stadt-Anzeiger, Express); in finanziellen Schwierigkeiten verkaufte es mehrere Titel, darunter Berliner Zeitung und Mitteldeutsche Zeitung.',
    sources: ['https://de.wikipedia.org/wiki/DuMont_Mediengruppe'],
  },
  {
    path: ['Ströer SE & Co. KGaA'],
    reason: 'Deutsches Digital- und Außenwerbeunternehmen; betreibt t-online.de, GIGA und zahlreiche regionale Nachrichtenportale. Kritik an mangelnder redaktioneller Unabhängigkeit.',
    sources: [
      'https://de.wikipedia.org/wiki/Str%C3%B6er_(Unternehmen)',
      'https://uebermedien.de/75449/auf-die-schlauen-kommen-gleich-noch-mehr-dumme/',
    ],
  },
  {
    path: ['Junge Freiheit Verlag'],
    reason: 'Kleinstverlag der gleichnamigen rechtspopulistischen Wochenzeitung Junge Freiheit.',
    sources: ['https://de.wikipedia.org/wiki/Junge_Freiheit'],
  },
  {
    path: ['COMPACT-Magazin GmbH'],
    reason: 'Verlag des rechtsextremistischen Compact-Magazins; vom Bundesverfassungsschutz als gesichert rechtsextremistisch eingestuft und 2024 verboten.',
    sources: [
      'https://de.wikipedia.org/wiki/Compact_(Magazin)',
      'https://taz.de/Einstufung-von-Compact-Magazin/!6018371/',
    ],
  },
  {
    path: ['Tichys Einblick GmbH'],
    reason: 'Verlag des konservativ-libertären Online-Magazins Tichys Einblick; positioniert sich gegen Einwanderung, Klimaschutz und öffentlich-rechtlichen Rundfunk.',
    sources: ['https://de.wikipedia.org/wiki/Tichys_Einblick'],
  },
  {
    path: ['Selbstverlag / Einzelpublikation'],
    reason: 'Kategorie für unabhängige Medien ohne Konzernzugehörigkeit, die von Einzelpersonen oder kleinen Gruppen im Selbstverlag betrieben werden.',
    sources: [],
  },
];
