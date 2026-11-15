RIPLEY WebXR V3 + Landscape + Drehregler

OHNE Node.js: index.html mit VS Code Live Server öffnen.
Für echte AR am Handy: main.js und style.css in dein GitHub-Pages-Repository kopieren, danach Commit + Push.

Neue Funktionen gegenüber V3:
- Querformat: kompakte, rechts platzierte und scrollbar gehaltene Steuerung.
- Wohnzimmer um Y-Achse drehen: Slider 0–360° und ↶/↷ je 15°.
- Das Handy darf gedreht/gekippt werden; Three.js passt die Darstellung bei Fenstergrößenänderungen an.
- Der Drehregler rotiert das 3D-Modell, NICHT den WebXR-Tischanker.

Unverändert: Normal-/Temperaturansicht; drei illustrative Temperaturzonen; Modellskalierung; Fire/Radiation/Convection/Conduction; Reset; optionales GLB.

Achtung: Manche Android-Browser/WebXR-Sitzungen sperren die Bildschirmausrichtung. Drehe das Handy ggf. VOR dem Start von AR ins Querformat und aktiviere Android Auto-Rotate.

Die Temperaturen sind ausschließlich illustrative Beispielwerte, keine Messung oder Brandsimulation.

NEU: Menue einklappen/oeffnen ueber Schaltflaeche direkt im Bedienfeld. Funktioniert auch in AR, falls DOM Overlay unterstuetzt wird. AR-Button bleibt separat erreichbar.
