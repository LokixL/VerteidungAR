// Source: Beraldi_671113_Abgabe_Final.pdf, Chapter 12, Figures 79–84.
// Explanations are presentation annotations, not new experimental findings.
window.RIPLEY_RESULTS = [
  {
    id:'fig79', figure:79, page:115, category:'PASSIVE ACOUSTICS', title:'Where does the acoustic spectrum change?',
    subtitle:'Stationary normal vs. gas fire · matched distance: 9 m', image:'assets/fig79.png',
    caption:'Passive recording comparison under stationary normal and gas-fire conditions at 9 m. Normalized spectra, difference spectrum and enlarged frequency regions. Shaded ranges show variation between technical frames within a recording.',
    key:'The most distinct change in this recording pair is frequency-dependent, rather than a simple increase in overall sound level.',
    points:[
      {x:23,y:24,box:[9,13,40,29],title:'01 · Read the spectra',look:'Top left: blue = normal conditions; orange = gas-fire conditions, both at 9 m. Horizontal axis = frequency (kHz); vertical axis = normalized magnitude (dB).',meaning:'This is a frequency-by-frequency comparison of two recordings, not a plot of sound intensity versus time.',limit:'The shaded bands describe technical frames from each recording, not variation across independent experiments.',speech:'The two curves show the spectral distribution under normal and gas-fire conditions at the same distance.'},
      {x:77,y:29,box:[57,13,39,30],title:'02 · Main finding: 6–7 kHz',look:'Top right: the orange gas-fire spectrum lies clearly above the blue reference over much of the enlarged 6–7 kHz range.',meaning:'This frequency interval carries the most pronounced normal-versus-gas difference in the selected stationary recording pair.',limit:'A spectral difference in one matched recording pair does not establish a general detection accuracy.',speech:'The clearest change is localized around six to seven kilohertz.'},
      {x:29,y:75,box:[9,55,39,31],title:'03 · Difference spectrum',look:'Bottom left: positive values indicate frequencies where gas-fire magnitude exceeds the normal reference; negative values indicate the opposite.',meaning:'The overall response is not uniformly elevated. Several frequency-dependent deviations are visible.',limit:'The overall RMS level was actually slightly lower for gas fire on both receiver channels.',speech:'The difference spectrum shows localized changes rather than a general rise in sound pressure.'},
      {x:80,y:72,box:[58,55,37,31],title:'04 · Secondary region: ~11 kHz',look:'Bottom right: a second region of increased gas-fire magnitude is visible around 11 kHz.',meaning:'The second feature could be an additional candidate for future investigation.',limit:'The separation here is less uniform than in the 6–7 kHz region.',speech:'There is a second difference around eleven kilohertz, but it is less consistent.'}
    ]
  },
  {
    id:'fig80', figure:80, page:115, category:'PASSIVE ACOUSTICS', title:'Can we summarize the 6–7 kHz feature?',
    subtitle:'Normalized frequency-band feature · individual technical frames', image:'assets/fig80.png',
    caption:'Normalized 5.8–7.0 kHz feature for individual passive technical frames. Horizontal bars mark recording medians. Moving recordings are included for comparison.',
    key:'The stationary 9 m median changes from 0.69 (normal) to 1.93 (gas fire), in the selected recordings.',
    points:[
      {x:19,y:72,box:[10,63,17,26],title:'01 · Normal reference',look:'Left group: the stationary normal recording at 9 m, median feature value 0.69.',meaning:'This is the reference for a distance-matched gas-fire comparison.',limit:'Each dot is a technical frame within a recording, not an independent experiment.',speech:'Under normal conditions, the selected frequency-band feature has a median of 0.69.'},
      {x:36,y:31,box:[29,18,19,35],title:'02 · Gas fire at 6 m',look:'Second group: the gas-fire recording at 6 m has a median of 1.69.',meaning:'The feature is also elevated in the second stationary gas-fire recording.',limit:'6 m and 9 m differ in measurement geometry; this is not a matched normal-to-fire comparison.',speech:'The same frequency region is also elevated in the gas-fire recording at six metres.'},
      {x:53,y:22,box:[47,13,17,32],title:'03 · Matched 9 m comparison',look:'Third group: the stationary gas-fire recording at 9 m has a median of 1.93, versus 0.69 for the normal recording at 9 m.',meaning:'The technical-frame values for the matched stationary normal and gas-fire recordings do not overlap in this example.',limit:'This is not a sensitivity, specificity, or classification-performance estimate.',speech:'At nine metres, the median increases from 0.69 to 1.93; this is an observation from the available recording pair.'},
      {x:84,y:35,box:[63,23,30,61],title:'04 · Measurements during movement',look:'The two right-hand groups show normal moving (median 0.76) and gas-fire moving (median 1.64).',meaning:'The feature remains visible during the tested movement session, though the gas-fire values vary more.',limit:'Moving gas-fire data involve a changing distance and acoustic path; do not infer movement-independent detection.',speech:'Even during movement, the feature remains visible in these recordings, but its variability increases.'}
    ]
  },
  {
    id:'fig81', figure:81, page:117, category:'ACTIVE ACOUSTICS', title:'What does active deconvolution record?',
    subtitle:'Transfer-response magnitude · 8–12 kHz', image:'assets/fig81.png',
    caption:'Deconvolution transfer responses between 8 and 12 kHz. Each curve is a median response within a recording; normal 9 m, gas fire 6 m, and gas fire 9 m.',
    key:'The sweep-based method produces structured, repeatable responses with local differences between measurement conditions.',
    points:[
      {x:86,y:23,box:[72,18,24,18],title:'01 · Three measurement conditions',look:'Legend: blue = normal at 9 m, orange = gas fire at 6 m, green = gas fire at 9 m.',meaning:'Blue versus green is distance matched. Blue versus orange additionally changes the distance.',limit:'The 6 m curve must not be interpreted as a pure fire-effect comparison with the 9 m reference.',speech:'Only the blue and green recordings share the same nominal distance.'},
      {x:46,y:36,box:[40,20,17,46],title:'02 · Structured transfer response',look:'Several peaks and troughs appear across 8–12 kHz rather than a single overall level.',meaning:'The active sweep captures a frequency-dependent transfer-response structure.',limit:'That structure also contains effects from the device and the acoustic environment.',speech:'We see a structured transfer response from the active frequency sweep.'},
      {x:65,y:54,box:[57,30,19,45],title:'03 · Local condition differences',look:'Around 10.5–11 kHz, the curves depart from one another in localized bands.',meaning:'This motivates looking at a difference spectrum in the next figure.',limit:'These differences are not yet demonstrated to be combustion-specific.',speech:'The interesting changes occur in narrow frequency regions, not over the whole spectrum.'}
    ]
  },
  {
    id:'fig82', figure:82, page:117, category:'ACTIVE ACOUSTICS', title:'How large are the local differences?',
    subtitle:'Gas-fire minus normal transfer response · 8–12 kHz', image:'assets/fig82.png',
    caption:'Deconvolution transfer-response differences. Orange compares gas fire 9 m minus normal 9 m (matched distance); blue compares gas fire 6 m minus normal 9 m (distance also changes).',
    key:'Within the matched 9 m comparison, opposite deviations of approximately +7.5 dB and −7.3 dB occur in a narrow frequency interval.',
    points:[
      {x:78,y:30,box:[69,23,27,17],title:'01 · The distance-matched curve',look:'Orange curve: gas fire at 9 m minus normal at 9 m.',meaning:'This is the relevant direct normal-to-gas comparison at the same nominal distance.',limit:'The blue 6 m minus 9 m comparison also includes the effect of different geometry.',speech:'For interpretation, we should focus on the orange, distance-matched curve.'},
      {x:65,y:30,box:[61,25,11,32],title:'02 · Positive deviation',look:'Near 10.68 kHz, the matched gas-fire response is approximately 7.5 dB above the normal reference.',meaning:'This is a localized positive spectral difference.',limit:'A positive difference at one frequency is not sufficient to identify the physical cause.',speech:'Near 10.68 kilohertz, the matched response shows a strong positive deviation.'},
      {x:69,y:85,box:[65,58,10,30],title:'03 · Negative deviation',look:'Near 10.87 kHz, the matched gas-fire response is approximately 7.3 dB below the normal reference.',meaning:'Opposite changes occur within a very narrow interval.',limit:'The observed response also depends on the measurement arrangement and environment.',speech:'Less than 200 hertz later, we observe a similarly strong negative deviation.'},
      {x:43,y:47,box:[25,28,34,43],title:'04 · What the sign means',look:'The horizontal zero line separates positive from negative difference values.',meaning:'The difference curve is not a measure of fire probability. It describes changes in measured transfer-response magnitude.',limit:'Independent reference experiments are needed to test specificity and reliability.',speech:'This is a spectral difference, not a calibrated fire probability or a detection score.'}
    ]
  },
  {
    id:'fig83', figure:83, page:120, category:'REPRODUCIBILITY', title:'Can RIPLEY repeat its active measurements?',
    subtitle:'Wood-fire deconvolution · independent recording sessions', image:'assets/fig83.png',
    caption:'Median deconvolution transfer responses of wood-fire recordings at 3 m and 7 m, between 10 and 12 kHz. Both curves are fire-present, different-distance groups.',
    key:'Independent sessions yield similar responses within each distance group: median correlation ~0.91 at 3 m and ~0.98 at 7 m.',
    points:[
      {x:81,y:22,box:[68,15,28,20],title:'01 · Two fire-present groups',look:'Blue = wood fire at 3 m; orange = wood fire at 7 m. Each line summarizes its own group.',meaning:'This graph compares two wood-fire distances, not normal versus wood-fire conditions.',limit:'Do not use these curves alone to claim successful identification of a wood-fire signature.',speech:'Both lines are wood-fire measurements; the variable here is distance and measurement geometry.'},
      {x:40,y:49,box:[32,30,17,44],title:'02 · Repeated spectral structure',look:'Both median responses have structured peaks and troughs across the 10–12 kHz band.',meaning:'The separate-recording analysis found median correlations ~0.91 across eight 3 m recordings, and ~0.98 across three 7 m recordings.',limit:'Those reproducibility statistics come from comparisons between independent recordings within each distance group; they cannot be read directly from the two displayed curves.',speech:'The important validation is repeatability across independent recording sessions, quantified separately for each distance.'},
      {x:66,y:30,box:[55,16,18,51],title:'03 · Differences between distances',look:'At some frequencies the 7 m curve is higher; at others the 3 m curve is higher.',meaning:'There is no simple uniform attenuation trend in this displayed interval.',limit:'Differences may reflect source distance, geometry, loudspeaker, microphones, and the environment.',speech:'The curves differ between three and seven metres; this is not a simple uniform attenuation law.'}
    ]
  },
  {
    id:'fig84', figure:84, page:121, category:'MOBILE OPERATION', title:'What happens when the prototype moves?',
    subtitle:'Passive 5.8–7.0 kHz feature · stationary versus moving', image:'assets/fig84.png',
    caption:'Boxplots of the passive normalized 5.8–7.0 kHz feature. Boxes describe technical sections within each recording, not independent experimental repetitions.',
    key:'The characteristic frequency-band feature remains visible during movement, while the value and variation change.',
    points:[
      {x:22,y:74,box:[12,64,19,20],title:'01 · Normal stationary',look:'The normal stationary recording has a median feature of 0.69.',meaning:'This provides a reference value for the passive feature.',limit:'The box shows within-recording variability, not uncertainty across independent sessions.',speech:'Under stationary normal conditions the median is 0.69.'},
      {x:43,y:69,box:[34,58,17,26],title:'02 · Normal movement',look:'Under normal movement, the median increases slightly to 0.76.',meaning:'Movement changes the measured feature even without a fire.',limit:'A movement effect should not be misinterpreted as evidence of fire.',speech:'Simply moving the device produces some change in the selected feature.'},
      {x:64,y:20,box:[56,11,18,28],title:'03 · Gas fire stationary',look:'The gas-fire stationary recording has a median feature of 1.93.',meaning:'In these recordings the gas-fire feature is higher than the normal reference.',limit:'These are not multiple independent fire-detection trials.',speech:'The feature is clearly elevated in the stationary gas-fire recording.'},
      {x:84,y:37,box:[76,28,18,38],title:'04 · Gas fire during movement',look:'The gas-fire moving recording has a median of 1.64 and a wider spread.',meaning:'The feature remains visible, but movement and a changing acoustic path increase variability.',limit:'The gas-fire movement recording involved approaching the fire, so distance also changed.',speech:'During movement the feature remains visible, but the values are more variable and the geometry changes.'}
    ]
  }
];
