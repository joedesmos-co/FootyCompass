#!/usr/bin/env node
/**
 * Quiz depth + World Cup content pass — promotes existing linked players only.
 * Upserts into players.generated-draft.json; no new imports or player counts.
 */

import { DATA_PATHS } from './lib/data-pipeline-paths.js';
import { upsertDraftPlayers } from './lib/upsert-draft-players.js';

const QUIZ_DEPTH_BATCH = [
  // —— Priority 1: World Cup nations ——
  {
    id: 'tm-159471',
    sourceId: '159471',
    displayName: 'Serge Gnabry',
    quickFact:
      'Germany winger who starred in Bayern Munich’s treble-winning sides and scored freely for Die Mannschaft on the left flank.',
    quizHints: [
      'Germany winger in white kit with Bayern Munich pedigree.',
      'Left-footed wide player — not Musiala the dribbler in midfield.',
      'Serge who cuts inside from the wing for Germany.',
    ],
    playingStyle:
      'Direct winger who cuts inside to shoot, presses aggressively, and combines quickly in the final third.',
    importanceScore: 86,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-473050',
    sourceId: '473050',
    displayName: 'Kevin Schade',
    quickFact:
      'Germany left winger who broke through at Brentford with blistering pace before earning senior national-team call-ups.',
    quizHints: [
      'Germany winger linked to the national squad with Premier League pace.',
      'Brentford wide player — not Gnabry the Bayern veteran.',
      'Kevin who attacks space on the left for Germany.',
    ],
    playingStyle:
      'Explosive left winger who runs in behind, beats defenders with pace, and finishes with power.',
    importanceScore: 78,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-1056993',
    sourceId: '1056993',
    displayName: 'Estêvão',
    quickFact:
      'Brazil teenage winger who rose at Palmeiras and moved to Chelsea as one of the Seleção’s most hyped wide prospects.',
    quizHints: [
      'Brazil right winger in yellow kit with Palmeiras roots.',
      'Chelsea signing — not Vinícius at Real Madrid.',
      'Estêvão who dribbles from the flank for Brazil.',
    ],
    playingStyle:
      'Skillful right winger who beats defenders 1v1, cuts inside, and creates from wide areas.',
    importanceScore: 82,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-341705',
    sourceId: '341705',
    displayName: 'Gerson',
    quickFact:
      'Brazil midfielder who won Olympic gold in 2016 and returned to Cruzeiro after spells at Lyon, Marseille, and Flamengo.',
    quizHints: [
      'Brazil central midfielder in yellow with Flamengo and Lyon pedigree.',
      'Cruzeiro playmaker — not Casemiro the defensive anchor.',
      'Gerson who dictates tempo from midfield for Brazil.',
    ],
    playingStyle:
      'Technical central midfielder who recycles possession, switches play, and keeps Brazil ticking.',
    importanceScore: 80,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-52896',
    sourceId: '52896',
    displayName: 'Everton Ribeiro',
    quickFact:
      'Brazil attacking midfielder who starred in Flamengo’s Libertadores wins and brings late-box creativity to the Seleção pool.',
    quizHints: [
      'Brazil number 10-style midfielder with Flamengo pedigree.',
      'Bahia playmaker — not Paquetá the box-to-box runner.',
      'Everton who threads passes between the lines for Brazil.',
    ],
    playingStyle:
      'Creative attacking midfielder who finds pockets, delivers through balls, and arrives late in the box.',
    importanceScore: 79,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-709187',
    sourceId: '709187',
    displayName: 'Nico Williams',
    quickFact:
      'Spain left winger and Athletic Bilbao academy product who became La Roja’s primary outlet on the flank after Euro 2024.',
    quizHints: [
      'Spain left winger in red kit with Athletic Bilbao roots.',
      'Brother of Iñaki — not Yamal the teenage right winger.',
      'Nico who attacks the byline for Spain.',
    ],
    playingStyle:
      'Direct left winger who beats defenders with pace, crosses from the line, and presses aggressively.',
    importanceScore: 88,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-128223',
    sourceId: '128223',
    displayName: 'Álvaro Morata',
    quickFact:
      'Spain striker who captained La Roja at Euro 2024 and has scored at World Cups and Champions League finals for club and country.',
    quizHints: [
      'Spain centre-forward in red with Real Madrid and Atlético pedigree.',
      'Como striker — not Pedri the midfielder.',
      'Álvaro who leads the line and presses from the front for Spain.',
    ],
    playingStyle:
      'Mobile centre-forward who links play, attacks the box, and finishes with headers and sharp movement.',
    importanceScore: 86,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-961297',
    sourceId: '961297',
    displayName: 'Rodrigo Mendoza',
    quickFact:
      'Spain youth midfielder in Atlético Madrid’s system — a La Roja prospect with composure between the lines.',
    quizHints: [
      'Spanish midfielder linked to the national youth pathway.',
      'Atlético Madrid prospect — not Rodri the Manchester City pivot.',
      'Rodrigo who carries the ball forward for Spain’s next generation.',
    ],
    playingStyle:
      'Press-resistant midfielder who carries past pressure and plays progressive passes from deep.',
    importanceScore: 72,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-524000',
    sourceId: '524000',
    displayName: 'Dani Vivian',
    quickFact:
      'Spain centre-back and Athletic Bilbao homegrown defender who brings aerial strength and calm distribution to La Roja.',
    quizHints: [
      'Spain centre-back with one-club Athletic Bilbao roots.',
      'Basque defender — not Laporte the left-footed option.',
      'Dani who wins headers and builds from the back for Spain.',
    ],
    playingStyle:
      'Composed centre-back who defends the box, wins aerial duels, and plays safe passes under pressure.',
    importanceScore: 76,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-463618',
    sourceId: '463618',
    displayName: 'Khéphren Thuram',
    quickFact:
      'France midfielder and son of Lilian Thuram who broke through at Nice before joining Juventus in Serie A.',
    quizHints: [
      'France central midfielder with Nice academy roots.',
      'Juventus box-to-box player — not Kanté the pure ball-winner.',
      'Khéphren who carries the ball and arrives in the box for France.',
    ],
    playingStyle:
      'Athletic midfielder who carries past presses, wins duels, and adds late runs into the penalty area.',
    importanceScore: 82,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-801734',
    sourceId: '801734',
    displayName: 'Mathys Tel',
    quickFact:
      'France forward who broke through at Bayern Munich as a teenager and joined Tottenham as a mobile centre-forward option.',
    quizHints: [
      'France striker in blue kit with Bayern Munich youth pedigree.',
      'Tottenham forward — not Mbappé the headline number 9.',
      'Mathys who runs in behind and finishes with both feet for France.',
    ],
    playingStyle:
      'Mobile forward who attacks space behind the line, links play, and finishes with composure.',
    importanceScore: 78,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-357147',
    sourceId: '357147',
    displayName: 'Diogo Dalot',
    quickFact:
      'Portugal right-back who came through Porto’s academy and became a Manchester United regular in the Seleção’s defensive pool.',
    quizHints: [
      'Portugal right-back in red-green kit with Manchester United ties.',
      'Attacking full-back — not Cancelo who inverts from wide.',
      'Diogo who overlaps and delivers crosses for Portugal.',
    ],
    playingStyle:
      'Attacking right-back who overlaps, delivers crosses, and defends 1v1 with recovery pace.',
    importanceScore: 80,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-182712',
    sourceId: '182712',
    displayName: 'João Cancelo',
    quickFact:
      'Portugal full-back famous for inverting into midfield at Manchester City and Barcelona before returning to La Liga.',
    quizHints: [
      'Portugal full-back who plays on either flank in red-green kit.',
      'Barcelona inverted full-back — not Dalot the overlapping right-back.',
      'João who drifts inside to create from wide for Portugal.',
    ],
    playingStyle:
      'Inverted full-back who carries into midfield, threads through balls, and creates overloads wide.',
    importanceScore: 84,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-326031',
    sourceId: '326031',
    displayName: 'Matthijs de Ligt',
    quickFact:
      'Netherlands centre-back who captained Ajax as a teenager and moved through Juventus, Bayern Munich, and Manchester United.',
    quizHints: [
      'Netherlands centre-back in orange kit with Ajax academy roots.',
      'Manchester United defender — not Van Dijk the Liverpool captain.',
      'Matthijs who leads the line and wins aerial duels for Oranje.',
    ],
    playingStyle:
      'Dominant centre-back who wins headers, steps into midfield, and organises the defensive line.',
    importanceScore: 86,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-330659',
    sourceId: '330659',
    displayName: 'Justin Kluivert',
    quickFact:
      'Netherlands attacking midfielder and son of Patrick Kluivert who starred at Roma and Bournemouth before senior Oranje call-ups.',
    quizHints: [
      'Netherlands attacking midfielder in orange with Roma pedigree.',
      'Bournemouth creator — not Gakpo the left-sided forward.',
      'Justin who combines in the final third for the Netherlands.',
    ],
    playingStyle:
      'Technical attacking midfielder who links play, arrives in the box, and finishes with both feet.',
    importanceScore: 78,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-586429',
    sourceId: '586429',
    displayName: 'Ryan Flamingo',
    quickFact:
      'Netherlands centre-back who broke through at PSV and adds left-footed ball-playing cover to the Oranje defensive pool.',
    quizHints: [
      'Netherlands centre-back in orange with PSV Eindhoven roots.',
      'Young defender — not De Ligt the experienced leader.',
      'Ryan who steps into midfield and plays progressive passes.',
    ],
    playingStyle:
      'Ball-playing centre-back who steps into midfield, wins duels, and distributes calmly from deep.',
    importanceScore: 74,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-111455',
    sourceId: '111455',
    displayName: 'Granit Xhaka',
    quickFact:
      'Switzerland captain and long-range passer who led Arsenal and Bayer Leverkusen before returning to the Premier League.',
    quizHints: [
      'Switzerland captain in red kit with long-range shooting threat.',
      'Defensive midfielder — not Shaqiri the flair winger.',
      'Granit who dictates tempo and strikes from distance for Switzerland.',
    ],
    playingStyle:
      'Composed defensive midfielder who switches play, presses triggers, and shoots from distance.',
    importanceScore: 86,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-507341',
    sourceId: '507341',
    displayName: 'Fabian Rieder',
    quickFact:
      'Switzerland attacking midfielder who broke through at Young Boys and adds creative thrust from central areas in Augsburg.',
    quizHints: [
      'Swiss attacking midfielder in red kit with Young Boys roots.',
      'Augsburg creator — not Xhaka the deep-lying passer.',
      'Fabian who dribbles between lines for Switzerland.',
    ],
    playingStyle:
      'Technical attacking midfielder who carries past pressure and plays line-breaking passes.',
    importanceScore: 74,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-245337',
    sourceId: '245337',
    displayName: 'Walker Zimmerman',
    quickFact:
      'United States centre-back and two-time MLS Defender of the Year who captained the USMNT at the 2022 World Cup.',
    quizHints: [
      'USA centre-back in stars-and-stripes kit who captained at Qatar 2022.',
      'Toronto FC defender — not Pulisic the winger.',
      'Walker who organises the back line and wins headers for the USMNT.',
    ],
    playingStyle:
      'Commanding centre-back who wins aerial duels, organises the line, and plays simple passes out of pressure.',
    importanceScore: 84,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-332705',
    sourceId: '332705',
    displayName: 'Tyler Adams',
    quickFact:
      'United States defensive midfielder who captained the USMNT at Qatar 2022 after breaking through at RB Leipzig.',
    quizHints: [
      'USA defensive midfielder in stars-and-stripes with RB Leipzig pedigree.',
      'Bournemouth holding player — not Pulisic the attacker.',
      'Tyler who shields the defence and presses aggressively for the USMNT.',
    ],
    playingStyle:
      'Energetic defensive midfielder who presses high, tackles hard, and recycles possession.',
    importanceScore: 82,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-532937',
    sourceId: '532937',
    displayName: 'Johan Vásquez',
    quickFact:
      'Mexico centre-back who starred in Liga MX before moving to Serie A and becoming a regular El Tri defensive option.',
    quizHints: [
      'Mexico centre-back in green kit with Genoa and Serie A ties.',
      'Left-footed defender — not Ochoa the goalkeeper.',
      'Johan who wins duels and builds from the back for Mexico.',
    ],
    playingStyle:
      'Composed centre-back who defends the box, plays out from deep, and wins physical duels.',
    importanceScore: 80,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-1066953',
    sourceId: '1066953',
    displayName: 'Mateo Chávez',
    quickFact:
      'Mexico left-back prospect in AZ Alkmaar’s system — an El Tri youth graduate with attacking overlap from defence.',
    quizHints: [
      'Mexico left-back in green kit with Eredivisie club ties.',
      'AZ Alkmaar defender — not Vásquez the centre-back.',
      'Mateo who overlaps and delivers from the left for Mexico.',
    ],
    playingStyle:
      'Attacking left-back who overlaps, delivers crosses, and recovers quickly in transition.',
    importanceScore: 72,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },

  // —— Zero-quiz nations (in-league linked players only) ——
  {
    id: 'tm-631927',
    sourceId: '631927',
    displayName: 'Saud Abdulhamid',
    quickFact:
      'Saudi Arabia right-back who starred in the Pro League before joining Lens in Ligue 1 as the Green Falcons’ wide outlet.',
    quizHints: [
      'Saudi Arabia right-back in green kit with Lens and Pro League ties.',
      'Attacking full-back — not Salem the goalkeeper.',
      'Saud who overlaps and delivers from the right for Saudi Arabia.',
    ],
    playingStyle:
      'Attacking right-back who overlaps, presses high, and delivers crosses from wide areas.',
    importanceScore: 76,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-833817',
    sourceId: '833817',
    displayName: 'Ahmed Qasem',
    quickFact:
      'Iraq winger in Nashville SC’s MLS squad — a wide outlet linked to the national team in FootyBrain.',
    quizHints: [
      'Iraq winger linked to the national squad with MLS club ties.',
      'Nashville SC wide player — not Zidane Iqbal the midfielder.',
      'Ahmed who attacks from the right for Iraq.',
    ],
    playingStyle:
      'Direct winger who runs at defenders, cuts inside, and combines quickly in the final third.',
    importanceScore: 70,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-686845',
    sourceId: '686845',
    displayName: 'Zidane Iqbal',
    quickFact:
      'Iraq midfielder who came through Manchester United’s academy and plays in the Eredivisie for FC Utrecht.',
    quizHints: [
      'Iraq central midfielder with Manchester United academy roots.',
      'FC Utrecht player — not Ahmed Qasem the winger.',
      'Zidane who recycles possession and presses from midfield for Iraq.',
    ],
    playingStyle:
      'Technical midfielder who keeps possession, presses aggressively, and plays progressive passes.',
    importanceScore: 72,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-551505',
    sourceId: '551505',
    displayName: 'Mousa Tamari',
    quickFact:
      'Jordan right winger who starred in the Jordanian Pro League before moving to Montpellier and Rennes in Ligue 1.',
    quizHints: [
      'Jordan winger in red-white-black kit with Ligue 1 ties.',
      'Rennes wide player — not the goalkeeper for Jordan.',
      'Mousa who dribbles from the right for the Nashama.',
    ],
    playingStyle:
      'Direct right winger who beats defenders 1v1, cuts inside, and creates from wide areas.',
    importanceScore: 78,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-108725',
    sourceId: '108725',
    displayName: 'Chris Wood',
    quickFact:
      'New Zealand’s all-time leading scorer and Premier League centre-forward who starred at Burnley, Leeds, and Nottingham Forest.',
    quizHints: [
      'New Zealand centre-forward in white kit — the All Whites’ record scorer.',
      'Nottingham Forest striker — not a midfielder for New Zealand.',
      'Chris who attacks the box and finishes with headers for the All Whites.',
    ],
    playingStyle:
      'Target centre-forward who holds up play, attacks the box, and finishes with power and headers.',
    importanceScore: 84,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-532096',
    sourceId: '532096',
    displayName: 'CJ dos Santos',
    quickFact:
      'Cape Verde goalkeeper in San Diego FC’s MLS squad — linked to the Blue Sharks national pool in FootyBrain.',
    quizHints: [
      'Cape Verde goalkeeper in blue kit with MLS club ties.',
      'San Diego FC shot-stopper — not a Cape Verde outfield player.',
      'CJ who commands the box for the Blue Sharks.',
    ],
    playingStyle:
      'Composed goalkeeper who commands the area, makes reflex saves, and distributes calmly.',
    importanceScore: 70,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-203517',
    sourceId: '203517',
    displayName: 'Steven Moreira',
    quickFact:
      'Cape Verde right-back who plays for Columbus Crew in MLS and overlaps as the Blue Sharks’ wide defensive outlet.',
    quizHints: [
      'Cape Verde right-back in blue kit with Columbus Crew ties.',
      'MLS full-back — not CJ dos Santos the goalkeeper.',
      'Steven who overlaps and defends 1v1 for Cape Verde.',
    ],
    playingStyle:
      'Attacking right-back who overlaps, delivers crosses, and recovers quickly in transition.',
    importanceScore: 72,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-348863',
    sourceId: '348863',
    displayName: 'Juninho Bacuna',
    quickFact:
      'Curaçao midfielder who came through Birmingham City’s academy and plays in the Eredivisie for FC Volendam.',
    quizHints: [
      'Curaçao midfielder in blue kit with Eredivisie club ties.',
      'FC Volendam central player — not Kuwas the winger.',
      'Juninho who carries the ball and combines for Curaçao.',
    ],
    playingStyle:
      'Technical midfielder who carries past pressure, combines quickly, and plays progressive passes.',
    importanceScore: 74,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-315211',
    sourceId: '315211',
    displayName: 'Sherel Floranus',
    quickFact:
      'Curaçao left-back in PEC Zwolle’s Eredivisie squad — an overlapping wide defender linked to the national team.',
    quizHints: [
      'Curaçao left-back in blue kit with PEC Zwolle ties.',
      'Eredivisie full-back — not Bacuna the midfielder.',
      'Sherel who overlaps from the left for Curaçao.',
    ],
    playingStyle:
      'Attacking left-back who overlaps, delivers crosses, and defends 1v1 with recovery pace.',
    importanceScore: 72,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-339337',
    sourceId: '339337',
    displayName: 'Armando Obispo',
    quickFact:
      'Curaçao centre-back in PSV’s Eredivisie squad — a ball-playing defender linked to the national team pool.',
    quizHints: [
      'Curaçao centre-back in blue kit with PSV Eindhoven ties.',
      'PSV defender — not Floranus the left-back.',
      'Armando who wins duels and builds from the back for Curaçao.',
    ],
    playingStyle:
      'Composed centre-back who wins aerial duels, steps into midfield, and distributes calmly.',
    importanceScore: 74,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-232219',
    sourceId: '232219',
    displayName: 'Brandley Kuwas',
    quickFact:
      'Curaçao winger who plays for FC Volendam in the Eredivisie and attacks from wide for the national team.',
    quizHints: [
      'Curaçao winger in blue kit with FC Volendam ties.',
      'Eredivisie wide player — not Obispo the centre-back.',
      'Brandley who dribbles from the flank for Curaçao.',
    ],
    playingStyle:
      'Direct winger who beats defenders 1v1, cuts inside, and combines quickly in the final third.',
    importanceScore: 72,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },

  // —— Priority 2: weak league quiz depth ——
  {
    id: 'tm-59377',
    sourceId: '59377',
    displayName: 'David de Gea',
    quickFact:
      'Spain goalkeeper and long-time Manchester United number one who moved to Fiorentina in Serie A after leaving Old Trafford.',
    quizHints: [
      'Spain goalkeeper in purple Fiorentina kit with Manchester United past.',
      'Shot-stopper — not Unai Simón the Athletic Bilbao keeper.',
      'David who reflex-saves and commands the box in Serie A.',
    ],
    playingStyle:
      'Reflex goalkeeper who excels in 1v1s, commands the penalty area, and distributes with composure.',
    importanceScore: 86,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-364135',
    sourceId: '364135',
    displayName: 'Moise Kean',
    quickFact:
      'Italy centre-forward who broke through at Juventus and rebuilt his reputation as a goal scorer at Fiorentina in Serie A.',
    quizHints: [
      'Italy striker in purple Fiorentina kit with Juventus youth roots.',
      'Mobile centre-forward — not Vlahović the target man at Juventus.',
      'Moise who runs in behind and finishes with pace in Serie A.',
    ],
    playingStyle:
      'Mobile centre-forward who attacks space behind the line and finishes with power and composure.',
    importanceScore: 80,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-273132',
    sourceId: '273132',
    displayName: 'Robin Gosens',
    quickFact:
      'Germany left wing-back who starred in Atalanta’s Champions League run before moving to Inter and Fiorentina in Serie A.',
    quizHints: [
      'Germany left wing-back with Atalanta and Inter pedigree in Serie A.',
      'Fiorentina wide defender — not Kimmich the midfielder.',
      'Robin who overlaps and arrives late in the box in Serie A.',
    ],
    playingStyle:
      'Attacking wing-back who overlaps, arrives in the box, and presses aggressively from wide.',
    importanceScore: 80,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-148252',
    sourceId: '148252',
    displayName: 'Remo Freuler',
    quickFact:
      'Switzerland midfielder and long-time Atalanta anchor who brings pressing and ball-winning to Bologna in Serie A.',
    quizHints: [
      'Swiss central midfielder in Bologna red-blue with Atalanta pedigree.',
      'Ball-winner — not Freuler’s teammate on the wing.',
      'Remo who shields the defence and recycles possession in Serie A.',
    ],
    playingStyle:
      'Energetic central midfielder who presses high, tackles hard, and keeps possession moving.',
    importanceScore: 78,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-167727',
    sourceId: '167727',
    displayName: 'Andrea Belotti',
    quickFact:
      'Italy striker and former Torino captain who became a Serie A goal scorer at Cagliari after starring for the Granata.',
    quizHints: [
      'Italy centre-forward in Cagliari red-blue with Torino captaincy past.',
      'Target striker — not Kean the mobile forward at Fiorentina.',
      'Andrea who fights for headers and finishes with power in Serie A.',
    ],
    playingStyle:
      'Hard-working centre-forward who presses, wins aerial duels, and finishes with power in the box.',
    importanceScore: 78,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-112052',
    sourceId: '112052',
    displayName: 'Bruno Martins Indi',
    quickFact:
      'Netherlands centre-back who played at the 2014 World Cup and captained Porto before returning to the Eredivisie at Sparta Rotterdam.',
    quizHints: [
      'Netherlands centre-back in orange with Porto and World Cup pedigree.',
      'Sparta Rotterdam defender — not De Ligt the younger leader.',
      'Bruno who organises the back line in the Eredivisie.',
    ],
    playingStyle:
      'Experienced centre-back who reads danger early, wins duels, and distributes calmly from deep.',
    importanceScore: 76,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-425306',
    sourceId: '425306',
    displayName: 'Matt Turner',
    quickFact:
      'United States goalkeeper who started at Qatar 2022 for the USMNT and returned to MLS with New England Revolution.',
    quizHints: [
      'USA goalkeeper in stars-and-stripes kit who started at Qatar 2022.',
      'New England Revolution shot-stopper — not Zimmerman the centre-back.',
      'Matt who reflex-saves and commands the box in MLS.',
    ],
    playingStyle:
      'Athletic goalkeeper who excels in 1v1s, commands the area, and distributes quickly.',
    importanceScore: 82,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-111783',
    sourceId: '111783',
    displayName: 'Alejandro Bedoya',
    quickFact:
      'United States midfielder and Philadelphia Union captain who has been a USMNT regular since the 2014 World Cup cycle.',
    quizHints: [
      'USA central midfielder in stars-and-stripes with Philadelphia Union ties.',
      'Union captain — not Adams the defensive anchor.',
      'Alejandro who presses, tackles, and leads by example in MLS.',
    ],
    playingStyle:
      'Energetic central midfielder who presses high, wins duels, and links defence to attack.',
    importanceScore: 80,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-315169',
    sourceId: '315169',
    displayName: 'Luciano Acosta',
    quickFact:
      'Argentina playmaker who won MLS MVP at DC United and returned to Brazil with Fluminense as a creative number 10.',
    quizHints: [
      'Argentina attacking midfielder in Fluminense maroon-green with MLS MVP past.',
      'Creative number 10 — not a Fluminense centre-forward.',
      'Luciano who threads passes and dribbles between lines in the Brasileirão.',
    ],
    playingStyle:
      'Skillful playmaker who dribbles in tight spaces, delivers through balls, and creates from deep.',
    importanceScore: 80,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
  {
    id: 'tm-461937',
    sourceId: '461937',
    displayName: 'Nuno Moreira',
    quickFact:
      'Portugal winger who plays for Vasco da Gama in the Brasileirão and adds direct wide threat from the left.',
    quizHints: [
      'Portugal winger with Vasco da Gama ties in the Brasileirão.',
      'Left-sided wide player — not Dalot the full-back.',
      'Nuno who dribbles from the flank in Brazilian club football.',
    ],
    playingStyle:
      'Direct winger who beats defenders 1v1, cuts inside, and combines quickly in the final third.',
    importanceScore: 72,
    quizEligible: true,
    rosterTier: 'featured',
    reviewStatus: 'approved',
  },
];

const result = upsertDraftPlayers({
  draftPath: DATA_PATHS.draftOverlay,
  batch: QUIZ_DEPTH_BATCH,
  description:
    'Quiz depth + World Cup content pass — WC nations, zero-quiz nations, Serie A/Eredivisie/MLS/Brasileirão depth (2026-05-29).',
});

console.log(
  `Upserted ${result.upserted} quiz-depth players (draft ${result.before} → ${result.after}).`,
);
