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

### Thomas — FAIT (thomas3.png validee 8/10)

**Aucune action requise.** thomas3.png est la photo de reference de style.

1. ~~Upscale thomas.png via upscale.media (2x → 2048x2048)~~ FAIT
2. ~~Coloriser via fotor.com/features/colorize-photo/ → telecharger PNG~~ FAIT
3. ~~Upload sur relightai.co → coller le prompt Thomas → generer~~ FAIT
4. ~~Comparer le visage~~ FAIT — valide 8/10
5. Recadrer thomas3.png en 3:4 via Photopea.com → exporter 900x1200 px PNG (si pas deja fait)
6. Renommer : thomas-harmonised.png

### Carl — V1 OK, V2 optionnelle

**Carl3.png est utilisable en l'etat** (7.5/10). Si V2 souhaitee, suivre le prompt V2 en section 2.

Option A — Garder Carl3.png :
1. Recadrer Carl3.png en 3:4 via Photopea.com → exporter 900x1200 px PNG
2. Renommer : carl-harmonised.png

Option B — Generer Carl V2 (optionnel) :
1. Recadrer Carl-picture.jfif en portrait serre (tete + epaules) AVANT le relight — voir details section 2
2. Upload sur relightai.co → coller le prompt Carl V2 (section 2) → generer
3. Appliquer les consignes anti-artefacts (section 0) + negative prompt
4. Comparer le visage + verifier cadrage vs thomas3.png → telecharger si OK
5. Recadrer en 3:4 → exporter 900x1200 px PNG
6. Renommer : carl-harmonised.png

### Maxime — A RETOUCHER (max2.png rejetee, repartir de max.png)

**ATTENTION : ne PAS reutiliser max2.png.** Repartir de max.png (l'originale).

Methode 1 (recommandee) — Relight AI :
1. Upload max.png directement sur relightai.co (deja en couleur, resolution suffisante)
2. Coller le prompt Maxime V3 Methode 1 (section 2) dans "Background Prompt"
3. Ajouter le negative prompt (section 2) si l'outil le supporte
4. Reduire lighting intensity a 60-70% si le slider existe
5. Appliquer la verification stricte en 5 points (section 2) — REJETER si bokeh balls ou sursaturation
6. Si OK → recadrer en 3:4 via Photopea.com → exporter 900x1200 px PNG
7. Renommer : max-harmonised.png

Si echec apres 3 essais → passer a Methode 2 (fond vert seul + IC Light, details en section 2).

### Harmonisation finale des couleurs (si necessaire)

Apres les 3 photos validees, si des ecarts de teinte subsistent :
- Ouvrir les 3 dans Photopea.com
- **Reference de couleur** : thomas3.png (photo validee avec le meilleur equilibre lumiere/fond)
- Sur Carl et Maxime : Image → Adjustments → Match Color → source = thomas3-harmonised.png
- Intensity a 50-70% — ne pas forcer pour eviter de denaturer les teints de peau

---

## 5. Plan B

| Option | Delai | Cout | Quand l'utiliser |
|---|---|---|---|
| Fiverr "harmonize 2 remaining headshots to match reference" | 24-48h | 15-30 EUR | Si Maxime V3 echoue apres 3 essais Relight AI + 3 essais Methode 2 |
| Reshoot les 3 en exterieur (meme lieu, meme heure) | 1 semaine | 0 EUR (smartphone suffit) | Si aucune harmonisation IA ne donne un resultat pro |
| Photopea manual | 2h | Gratuit | Ajuster la balance manuellement (necessite des bases Photoshop) |

**Recommandation Plan B** : si apres 3 essais Relight AI + 3 essais Methode 2 la photo de Maxime est toujours "IA-looking", poster une mission Fiverr "Match 2 team headshots to this reference photo style — warm outdoor green bokeh, natural light" avec thomas3.png comme reference. Budget 20 EUR, livraison 24h.

**Plan B fallback pour Maxime specifiquement** : si meme Fiverr echoue, l'original max.png reste meilleur que max2.png. Utiliser max.png avec un simple ajustement de temperature de couleur dans Photopea (Image → Adjustments → Color Balance → pousser Midtones vers Warm +15/+10) pour rapprocher la teinte du fond overcast vers une tonalite plus chaude. Le resultat ne sera pas identique a thomas3/Carl3 mais sera coherent et surtout naturel.

---

## 6. Checklist de progression

- [x] Thomas : thomas3.png validee 8/10 — recadrage 3:4 + rename restant
- [ ] Carl : Carl3.png utilisable 7.5/10 — V2 optionnelle (cadrage + regard)
- [ ] Maxime : A RETOUCHER — max2.png rejetee, repartir de max.png avec prompt V3
- [ ] Recadrage final 3:4 des 3 photos (900x1200 px minimum)
- [ ] Harmonisation couleurs finale si ecarts visibles
- [ ] Placement dans /Photos/ avec noms definitifs (*-harmonised.png)
- [ ] Integration dans le site par @fullstack

---

**Handoff → Thomas (execution manuelle)**
- Fichier produit : `docs/ia/photo-harmonisation-prompts.md`
- Decisions prises : thomas3.png VALIDEE comme reference de style (8/10). Carl3.png ACCEPTABLE en l'etat (7.5/10), V2 optionnelle avec prompt corrige (cadrage serre + regard). max2.png REJETEE (4/10 — bokeh balls + sursaturation). Nouveau prompt Maxime V3 avec 2 methodes (Relight AI principal, fond vert + IC Light en fallback). Consignes anti-artefacts IA integrees dans tous les prompts (negative prompts + verification stricte en 5 points).
- Prochaine action : generer la photo Maxime V3 avec le prompt de la section 2 (Methode 1). C'est le seul item bloquant restant.
- Points d'attention : TOUJOURS partir de max.png (pas max2.png). Reduire l'intensite du lighting a 60-70%. Verifier l'absence de bokeh balls en zoomant a 200%. Comparer cote a cote avec thomas3.png pour la saturation. Photos finales en PNG, ratio 3:4, minimum 900x1200px. Garder les originales en backup.
