---
titel: "Quellen: IT-Sicherheit von KI/LLMs"
thema: "LLMs sind prinzipiell nicht absicherbar"
tags: [quelle, it-sicherheit, llm, guardrails, gödel, adversarial-prompts, prompt-injection, owasp, agentic-ai, threat-modeling]
stand: 2026-09-24
---

# Quellen: IT-Sicherheit von KI/LLMs

Quellen zur Stützung der Randbemerkung **„LLMs sind prinzipiell nicht absicherbar“** — nicht der Kern des Seminar-Inputs, sondern Stützungsbelege.

## 1) Vortragsaufzeichnung: Threat Modeling für KI-Agenten

**Titel:** [Vier grüne Häkchen, trotzdem gehackt: Threat Modeling für KI-Agenten](https://media.ccc.de/v/god2026-110764-vier-grune-hakchen-trotzd)

- **Autor:** Christian Schneider
- **Veranstaltung:** German OWASP Day 2026
- **Kernaussage:** Per-Komponenten-Security-Reviews reichen bei Agentic AI nicht aus, da Angriffspfade über Vertrauensgrenzen hinweg entstehen. Der Vortrag stellt die **Fünf-Zonen-Brille** (Eingabe, Planung, Tool-Ausführung, Speicher, Agent-zu-Agent-Kommunikation) als systematische Methode vor, inkl. realer Beispiele wie **EchoLeak (CVE-2025-32711)**.
- **Lizenz:** [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

## 2) NIST-Meldung (Pressemitteilung)

**Titel:** [NIST Mathematical Proof Supports Transition to a Continuous-Monitor-and-Update Security Model for AI Systems](https://www.nist.gov/news-events/news/2026/06/nist-mathematical-proof-supports-transition-continuous-monitor-and-update)

- **Autor der Meldung:** Chad Boutin (NIST News)
- **Datum:** 9. Juni 2026
- **Kernaussage:** Apostol Vassilev (Senior Scientist, NIST) legt einen mathematischen Beweis vor: **Keine feste (endliche) Menge von Guardrails ist universell robust gegen adaptive adversarialische Prompts.** Der Beweis überträgt die Logik von Kurt Gödels Unvollständigkeitssätzen (1931) auf KI-Systeme — für jede feste Regelmenge existieren Prompts, die sie umgehen; man muss sie nur finden.
- **Praktische Konsequenz laut NIST:** Abkehr vom „One-and-Done“-Sicherheitsmodell; Übergang zu **Continuous-Monitor-and-Update** mit drei Elementen: (1) kontinuierliches Red Teaming, (2) fortlaufende Härtung der Guardrails, (3) operative Resilienz. Der Beweis liefert Angreifern kein Rezept — Ziel ist, dass die Kosten der Exploit-Suche die Angreiferressourcen übersteigen.

## 3) Paper (Primärquelle)

**Titel:** *Robust AI Security and Alignment: A Sisyphean Endeavor?*

- **Autor:** Apostol Vassilev (NIST, Information Technology Laboratory)
- **Veröffentlichung:** IEEE Security & Privacy, vol. 24, no. 3 (Mai/Juni 2026), S. 52–58
- **DOI:** [10.1109/MSEC.2026.3678214](https://doi.org/10.1109/MSEC.2026.3678214)

**Links (Volltext):**
   Quelle | Link |
 |---|---|
 | PMC (Open Access) | https://pmc.ncbi.nlm.nih.gov/articles/PMC13533067/ |
 | IEEE Xplore | https://ieeexplore.ieee.org/iel8/8013/11519081/11475847.pdf |
 | NIST-PDF | https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=960858 |
 | NIST CSRC | https://csrc.nist.gov/pubs/journal/2026/05/robust-ai-security-and-alignment-a-sisyphean-endea/final |
 | NIST-Publikationsseite | https://www.nist.gov/publications/robust-ai-security-and-alignment-sisyphean-endeavor |

- **Kernaussage:** Das Paper etabliert **informationstheoretische Grenzen** für die Robustheit von KI-Sicherheit und KI-Alignment (Gödel-Argumentation) und leitet weitere Resultate zu kognitiven Reasoning-Grenzen von KI-Systemen ab. Titelgebend: Sicherheit als endloser Prozess („Sisyphus-Arbeit“), kein erreichbarer Endzustand.

**Zitation:**
> Vassilev, A. (2026). Robust AI Security and Alignment: A Sisyphean Endeavor? *IEEE Security & Privacy*, 24(3), 52–58. https://doi.org/10.1109/MSEC.2026.3678214

## 4) OWASP Top 10 for LLM Applications

- **Aktuelle Version (2026):** https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/
- **Übersichtsseite / Archiv:** https://genai.owasp.org/llm-top-10/
- **Offizielles GitHub-Repository:** https://github.com/GenAI-Security-Project/GenAI-LLM-Top10
- **OWASP-Projektseite:** https://owasp.org/projects/top-10-for-large-language-model-applications
- **Kernaussage:** Liste der kritischsten Sicherheitsrisiken für LLM-Anwendungen; **Prompt Injection** belegt Platz 1 — die praktische Seite dessen, was Vassilev mathematisch beweist. Risiken sind u. a. auf NIST, MITRE ATLAS und CWE gemappt.

**Zitation:**
> OWASP GenAI Security Project. (2026). *OWASP Top 10 for Large Language Model Applications (Version 2026)*. OWASP Foundation. https://doi.org/10.5281/zenodo.22109014

---

## Zusammenhang der Quellen

- **Christian Schneider (Vortrag):** Praktische Belege für die **Unzulänglichkeit von Per-Komponenten-Security-Reviews** bei Agentic AI. Die **Fünf-Zonen-Brille** zeigt, wie Angriffspfade quer über Vertrauensgrenzen entstehen — selbst wenn jede Komponente einzeln sicher erscheint („vier grüne Häkchen“). Konkrete Beispiele: **EchoLeak (CVE-2025-32711)**, RAG-Pipeline-Poisoning, MCP-Tool-Chain-Missbrauch.
- **Vassilev (Paper):** Mathematischer Beweis — **keine endliche Guardrail-Menge ist universell robust** (Gödel-Logik, informationstheoretische Grenzen).
- **NIST-Meldung:** Offizielle Einordnung und praktische Konsequenz (**Continuous-Monitor-and-Update**-Modell).
- **OWASP LLM Top 10:** Empirische/praktische Bestätigung — **Prompt Injection als Risiko Nr. 1**.

Zusammen stützen sie die Randbemerkung: **Konventionelle, statische Sicherheitsmodelle können LLMs und KI-Agenten prinzipiell nicht vollständig absichern; Sicherheit ist ein kontinuierlicher Prozess, kein Zustand.**
