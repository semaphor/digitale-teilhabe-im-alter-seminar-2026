# OpenHands auf Linux (Ubuntu 26.04, headless): Setup und Konfiguration

> Ziel: OpenHands mit **Mistral-Backend** auf einem headless Ubuntu-Server (Version 26.04) betreiben. Gleiche Architektur wie unter Windows (siehe [[02 OpenHands auf Windows - Setup und Konfiguration]]), aber ohne Desktop, ohne WSL, mit SSH-Zugriff und härterer Netzwerk-Absicherung.

## Unterschiede zur Windows-Anleitung

| Aspekt | Windows | Ubuntu headless |
|---|---|---|
| Docker | Docker Desktop + WSL2-Integration | Docker Engine (native, via apt) |
| Zugriff auf geteilten Ordner | `\\wsl$\…` im Explorer | SSH/SCP, SFTP, oder Git |
| UI-Erreichbarkeit | `http://localhost:8000` am eigenen Rechner | `ssh -L 8000:localhost:8000` (SSH-Tunnel) |
| Sicherheit | Loopback-Binding reicht meist | zusätzlich: Firewall, kein Port nach außen |

## Schritt 1: Docker Engine installieren

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
mkdir -p ~/agent/incoming ~/agent/outgoing ~/openhands-state
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
  -v ~/openhands-state:/home/openhands/.openhands \
  -v ~/agent:/projects \
  -v /var/run/docker.sock:/var/run/docker.sock \
  ghcr.io/openhands/agent-canvas:latest
```

Unterschiede zum Windows-Setup:

- `-d --restart unless-stopped`: läuft dauerhaft im Hintergrund, übersteht Reboots (headless-Betrieb).
- `-p 127.0.0.1:8000:8000`: UI ist **nur lokal** erreichbar – Zugriff von außen ausschließlich per SSH-Tunnel (Schritt 4).
- API-Key wird aus der Shell-Umgebung des Servers gelesen, nicht vom Client-Rechner.

> [!WARNING] Docker-Socket und Loopback
> Der `docker.sock`-Mount gibt dem Container Kontrolle über den Docker-Daemon, und der App-Server verwaltet Sandboxes mit deinem Linux-User-Kontext. Aus diesem Grund:
> - **niemals** `-p 0.0.0.0:8000` (öffentliche/Netzwerk-Erreichbarkeit) verwenden
> - Server nur mit abgesichertem SSH betreiben (Key-Auth, ggf. `fail2ban`)
> - Optional: `ufw` Firewall aktivieren und nur SSH durchlassen:
>   ```bash
>   sudo ufw allow OpenSSH && sudo ufw enable
>   ```

## Schritt 4: Zugriff auf die Web-UI (SSH-Tunnel)

Auf deinem **Client-Rechner** (Windows PowerShell oder Linux-Terminal):

```bash
ssh -L 8000:localhost:8000 <user>@<server-ip>
```

Danach lokal im Browser: **http://localhost:8000**

Der komplette Traffic läuft verschlüsselt über SSH; der Server-Port 8000 ist von außen nicht erreichbar.

Falls die UI beim ersten Start einen lokalen API-Key verlangt:

```bash
# auf dem Server
docker exec openhands sh -c 'cat "$STATE_DIR/api-key.txt"'
```

## Schritt 5: Dateiaustausch ohne `\\wsl$`

Der geteilte Ordner liegt jetzt auf dem Server unter `~/agent`. Dorthin kommst du:

```bash
# Datei vom Client auf den Server
scp aufgabe.txt <user>@<server-ip>:agent/incoming/

# Ergebnis zurückholen
scp <user>@<server-ip>:agent/outgoing/antwort.md .
```

Alternativ (und für Agenten-Aufgaben oft sauberer): Der Agent arbeitet direkt in einem **Git-Repo** unter `~/agent/repo` – Änderungen kommen als Commit/Branch zurück, die du lokal pulst.

## Schritt 6: Betrieb und Wartung

```bash
# Status/Logs
docker ps
docker logs -f openhands

# Update
docker stop openhands && docker rm openhands
docker pull ghcr.io/openhands/agent-canvas:latest
# danach Schritt-3-Befehl erneut ausführen

# Aufräumen von gestoppten Sandbox-Containern
docker container prune -f
```

Persistenz: Session-State in `~/openhands-state`, Arbeitsdaten in `~/agent` – Container löschen kostet keinen Chatverlauf.

## Typische Fehler und Lösungen (Linux-spezifisch)

| Problem | Ursache / Lösung |
|---|---|
| `permission denied` bei `docker` | User nicht in docker-Gruppe (`sudo usermod -aG docker $USER`, neu einloggen) |
| UI im Browser des Clients nicht erreichbar | Tunnel fehlt oder falsch: `ssh -L 8000:localhost:8000` muss laufen; Server bindet nur `127.0.0.1` |
| Sandboxes starten nicht | Socket-Mount fehlt oder AppArmor/Selinux-Profile blockieren – `docker logs openhands` zeigt Details |
| Agent kann nicht auf `/projects` schreiben | Mount-Ownership: `sudo chown -R $USER: ~/agent` (Sandbox läuft als `SANDBOX_USER_ID=1000`) |
| Nach Reboot ist alles weg | `--restart unless-stopped` gesetzt? Persistenz-Mounts (`~/openhands-state`, `~/agent`) vorhanden? |
| Verdacht auf Missbrauch von außen | `ss -tlnp` prüfen: Port 8000 darf nur auf 127.0.0.1 lauschen; UFW-Regeln kontrollieren |

## Ausblick

- Vergleichbarer Schnelltest ohne OpenHands-Stack: [[01 Minimaler Testlauf - Mistral Vibe im Docker auf Windows]] (übertragbar auf Linux: identische Befehle, Mount statt `\\wsl$` einfach `~/agent` direkt)
- Windows-Variante mit Docker Desktop: [[02 OpenHands auf Windows - Setup und Konfiguration]]
