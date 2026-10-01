# OpenHands auf Linux (Ubuntu 26.04, headless): Setup und Konfiguration

> Ziel: OpenHands mit **Mistral-Backend** auf einem headless Ubuntu-Server (Version 26.04) betreiben. Gleiche Architektur wie unter Windows (siehe [[02 OpenHands auf Windows - Setup und Konfiguration]]), aber ohne Desktop, ohne WSL, mit SSH-Zugriff und härterer Netzwerk-Absicherung. Docker läuft **rootless**: Daemon und alle Container laufen im User-Namespace deines Benutzerkontos — Docker-Zugriff kann niemals zu root auf dem Host eskalieren, deshalb kommt dein Benutzer **nicht** in die docker-Gruppe (die wäre root-äquivalent).

## Unterschiede zur Windows-Anleitung

| Aspekt | Windows | Ubuntu headless |
|---|---|---|
| Docker | Docker Desktop + WSL2-Integration | Docker Engine **rootless** (Pakete via apt, Daemon als User-Service) |
| Zugriff auf geteilten Ordner | Explorer über `\\wsl$\…` (Windows) bzw. direkt `~/agent` | SSH/SCP, SFTP, oder Git |
| UI-Erreichbarkeit | `http://localhost:8000` am eigenen Rechner | `ssh -L 8000:localhost:8000` (SSH-Tunnel) |
| Sicherheit | Loopback-Binding reicht meist | zusätzlich: kein root im Docker-Pfad, Firewall, kein Port nach außen |

## Schritt 1: Docker Engine installieren (rootless)

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

sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin docker-ce-rootless-extras
```

**Wichtig:** Der klassische Schritt „Benutzer in die docker-Gruppe aufnehmen" entfällt bei Rootless Docker bewusst — Mitglieder der docker-Gruppe sind faktisch root. Der Rootless-Daemon braucht weder docker-Gruppe noch sudo im Betrieb.

> [!NOTE] Ubuntu 24.04+/26.04: AppArmor und unprivilegierte User-Namespaces
> Ubuntu schränkt unprivilegierte User-Namespaces ein (`kernel.apparmor_restrict_unprivileged_userns = 1`), was Rootless Docker grundsätzlich blockieren würde. Bei Installation über die **dpkg-Pakete** (oben) liefert Ubuntu das nötige AppArmor-Profil für `rootlesskit` gleich mit (`/etc/apparmor.d/rootlesskit`) — es ist kein manueller sysctl- oder Profil-Eingriff nötig. Nur bei der Skript-Installation über `get.docker.com/rootless` müsste dieses Profil selbst angelegt werden.

Danach den Rootless-Daemon als dein Benutzer einrichten:

```bash
# Voraussetzung: Sub-UID/GID-Bereiche müssen existieren (je mindestens 65536)
grep ^$USER: /etc/subuid /etc/subgid

dockerd-rootless-setuptool.sh install
sudo loginctl enable-linger $USER   # einmalig: Daemon startet beim Boot ohne Login-Sitzung

systemctl --user start docker.service
docker info | grep -A3 'Security Options'   # muss "rootless" zeigen
```

Ab jetzt spricht `docker` für deinen Benutzer mit dem Rootless-Daemon (CLI-Context `rootless`). Der rootful-System-Dienst wird nicht mehr gebraucht und kann deaktiviert werden:

```bash
sudo systemctl disable --now docker.service docker.socket
```

## Schritt 2: Ordner und API-Key vorbereiten

```bash
mkdir -p ~/agent ~/.openhands
```

API-Key als Datei mit restriktiven Rechten ablegen — **nicht** im geteilten Ordner `~/agent`, **nicht** world-readable:

```bash
printf 'MISTRAL_API_KEY="dein-key"\n' > ~/.openhands/mistral.env
chmod 600 ~/.openhands/mistral.env
```

`~/.openhands` ist der persistente State-Ordner (Session-Verlauf, Einstellungen, generierte Backend-Keys) und wird in Schritt 3 in den Container gemountet. Wer einen Geheimnis-Manager nutzt (z.B. Vaultwarden mit CLI-Wrapper), speichert den Key dort statt in der Datei und lädt ihn beim Containerstart in die Umgebung.

## Schritt 3: OpenHands starten (Agent Canvas)

```bash
set -a; . ~/.openhands/mistral.env; set +a

docker run -d --name openhands \
  --restart unless-stopped \
  --user 0:0 \
  -p 127.0.0.1:8000:8000 \
  -e HOME=/home/openhands \
  -e SANDBOX_USER_ID=0 \
  -e LLM_API_KEY \
  -e LLM_MODEL="mistral/mistral-medium-3-5" \
  -e LLM_BASE_URL="https://api.mistral.ai/v1" \
  -v ~/.openhands:/home/openhands/.openhands \
  -v ~/agent:/projects \
  -v "$XDG_RUNTIME_DIR/docker.sock":/var/run/docker.sock \
  ghcr.io/openhands/agent-canvas:latest
```

Die Rootless-spezifischen Flags im Detail:

| Flag | Zweck |
|---|---|
| `--user 0:0` | Container-Prozesse laufen als UID 0 — im Rootless-User-Namespace entspricht UID 0 exakt deinem Host-Benutzer. Jede andere Container-UID mappt in den Subuid-Bereich (`/etc/subuid`) und kann nicht in die gemounteten Ordner schreiben. |
| `-e SANDBOX_USER_ID=0` | Auch die Session-Sandboxes laufen als Container-Root ⇒ Dateien, die der Agent anlegt, landen auf dem Host als `du:du`. (Ohne rootless wäre hier `1000` richtig, siehe Anleitung 02.) |
| `-e HOME=/home/openhands` | Mit `--user 0:0` wäre `$HOME` sonst `/root` — der Entry­point würde den State im Container abseits des Mounts ablegen und er wäre beim Neustart weg. |
| `-v "$XDG_RUNTIME_DIR/docker.sock":/var/run/docker.sock` | OpenHands spawnt die Sandbox-Container über den Socket des **Rootless**-Daemons (`$XDG_RUNTIME_DIR/docker.sock`, typisch `/run/user/<uid>/docker.sock`) — nicht den des rootful-System-Daemons. |

Modell: `mistral-medium-3-5`. Die verfügbaren Modelle hängen vom eigenen Key/Plan ab — prüfbar per `curl https://api.mistral.ai/v1/models -H "Authorization: Bearer $MISTRAL_API_KEY"`. (Ältere Varianten dieser Anleitung nutzten `devstral-medium-2507`; das ist nicht in jedem Plan verfügbar.)

Unterschiede zum Windows-Setup:

- `-d --restart unless-stopped`: läuft dauerhaft im Hintergrund, übersteht Reboots (headless-Betrieb).
- `-p 127.0.0.1:8000:8000`: UI ist **nur lokal** erreichbar – Zugriff von außen ausschließlich per SSH-Tunnel (Schritt 4).
- API-Key wird aus `~/.openhands/mistral.env` in die Shell-Umgebung geladen und per `-e LLM_API_KEY` (ohne Wert) an den Container durchgereicht — steht nie als Klartext in einer Befehlszeile, Datei im geteilten Ordner oder im `~/.profile`.

> [!WARNING] Docker-Socket und Loopback
> Der `docker.sock`-Mount gibt dem Container Kontrolle über den Docker-Daemon. Im Rootless-Betrieb ist das Kontroll-Radius auf dein Benutzerkonto begrenzt (kein host-root) — trotzdem gilt:
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

## Schritt 5: Dateiaustausch per SSH/SCP

Der geteilte Ordner ist schlicht `~/agent` — Unterordner wie `incoming/` und `outgoing/` sind nicht nötig: OpenHands arbeitet direkt im ganzen Ordner, Dateien kommen einfach hinein bzw. liegen nach der Session darin.

```bash
# Datei vom Client auf den Server
scp aufgabe.txt <user>@<server-ip>:agent/

# Ergebnis zurückholen
scp <user>@<server-ip>:agent/antwort.md .
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

Persistenz: Session-State in `~/.openhands`, Arbeitsdaten in `~/agent` – Container löschen kostet keinen Chatverlauf.

## Typische Fehler und Lösungen (Linux/rootless-spezifisch)

| Problem | Ursache / Lösung |
|---|---|
| `permission denied` bei `docker` | Nicht die docker-Gruppe setzen! Prüfen: Läuft der User-Daemon (`systemctl --user status docker.service`) und ist der CLI-Context `rootless` aktiv (`docker context show`)? |
| `dockerd-rootless` startet nicht: `fork/exec /proc/self/exe: permission denied` | AppArmor-Userns-Beschränkung. Bei dpkg-Installation muss `/etc/apparmor.d/rootlesskit` existieren; sonst Profil anlegen oder `docker-ce-rootless-extras` per apt installieren |
| UI im Browser des Clients nicht erreichbar | Tunnel fehlt oder falsch: `ssh -L 8000:localhost:8000` muss laufen; Server bindet nur `127.0.0.1` |
| Sandboxes starten nicht | Socket-Mount fehlt oder zeigt auf den falschen Socket — im Rootless-Betrieb muss `$XDG_RUNTIME_DIR/docker.sock` gemountet werden; `docker logs openhands` zeigt Details |
| Agent kann nicht auf `/projects` schreiben | `--user 0:0` / `SANDBOX_USER_ID=0` gesetzt? Ohne die Flags mappt die Container-UID in den Subuid-Bereich und hat keinen Zugriff auf die Host-Mounts |
| Nach Reboot ist alles weg | `--restart unless-stopped` gesetzt? `loginctl enable-linger $USER` aktiviert (sonst startet der Rootless-Daemon erst mit einer Login-Sitzung)? Persistenz-Mounts (`~/.openhands`, `~/agent`) vorhanden? |
| Verdacht auf Missbrauch von außen | `ss -tlnp` prüfen: Port 8000 darf nur auf 127.0.0.1 lauschen; UFW-Regeln kontrollieren |

## Ausblick

- Vergleichbarer Schnelltest ohne OpenHands-Stack: [[01 Minimaler Testlauf - Mistral Vibe im Docker auf Windows]] (unter Linux identische Befehle, der Austauschordner ist einfach `~/agent` direkt)
- Windows-Variante mit Docker Desktop: [[02 OpenHands auf Windows - Setup und Konfiguration]]
- Dieselbe Ubuntu-Installation, aber lokal am Laptop statt headless: [[03 OpenHands auf Ubuntu 26.04 - Lokal am Laptop]]
