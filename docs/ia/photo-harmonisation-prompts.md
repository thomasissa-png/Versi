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

Les outils de relighting/fond IA produisent des artefacts reconnaissables. Cette section documente les garde-fous ET le fonctionnement reel des outils, calibre sur les tests de production effectues sur ce projet.

### 0a. Fonctionnement reel de Relight AI (relightai.co) — constate en production

**Ce que Relight AI fait** :
- Accepte UN champ texte unique : "Background Prompt"
- Genere un nouveau fond + ajuste l'eclairage du sujet en une passe
- Preserve bien la geometrie du visage (pas de deformation)
- Traitement rapide (~10-15 secondes par image)
- Format accepte : PNG, JPEG, WEBP, max 5 Mo

**Ce que Relight AI ne fait PAS** :
- **PAS de negative prompt.** Il n'y a AUCUN champ pour decrire ce qu'on ne veut pas. Toute formulation negative ("no bokeh balls", "without light spots") ecrite dans le champ "Background Prompt" est IGNOREE par le moteur ou — pire — les mots-cles negatifs sont interpretes comme des instructions de generation. C'est un comportement documente des modeles de diffusion : le mot "bokeh balls" dans "no bokeh balls" genere des bokeh balls.
- **PAS de sliders.** Aucun controle pour "lighting intensity", "background blur", "warmth". Le seul levier est le texte du prompt.
- **Prompts longs = resultats imprevisibles.** Au-dela de ~8-10 mots, l'outil ignore partiellement le prompt ou combine les concepts de maniere aleatoire. **Les prompts courts (3-7 mots-cles) sont nettement plus fiables.**
- **PAS de controle de temperature de couleur.** On ne peut pas demander "warm but not too warm". Le modele interprete "warm" a sa facon, souvent vers une sursaturation style golden hour.

**Consequence directe sur ce projet** : les prompts V1 et V2 de Maxime etaient TROP LONGS (50+ mots) et incluaient des negative prompts inutiles. Le modele a interprete les mots "bokeh balls", "oversaturated", "water", "sunset reflection" du pretendu negative prompt comme des instructions positives. C'est la cause probable de l'echec de max2.png (bokeh balls + fond aquatique + sursaturation).

### 0b. IC Light V2 comme alternative (recommandee si Relight AI echoue)

IC Light V2 (par lllyasviel, le createur de ControlNet) offre un controle superieur :

**Deux modes disponibles** :
- **Text-conditioned (iclight_sd15_fc)** : upload foreground + prompt texte → reeclairage. Similaire a Relight AI mais avec plus de controle.
- **Background-conditioned (iclight_sd15_fbc)** : upload foreground + upload d'une IMAGE de fond → le modele harmonise la lumiere du sujet avec le fond fourni. **C'est le mode ideal pour notre cas** : on fournit directement une photo de vegetation verte floue et IC Light adapte la lumiere de Maxime pour matcher ce fond.

**Avantages sur Relight AI** :
- Le mode background-conditioned elimine le probleme "le modele invente un fond bizarre" — on fournit le fond exact qu'on veut
- Meilleur controle de la lumiere (direction, intensite)
- Prompts simples suffisent ("portrait, natural light") car le fond est deja fourni en image

**Ou l'utiliser** :
- HuggingFace Space officiel : https://huggingface.co/spaces/lllyasviel/IC-Light
- IC Light V2-Vary (version amelioree) : https://huggingface.co/spaces/lllyasviel/iclight-v2-vary
- NE PAS utiliser iclightai.com (site non officiel)

### 0c. Regles de formulation des prompts Relight AI (calibrees sur les echecs reels)

1. **Prompt COURT : 3-7 mots-cles maximum.** Des mots-cles separes par des virgules. Pas de phrases. Pas de descriptions elaborees.
2. **100% positif.** Decrire UNIQUEMENT ce qu'on veut voir. Jamais "no", "without", "not", "avoid". Le modele ne comprend pas la negation.
3. **Eviter les mots-pieges.** Ne JAMAIS utiliser ces mots meme dans un contexte positif — le modele les interprete comme instructions de generation :
   - `bokeh` (meme "soft bokeh" → produit des bokeh balls rondes)
   - `golden hour` / `sunset` / `warm glow` (→ sursaturation orange quasi systematique)
   - `water` / `ocean` / `lake` / `beach` / `reflection` (→ fonds aquatiques)
   - `light rays` / `rim light` / `backlight` / `lens flare` (→ halos et artefacts lumineux)
   - `cinematic` / `dramatic` / `moody` (→ effets excessifs, contraste force)
   - `magical` / `dreamy` / `ethereal` (→ effets oniriques = marqueur IA)
4. **Mots-cles fiables testes** (resultats previsibles, sans artefacts) :
   - Fond : `green foliage`, `natural leaves`, `outdoor park`, `garden`, `hedge`
   - Flou : `shallow depth of field`, `blurred background`
   - Lumiere : `natural daylight`, `overcast light`, `soft light`, `diffused light`
   - Temperature : `neutral tones`, `natural color` (eviter "warm tones" — risque de sursaturation)
5. **Tester 3 fois.** Chaque prompt doit etre genere au minimum 3 fois. Relight AI a une variance significative — le meme prompt peut produire un resultat correct et un resultat avec artefacts. Retenir le meilleur des 3.

### 0d. Criteres de rejet d'un resultat (inchanges)

**REJETER si** :
- Bokeh balls (ronds lumineux flous individuels) visibles en zoom 200%
- Saturation de la lumiere visiblement superieure a thomas3.png
- Fond avec eau, reflets, ciel colore ou tout element non-vegetation
- Halos lumineux autour du sujet ou decoupe nette sujet/fond
- Peau lissee, teinte orange, ou yeux avec reflets non naturels

**ACCEPTER si** :
- Fond = vegetation verte floue uniforme, aucun point lumineux individuel
- Lumiere = naturelle, laterale, chaleur comparable a thomas3.png
- Transition sujet/fond = progressive et naturelle
- Teint de peau = fidele a la photo source max.png

**Regle de validation** : comparer le resultat avec thomas3.png. Si le fond ou la lumiere semble "plus IA" que thomas3 → rejeter et regenerer. Le test ultime : un investisseur de 48 ans ne doit pas detecter de retouche IA.

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
green foliage, blurred background, soft natural daylight, shallow depth of field
```

**PAS de negative prompt.** Relight AI n'a pas de champ negative prompt. Ne rien ajouter dans le prompt principal qui decrit ce qu'on ne veut pas (voir section 0a pour les raisons).

**Etape 3 — Verification** :
- Le regard : doit sembler diriger vers l'objectif (ou quasi). Si le regard reste trop off-camera, l'outil ne peut pas corriger cela — dans ce cas, Carl3.png reste le meilleur resultat.
- Le cadrage : doit matcher thomas3.png (meme proportion tete/epaules dans le cadre)
- Le fond : vegetation verte floue uniforme, AUCUN point lumineux individuel (bokeh balls), pas de saturation excessive. Comparer directement avec thomas3.png.

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

#### Prompt Maxime V3 — Methode 1 : Relight AI (tentative rapide)

**Etape 1 — Upload max.png directement** (deja en couleur, pas besoin de coloriser ni d'upscale — 928x1120 est suffisant).

**Etape 2 — Relight AI (relightai.co/dashboard)** :
Upload max.png, prompt "Background Prompt" :

```
green foliage, blurred background, natural daylight, shallow depth of field
```

**Pourquoi ce prompt** :
- 7 mots-cles seulement (dans la fourchette optimale 3-7 identifiee en section 0c)
- 100% positif — aucun mot negatif, aucune description de ce qu'on ne veut pas
- Aucun mot-piege (pas de "bokeh", "golden hour", "warm", "sunset", "water", "cinematic")
- Chaque mot-cle est dans la liste "fiable testee" de la section 0c
- `natural daylight` au lieu de `golden hour` → lumiere neutre, pas de sursaturation orange
- `green foliage` → vegetation verte, pas de fond aquatique ni urbain
- `blurred background` + `shallow depth of field` → flou uniforme naturel SANS nommer "bokeh"

**PAS de negative prompt.** Relight AI n'a pas de champ dedie. NE RIEN AJOUTER dans le prompt qui decrit ce qu'on ne veut pas. Voir section 0a.

**PAS de sliders.** L'outil n'en a pas. Le prompt est le seul levier.

**Etape 3 — Generer 3 fois.** La variance de Relight AI est significative. Generer le meme prompt 3 fois et comparer les 3 resultats. Retenir le meilleur.

**Etape 4 — Verification stricte (5 tests obligatoires)** :
1. **Test bokeh balls** : zoomer sur le fond a 200%. Si des ronds lumineux individuels (cercles clairs sur fond sombre) sont visibles → REJETER
2. **Test saturation** : mettre thomas3.png et le resultat cote a cote sur le meme ecran. Si la lumiere de Maxime est visiblement plus chaude/orangee que Thomas → REJETER
3. **Test "investisseur"** : montrer la photo a quelqu'un sans contexte. S'il dit "c'est retouche", "c'est filtre" ou "c'est IA" → REJETER. Critere : indiscernable d'une vraie photo par un investisseur de 48 ans.
4. **Test visage** : comparer avec max.png original. Les yeux, nez, bouche, oreilles, chemise rayee doivent etre identiques. Aucun lissage de peau, aucune modification de teint.
5. **Test transition** : la zone entre les epaules/chemise et le fond doit etre progressive et naturelle (pas de decoupe nette, pas de halo lumineux autour du sujet)

**Seuil de rejet** : si 2 des 3 generations echouent au meme test → Relight AI ne convient pas pour cette photo. Passer a la Methode 2.

#### Prompt Maxime V3 — Methode 2 : IC Light V2 background-conditioned (RECOMMANDEE si Methode 1 echoue)

Cette methode offre un controle superieur car on fournit directement l'image de fond au lieu de la decrire par prompt. Le modele ne peut pas "inventer" un fond avec des bokeh balls ou de l'eau — il utilise le fond qu'on lui donne.

**Etape 1 — Preparer l'image de fond** :

Option A (recommandee) — Extraire le fond de thomas3.png :
- Ouvrir thomas3.png dans Photopea.com
- Selectionner une zone de fond (vegetation verte floue) qui ne contient PAS le sujet Thomas — typiquement les bords gauche/droit de l'image
- Etirer/dupliquer cette zone pour creer un fond de 928x1120 px (la taille de max.png)
- Appliquer un flou gaussien de 8-12 px pour uniformiser les raccords
- Exporter en PNG : `max-background-reference.png`

Option B — Photo stock :
- Chercher sur Unsplash : "green leaves out of focus background" ou "park foliage blurred"
- Choisir une photo avec : vegetation verte, flou uniforme, PAS de points lumineux individuels, PAS de ciel visible
- Redimensionner a 928x1120 px
- Verifier : AUCUN bokeh ball visible meme subtil

**Etape 2 — Supprimer le fond de max.png** :
- Aller sur remove.bg (gratuit, bonne qualite de decoupe pour les portraits)
- Upload max.png → telecharger la version sans fond (PNG transparent)
- Nommer : `max-foreground.png`

**Etape 3 — IC Light V2 background-conditioned** :
- Aller sur https://huggingface.co/spaces/lllyasviel/IC-Light
- Choisir le mode **"Background Condition"** (pas "Text Condition")
- Upload foreground : `max-foreground.png`
- Upload background : `max-background-reference.png`
- Prompt texte (minimal, car le fond est deja fourni) :

```
portrait, natural soft light from left side
```

- Generer. IC Light va harmoniser la lumiere de Maxime pour qu'elle corresponde au fond fourni (direction, temperature, intensite).
- Generer 3 fois et comparer.

**Pourquoi cette methode est superieure** :
- Le fond est une VRAIE photo de vegetation (extraite de thomas3.png ou stock) — pas une generation IA
- IC Light ne modifie que la lumiere du sujet, pas le fond
- Le resultat est mecaniquement plus coherent avec thomas3.png car le fond EST celui de thomas3

**Etape 4 — Assembler si necessaire** :
Si IC Light produit un composite satisfaisant, exporter directement.
Si le fond a des raccords visibles, ouvrir dans Photopea.com et ajuster manuellement (outil tampon de duplication sur les zones de raccord).

**Etape 5 — Verification** : memes 5 tests que Methode 1.

#### Prompt Maxime V3 — Methode 3 : IC Light V2-Vary (nouveau, a tester)

IC Light V2-Vary est une version amelioree disponible sur https://huggingface.co/spaces/lllyasviel/iclight-v2-vary. Si les methodes 1 et 2 echouent, tester cette version avec les memes inputs que la Methode 2. La version "Vary" a ete concue pour mieux gerer les variations de lumiere complexes.

#### Ce qui a echoue avec max2.png — autopsie (NE PAS reproduire)

**Resultat** : 4/10 — PIRE que l'original max.png. La "retouche" a degrade la photo.

**Causes identifiees** :
1. **Prompt trop long** (50+ mots) → Relight AI a ignore la majorite des instructions et pioche aleatoirement dans les mots-cles
2. **Negative prompt injecte dans le prompt principal** → les mots "bokeh balls", "water", "oversaturated", "sunset reflection" ont ete interpretes comme des instructions POSITIVES par le modele de diffusion
3. **Mots-pieges dans le prompt positif** : "golden hour" → sursaturation orange, "bokeh" → bokeh balls, "warm glow" → filtre Instagram
4. **Pas de comparaison avec thomas3.png** lors de la validation → la sursaturation n'a pas ete detectee en amont

**Artefacts produits** :
- Bokeh balls (ronds lumineux flous) = marqueur IA le plus evident pour un oeil non expert
- Fond avec reflets d'eau ou lumiere rasante sur une surface aqueuse = "IA paradise"
- Golden hour sursaturee = filtre Instagram, pas une photo professionnelle
- L'ensemble donne une impression de "brochure touristique generee par IA"

**Lecon** : le prompt V3 (section ci-dessus) corrige les 4 causes en etant court (7 mots), 100% positif, sans mots-pieges, et avec comparaison obligatoire avec thomas3.png.

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
2. Upload sur relightai.co → coller le prompt Carl V2 (section 2) : `green foliage, blurred background, soft natural daylight, shallow depth of field`
3. PAS de negative prompt. Appliquer les consignes anti-artefacts (section 0). Generer 3 fois.
4. Comparer le visage + verifier cadrage vs thomas3.png → telecharger le meilleur resultat si OK
5. Recadrer en 3:4 → exporter 900x1200 px PNG
6. Renommer : carl-harmonised.png

### Maxime — A RETOUCHER (max2.png rejetee, repartir de max.png)

**ATTENTION : ne PAS reutiliser max2.png.** Repartir de max.png (l'originale).

**Methode 1 — Relight AI (tentative rapide)** :
1. Upload max.png directement sur relightai.co (deja en couleur, resolution suffisante)
2. Coller le prompt court Maxime V3 Methode 1 (section 2) dans "Background Prompt" : `green foliage, blurred background, natural daylight, shallow depth of field`
3. PAS de negative prompt (l'outil n'en a pas). PAS de sliders (l'outil n'en a pas).
4. Generer 3 fois. Comparer les 3 resultats.
5. Appliquer la verification stricte en 5 points (section 2) — REJETER si bokeh balls ou sursaturation
6. Si OK → recadrer en 3:4 via Photopea.com → exporter 900x1200 px PNG
7. Renommer : max-harmonised.png

**Si echec (2/3 generations echouent au meme test) → Methode 2 — IC Light V2 background-conditioned** :
1. Preparer le fond : extraire la vegetation de thomas3.png (voir details section 2 Methode 2)
2. Supprimer le fond de max.png via remove.bg
3. Upload sur IC Light V2 (HuggingFace) en mode "Background Condition"
4. Prompt minimal : `portrait, natural soft light from left side`
5. Generer 3 fois. Retenir le meilleur.
6. Verification stricte en 5 points → recadrer 3:4 → exporter 900x1200 px PNG
7. Renommer : max-harmonised.png

Si echec des 2 methodes → Plan B (section 5).

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
- Decisions prises :
  - thomas3.png VALIDEE comme reference de style (8/10) — aucune action
  - Carl3.png ACCEPTABLE en l'etat (7.5/10) — V2 optionnelle avec prompt COURT corrige
  - max2.png REJETEE (4/10) — autopsie faite : prompt trop long + negative prompt toxique + mots-pieges
  - Nouveau prompt Maxime V3 COURT (7 mots-cles) calibre sur le fonctionnement reel de Relight AI
  - IC Light V2 background-conditioned recommande comme methode 2 (controle superieur car on fournit le fond en image)
  - Tous les negative prompts supprimes (Relight AI ne les supporte pas)
  - Tous les prompts raccourcis a 3-7 mots-cles (zone optimale de fiabilite)
- Prochaine action : generer la photo Maxime V3 avec le prompt de la section 2 Methode 1. Si echec en 3 essais → Methode 2 (IC Light V2). C'est le seul item bloquant restant.
- Points d'attention : TOUJOURS partir de max.png (pas max2.png). PAS de negative prompt (l'outil ne le supporte pas). PAS de sliders (l'outil n'en a pas). Generer 3 fois et comparer. Verifier l'absence de bokeh balls en zoomant a 200%. Comparer cote a cote avec thomas3.png pour la saturation. Le resultat doit etre indiscernable d'une vraie photo par un investisseur de 48 ans. Photos finales en PNG, ratio 3:4, minimum 900x1200px. Garder les originales en backup.
