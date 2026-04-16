# Recherche de faisabilité — Détection automatique de l'échelle d'un plan (V2)

> Livrable @ia — recherche pragmatique, pas un POC.
> Spec source : `docs/product/vs-spec-f05-surface-m2-temps-reel.md` (Q3 / Option 3)
> Décision V1 actée : calibration manuelle modale. V2 = automatique si faisable.

---

## 1. En-tête

- **Date** : 2026-04-16
- **Session** : versi-s19-visuels-autopilot
- **Branche** : `claude/versi-s19-visuels-autopilot-K7mQr`
- **Auteur** : @ia
- **Persona cible** : Thomas (marchand de biens, outil INTERNE Versi Studio)
- **Question Thomas** : "peut-on y arriver ? Si oui faisons. Sinon faison pas de suite."

---

## 2. Résumé exécutif

**Verdict : NO-GO V2 dans l'immédiat — À RECONSIDÉRER après 3 mois de V1 prod.**

L'approche LLM Vision (Claude Sonnet) est techniquement la plus prometteuse (faisabilité MOYENNE-HAUTE pour plans avec mention textuelle "1:100"), mais aucun benchmark public ne valide une accuracy fiable sur des plans réels (notamment plans scannés sans mention d'échelle). Coût marginal acceptable (~0.005-0.015 € par plan), MAIS le ROI est faible vs la calibration manuelle V1 qui prend ~30 secondes pour Thomas (1-2 plans/semaine = ~1 minute de friction hebdo).

**Recommandation actionnable** : conserver V1 manuelle, instrumenter en prod (combien de plans calibrés/semaine, temps moyen de calibration), reconsidérer V2 si volume > 20 plans/semaine OU si Thomas signale une friction réelle.

---

## 3. Use case précis

**Inputs réels (Thomas upload depuis sources hétérogènes)** :
1. **Plan d'architecte vectoriel/PDF propre** avec mention textuelle "1:100", "1/200", "Échelle 1/100" — cas le plus fréquent (~40-50% estimé, à valider)
2. **Plan avec barre d'échelle graphique** (segment + annotations "0 — 5m — 10m") — fréquent sur plans pro (~20-30%)
3. **Plan avec dimensions cotées** (ex: "5,80 m" à côté d'un mur, sans échelle globale)
4. **Plan scanné sans aucune indication** (cas dégradé, ~10-20%) — IMPOSSIBLE à résoudre sans humain dans la boucle

**Output attendu** : `m2_per_pixel: number` (DECIMAL(12,6)) à persister dans `vs_plans.m2_per_pixel`.
**Précision cible** : ±5-10% (Thomas décide "T2 ou T4 ?", pas du cadastre).
**Volume estimé** : 1-3 plans / semaine en V1 (1-2 immeubles/mois × 1-3 plans).

---

## 4. Comparaison des 3 approches

| Critère | A — Tesseract OCR + regex | B — LLM Vision (Claude Sonnet) | C — OpenCV + OCR ciblé |
|---|---|---|---|
| **Faisabilité technique** | MOYENNE (cas 1 uniquement) | MOYENNE-HAUTE (cas 1+2+3) | FAIBLE-MOYENNE (cas 2 + barres graphiques) |
| **Accuracy estimée cas 1** (mention "1:100") | 70-85% si DPI ≥ 300, plan propre | 85-95% (estimation, pas de benchmark public spécifique) | 60-75% (Tesseract sous-jacent identique) |
| **Accuracy cas 2** (barre graphique) | 30-50% (texte rotatif, segments à corréler) | 60-80% (estimation) | 70-85% si pipeline custom |
| **Accuracy cas 3-4** (sans mention) | 0% | 5-15% (extrapolation hasardeuse, à éviter) | 0% sans dimensions cotées explicites |
| **Coût marginal / plan** | ~0 € (Tesseract.js local) | ~0.005-0.015 € (1 image ~1500 tokens input + ~100 output @ Sonnet 4.5) | ~0 € si OpenCV self-host, ~0.001 € si AWS Rekognition |
| **Latence** | 2-5s côté serveur (Tesseract Node) | 3-8s (Vision API) | 5-15s (pipeline multi-étapes) |
| **Temps dev V2** | 3-5 jours (extraction + regex + tests sur ≥10 plans réels Thomas) | 2-3 jours (prompt + Zod schema + retry + fallback) | 8-12 jours (pipeline CV custom) |
| **Risque silencieux** | Plan mal calibré sans alerte → erreur ±50% sur surfaces | LLM hallucine "1:100" alors que c'est "1:200" → erreur ×4 sur surfaces | Pipeline complexe, debug difficile |
| **Maintenance** | Faible (regex stables) | Moyenne (modèle évolue, prompts à re-tester) | Haute (pipeline fragile aux variations de plans) |

**Notes de prudence (règle n°2 zéro invention)** :
- Les chiffres d'accuracy ci-dessus sont des **estimations qualifiées** basées sur la connaissance générale des outils, PAS sur un benchmark public sur plans d'architecte. Aucune étude académique chiffrée trouvée (cf. Section 6).
- La validation réelle nécessite un POC sur ≥10 plans représentatifs des sources Thomas.

---

## 5. Approche recommandée (SI V2 est déclenchée)

**Approche B — LLM Vision (Claude Sonnet 4.5)** est la moins coûteuse en temps dev et la plus polyvalente sur les 3 cas typiques.

**Architecture cible si on faisait V2** :
1. Upload plan → conversion image (PNG, ≤2000px côté max pour limiter tokens)
2. Appel Claude Sonnet 4.5 Vision avec prompt structuré + Zod schema :
   ```
   { detected: boolean, scale_ratio: string|null, source: "text"|"graphic"|"none",
     confidence: 0-1, reasoning: string }
   ```
3. Si `confidence ≥ 0.8` ET `source !== "none"` → calcul `m2_per_pixel` automatique + bannière "Échelle détectée : 1:100 — confirmer ?" (toujours validation humaine en V2.0, full auto en V2.1)
4. Sinon → fallback sur calibration manuelle V1 (déjà en place, code réutilisé)
5. Logging Langfuse : input image hash, output, confidence, validation Thomas (oui/non)

**ROI estimé (si volume = 2 plans/semaine)** :
- Temps économisé : 30s × 2 = 60s/semaine = ~1h/an
- Coût horaire Thomas : disons 80 €/h → gain : ~80 €/an
- Coût tokens : 0.01 € × 2 × 52 = ~1 €/an
- ROI brut = 80, MAIS coût de dev V2 (3 jours @ ~1000€/j) = 3000 € → **payback 37 ans**

**ROI uniquement positif si** :
- Volume × 10 (20 plans/semaine) → ROI 1-2 ans
- OU intégration dans futur produit "Versi Studio SaaS" exposé à d'autres marchands de biens (cas non en scope V1)

---

## 6. Sources

[À remplir]

---

## 7. Décision GO V2 / NO-GO V2 / À reconsidérer

[À remplir]

---

## 8. Si NO-GO — alternative proposée

[À remplir]

---

## 9. Handoff

[À remplir]
