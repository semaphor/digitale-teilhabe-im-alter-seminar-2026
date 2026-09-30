# Anleitung 00: Mistral-Account anlegen und API-Key erhalten

> Ziel: Einen Mistral-Account anlegen und einen API-Key erzeugen – die Grundlage für alle drei Setup-Anleitungen ([[01 Minimaler Testlauf - Mistral Vibe im Docker auf Windows]], [[02 OpenHands auf Windows - Setup und Konfiguration]], [[03 OpenHands auf Linux - Ubuntu 26.04 headless]]).

## Schritt 1: Account anlegen

1. Öffne [console.mistral.ai](https://console.mistral.ai) im Browser.
2. Klicke auf **Sign up** (bzw. *Create account*).
3. Registrieren geht per E-Mail-Adresse oder bequem über einen bestehenden Google-, GitHub- oder Microsoft-Account (SSO).
4. E-Mail-Verifizierung: Mistral schickt einen Bestätigungslink – anklicken und damit den Account aktivieren.
5. Danach landest du in der **Mistral Console** (dem Verwaltungs-Dashboard).

## Schritt 2: API-Key erzeugen

1. In der Console links im Menü: **API Keys** (unter *Platform* → *API Keys*).
2. Button **Create new key** klicken.
3. Name vergeben, z.B. `ki-agent-lokal` (wichtig, wenn du später mehrere Keys für verschiedene Zwecke verwalten willst).
4. Optional: Environment wählen – für den Einstieg **default** (Production) lassen.
5. Der Key wird **einmalig** im Klartext angezeigt (Format: ein langer zufälliger String, beginnt typischerweise mit einem 32-Zeichen-Token).

> [!WARNING] Key sofort kopieren und sicher speichern
> Nach dem Schließen des Dialogs kannst du den Key **nie wieder einsehen** – nur löschen oder rotieren. Kopiere ihn direkt in einen Passwort-Manager (Bitwarden, KeePass, 1Password o.ä.) oder dein Geheimnis-System.
>
> **Niemals** den Key:
> - in Dateien im geteilten Agent-Ordner (`~/agent`) ablegen
> - in Git-Repositories committen (auch nicht in `.env` ohne `.gitignore`-Eintrag)
> - in Chats, Screenshots oder Dokumente kopieren
> - als Klartext in Skripte schreiben, die du weitergibst

## Schritt 3: Key sicher aufbewahren und bereitstellen

Der Key gehört auf den **Host**, nicht in den Agent-Containern (siehe Architektur in den Anleitungen 01–03). Für die lokale Shell:

**Linux / WSL:**
```bash
# In ~/.profile (nicht in Dateien unter ~/agent!)
echo 'export MISTRAL_API_KEY="dein-key"' >> ~/.profile
source ~/.profile
```

**Windows PowerShell (falls ein Tool direkt auf dem Host läuft):**
```powershell
# nur für die aktuelle Session
$env:MISTRAL_API_KEY = "dein-key"
```

Alternativ: Manche Tools (z.B. das Vibe CLI selbst mit `vibe --setup` oder eine `~/.vibe/.env` mit `VIBE_HOME`-Trennung) verwalten den Key selbst – die Container-Varianten in unseren Anleitungen nutzen aber bewusst die Env-Variable vom Host.

## Schritt 4: Key testen

Schneller Funktionstest mit `curl` (von der Shell, in der die Variable gesetzt ist):

```bash
curl https://api.mistral.ai/v1/models \
  -H "Authorization: Bearer $MISTRAL_API_KEY"
```

Erwartung: eine JSON-Liste mit verfügbaren Modellen (Status 200). Kommt `401 Unauthorized`, ist der Key falsch kopiert, abgelaufen oder rotiert worden.

Oder direkt mit dem Vibe CLI:

```bash
vibe   # startet und fragt ggf. nach dem Key, wenn MISTRAL_API_KEY nicht gesetzt ist
```

## Schritt 5: Kosten und Limits im Blick behalten

- Die Mistral Console zeigt unter **Usage** / **Billing** den Verbrauch pro Key und Zeitraum.
- Neues Konto: Achte auf das aktuelle Free-Tier-Modellangebot und Test-Credits in der Console (Änderungen vorbehalten – einfach dort nachlesen, was dein Plan hergibt).
- **Empfehlung für Agenten-Experimente:** Setze dir in der Console (falls verfügbar) ein Spending-Limit pro Key, bevor du autonome Agenten längere Zeit laufen lässt. Agenten-Sessions können je nach Task viele API-Calls verursachen.
- **Key-Rotation:** Verdächtigst du einen Leak (Key in einem Commit, Screenshot, Log), sofort in der Console löschen (`Delete`) und einen neuen erzeugen – die betroffenen Konfigurationen dann überall aktualisieren.

## Typische Fehler und Lösungen

| Problem | Ursache / Lösung |
|---|---|
| `401 Unauthorized` beim API-Call | Key falsch kopiert (Leerzeichen/Zeilenbruch) oder gelöscht – neuen erzeugen |
| Key funktioniert lokal, aber nicht im Container | Env-Variable wurde beim `docker run` nicht übergeben (`-e MISTRAL_API_KEY`) |
| `vibe` fragt trotzdem nach dem Key | Variable nicht exportiert oder falsche Shell-Konfiguration (`~/.profile` vs. Login-Shell) |
| Ungewohnt hoher Verbrauch | Usage-Seite in der Console prüfen, ggf. Key rotieren und Limits setzen |

## Ausblick

Mit funktionierendem Key geht es weiter mit:
- [[01 Minimaler Testlauf - Mistral Vibe im Docker auf Windows]] – der 30-Minuten-Test
- [[02 OpenHands auf Windows - Setup und Konfiguration]] – Multi-Session mit Web-UI
- [[03 OpenHands auf Linux - Ubuntu 26.04 headless]] – Server-Variante
