# Harmonisation photos fondateurs Versi

Objectif : Thomas et Carl doivent matcher le style de Maxime (golden hour, exterieur, tons chauds, couleur naturelle).

**Photo reference (Maxime)** : portrait exterieur, lumiere naturelle chaude venant de la gauche, fond nature/ciel flou, chemise rayee claire, sourire naturel, teint chaud. 928x1120 px.

---

## 1. Recommandation de plateforme

| Outil | Preservation visage | Relighting + fond | Facilite | Cout | Verdict |
|---|---|---|---|---|---|
| **Relight AI (relightai.co)** | Excellente (ne touche pas a la geometrie) | Prompt texte pour fond + lumiere en une passe | Upload + prompt + clic | Gratuit (tokens mensuels) | **RETENU** |
| IC Light V2 (via iclight.net ou HuggingFace) | Excellente | Meilleur relighting pur, mais ne change pas le fond | Web demo ou local | Gratuit | **COMPLEMENT** pour ajuster la lumiere apres Relight AI si necessaire |
| Clipdrop Relight | Bonne | Controle par points lumineux (pas par prompt) — moins intuitif | Drag & drop | Gratuit (base) | Plan C |
| Fotor Colorize + Relight | Bonne | Colorisation + relighting dans le meme outil | Web UI | Gratuit (base) | Alternative colorisation |

**ATTENTION** : iclightai.com est un site NON OFFICIEL — le vrai IC Light est sur GitHub (lllyasviel/IC-Light). Utiliser iclight.net ou le HuggingFace Space officiel.

**Strategie retenue** : Relight AI en outil principal (fond + lumiere en une passe via prompt). Si le resultat manque de chaleur, passer dans IC Light pour affiner la lumiere uniquement.

---

## 2. Prompts exacts

### Photo Thomas (thomas.png — B&W studio vers warm outdoor)

**Etape 1 — Coloriser d'abord** (obligatoire, la photo est quasi N&B) :
- Aller sur **fotor.com/features/colorize-photo/** (gratuit, pas de watermark sur la colorisation)
- OU **imagecolorizer.com** (gratuit, HD disponible)
- Upload thomas.png → telecharger la version colorisee en PNG

**Etape 2 — Relight AI (relightai.co/dashboard)** :
Upload la photo colorisee, coller ce prompt dans "Background Prompt" :

```
Soft blurred outdoor background with green trees and overcast sky,
warm golden hour sunlight coming from the left side, natural warm
color temperature, soft bokeh nature background, portrait photography
with shallow depth of field, gentle warm rim light on hair
```

**Etape 3 — Verifier** : comparer le visage avec l'original. Les yeux, le nez, la bouche doivent etre identiques. Si deformation → regenerer (le resultat varie a chaque generation).

### Photo Carl (Carl-picture.jfif — casual vers warm outdoor)

Carl est deja en couleur. Passer directement a Relight AI.

**Relight AI prompt** :

```
Soft blurred outdoor background with green trees and overcast sky,
warm golden hour sunlight coming from the left side, natural warm
color temperature, soft bokeh nature background, portrait photography
with shallow depth of field, gentle warm rim light on hair
```

---

## 3. Parametres et recadrage

**Resolution** :
- Thomas : 1024x1024 → apres crop 3:4 = ~768x1024. Upscale via **upscale.media** (gratuit, 2x) vers ~1536x2048 AVANT le relight pour un meilleur resultat
- Carl : 706x706 → upscale 2x d'abord vers ~1412x1412, puis relight, puis crop 3:4
- Maxime : 928x1120 → deja quasi 3:4, crop mineur

**Recadrage final (les 3 photos)** :
- Ratio 3:4 (le composant `team__photo-wrapper` utilise `aspect-ratio: 3/4`)
- Cadrage : tete + epaules, visage au 1/3 superieur, espace au-dessus de la tete
- Outil : Photopea.com (gratuit, Photoshop en ligne) ou Canva
- Taille cible : 900x1200 px minimum

---

## 4. Workflow etape par etape

### Thomas (le plus complexe)

1. Upscale thomas.png via upscale.media (2x → 2048x2048)
2. Coloriser via fotor.com/features/colorize-photo/ → telecharger PNG
3. Upload sur relightai.co → coller le prompt Thomas → generer
4. Comparer le visage : si OK → telecharger. Si deformation → regenerer (3 essais max)
5. Recadrer en 3:4 via Photopea.com → exporter 900x1200 px PNG
6. Renommer : thomas-harmonised.png

### Carl

1. Upscale Carl-picture.jfif via upscale.media (2x)
2. Upload sur relightai.co → coller le prompt Carl → generer
3. Comparer le visage → telecharger si OK
4. Recadrer en 3:4 → exporter 900x1200 px PNG
5. Renommer : carl-harmonised.png

### Maxime (reference — ne rien changer)

1. Recadrer en 3:4 exact si necessaire (crop mineur bas de la photo)
2. Renommer : max-harmonised.png

### Harmonisation finale des couleurs (si necessaire)

Si les 3 photos ont encore des ecarts de teinte apres relighting :
- Ouvrir les 3 dans Photopea.com
- Sur Thomas et Carl : Image → Adjustments → Match Color → source = max-harmonised.png
- Intensity a 50-70%

---

## 5. Plan B

| Option | Delai | Cout | Quand l'utiliser |
|---|---|---|---|
| Fiverr "color match 3 team headshots" | 24-48h | 15-30 EUR | Si le visage de Thomas est degrade apres 3 essais |
| Reshoot les 3 en exterieur (meme lieu, meme heure) | 1 semaine | 0 EUR (smartphone suffit) | Si aucune harmonisation IA ne donne un resultat pro |
| Photopea manual | 2h | Gratuit | Coloriser + ajuster la balance manuellement (necessite des bases Photoshop) |

**Recommandation Plan B** : si apres 3 essais Relight AI le visage de Thomas est degrade, poster une mission Fiverr "Color match and harmonize 3 team headshots to warm outdoor style — reference photo provided" avec max.png comme reference. Budget 20 EUR, livraison 24h.

---

**Handoff → Thomas (execution manuelle)**
- Fichier produit : `docs/ia/photo-harmonisation-prompts.md`
- Decisions prises : Relight AI (relightai.co) comme outil principal — fond + lumiere en une passe via prompt. Colorisation prealable obligatoire pour Thomas (fotor.com). IC Light en complement si la lumiere manque de chaleur. Pas de generation IA du visage — uniquement relighting et changement de fond.
- Points d'attention : toujours comparer le visage avant/apres. Upscale AVANT le relight (meilleure qualite). Les photos finales doivent etre en PNG, ratio 3:4, minimum 900x1200px. Placer dans `/Photos/` en gardant les originales en backup.
