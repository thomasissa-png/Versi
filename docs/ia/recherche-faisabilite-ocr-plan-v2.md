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

**Recherches WebSearch effectuées (2026-04-16)** :
- Query 1 : `"GPT-4 Vision Claude Sonnet architectural blueprint scale extraction accuracy benchmark 2025"`
- Query 2 : `"Tesseract OCR architectural plan scale ratio detection accuracy"`

**Verdict honnête sur les sources (règle n°2 zéro invention)** :

> **Aucun benchmark public spécifique à l'extraction d'échelle sur plans d'architecte n'a été trouvé.** Ni pour LLM Vision (GPT-4V / Claude Sonnet), ni pour Tesseract, ni pour OpenCV. Les comparatifs de modèles 2025-2026 portent sur des benchmarks généralistes (MMLU, HumanEval, vision documents génériques), pas sur ce use case de niche.

**Sources consultées (non-spécifiques mais utiles pour calibrer Tesseract)** :
- [Tesseract documentation — Improving quality](https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html) : DPI ≥ 300 obligatoire, dégradation rapide en dessous de 8pt × 300dpi.
- [Improving Tesseract 4.0 accuracy via preprocessing (ResearchGate)](https://www.researchgate.net/publication/341155551_Improving_the_Accuracy_of_Tesseract_40_OCR_Engine_Using_Convolution-Based_Preprocessing) : preprocessing adaptatif fait passer accuracy caractère de 0.134 à 0.616 (+359%) — pertinent pour le cas dégradé "plan scanné".
- [Deep Learning OCR — Tesseract vs docTR](https://47billion.com/blog/deep-learning-ocr-tesseract-vs-doctr-explained-with-real-world-results/) : sur layouts complexes (multi-colonnes, rotations), Tesseract perd ~20-30 points d'accuracy vs OCR deep-learning modernes — cohérent avec note "barre graphique rotative" du tableau Section 4.

**Sources comparatifs LLM (non-spécifiques au use case)** :
- [LM Council — AI Model Benchmarks Apr 2026](https://lmcouncil.ai/benchmarks)
- [Claude 4 Sonnet vs GPT-5 — Production APIs 2026](https://contracollective.com/blog/claude-4-sonnet-vs-gpt-5-ai-api-production-2026)

**Conséquence méthodologique** : tous les chiffres d'accuracy de la Section 4 sont des **estimations qualifiées** (basées sur la connaissance générale des outils + retours empiriques sur use cases adjacents : OCR de documents techniques, extraction de tableaux par LLM Vision). **Aucun chiffre n'est cité comme un fait validé.** La seule façon d'obtenir des chiffres réels = POC sur ≥10 plans représentatifs Thomas. Coût POC (Approche B) = ~0.10 € de tokens + 1 jour dev.



---

## 7. Décision GO V2 / NO-GO V2 / À reconsidérer

**Décision : NO-GO V2 immédiat — À RECONSIDÉRER après 3 mois de V1 prod.**

**Raisons (par ordre d'importance)** :

1. **ROI négatif au volume actuel.** Volume estimé V1 = 1-3 plans/semaine. Temps économisé maximum = ~2 minutes/semaine. Coût dev V2 (Approche B, la moins chère) = 2-3 jours. Payback > 30 ans. Règle "ROI < 1 = feature IA non justifiée" du protocole @ia → NO-GO.

2. **Risque silencieux d'erreur ×4.** Si le LLM hallucine "1:100" alors que le plan est en "1:200", toutes les surfaces sont divisées par 4. Thomas ne s'en rendra pas compte avant publication d'une annonce avec un T3 affiché à 18 m². En V2.0 il faudrait DE TOUTE FAÇON une étape de validation humaine ("Échelle détectée : 1:100 — confirmer ?"), ce qui annule 80% du gain de temps vs V1 manuelle.

3. **Pas de benchmark public pour valider la faisabilité.** On ne peut pas s'engager sur une feature dont on ignore l'accuracy réelle sur les inputs Thomas. Un POC est nécessaire AVANT décision finale — coût POC ~1 jour dev, mais à n'engager QUE si volume justifie l'investigation.

4. **V1 manuelle n'est pas une friction réelle.** Tracer une ligne sur un mur connu + saisir "5.80" prend ~30 secondes. Thomas, marchand de biens habitué aux plans, fait ça naturellement. C'est une friction perçue par l'agent IA, pas par l'utilisateur.

**Conditions de réouverture du sujet (triggers V2)** :
- Volume > 20 plans/semaine en prod (Versi Studio scale-up ou exposition à d'autres marchands de biens)
- Thomas remonte explicitement la calibration manuelle comme top friction (via feedback in-app ou échange direct)
- Évolution majeure d'un modèle Vision avec benchmark public dédié à l'extraction de plans (ex : Anthropic publie un cookbook "blueprint analysis" avec accuracy mesurée)



---

## 8. Alternative proposée (puisque NO-GO V2)

**Plan d'action recommandé** (par ordre de priorité) :

### Court terme (V1, déjà acté) — Garder calibration manuelle modale
Aucun changement — la spec F05 Section "Recommandation Q2" est validée. Coût : 0 €.

### Moyen terme (3-6 mois) — Instrumentation pour décider en data-driven
Ajouter 3 events analytics (handoff @data-analyst → tracking-plan) sur le composant `PlanCalibration` :
- `plan_calibration_opened` (quand bannière cliquée)
- `plan_calibration_completed` (sauvegarde `m2_per_pixel` réussie) avec props : `duration_seconds`, `attempts_count`
- `plan_calibration_abandoned` (modale fermée sans sauvegarde)

**Objectif** : avoir des données réelles sur (a) volume hebdo, (b) temps moyen, (c) taux d'abandon. Ces 3 métriques tranchent objectivement le débat V2 dans 3 mois.

### Si V2 est déclenchée plus tard — Approche progressive en 3 paliers (recommandée)
1. **Palier 1 (POC — 1 jour)** : tester Claude Sonnet 4.5 Vision sur 10 plans réels Thomas. Mesurer accuracy par cas (mention texte / barre graphique / sans mention). Si accuracy cas 1 < 80% → STOP, conserver V1 indéfiniment.
2. **Palier 2 (V2.0 — assistant pré-rempli, ~2 jours)** : LLM Vision détecte l'échelle ET la propose dans la modale de calibration manuelle (ratio pré-rempli + ligne pré-positionnée si possible). Thomas valide ou corrige en 1 clic. Ne supprime PAS la calibration manuelle, l'augmente. Risque silencieux quasi-éliminé.
3. **Palier 3 (V2.1 — full auto, +1 jour)** : si Palier 2 montre > 95% de validations sans modification sur 100 plans, passer en mode "auto + bannière confirmation discrète". Logging Langfuse obligatoire pour détecter dérive.

### Alternative non-IA (à considérer si volume reste faible)
Améliorer l'UX de la modale V1 : ligne de calibration pré-positionnée sur le plus long mur détecté par OpenCV (HoughLinesP, ~50 lignes de code, faisabilité HAUTE, coût marginal 0 €). Thomas ajuste les extrémités si besoin et saisit la dimension. Gain estimé : -10s par calibration. ROI quasi-nul mais améliore l'expérience perçue. **Optionnel, à n'engager que si Thomas le demande explicitement.**



---

## 9. Handoff

---
**Handoff → @product-manager (puis Thomas pour décision finale)**

- **Fichier produit** : `/home/user/Versi/docs/ia/recherche-faisabilite-ocr-plan-v2.md`
- **Décision technique recommandée** : NO-GO V2 OCR/IA immédiat. Conserver V1 calibration manuelle (déjà spec'ée et validée Q2 de F05).
- **Justification** : ROI < 0.05 au volume estimé (1-3 plans/sem) + risque silencieux d'erreur ×4 sur surfaces + aucun benchmark public pour valider l'accuracy.
- **Points d'attention pour @product-manager** :
  - Mettre à jour `vs-spec-f05-surface-m2-temps-reel.md` Section Q3 : remplacer "Report en V2" par "Report en V2 conditionnel — voir `docs/ia/recherche-faisabilite-ocr-plan-v2.md`. Triggers de réouverture documentés."
  - Ajouter au backlog produit (V2 conditionnelle) : POC Approche B (1 jour) + Palier 2 assistant pré-rempli (2 jours) si POC concluant.
- **Handoff parallèle → @data-analyst** :
  - Ajouter 3 events à `tracking-plan.md` : `plan_calibration_opened`, `plan_calibration_completed` (props `duration_seconds`, `attempts_count`), `plan_calibration_abandoned`. Objectif = data-driven decision V2 dans 3 mois.
- **Handoff parallèle → @fullstack** (si V1 implémentée plus tard) :
  - Instrumenter les 3 events ci-dessus dans le composant `PlanCalibration`.
- **Aucun code à produire dans `src/lib/ai/`** : NO-GO V2 = aucun appel LLM ajouté.
- **Question ouverte pour Thomas** : valides-tu ce NO-GO V2 ? Si tu veux quand même un POC rapide (1 jour), dis-le et @ia + @fullstack lancent l'Approche B sur 10 plans tests pour mesurer l'accuracy réelle avant de fermer définitivement le sujet.
---

