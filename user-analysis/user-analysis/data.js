/**
 * Table 7, chapter 6.8, Beraldi (2026), RIPLEY Masterthesis.
 * Wording preserved from the author's table (including "Operation below Noise").
 * First/Second are development PRIORITIES, not implementation status.
 */
export const MAP = [
  {
    title:'User Preparation',short:'Preparation',icon:'⏻',
    tasks:['System Initialization','Self-Test Execution','Status Verification'],
    first:['Device performs self-test','System indicates working status: ready','System indicates working status: error'],
    second:['Detailed system diagnostics','Component-level status'],
    link:{need:'Reliable system preparation',realization:'Startup hardware checks and status feedback',note:'A prototype implementation; not an operational certification.'}
  },
  {
    title:'Deployment',short:'Deployment',icon:'◎',
    tasks:['Device Handling','Operation under PPE'],
    first:['Device operable with protective equipment (gloves)','Device readable under low visibility (mask/smoke)'],
    second:['Optimized ergonomic design','Improved usability under PPE'],
    link:{need:'Operation under PPE',realization:'Prominent rotary encoder, display and RGB LEDs',note:'Handling with gloves is a design consideration; field usability has not yet been validated.'}
  },
  {
    title:'Detection',short:'Detection',icon:'◉',
    tasks:['Signal Capture','Fire Presence Detection','Early Warning Generation'],
    first:['Detect presence of fire (yes/no)','Generate early warning signal'],
    second:['Improved detection correctness','Effective detection under background noise','Detection through far distances'],
    link:{need:'Fire-related acoustic information',realization:'Implemented passive, stepped-frequency and deconvolution acquisition',note:'Automatic reliable fire detection and warning remain future research.'}
  },
  {
    title:'Fire Analysis',short:'Fire Analysis',icon:'♨',
    tasks:['Fire Type Classification','Fire Intensity Estimation'],
    first:['Identify presence of fire-related acoustic activity'],
    second:['Distinguish between fire types (gas/wood fire)','Classification based on acoustic characteristics'],
    link:{need:'Acoustic characterization',realization:'Research recordings and analysis of observed fire-related features',note:'A validated real-time classifier was not established.'}
  },
  {
    title:'Localization',short:'Localization',icon:'⌖',
    tasks:['Direction Estimation','Source Approximation'],
    first:['Full localization not required','Basic directional indication'],
    second:['Estimate direction of fire source','Improved positioning accuracy'],
    link:{need:'Directional indication',realization:'Two microphone channels provide a technical starting point',note:'Directional localization was not validated in the thesis.'}
  },
  {
    title:'Decision Support',short:'Decision Support',icon:'◇',
    tasks:['Information Simplification','Status Evaluation'],
    first:['Simplified status output: no fire','Simplified status output: fire detected'],
    second:['Detailed situational classification: no fire / possible fire / active fire','Optimized visualization and interpretation'],
    link:{need:'Unambiguous status feedback',realization:'Display, LEDs and live monitoring interface',note:'The future automatic fire / no-fire warning has not been validated.'}
  },
  {
    title:'Communication',short:'Communication',icon:'⇄',
    tasks:['Data Transmission','Alert Communication'],
    first:['Local visual alert','Local acoustic alert','Transfer of an alert signal to another device'],
    second:['Remote transmission of system status','Live monitoring'],
    link:{need:'Communication of information',realization:'Local user interface and serial dataset export',note:'Operational remote status and alarm transmission are future requirements.'}
  },
  {
    title:'Robustness',short:'Robustness',icon:'⬡',
    tasks:['Thermal Resistance','Water Resistance','Operation below Noise','Operation under Smoke'],
    first:['Operation under elevated temperature','Operation under moisture conditions'],
    second:['Performance under extreme sound conditions','Performance in varying environmental conditions','Extended durability testing'],
    link:{need:'Operational environmental resistance',realization:'Portable 3D-printed research enclosure',note:'Heat, moisture, smoke and ruggedness suitability still require redesign and testing.'}
  },
  {
    title:'Data Governance',short:'Data Governance',icon:'▣',
    tasks:['Data Security','Information Handling'],
    first:['Basic safe data transmission'],
    second:['Data storage for analysis','Data anonymization','Use of data for system improvement (machine learning)'],
    link:{need:'Recording and management',realization:'CSV datasets with measurement metadata; SD card and Ripley Analysis Suite',note:'Operational data-protection requirements are not equivalent to the research storage workflow.'}
  }
];

/** Derived from chapter 5 user analysis (not numerical stress measurements). */
export const CONSTRAINTS = [
  {id:'visibility',label:'Low Visibility',short:'Sicht',icon:'◌',color:'#72c7ed',
   detail:'Rauch, Dunkelheit und unbekannte Raumstrukturen können die visuelle Orientierung und die Ablesbarkeit technischer Anzeigen einschränken.',
   implication:'Klar erkennbare Zustände und möglichst geringe Abhängigkeit von komplexen Displayinformationen.',
   area:'Deployment · Decision Support'},
  {id:'heat',label:'Heat',short:'Hitze',icon:'♨',color:'#ff9d60',
   detail:'Erhöhte Umgebungstemperaturen und körperliche Belastung erschweren längere Einsätze und stellen Anforderungen an mitgeführte Geräte.',
   implication:'Temperaturbeständigkeit und geeignete Schutzmaßnahmen vor dem praktischen Einsatz prüfen.',
   area:'Robustness'},
  {id:'noise',label:'Noise',short:'Lärm',icon:'≋',color:'#a6b1ff',
   detail:'Einsatzgeräusche, Atemschutztechnik und Funkverkehr erschweren akustische Wahrnehmung und Verständigung.',
   implication:'Mehrere klar unterscheidbare Rückmeldekanäle in Betracht ziehen; Messverfahren bei Störgeräuschen untersuchen.',
   area:'Detection · Communication'},
  {id:'gloves',label:'Protective Gloves',short:'Handschuhe',icon:'✳',color:'#8bf1c8',
   detail:'Schutzhandschuhe reduzieren Feinmotorik und beeinflussen die Bedienbarkeit kleiner Tasten, Anschlüsse und Menüs.',
   implication:'Gut erreichbare, taktil unterscheidbare Bedienelemente – beim Prototyp ein zentraler Rotary Encoder.',
   area:'Deployment'},
  {id:'air',label:'Limited Breathing Air',short:'Atemluft',icon:'◷',color:'#f7d589',
   detail:'Der verfügbare Atemluftvorrat ist begrenzt. Zusätzliche Arbeitsschritte konkurrieren mit einsatzkritischen Aufgaben.',
   implication:'Kurze Interaktionszeiten und eindeutige Statusinformationen; keine unnötigen Bedienfolgen.',
   area:'User Preparation · Decision Support'},
  {id:'time',label:'Time Pressure',short:'Zeitdruck',icon:'⌛',color:'#ffb5a0',
   detail:'Lagefeststellung und Entscheidungen erfolgen teilweise unter hoher zeitlicher Unsicherheit und sich verändernden Bedingungen.',
   implication:'Schnell zugängliche Information zur Unterstützung der Lagefeststellung.',
   area:'Detection · Decision Support'},
  {id:'cognition',label:'Cognitive Workload',short:'Aufmerksamkeit',icon:'✦',color:'#daaaff',
   detail:'Orientierung, Kommunikation, Teamkoordination und Sicherheit beanspruchen die Aufmerksamkeit gleichzeitig.',
   implication:'Reduzierte Informationskomplexität und klar erkennbare Systemzustände.',
   area:'Decision Support'},
  {id:'equipment',label:'Equipment Load',short:'Ausrüstung',icon:'▣',color:'#8ab9d2',
   detail:'Schutzkleidung, Atemschutzgerät und weitere Ausrüstung erhöhen Gewicht und Platzbedarf und erschweren die Bewegung.',
   implication:'Kompakte, tragbare Bauweise ohne unnötige zusätzliche Ausrüstungslast.',
   area:'Deployment · Robustness'}
];
