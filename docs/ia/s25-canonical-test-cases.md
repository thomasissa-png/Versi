# Test cases CANONICAL_PROMPT_V1 (s25)

**Date** : 2026-04-22 · **Agent** : @ia · **Version prompt** : 1.0 · **Statut** : à exécuter par @qa Phase 2 step 3

Chaque test case définit un input représentatif + critères binaires d'acceptation. Succès global = ≥ 5/7 critères PASS sur chaque TC + 2 TC sur 3 à score parfait.

---

## Méthode d'exécution

Pour chaque TC :
1. Lire input image depuis `/home/user/Versi/versi-studio/test-plans/` (ou HYPOTHÈSE si indisponible)
2. Appel `openai.images.edit({ model: 'gpt-image-1', image: toFile(buf, ...), prompt: CANONICAL_PROMPT_V1, size: '2048x2048', quality: 'high' })`
3. Sauvegarder output dans `/home/user/Versi/docs/ia/s25-canonical-samples/TC{N}-output.png`
4. Auditeur humain (Thomas + @qa) coche chaque critère OUI/NON sur l'output
5. Reporter scores dans ce fichier (section Résultats, à compléter)

---

## TC1 — Scan A3 qualité médiocre (plan photocopié incliné ~3°)

**Input type** : PDF exporté depuis scan d'un plan cadastral ou plan de diagnostic énergétique. Résolution 200-300 DPI, noir et blanc avec bruit de scan (taches, hachures partielles, cotations manuscrites ajoutées au feutre).

**Plan à utiliser** : `versi-studio/test-plans/P03-scan-medioque.pdf` [HYPOTHÈSE — à confirmer par @qa, sinon scanner un plan réel]

**Attentes output — critères binaires** :
- C1 : Murs redessinés en noir uniforme 6px sur fond blanc pur (pas de gris résiduel) — OUI/NON
- C2 : Inclinaison source ~3° corrigée à 0° (plan droit) — OUI/NON
- C3 : Toutes les pièces du source présentes dans l'output (comptage identique) — OUI/NON
- C4 : Aucune cotation / nombre / cartouche visible dans l'output — OUI/NON
- C5 : Ouvertures (portes arcs, fenêtres doubles lignes) présentes aux positions sources (tolérance ±5px) — OUI/NON
- C6 : Pas d'invention de mur ou pièce supplémentaire (vérification par comptage + superposition mentale) — OUI/NON
- C7 : Taches / hachures / annotations manuscrites complètement supprimées — OUI/NON

**Seuil acceptation** : 6/7 minimum. C3 et C6 sont bloquants (FAIL si l'un des deux échoue).

---

## TC2 — PDF vectoriel propre (plan architecte)

**Input type** : Plan produit par logiciel CAO (AutoCAD, ArchiCAD) exporté en PDF vectoriel. Lignes nettes, cotations propres, cartouche fournisseur en bas à droite, légende matériaux, hachures murs porteurs.

**Plan à utiliser** : `versi-studio/test-plans/P01-archi-dwg-export.pdf` [HYPOTHÈSE — à confirmer par @qa]

**Attentes output — critères binaires** :
- C1 : Cartouche architecte en bas à droite complètement supprimé — OUI/NON
- C2 : Toutes les cotations (nombres le long des murs) supprimées — OUI/NON
- C3 : Hachures des murs porteurs remplacées par trait noir plein uniforme — OUI/NON
- C4 : Légende matériaux supprimée — OUI/NON
- C5 : Murs obliques (s'il y en a) préservés dans leur angle d'origine (pas de forçage 90°) — OUI/NON
- C6 : Labels pièces préservés si présents en source, en texte sans-serif simple — OUI/NON
- C7 : Ratio A4 paysage respecté, marges ≤ 50px — OUI/NON

**Seuil acceptation** : 6/7 minimum. C5 bloquant (FAIL si murs obliques forcés à 90°).

---

## TC3 — Plan manuscrit / croquis

**Input type** : Croquis main levée sur papier quadrillé, scanné au smartphone. Traits irréguliers, proportions approximatives, annotations manuscrites dans les pièces ("chambre Léo", "cuisine", "~12m²"), pas de cotations formelles.

**Plan à utiliser** : `versi-studio/test-plans/P05-croquis-main-levee.jpg` [HYPOTHÈSE — à confirmer par @qa, prendre un croquis Thomas réel]

**Attentes output — critères binaires** :
- C1 : Traits irréguliers redessinés en droites nettes 6px — OUI/NON
- C2 : Grille papier quadrillé complètement supprimée — OUI/NON
- C3 : Proportions relatives des pièces préservées (pas de redistribution créative) — OUI/NON
- C4 : Annotations manuscrites transformées en labels sans-serif lisibles OU supprimées si illisibles — OUI/NON
- C5 : Ouvertures (portes/fenêtres) identifiées et rendues en conventions standard — OUI/NON
- C6 : Aucune pièce inventée au-delà du croquis source — OUI/NON
- C7 : Orientation redressée si croquis de travers (≤ 5°) — OUI/NON

**Seuil acceptation** : 5/7 minimum (TC3 plus tolérant car input le plus dégradé). C3 et C6 bloquants.

---

## Validation visuelle (à exécuter par @qa — Phase 2 step 3)

**Pré-requis** :
- Clé `OPENAI_API_KEY` dans `/home/user/Versi/versi-studio/.env`
- 3 plans réels dans `versi-studio/test-plans/` (ou les scanner depuis Thomas)
- Dossier `/home/user/Versi/docs/ia/s25-canonical-samples/` créé

**Script minimal à exécuter par @qa** :
```typescript
import OpenAI, { toFile } from 'openai';
import fs from 'fs/promises';
import { CANONICAL_PROMPT_V1 } from '@/lib/ai/prompts/canonical';

const openai = new OpenAI();
for (const tc of ['TC1', 'TC2', 'TC3']) {
  const buf = await fs.readFile(`./test-plans/${tc}.png`);
  const res = await openai.images.edit({
    model: 'gpt-image-1',
    image: await toFile(buf, 'plan.png', { type: 'image/png' }),
    prompt: CANONICAL_PROMPT_V1,
    size: '2048x2048',
    quality: 'high',
  });
  const out = Buffer.from(res.data[0].b64_json, 'base64');
  await fs.writeFile(`./docs/ia/s25-canonical-samples/${tc}-output.png`, out);
}
```

**Note @ia** : validation visuelle non exécutée dans cette phase (pas d'accès confirmé aux plans test ni clé OpenAI locale vérifiée). @qa doit exécuter sur env réel et reporter scores ci-dessous.

---

## Résultats (à compléter par @qa)

| TC | Score | Critères FAIL | Verdict | Notes |
|---|---|---|---|---|
| TC1 | __/7 | | PASS / FAIL | |
| TC2 | __/7 | | PASS / FAIL | |
| TC3 | __/7 | | PASS / FAIL | |

**GO PRODUCTION** si : TC1 ≥ 6/7 ET TC2 ≥ 6/7 ET TC3 ≥ 5/7 ET aucun critère bloquant FAIL.

Si NO-GO : itérer CANONICAL_PROMPT_V2 avec few-shot ou pré-OCR labels (cf. `prompt-library.md` section "Évolution versions futures").
