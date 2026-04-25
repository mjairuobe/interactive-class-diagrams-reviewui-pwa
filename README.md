# Interactive Class Diagrams ReviewUI (Mobile-First AI Review App)

Das AI-Zeitalter hat die Softwareentwicklung grundlegend verändert. KI nimmt uns durch agentische Workflows viel Arbeit ab und produziert in kürzerer Zeit deutlich mehr Code-Output als ein einzelner Entwickler. Dadurch verschiebt sich der Fokus des Entwicklers vom bloßen Schreiben von Code hin zum architektonischen Denken. 

Die meiste Denkarbeit passiert jedoch nicht auf Knopfdruck am Schreibtisch. Die besten Ideen kommen mir oft in Alltagssituationen, etwa beim Zähneputzen. Unser Bewusstsein ist der Richtungsgeber, während das Unterbewusstsein Hintergrundprozesse verarbeitet. Wenn ich also unterwegs einen Einfall habe, muss ich KI-Agenten auch direkt von meinem Smartphone aus anstoßen und ihre Arbeit überprüfen können. Heutige Entwickler-Tools sind aber kaum für "Mobile-first" ausgelegt.

## Hintergrund

In meinen vorherigen Konzepten ([markup-class-diagram-ui-poc](https://github.com/mjairuobe/markup-class-diagram-ui-poc) und [Mobile-first-AI-Review-App-Konzept](https://github.com/mjairuobe/Mobile-first-AI-Review-App-Konzept-)) habe ich beschrieben, dass wir neue Tools brauchen, um auch große, komplexe Codebasen überblicken zu können. Bei Entwicklung mit Agenten ist Codereview eine wichtige Herausforderung: der Überblick aber auch das Detail muss im Fokus bleiben.

Klassendiagramme (z.B. generiert durch Mermaid) eignen sich hierfür hervorragend, da sie auf einem hochformatigen Handydisplay meist ohne viel Scrollen darstellbar sind und einen sofortigen architektonischen Überblick liefern. Geänderte Funktionen oder Variablen können direkt im Diagramm hervorgehoben und interaktiv klickbar gemacht werden.

## Zielsetzung (Proof of Concept)

Dieses Proof of Concept (PoC) zielt darauf ab, einen **nahtlosen, Mobile-first Review-Prozess** über interaktive Klassendiagramme zu schaffen:

- **Automatische Generierung:** Klassendiagramme werden bei jedem Commit (z.B. aus Git-Diffs) automatisch aktualisiert.
- **Overview- und Detailfokus:** Viewport zoomt standardmäßig auf ein Diagrammteil (z. B. Klasse)
- **Interaktive Relationen:** Mit Klicks auf Relationen (z.B. `sells` oder `pays`) lässt sich butterweich zwischen Klassen hin- und hernavigieren
- **Code-Einblicke:** Ein Klick auf Methoden oder Deklarationen im Diagramm öffnet einen CodeViewer im Slider, um sofort die konkrete Implementation zu betrachten.
- **KI-Unterstützung:** Direkt im CodeViewer kann über ein Kontextmenü ("Ask / Comment") ein KI-Chat gestartet werden, um Rückfragen zum Quellcode zu stellen oder Aufgaben per Webhook an Agenten zu delegieren.

### Visuelle Legende für Codeänderungen im Diagramm

Um Modifikationen im Diagramm schnell erfassen zu können, nutzen wir eine einfache Farblogik:

*   <span style="color: #eab308; font-weight: bold;">🟨 Gelb</span>: Der Code in dieser Methode/Klasse wurde **geändert**.
*   <span style="color: #22c55e; font-weight: bold;">🟩 Grün</span>: Dieser Code ist komplett **neu hinzugekommen**.
*   <span style="color: #ef4444; font-weight: bold;">🟥 Rot</span>: Dieser Code wurde **entfernt**.

## Demo & Impressionen

### Nahtlose Navigation zwischen Klassen
Ein Klick auf eine Relation wie `sells` animiert fließend zur Ziel-Klasse, ein erneuter Klick bringt uns wieder zurück.

![Boomerang Navigation](public/boomerang_sells.webp)

### Nahtloses Einblenden von Quellcode
Ein Klick auf die Methode `list_products()` schiebt den responsiven CodeViewer direkt ins Sichtfeld, ohne den Kontext zu verlieren.

![CodeViewer Animation](public/open_codeviewer.webp)

### KI-Assistent & Chat-Interface
Direkt am Code kann durch Markieren ein Chat-Fenster geöffnet werden. Die KI antwortet auf Anfragen zum Code oder der Datenbank.

![KI Chat Interface](public/chat_hq.png)

### Agentische Aktionen via Webhook
Aus dem Chat heraus lassen sich Aktionen über ein Dropdown-Menü direkt an externe Systeme delegieren (z.B. Webhooks).

![Webhook Senden](public/chat_webhook_menu.png)

## Ausblick

Das PoC beweist: Code-Reviews und Architektur-Verständnis lassen sich sehr wohl auf Smartphones portieren. Die nächsten Schritte wären:
1.  **Dynamische Backend-Anbindung:** Ersetzen der Dummy-Diffs durch echte Git-Integration (automatische Generierung der Mermaid-Graphen). Einstellen einer Standard Compare-Branch (z. B. aktuelles Commit immer mit main vergleichen). Geänderte Codezeilen über git diff feststellen, geänderte Methoden/Scopes z. B. durch ´ast´-Libary in Python. 
2.  **Anbindung an Ökosysteme von AI-Agenten:** Automatische Generiung von einem Applink/Deeplink zum Codereview nach Push auf Github; Webhook Anbindung,um Kritik und Verbesserungsvorschläge an vergangene Codingsitzungen zu senden; Reviewprozess an Kanban Boards für Agenten Orchestrierung anbinden z. B. VibeKanban oder Agent Kanban
