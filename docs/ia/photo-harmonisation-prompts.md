# Harmonisation photos fondateurs Versi

Objectif : les 3 photos fondateurs doivent avoir un style uniforme — exterieur, green bokeh naturel, golden hour douce, tons chauds.

**Photo reference de style** : thomas3.png (VALIDE 8/10) — exterieur, golden hour, blazer marine, fond vert bokeh naturel, regard face camera. C'est desormais la reference de style pour les retouches restantes.

**Statut global** :
| Fondateur | Photo source | Photo validee | Statut | Score |
|---|---|---|---|---|
| Thomas | thomas.png | thomas3.png | VALIDE | 8/10 |
| Carl | Carl-picture.jfif | Carl3.png | ACCEPTABLE — V2 optionnelle recommandee | 7.5/10 |
| Maxime | max.png | — | A RETOUCHER — max2.png rejetee (4/10) | — |

---

## 0. Consignes anti-artefacts IA (obligatoire pour TOUS les prompts)

Les outils de relighting/fond IA produisent des artefacts reconnaissables. Chaque prompt DOIT integrer ces garde-fous :

**INTERDIT dans tout resultat** :
- Bokeh balls (ronds lumineux flous) — marqueur IA le plus evident
- Lens flare artificiels (trainees lumineuses)
- Saturation excessive de la lumiere golden hour (pas de "filtre Instagram")
- Fond avec eau, plage, coucher de soleil tropical — aucun fond "paradise"
- Halos lumineux autour du sujet (transition fond trop nette ou trop brillante)
- Peau lissee artificiellement ou teinte de peau orange
- Yeux avec reflets non naturels

**OBLIGATOIRE dans tout resultat** :
- Fond = vegetation verte floue UNIQUEMENT (arbres, feuillage, haie)
- Bokeh = doux et uniforme, pas de points lumineux individuels visibles
- Lumiere = naturelle, laterale gauche, chaleur moderee (pas sursaturee)
- Transition sujet/fond = progressive et naturelle (pas de decoupe nette)
- Teint de peau = naturel, fidele a la photo source

**Si l'outil supporte les negative prompts** (Relight AI, Stable Diffusion, etc.) :
```
Negative prompt: bokeh balls, lens flare, light orbs, circular highlights,
oversaturated, orange skin, artificial glow, water reflection, beach,
sunset over water, HDR effect, Instagram filter, smooth skin, airbrushed,
plastic skin, halo around subject, sharp cutout edges
```

**Regle de validation** : comparer le resultat avec thomas3.png. Si le fond ou la lumiere semble "plus IA" que thomas3 → rejeter et regenerer.

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

### Photo Thomas — VALIDE (thomas3.png — 8/10)

**Statut : FAIT.** thomas3.png est validee et sert desormais de reference de style.

Retour audit : exterieur, golden hour, blazer marine, regard face camera — le bon registre. Legere asymetrie oculaire et transition fond un peu nette, mais subtil et acceptable.

<details>
<summary>Historique du prompt utilise (pour reference)</summary>

**Etape 1 — Coloriser** (photo source quasi N&B) :
- fotor.com/features/colorize-photo/ ou imagecolorizer.com
- Upload thomas.png → telecharger la version colorisee en PNG

**Etape 2 — Relight AI (relightai.co/dashboard)** :
Upload la photo colorisee, prompt "Background Prompt" :

```
Soft blurred outdoor background with green trees and overcast sky,
warm golden hour sunlight coming from the left side, natural warm
color temperature, soft bokeh nature background, portrait photography
with shallow depth of field, gentle warm rim light on hair
```

**Etape 3 — Verification visage** : comparer avec l'original.
</details>

---

### Photo Carl — ACCEPTABLE (Carl3.png — 7.5/10) + Prompt V2 optionnel

**Statut : ACCEPTABLE AVEC RESERVE.** Carl3.png est utilisable en l'etat mais une V2 ameliorerait la coherence avec thomas3.png.

**Retour audit Carl3.png** :
- Regard trop off-camera (profil 3/4 trop marque) — thomas3 regarde face camera
- Cadrage plus large que les autres — thomas3 est plus serre (tete + epaules)
- Le fond et la lumiere sont corrects

**Decision** : utiliser Carl3.png en V1. Si une V2 est souhaitee, utiliser le prompt ci-dessous.

#### Prompt V2 Carl (optionnel — cadrage + regard corriges)

**Pre-requis** : partir de la photo source originale Carl-picture.jfif (pas de Carl3.png).

**Etape 1 — Recadrer AVANT le relight** :
- Ouvrir Carl-picture.jfif dans Photopea.com
- Recadrer en portrait serre : tete + epaules uniquement, comme thomas3.png
- Le visage doit occuper environ 40-50% de la hauteur du cadre
- Exporter en PNG

**Etape 2 — Relight AI (relightai.co/dashboard)** :
Upload la photo recadree, prompt "Background Prompt" :

```
Soft blurred outdoor background with natural green foliage and leaves,
warm golden hour sunlight coming from the left side, natural warm
color temperature, smooth uniform green bokeh without any visible
light spots or bokeh balls, portrait photography with shallow depth
of field, gentle warm fill light, natural skin tones
```

**Negative prompt** (si supporte) :
```
bokeh balls, lens flare, light orbs, circular highlights,
oversaturated, orange skin, artificial glow, water, beach,
sunset over water, HDR effect, smooth skin, halo around subject
```

**Etape 3 — Verification** :
- Le regard : doit sembler diriger vers l'objectif (ou quasi). Si le regard reste trop off-camera, l'outil ne peut pas corriger cela — dans ce cas, Carl3.png reste le meilleur resultat.
- Le cadrage : doit matcher thomas3.png (meme proportion tete/epaules dans le cadre)
- Le fond : vert bokeh uniforme, pas de bokeh balls, pas de saturation excessive

---

### Photo Maxime — A RETOUCHER (max2.png rejetee 4/10)

**Statut : A FAIRE.** max2.png est un ECHEC — l'original max.png est superieur.

**Retour audit max2.png (4/10 — FAIL)** :
- Bokeh balls (ronds lumineux flous) = marqueur IA le plus evident
- Lumiere golden hour sursaturee = "filtre Instagram"
- Fond eau/lumiere rasante = "IA paradise"
- L'original max.png est MEILLEUR que cette version retouchee

**Analyse de max.png (photo source)** :
- Fond : exterieur overcast (ciel couvert), vegetation naturelle mais tonalite grise/froide
- Sujet : chemise rayee claire, sourire naturel, teint chaud, lumiere venant de la gauche
- Qualite : bonne, 928x1120 px, visage bien expose
- Probleme : le fond est gris/froid alors que thomas3 et Carl3 ont un fond vert bokeh chaud

**Objectif** : remplacer le fond gris overcast de max.png par un fond vert bokeh naturel (comme thomas3.png) SANS toucher au visage, a la chemise, ni a l'expression. Le resultat doit etre indiscernable d'une vraie photo prise en exterieur par un photographe.

#### Prompt Maxime V3 — Methode 1 : Relight AI (recommandee)

**Etape 1 — Upload max.png directement** (deja en couleur, pas besoin de coloriser ni d'upscale — 928x1120 est suffisant).

**Etape 2 — Relight AI (relightai.co/dashboard)** :
Upload max.png, prompt "Background Prompt" :

```
Soft blurred outdoor background with natural green trees and foliage
only, uniform smooth green bokeh with no visible light spots or
bright circles, warm but gentle golden hour sunlight from the left
side, subtle warm color temperature without oversaturation, natural
portrait photography with shallow depth of field, soft diffused
light on subject, realistic outdoor park setting, no water no sky
visible in background
```

**Negative prompt** (si supporte) :
```
bokeh balls, lens flare, light orbs, bright circles, circular
highlights, oversaturated golden light, orange tint, water,
lake, river, ocean, beach, sunset reflection, HDR, Instagram
filter, artificial glow, halo, smooth plastic skin, airbrushed
skin, sharp edge cutout, visible mask boundary
```

**Parametres Relight AI** (si disponibles) :
- Lighting intensity / strength : reduire a 60-70% (pas 100% — evite la sursaturation)
- Si un slider "background blur" existe : valeur moyenne (le bokeh doit etre present mais pas excessif)

**Etape 3 — Verification stricte** :
1. **Test bokeh balls** : zoomer sur le fond a 200%. Si des ronds lumineux individuels sont visibles → REJETER
2. **Test saturation** : mettre thomas3.png et le resultat cote a cote. Si la lumiere de Maxime est visiblement plus chaude/saturee que Thomas → REJETER
3. **Test "filtre Instagram"** : montrer la photo a quelqu'un sans contexte. S'il dit "c'est retouche" ou "c'est IA" → REJETER
4. **Test visage** : superposer mentalement avec max.png. Les yeux, nez, bouche, chemise doivent etre identiques.
5. **Test transition** : la zone entre les epaules/chemise et le fond doit etre progressive (pas de decoupe nette)

#### Prompt Maxime V3 — Methode 2 : Fond vert seul + IC Light (alternative si Methode 1 echoue)

Si Relight AI produit encore des artefacts apres 3 essais :

**Etape 1 — Supprimer le fond uniquement** :
- Aller sur remove.bg (gratuit, bonne qualite de decoupe)
- Upload max.png → telecharger la version sans fond (PNG transparent)

**Etape 2 — Ajouter un fond vert bokeh naturel** :
- Ouvrir Photopea.com
- Creer un nouveau document 928x1120 px
- Placer le fond (options ci-dessous) en couche arriere, Maxime sans fond en couche avant
- Ajuster la position pour que le cadrage soit coherent

**Options de fond** :
- Option A : prendre un screenshot du fond de thomas3.png (cropper une zone sans le sujet), appliquer un flou gaussien supplementaire de 5-10px, utiliser comme fond
- Option B : chercher sur Unsplash "green foliage bokeh portrait background" — telecharger une photo de vegetation floue sans bokeh balls visibles

**Etape 3 — Harmoniser la lumiere avec IC Light** :
- Aller sur iclight.net (ou le HuggingFace Space officiel lllyasviel/IC-Light)
- Upload le composite (Maxime + fond vert)
- Objectif : harmoniser la lumiere du sujet avec le fond (direction et temperature)
- Ne PAS utiliser un prompt qui ajoute du golden hour excessif — juste harmoniser

**Etape 4 — Verification** : memes criteres que Methode 1

#### Ce qui a echoue avec max2.png (a eviter)

Pour reference, voici ce qui a produit le resultat 4/10 — NE PAS reproduire :
- Fond avec reflets d'eau ou lumiere rasante sur une surface
- Bokeh avec des points lumineux individuels (bokeh balls)
- Golden hour sursaturee (teinte orange excessive sur tout le cadre)
- Tout prompt qui evoque "sunset", "warm glow", "light rays", "magical light"

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
