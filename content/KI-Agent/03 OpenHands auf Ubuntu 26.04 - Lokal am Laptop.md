# OpenHands auf Ubuntu 26.04: Lokal am Laptop

> Ziel: OpenHands mit **Mistral-Backend** lokal auf einem Ubuntu-26.04-Laptop betreiben – mit Desktop, Browser direkt am Rechner, geteiltem Ordner `~/agent` und ohne SSH/WSL-Umwege. Die Server-Variante ohne Desktop steht in [[04 OpenHands auf Linux - Ubuntu 26.04 headless]].

## Voraussetzungen

- Laptop/PC mit **Ubuntu 26.04** (Desktop-Installation) und Internetzugang
- Mindestens ~8 GB RAM (OpenHands-Container + je Sandbox-Container)
- Ein **Mistral API-Key** (siehe [[00 Mistral-Account und API-Key anlegen]])
- Ein lokaler Benutzer mit sudo-Rechten

## Unterschiede zu den anderen Varianten

| Aspekt | Windows (02) | Ubuntu Laptop (diese Anleitung) | Ubuntu headless (04) |
|---|---|---|---|
| Docker | Docker Desktop + WSL2 | Docker Engine (native, via apt) | Docker Engine (via apt) |
| Zugriff auf geteilten Ordner | `\\wsl$\…` im Explorer | direkt `~/agent` im Dateimanager/Terminal | SSH/SCP, SFTP, Git |
| UI-Erreichbarkeit | `http://localhost:8000` | `http://localhost:8000` direkt im Browser | SSH-Tunnel `ssh -L 8000:…` |
| Netzwerk-Absicherung | Loopback-Binding reicht | Loopback-Binding reicht | zusätzlich Firewall/SSH-Härtung |

## Schritt 1: Docker Engine installieren

Im Terminal (Ctrl+Alt+T):

```bash
# Alte Versionen entfernen (falls vorhanden)
sudo apt remove docker docker-engine docker.io containerd runc 2>/dev/null

# Offizielles Docker-Repo einrichten
sudo apt update && sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Prüfen
sudo docker run --rm hello-world
```

Deinen Benutzer zur docker-Gruppe hinzufügen (kein sudo für jeden Befehl):

```bash
sudo usermod -aG docker $USER
newgrp docker   # oder aus- und wieder einloggen
```

## Schritt 2: Ordner und API-Key vorbereiten

```bash
mkdir -p ~/agent/incoming ~/agent/outgoing ~/agent-openhands-state
```

API-Key sicher ablegen (nicht im geteilten Ordner, nicht world-readable):

```bash
# Einmalig in ~/.profile (oder besser: Geheimnis-Manager deiner Wahl)
echo 'export MISTRAL_API_KEY="dein-key"' >> ~/.profile
source ~/.profile
```

## Schritt 3: OpenHands starten (Agent Canvas)

```bash
docker run -d --name openhands \
  --restart unless-stopped \
  -p 127.0.0.1:8000:8000 \
  -e SANDBOX_USER_ID=1000 \
  -e LLM_API_KEY="$MISTRAL_API_KEY" \
  -e LLM_MODEL="mistral/devstral-medium-2507" \
  -e LLM_BASE_URL="https://api.mistral.ai/v1" \
  -v ~/agent-openhands-state:/home/openhands/.openhands \
  -v ~/agent:/projects \
  -v /var/run/docker.sock:/var/run/docker.sock \
  ghcr.io/openhands/agent-canvas:latest
```

Erläuterungen:

- `-d --restart unless-stopped`: läuft im Hintergrund, übersteht Reboots – aber du kannst auch jederzeit `docker stop openhands` machen, wenn du den Laptop allein nutzen willst.
- `-p 127.0.0.1:8000:8000`: UI ist nur lokal erreichbar, auch im WLAN nicht von anderen Geräten.
- Der Mount `~/agent:/projects` ist dein bidirektionaler Austauschordner – direkt im Dateimanager sichtbar.

> [!WARNING] Docker-Socket
> Der `docker.sock`-Mount gibt dem Container Kontrolle über den Docker-Daemon. Für den Laptop-Betrieb ist das das übliche Setup; trotzdem gilt: **kein** `-p 0.0.0.0:8000` oder Port-Weiterleitung, sonst wäre die UI (und damit die Docker-Steuerung) im Netz erreichbar.

## Schritt 4: Web-UI öffnen

Direkt am Laptop im Browser: **http://localhost:8000**

Falls die UI beim ersten Start einen lokalen API-Key verlangt:

```bash
docker exec openhands sh -c 'cat "$STATE_DIR/api-key.txt"'
```

## Schritt 5: Erste Session und Dateiaustausch

1. **Neue Session/Conversation starten** – OpenHands spawnt automatisch einen Sandbox-Container.
2. Aufgabe stellen, z.B.:
   ```text
   Lies /projects/incoming/aufgabe.txt und schreibe eine Zusammenfassung nach /projects/outgoing/zusammenfassung.md
   ```
3. Im Dateimanager prüfen: `~/agent/outgoing/zusammenfassung.md` sollte existieren.

### Mehrere Sessions parallel

Weitere Conversations in der UI starten – jede bekommt ihren eigenen Container:

> [!WARNING] Kollisionsgefahr bei gemeinsamem Mount
> Parallele Sessions am gleichen `~/agent`-Ordner können sich gegenseitig Dateien überschreiben. Für disjunkte Aufgaben pro Session Unterordner verwenden (z.B. `~/agent/session-1`, `~/agent/session-2`).

## Schritt 6: Betrieb, Updates, Persistenz

```bash
# Status/Logs
docker ps
docker logs -f openhands

# Stoppen (z.B. um Ressourcen freizugeben)
docker stop openhands

# Update
docker stop openhands && docker rm openhands
docker pull ghcr.io/openhands/agent-canvas:latest
# danach Schritt-3-Befehl erneut ausführen

# Gestoppte Sandbox-Container aufräumen
docker container prune -f
```

Persistenz: Session-State in `~/agent-openhands-state`, Arbeitsdaten in `~/agent` – Container löschen kostet keinen Chatverlauf.

## Typische Fehler und Lösungen

| Problem | Ursache / Lösung |
|---|---|
| `permission denied` bei `docker` | User nicht in docker-Gruppe (`sudo usermod -aG docker $USER`, neu einloggen) |
| UI nicht im Browser erreichbar | Läuft der Container? (`docker ps`) – und Loopback-Adresse `localhost` statt `127.0.0.1` bzw. umgekehrt probieren |
| Sandboxes starten nicht | Socket-Mount fehlt – `docker logs openhands` zeigt Details; Ubuntu AppArmor blockiert selten, dann Logs lesen |
| Agent kann nicht auf `/projects` schreiben | `sudo chown -R $USER: ~/agent` (Sandbox läuft als `SANDBOX_USER_ID=1000`) |
| Akku leer, Sessions weg | Container-Neustart ist okay (Persistenz-Mounts), aber laufende Agent-Tasks unterbrechen – für lange Runs lieber die Server-Variante [[04 OpenHands auf Linux - Ubuntu 26.04 headless]] |
| Verdacht auf Fremdzugriff im WLAN | `ss -tlnp` prüfen: Port 8000 darf nur auf 127.0.0.1 lauschen |

## Ausblick

- Vorbereitung: [[00 Mistral-Account und API-Key anlegen]]
- Schneller Sanity-Check mit dem Vibe-CLI direkt: [[01 Minimaler Testlauf - Mistral Vibe im Docker auf Windows]] (Befehle funktionieren unter Ubuntu identisch, ohne WSL-Zugriff einfach direkt `~/agent` nutzen)
- Windows-Variante mit Docker Desktop: [[02 OpenHands auf Windows - Setup und Konfiguration]]
- Dauerhafter Betrieb ohne Desktop: [[04 OpenHands auf Linux - Ubuntu 26.04 headless]]
