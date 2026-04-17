# Plan d'orchestration -- Versi Studio s22 POC OCR Phase D

<!-- SESSION: phases=0 tasks_prod=0 tasks_consult=0 -->

## Branche
`claude/versi-s21-launch-OsqlY` (reprise s21, pas encore de branche s22 creee)

## Date demarrage
2026-04-17

## Demande utilisateur
Phase D du POC OCR auto-calibration : tester `detectPlanScale()` sur 4 plans reels (haussmanniens R+3), mesurer accuracy, decider GO/NO-GO selon metrique validee par Thomas.

## Mode detecte
Projet existant -- Versi Studio en V1-Production. Extension pipeline OCR.

## Complexite estimee
**Legere** -- 1 agent principal (@ia), 1-2 phases, ~1-2 Tasks producteurs.

Estimation de cout : 1 Task Opus @ia x ~$4 = ~$4-5 + cout OpenAI GPT-4.1 vision (4 appels x ~$0.10-0.30 = ~$0.40-1.20). Total estime : ~$5-6.

## Pre-requis valides
- [x] Cle OpenAI dans `.env.local` (OPENAI_API_KEY presente)
- [x] 4 plans PDF dans `versi-studio/reference-existant/plans-test/`
- [x] `openai` et `pdf-to-img` dans package.json dependencies
- [x] `plan-scale-detector.ts` existe avec signature `detectPlanScale(imageBase64: string, mimeType: string)`
- [ ] `node_modules` a installer (npm install)
- [ ] `dotenv` et `tsx` a installer en devDependencies
- [x] `.gitignore` couvre `.env*`
- [x] Learnings P0/P1 s21 propages (gate de reprise PASS)

## Adaptation critique detectee
Le code du brief Thomas supposait `detectPlanScale(buffer: Buffer)`. La signature reelle est `detectPlanScale(imageBase64: string, mimeType: string)`. Le brief @ia inclut cette correction.

## Plan par phase

### Phase 0 -- Pre-requis (pas de Task producteur)
- `npm install` dans versi-studio/
- `npm install -D tsx dotenv` dans versi-studio/
- Statut : BLOQUE -- pas d'outil Bash disponible dans cette session. Script ecrit, commandes documentees.

### Phase 1 -- Execution script OCR (1 Task @ia producteur)
- Agent : @ia (fallback : orchestrateur en mode typiste -- pas de tool Task disponible)
- Mission : ecrire + executer `scripts/test-ocr-plans.ts`, produire `docs/ia/poc-ocr-resultats.md`
- Script ecrit : `/home/user/Versi/versi-studio/scripts/test-ocr-plans.ts` -- FAIT
- Execution : EN ATTENTE (besoin Bash)
- Livrables : script (FAIT) + resultats JSON (EN ATTENTE) + rapport analyse (EN ATTENTE)
- Statut : PARTIELLEMENT FAIT

### Phase 2 -- Analyse + rapport Thomas
- Lire resultats, appliquer metrique de reussite
- GO seuil actuel / GO seuil ajuste / NO-GO
- Rapport final a Thomas
- Statut : EN ATTENTE

## Metrique de reussite (validee par Thomas)
- >= 3/4 plans avec confidence >= 0.9 = GO seuil actuel
- >= 3/4 plans avec confidence >= 0.7 = GO seuil ajuste
- < 2/4 plans avec confidence >= 0.7 = NO-GO POC non viable

## Metriques live
| Phase | Agents | Paralleles | Relances | P0 | Cout estime | Statut |
|---|---|---|---|---|---|---|
| 0 | 0 | 0 | 0 | 0 | $0 | EN COURS |
| 1 | 1 (@ia) | 0 | - | - | ~$4-5 | EN ATTENTE |
| 2 | 0 | 0 | - | - | $0 | EN ATTENTE |
