RIPLEY WebXR – ohne Node.js

1) Den Ordner Ripley_WebXR_Live_Server in VS Code öffnen.
2) index.html öffnen, unten rechts "Go Live" (Live Server).
3) Im Browser erscheint die 3D-Vorschau und die Buttons.
4) Für Android-AR: Alle Dateien dieses Ordners in ein öffentliches GitHub-Repository hochladen, Settings -> Pages -> Deploy from a branch -> main / (root) wählen.
5) Die HTTPS-Adresse in Android Chrome öffnen. START AR -> Tisch scannen -> tippen.

Benötigt Internet, weil Three.js über jsDelivr CDN geladen wird.
Keine Installation von Node.js/npm/Vite notwendig.
Der QR-Code kann später auf die GitHub-Pages-URL verweisen.
Optionale Modelle: models/living-room.glb.
Dies ist eine schematische Visualisierung, keine physikalisch kalibrierte Brandsimulation.
WebXR AR setzt Android Chrome und ein geeignetes ARCore-Gerät voraus.
WebXR-Tischplatzierung und DOM-Overlay-Unterstützung sind geräteabhängig.
