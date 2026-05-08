/**
 * VisualWizardRoomStep — Une étape du wizard (1 pièce).
 *
 * Composition (s32) :
 *  - Header : progression "Pièce N / Total" + nom + barre
 *  - RoomZoomCanvas : vue zoomée + click-to-place + drag flèche d'angle
 *  - Liste pastilles placées : vignettes photos uploadées + bouton upload par position
 *  - RoomStylePicker : style propre à la pièce
 *  - Footer : Précédent / Suivant (validation : ≥1 photo + style)
 *
 * Responsabilité : orchestrer 1 pièce. Toute la persistance API est déléguée
 * au parent (VisualWizard) via callbacks.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import RoomZoomCanvas from "@/components/vs/RoomZoomCanvas";
import RoomStylePicker from "@/components/vs/RoomStylePicker";
import RoomSegmentsPanel from "@/components/vs/RoomSegmentsPanel";
import RoomArchitecturalDetails from "@/components/vs/RoomArchitecturalDetails";
import ArchitectChatPanel, {
  type FieldUpdate as ChatFieldUpdate,
} from "@/components/vs/ArchitectChatPanel";
import BriefSummaryDialog from "@/components/vs/BriefSummaryDialog";
import { buildHumanReadableBrief } from "@/lib/vs/brief-summary";
import type {
  VsRoom,
  VsLot,
  VsPhoto,
  ZoneRect,
  VsRoomSegment,
  VsRoomSegmentType,
  ApiResponse,
  ArchitecturalDetails,
  ArchitecturalFieldValue,
} from "@/lib/vs/types";
import { emptyArchitecturalDetails } from "@/lib/vs/types";
import type { NormalizedPoint } from "@/lib/vs/ui/photo-placement";
import { UNDO_WINDOW_MS } from "@/lib/vs/ui/toast-duration";
import type { StyleId } from "@/lib/vs/styles";

export interface VisualWizardRoomStepProps {
  /** Index 1-based pour l'affichage. */
  stepIndex: number;
  /** Nombre total de pièces dans le wizard. */
  totalSteps: number;
  /** Pièce courante. */
  room: VsRoom;
  /**
   * Lot parent de la pièce courante. Permet d'accéder au profil architectural
   * (5 champs) pour : (a) snapshot undo réel sur update_field scope=lot,
   * (b) inclure le profil dans la synthèse brief (BriefSummaryDialog).
   */
  currentLot: VsLot | null;
  /** URL plan global. */
  planImageUrl: string | null;
  /** Zone du lot (% du plan global). */
  lotZone: ZoneRect;
  /** Photos placées dans cette pièce. */
  placements: VsPhoto[];

  /**
   * Crée une nouvelle position photographe (pas encore d'image attachée).
   * Le parent crée un placement "pending" qui prendra une photo lors de l'upload.
   */
  onPlacementPending: (point: NormalizedPoint) => void;
  /** Met à jour l'angle d'un placement existant (PATCH photo). */
  onAngleCommit: (placementId: string, angle: number) => Promise<void>;
  /** Upload d'une photo pour un placement pending (multipart + position). */
  onUploadForPending: (
    pendingId: string,
    file: File
  ) => Promise<void>;
  /** Upload remplaçant la photo d'un placement déjà fait. */
  onUploadReplace: (placementId: string, file: File) => Promise<void>;
  /** Supprime un placement (DELETE photo OU annule pending). */
  onDeletePlacement: (placementId: string) => Promise<void>;

  /** Sélectionne le style de la pièce (PATCH /rooms/:id). */
  onStyleSelect: (id: StyleId) => Promise<void>;

  /** s32 #3 (autopilot) — toggle meublé/non-meublé. */
  onFurnishedChange: (isFurnished: boolean) => Promise<void>;
  /** s32 (Thomas prod) — mise à jour détails architecturaux pièce (4 champs). */
  onArchitecturalDetailsChange?: (details: ArchitecturalDetails) => Promise<void>;
  /** s32 (Thomas prod) — true pendant l'analyse Vision auto au mount. */
  visionAnalyzing?: boolean;
  /** s32 #3 (autopilot) — commentaire libre pièce (debounce côté parent). */
  onCommentChange: (comment: string) => Promise<void>;
  /** s32 #3 (autopilot) — commentaire courant (lu depuis vs_room_settings côté parent). */
  comment: string | null;
  /** s32 #P3 (Thomas prod) — nb visuels souhaités pour cette pièce (1-5, default 3). */
  targetVisualCount: number;
  /** s32 #P3 (Thomas prod) — handler PATCH /settings (optimistic). */
  onTargetVisualCountChange: (count: number) => Promise<void>;
  /** s32 #5 (autopilot) — skip pièce (pas de visuels). */
  onSkipRoom: () => Promise<void>;
  /** s32 #4 (autopilot) — génère uniquement cette pièce (preview puis next). */
  onGenerateThisRoom: () => Promise<void>;

  /** Navigation arrière (la suite est gérée par le state machine parent). */
  onPrevRoom: (() => void) | null;

  /** Drag visuel (sans commit). Optionnel. */
  onAngleDrag?: (placementId: string, angle: number) => void;
  /** s32 #1 (autopilot) — commit final déplacement pastille. */
  onPlacementMoveCommit: (placementId: string, point: NormalizedPoint) => Promise<void>;
  /**
   * s32 #P1 (Thomas prod) — notifie le parent que le polygone DB a changé
   * (drag d'un sommet validé). Le parent doit mettre à jour son state
   * local `roomsState` pour que le prochain render reflète le nouveau
   * polygone (sans offsets, déjà baked).
   */
  onPolygonChange?: (
    roomId: string,
    newPolygon: Array<{ x_percent: number; y_percent: number }>
  ) => void;
}

/**
 * Type étendu : un placement "pending" est un VsPhoto avec id `pending-*` et
 * file_path vide. C'est juste une UI-side abstraction pour faire apparaître
 * la pastille AVANT que la photo soit uploadée. Une fois la photo uploadée
 * via `onUploadForPending`, le parent remplace le pending par le VsPhoto réel.
 */

export default function VisualWizardRoomStep({
  stepIndex,
  totalSteps,
  room,
  currentLot,
  planImageUrl,
  lotZone,
  placements,
  onPlacementPending,
  onAngleCommit,
  onUploadForPending,
  onUploadReplace,
  onDeletePlacement,
  onStyleSelect,
  onFurnishedChange,
  onArchitecturalDetailsChange,
  visionAnalyzing,
  onCommentChange,
  comment,
  targetVisualCount,
  onTargetVisualCountChange,
  onSkipRoom,
  onGenerateThisRoom,
  onPrevRoom,
  onAngleDrag,
  onPlacementMoveCommit,
  onPolygonChange,
}: VisualWizardRoomStepProps) {
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [busyPlacementId, setBusyPlacementId] = useState<string | null>(null);
  const [outsideHint, setOutsideHint] = useState<string | null>(null); // s32 #2 — toast info clic hors polygone (placement autorisé)
  const [commentDraft, setCommentDraft] = useState<string>(comment ?? ""); // s32 #3 — commentaire (debounce 800ms)
  const [confirmSkip, setConfirmSkip] = useState<boolean>(false); // s32 #5 — confirm modal-light avant skip
  const [skipping, setSkipping] = useState<boolean>(false);
  const [generatingThis, setGeneratingThis] = useState<boolean>(false); // s32 #4 — busy "Générer cette pièce"
  const [movingPlacementId, setMovingPlacementId] = useState<string | null>(null); // B1 itér.4 — feedback drag dans la liste
  const [skipToast, setSkipToast] = useState<string | null>(null); // B9 itér.4 — toast info post-skip
  const [recentlyCreatedIds, setRecentlyCreatedIds] = useState<Set<string>>(new Set()); // B6
  const [errorPlacementIds, setErrorPlacementIds] = useState<Map<string, string>>(new Map()); // B10 — erreur par placement
  const [showMobileDragHint, setShowMobileDragHint] = useState<boolean>(false); // V3.1 D2 — hint drag mobile (1ère apparition)
  const [showVertexDragHint, setShowVertexDragHint] = useState<boolean>(false); // C4 itér. — hint sommets blancs (1ère apparition desktop+mobile)
  // ─── s32 V3 — Drag direct contour (preview live, commit immédiat) ──
  /**
   * Offset visuel pendant le drag du contour (preview). Au pointer up, le
   * commit appelle PATCH /rooms/:id directement (pas de bouton Appliquer).
   * - null = pas de drag actif (le polygone effectif utilise l'offset DB)
   */
  const [contourPreview, setContourPreview] = useState<{ x: number; y: number } | null>(null);
  // ─── s32 V3 — Annotations segments via panel latéral ──────────────
  const [segments, setSegments] = useState<VsRoomSegment[]>([]);
  const [segmentsLoading, setSegmentsLoading] = useState<boolean>(false);
  /** Segment hover/focus dans le panel ou canvas (sync visuelle). */
  const [highlightedSegmentIndex, setHighlightedSegmentIndex] = useState<number | null>(null);
  // ─── s32 (Phase 9) — Chat architecte virtuel (toggle panel) ──────
  const [panelMode, setPanelMode] = useState<"segments" | "chat">("segments");
  const [chatBriefValidated, setChatBriefValidated] = useState<boolean>(false);
  const [chatToast, setChatToast] = useState<string | null>(null);
  // s32 Phase 9 itér. — distinction succès / erreur du toast chat (a11y + couleur).
  const [chatToastType, setChatToastType] = useState<"success" | "error">("success");
  // s32 Phase 4 — Annuler le dernier update_field IA (toast bouton inline).
  // null = pas d'undo possible. Auto-clear après 5s ou après clic Annuler.
  const [chatToastUndo, setChatToastUndo] = useState<{
    revertField: string;
    previousValue: ArchitecturalFieldValue | string | null;
    scope: "lot" | "room";
    /** Pour multi-select (specifics/technical_constraints) on snapshot la liste entière. */
    previousList?: ArchitecturalFieldValue[];
    /** previousLotValue spécifique scope='lot' (5 champs profile). */
    previousLotValue?: string | null;
  } | null>(null);
  // s32 Phase 5 — modale récap brief avant POST /visuals/generate.
  const [briefDialogOpen, setBriefDialogOpen] = useState<boolean>(false);
  const [briefDialogText, setBriefDialogText] = useState<string>("");
  const fileInputsRef = useRef<Map<string, HTMLInputElement>>(new Map());
  const cardRefs = useRef<Map<string, HTMLLIElement>>(new Map()); // B7 — auto-scroll
  const headerRef = useRef<HTMLHeadingElement>(null); // B9 — focus reset
  const prevPlacementCountRef = useRef<number>(placements.length);
  const prevPlacementIdsRef = useRef<Set<string>>(
    new Set(placements.map((p) => p.id))
  );

  const placementsWithPhoto = useMemo(
    () => placements.filter((p) => p.is_placed_on_plan && p.file_path !== ""),
    [placements]
  );

  const styleId = (room.style_id as StyleId | null) ?? null;

  const _canGoNext = useMemo(() => {
    if (!styleId) return false;
    if (placementsWithPhoto.length === 0) return false;
    return true;
  }, [styleId, placementsWithPhoto.length]);

  const disabledReason = useMemo(() => {
    if (!styleId && placementsWithPhoto.length === 0) {
      return "Placez au moins une photo et choisissez un style.";
    }
    if (!styleId) return "Choisissez un style pour cette pièce.";
    if (placementsWithPhoto.length === 0) return "Ajoutez au moins une photo.";
    return null;
  }, [styleId, placementsWithPhoto.length]);

  // s33 fix B-4 — checklist conditionnelle des pré-requis pour
  // « Générer cette pièce ». Remplace le message texte unique par une liste
  // ✓/✗ qui dit explicitement à l'utilisateur ce qui manque encore.
  // Audit : bouton actif mais l'utilisateur ne savait pas si tout était OK.
  const generateChecklist = useMemo(
    () => [
      {
        ok: placementsWithPhoto.length > 0,
        label:
          placementsWithPhoto.length > 0
            ? `Photo${placementsWithPhoto.length > 1 ? "s" : ""} déposée${placementsWithPhoto.length > 1 ? "s" : ""} (${placementsWithPhoto.length})`
            : "Placez au moins une prise de vue",
      },
      {
        ok: !!styleId,
        label: styleId ? "Style choisi" : "Choisissez un style",
      },
    ],
    [placementsWithPhoto.length, styleId]
  );

  const triggerFilePicker = useCallback((placementId: string) => {
    const input = fileInputsRef.current.get(placementId);
    input?.click();
  }, []);

  // s32 #2 — info hors polygone (placement AUTORISÉ — l'IA interprète la distance).
  const handleClickOutsidePolygon = useCallback(() => {
    setOutsideHint("Position hors pièce : l'IA interprétera la distance.");
  }, []);
  useEffect(() => {
    if (outsideHint === null) return;
    const t = setTimeout(() => setOutsideHint(null), 2500);
    return () => clearTimeout(t);
  }, [outsideHint]);

  // s32 #3 — sync brouillon commentaire si la prop change (changement de pièce)
  useEffect(() => {
    setCommentDraft(comment ?? "");
  }, [comment, room.id]);

  // s32 #3 — debounce 800ms du commentaire vers l'API
  useEffect(() => {
    const initial = comment ?? "";
    if (commentDraft === initial) return;
    const timer = setTimeout(() => {
      void onCommentChange(commentDraft);
    }, 800);
    return () => clearTimeout(timer);
  }, [commentDraft, comment, onCommentChange]);

  // s32 #5 — handler skip avec confirm two-step (pas de Dialog component dispo simple)
  const handleSkipClick = useCallback(() => {
    if (!confirmSkip) {
      setConfirmSkip(true);
      return;
    }
    setSkipping(true);
    void onSkipRoom()
      .then(() => {
        // B9 itér.4 — toast feedback success (auto-clear 3s)
        setSkipToast("Pièce ignorée — retrouvez-la dans le récapitulatif.");
      })
      .finally(() => {
        setSkipping(false);
        setConfirmSkip(false);
      });
  }, [confirmSkip, onSkipRoom]);
  // Reset confirm si user change de pièce
  useEffect(() => {
    setConfirmSkip(false);
  }, [room.id]);
  // s32 (Phase 9) — reset état chat à chaque changement de pièce
  useEffect(() => {
    setPanelMode("segments");
    setChatBriefValidated(false);
    setChatToast(null);
    setChatToastUndo(null);
    setBriefDialogOpen(false);
    setBriefDialogText("");
  }, [room.id]);
  // s32 (Phase 9) — auto-clear chat toast.
  // s32 Phase 4 : durée étendue à 5s si undo possible (donne le temps de cliquer
  // « Annuler »). Sinon 3s standard.
  useEffect(() => {
    if (chatToast === null) return;
    const duration = chatToastUndo !== null ? UNDO_WINDOW_MS : 3000;
    const t = setTimeout(() => {
      setChatToast(null);
      setChatToastUndo(null);
    }, duration);
    return () => clearTimeout(t);
  }, [chatToast, chatToastUndo]);

  // s32 (Phase 9) — handler chat update_field : applique le patch côté UI
  // (room ou lot scope) + toast feedback. Persistance API immédiate.
  // s32 Phase 4 — capture la valeur précédente pour permettre Annuler 5s.
  const handleChatFieldUpdate = useCallback(
    async (update: ChatFieldUpdate) => {
      const FIELD_LABELS: Record<string, string> = {
        floor: "Sol",
        walls: "Murs",
        lighting: "Luminosité",
        specifics: "Particularités",
        level: "Niveau prestation",
        technical_constraints: "Contraintes techniques",
        ceiling_height: "Hauteur",
        orientation: "Orientation",
        general_state: "État général",
        target_level: "Niveau visé",
        target_audience: "Cible",
        style: "Style",
      };
      const label = FIELD_LABELS[update.field] ?? update.field;
      setChatToastType("success");
      setChatToast(`J'ai mis à jour : ${label} → ${update.value}`);

      try {
        if (update.scope === "room") {
          if (update.field === "style") {
            // Snapshot pour undo (style)
            const previousStyle = room.style_id;
            await onStyleSelect(update.value as StyleId);
            setChatToastUndo({
              revertField: "style",
              previousValue: previousStyle,
              scope: "room",
            });
            return;
          }
          const current =
            room.architectural_details ?? emptyArchitecturalDetails();
          const next: ArchitecturalDetails = {
            floor: { ...current.floor },
            walls: { ...current.walls },
            lighting: { ...current.lighting },
            specifics: [...current.specifics],
            level: current.level ? { ...current.level } : { value: null, source: null },
            technical_constraints: current.technical_constraints
              ? [...current.technical_constraints]
              : [],
          };
          // s32 Phase 4 — snapshot avant patch (selon type single/multi)
          let undoPayload: typeof chatToastUndo = null;
          if (update.field === "specifics") {
            undoPayload = {
              revertField: "specifics",
              previousValue: null,
              scope: "room",
              previousList: current.specifics.map((s) => ({ ...s })),
            };
            const fv: ArchitecturalFieldValue = {
              value: update.value,
              source: "user",
              confirmed: true,
            };
            if (!next.specifics.some((s) => s.value === update.value)) {
              next.specifics.push(fv);
            }
          } else if (update.field === "technical_constraints") {
            undoPayload = {
              revertField: "technical_constraints",
              previousValue: null,
              scope: "room",
              previousList: (current.technical_constraints ?? []).map((s) => ({ ...s })),
            };
            const fv: ArchitecturalFieldValue = {
              value: update.value,
              source: "user",
              confirmed: true,
            };
            if (!(next.technical_constraints ?? []).some((s) => s.value === update.value)) {
              next.technical_constraints = [...(next.technical_constraints ?? []), fv];
            }
          } else if (
            update.field === "floor" ||
            update.field === "walls" ||
            update.field === "lighting" ||
            update.field === "level"
          ) {
            const prev = current[update.field];
            undoPayload = {
              revertField: update.field,
              previousValue: prev ? { ...prev } : null,
              scope: "room",
            };
            next[update.field] = {
              value: update.value,
              source: "user",
              confirmed: true,
            };
          } else {
            // Champ inconnu pour scope room
            return;
          }
          if (onArchitecturalDetailsChange) {
            await onArchitecturalDetailsChange(next);
          }
          if (undoPayload) setChatToastUndo(undoPayload);
        } else if (update.scope === "lot") {
          // Patch direct PATCH /api/vs/lots/:id (champ profile)
          const VALID_LOT_FIELDS = [
            "ceiling_height",
            "orientation",
            "general_state",
            "target_level",
            "target_audience",
          ];
          if (!VALID_LOT_FIELDS.includes(update.field)) return;
          // s32 micro-fix architecte (10/10) — snapshot undo VRAIE valeur précédente
          // lue depuis currentLot.architectural_profile (prop propagée par parent).
          // Avant : null forcé → undo unsettait au lieu de revert. Maintenant :
          // currentLot peut être null si parent ne l'a pas encore propagé → fallback null.
          const previousLotValue =
            (currentLot?.architectural_profile?.[
              update.field as keyof typeof currentLot.architectural_profile
            ] as string | null | undefined) ?? null;
          setChatToastUndo({
            revertField: update.field,
            previousValue: previousLotValue,
            scope: "lot",
            previousLotValue,
          });
          await fetch(`/api/vs/lots/${room.lot_id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              architectural_profile: { [update.field]: update.value },
            }),
          });
        }
      } catch (err) {
        console.error("[VisualWizardRoomStep] chat field update failed:", err);
        setChatToastType("error");
        setChatToast(`Mise à jour échouée : ${label}`);
      }
    },
    [
      room.architectural_details,
      room.lot_id,
      room.style_id,
      currentLot,
      onArchitecturalDetailsChange,
      onStyleSelect,
    ]
  );

  // s32 Phase 4 — Annuler la dernière mise à jour IA.
  // Restaure la valeur précédente côté DB + UI. Clear le toast.
  const handleChatToastUndo = useCallback(async () => {
    const undo = chatToastUndo;
    if (!undo) return;
    try {
      if (undo.scope === "room") {
        if (undo.revertField === "style") {
          // Restaure style_id via PATCH room direct (onStyleSelect ne supporte pas null)
          await fetch(`/api/vs/rooms/${room.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ style_id: undo.previousValue ?? null }),
          });
          // Notifier le parent pour rafraîchir
          if (typeof undo.previousValue === "string") {
            await onStyleSelect(undo.previousValue as StyleId);
          }
        } else {
          const current =
            room.architectural_details ?? emptyArchitecturalDetails();
          const next: ArchitecturalDetails = {
            floor: { ...current.floor },
            walls: { ...current.walls },
            lighting: { ...current.lighting },
            specifics: [...current.specifics],
            level: current.level ? { ...current.level } : { value: null, source: null },
            technical_constraints: current.technical_constraints
              ? [...current.technical_constraints]
              : [],
          };
          if (
            undo.revertField === "specifics" ||
            undo.revertField === "technical_constraints"
          ) {
            const list = undo.previousList ?? [];
            if (undo.revertField === "specifics") next.specifics = list;
            else next.technical_constraints = list;
          } else if (
            undo.revertField === "floor" ||
            undo.revertField === "walls" ||
            undo.revertField === "lighting" ||
            undo.revertField === "level"
          ) {
            const prev =
              undo.previousValue && typeof undo.previousValue === "object"
                ? (undo.previousValue as ArchitecturalFieldValue)
                : { value: null, source: null };
            next[undo.revertField] = prev;
          }
          if (onArchitecturalDetailsChange) {
            await onArchitecturalDetailsChange(next);
          }
        }
      } else if (undo.scope === "lot") {
        // Restaure le champ lot via PATCH (null = unset)
        await fetch(`/api/vs/lots/${room.lot_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            architectural_profile: {
              [undo.revertField]: undo.previousLotValue ?? null,
            },
          }),
        });
      }
      setChatToastType("success");
      setChatToast("Modification annulée.");
    } catch (err) {
      console.error("[VisualWizardRoomStep] chat undo failed:", err);
      setChatToastType("error");
      setChatToast("Annulation échouée.");
    } finally {
      setChatToastUndo(null);
    }
  }, [
    chatToastUndo,
    room.id,
    room.lot_id,
    room.architectural_details,
    onArchitecturalDetailsChange,
    onStyleSelect,
  ]);

  const handleChatBriefValidated = useCallback(
    (confidence: "high" | "medium" | "low") => {
      // s32 Phase 9 — defense-in-depth : ignore validate_brief avec confidence='low'.
      // Le system prompt LLM empêche en principe ce cas, mais robustesse > confiance aveugle.
      if (confidence === "low") return;
      setChatBriefValidated(true);
    },
    []
  );

  const handleOpenChat = useCallback(() => setPanelMode("chat"), []);
  const handleCloseChat = useCallback(() => {
    setPanelMode("segments");
    // s32 Phase 9 itér. — focus restoration : on rend la main au bouton
    // qui a ouvert le chat (toggle du panel segments). requestAnimationFrame
    // pour attendre le re-render du panel segments.
    requestAnimationFrame(() => {
      const btn = document.querySelector<HTMLButtonElement>(
        '[data-testid="open-architect-chat"]'
      );
      btn?.focus();
    });
  }, []);
  // B9 itér.4 — auto-clear skipToast après 3s
  useEffect(() => {
    if (skipToast === null) return;
    const t = setTimeout(() => setSkipToast(null), 3000);
    return () => clearTimeout(t);
  }, [skipToast]);

  // B6 + B7 — détection nouveaux placements (auto-scroll + flag "recent" 3s)
  useEffect(() => {
    const currentIds = new Set(placements.map((p) => p.id));
    const prevIds = prevPlacementIdsRef.current;
    const newIds: string[] = [];
    for (const id of currentIds) {
      if (!prevIds.has(id)) newIds.push(id);
    }
    if (newIds.length > 0) {
      // B6 : marquer comme récemment créés (3s)
      setRecentlyCreatedIds((prev) => {
        const next = new Set(prev);
        for (const id of newIds) next.add(id);
        return next;
      });
      const timers = newIds.map((id) =>
        setTimeout(() => {
          setRecentlyCreatedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, 3000)
      );
      // B7 : auto-scroll vers la dernière nouvelle carte
      const lastNewId = newIds[newIds.length - 1];
      requestAnimationFrame(() => {
        const card = cardRefs.current.get(lastNewId);
        card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      prevPlacementIdsRef.current = currentIds;
      prevPlacementCountRef.current = placements.length;
      return () => {
        for (const t of timers) clearTimeout(t);
      };
    }
    prevPlacementIdsRef.current = currentIds;
    prevPlacementCountRef.current = placements.length;
  }, [placements]);

  // B9 — focus reset sur changement de pièce (room.id)
  useEffect(() => {
    headerRef.current?.focus();
  }, [room.id]);

  // ─── s32 V3 — reset states canvas au changement de pièce ─────────
  useEffect(() => {
    setContourPreview(null);
    setHighlightedSegmentIndex(null);
  }, [room.id]);

  // ─── V3.1 D2 — hint drag mobile (1ère apparition uniquement) ──────
  // Affiche un overlay informatif sur le canvas si l'utilisateur est sur
  // pointeur tactile ET n'a jamais vu le hint. Disparaît au 1er drag commit
  // ou au bout de 5s. Persistance via localStorage (clé `versi.wizardDragHintShown`).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const isCoarse =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: coarse)").matches;
      if (!isCoarse) return;
      const seen = window.localStorage.getItem("versi.wizardDragHintShown");
      if (seen) return;
      setShowMobileDragHint(true);
      const timer = setTimeout(() => setShowMobileDragHint(false), 5000);
      return () => {
        setShowMobileDragHint(false);
        clearTimeout(timer);
      };
    } catch {
      // localStorage indisponible (mode privé Safari, etc.) → pas de hint.
      return;
    }
  }, [room.id]);

  // V3.1 D2 — au 1er drag commit du contour, on consomme le hint définitivement.
  const dismissMobileDragHint = useCallback(() => {
    if (!showMobileDragHint) return;
    setShowMobileDragHint(false);
    try {
      window.localStorage.setItem("versi.wizardDragHintShown", "1");
    } catch {
      /* localStorage indisponible — best-effort */
    }
  }, [showMobileDragHint]);

  // C4 itér. — hint sommet drag (1ère apparition, desktop ET mobile).
  // Pattern identique au hint mobile drag mais sans filtre coarse pointer.
  // Affiché 5s, puis persistance via localStorage (clé `versi.vertexDragHintShown`).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem("versi.vertexDragHintShown");
      if (seen) return;
      setShowVertexDragHint(true);
      const timer = setTimeout(() => {
        setShowVertexDragHint(false);
        try {
          window.localStorage.setItem("versi.vertexDragHintShown", "1");
        } catch {
          /* localStorage indisponible — best-effort */
        }
      }, 5000);
      return () => {
        setShowVertexDragHint(false);
        clearTimeout(timer);
      };
    } catch {
      // localStorage indisponible (mode privé Safari, etc.) → pas de hint.
      return;
    }
  }, [room.id]);

  // C4 itér. — au 1er commit de sommet, on consomme le hint définitivement.
  const dismissVertexDragHint = useCallback(() => {
    if (!showVertexDragHint) return;
    setShowVertexDragHint(false);
    try {
      window.localStorage.setItem("versi.vertexDragHintShown", "1");
    } catch {
      /* localStorage indisponible — best-effort */
    }
  }, [showVertexDragHint]);

  // ─── s32 V3 — load segments à l'ouverture pièce ──────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setSegmentsLoading(true);
      try {
        const res = await fetch(`/api/vs/rooms/${room.id}/segments`, { method: "GET" });
        const json = (await res.json()) as ApiResponse<VsRoomSegment[]>;
        if (!cancelled && json.success) {
          setSegments(json.data);
        }
      } catch (err) {
        console.warn("[VisualWizardRoomStep] load segments failed:", err);
      } finally {
        if (!cancelled) setSegmentsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [room.id]);

  // ─── s32 V3 — drag direct contour (preview + commit immédiat) ─────
  const handleContourDrag = useCallback(
    (offset: { x: number; y: number }) => {
      setContourPreview(offset);
      // V3.1 D2 — au 1er drag, on masque le hint mobile et on persiste la flag.
      dismissMobileDragHint();
    },
    [dismissMobileDragHint]
  );

  const handleContourCommit = useCallback(
    async (offset: { x: number; y: number }) => {
      // Garde l'offset visuel jusqu'à ce que le PATCH return — pas de flash.
      setContourPreview(offset);
      try {
        const res = await fetch(`/api/vs/rooms/${room.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            polygon_offset_x: offset.x,
            polygon_offset_y: offset.y,
          }),
        });
        const json = (await res.json()) as ApiResponse<VsRoom>;
        if (!json.success) {
          console.error("[VisualWizardRoomStep] PATCH polygon_offset failed:", json.error);
          // Rollback visuel : on retire le preview, le polygone revient à l'offset DB.
          setContourPreview(null);
          return;
        }
        // Succès — le parent revalidera via fetch ; on attend ce re-render
        // avant de retirer le preview pour éviter un flash visuel.
        setTimeout(() => setContourPreview(null), 200);
      } catch (err) {
        console.error("[VisualWizardRoomStep] PATCH polygon_offset error:", err);
        setContourPreview(null);
      }
    },
    [room.id]
  );

  // ─── s32 #P1 (Thomas prod) — drag par sommet du polygone ──────────
  /**
   * Au commit, le polygone reçu est en lot-local % EFFECTIF (DB + offset
   * appliqué par RoomZoomCanvas). On le persiste tel quel et on RESET les
   * offsets à 0 pour éviter une double application au prochain render.
   * Pattern : "bake l'offset dans le polygone au commit d'un sommet".
   */
  const handleVertexCommit = useCallback(
    async (newPolygon: Array<{ x_percent: number; y_percent: number }>) => {
      // C4 itér. — au 1er commit, on masque le hint sommet définitivement.
      dismissVertexDragHint();
      try {
        const res = await fetch(`/api/vs/rooms/${room.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            polygon: newPolygon,
            // Bake : offsets remis à null (= 0 effectif) car déjà inclus
            // dans le polygone que l'on persiste.
            polygon_offset_x: null,
            polygon_offset_y: null,
          }),
        });
        const json = (await res.json()) as ApiResponse<VsRoom>;
        if (!json.success) {
          console.error("[VisualWizardRoomStep] PATCH polygon vertex failed:", json.error);
          return;
        }
        // Reset preview contour (l'offset baked est dans newPolygon).
        setContourPreview(null);
        // Notifie le parent pour qu'il rafraîchisse roomsState (sinon le prochain
        // render utilisera l'ancien polygone DB → flash visuel).
        onPolygonChange?.(room.id, newPolygon);
      } catch (err) {
        console.error("[VisualWizardRoomStep] PATCH polygon vertex error:", err);
      }
    },
    [room.id, onPolygonChange, dismissVertexDragHint]
  );

  // ─── s32 V3 — change type segment depuis le panel latéral ─────────
  const handleSegmentTypeChange = useCallback(
    async (segmentIndex: number, type: VsRoomSegmentType) => {
      // Optimistic update local immédiat (< 100ms feedback canvas + panel)
      setSegments((prev) => {
        const existing = prev.find((s) => s.segment_index === segmentIndex);
        if (existing) {
          return prev.map((s) =>
            s.segment_index === segmentIndex ? { ...s, type } : s
          );
        }
        return [
          ...prev,
          {
            id: `pending-${segmentIndex}`,
            room_id: room.id,
            segment_index: segmentIndex,
            type,
            notes: null,
            updated_at: new Date().toISOString(),
          },
        ];
      });
      try {
        const res = await fetch(
          `/api/vs/rooms/${room.id}/segments/${segmentIndex}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type }),
          }
        );
        const json = (await res.json()) as ApiResponse<VsRoomSegment>;
        if (json.success) {
          setSegments((prev) =>
            prev.map((s) =>
              s.segment_index === segmentIndex ? json.data : s
            )
          );
        }
      } catch (err) {
        console.error("[VisualWizardRoomStep] PATCH segment failed:", err);
      }
    },
    [room.id]
  );

  const handleFileChange = useCallback(
    async (placementId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setBusyPlacementId(placementId);
      // Reset erreur précédente pour ce placement
      setErrorPlacementIds((prev) => {
        if (!prev.has(placementId)) return prev;
        const next = new Map(prev);
        next.delete(placementId);
        return next;
      });
      try {
        const isPending = placementId.startsWith("pending-");
        if (isPending) {
          await onUploadForPending(placementId, file);
        } else {
          await onUploadReplace(placementId, file);
        }
      } catch (err) {
        // B10 — stocker l'erreur pour ce placement spécifique
        const msg =
          err instanceof Error ? err.message : "L'envoi de la photo a échoué.";
        setErrorPlacementIds((prev) => {
          const next = new Map(prev);
          next.set(placementId, msg);
          return next;
        });
      } finally {
        setBusyPlacementId(null);
      }
    },
    [onUploadForPending, onUploadReplace]
  );

  // B10 — réessayer l'upload pour un placement en erreur
  const handleRetryUpload = useCallback(
    (placementId: string) => {
      setErrorPlacementIds((prev) => {
        if (!prev.has(placementId)) return prev;
        const next = new Map(prev);
        next.delete(placementId);
        return next;
      });
      triggerFilePicker(placementId);
    },
    [triggerFilePicker]
  );

  const handleDelete = useCallback(
    async (placementId: string) => {
      setBusyPlacementId(placementId);
      try {
        await onDeletePlacement(placementId);
        if (selectedPlacementId === placementId) setSelectedPlacementId(null);
      } finally {
        setBusyPlacementId(null);
      }
    },
    [onDeletePlacement, selectedPlacementId]
  );

  const roomLabel = room.custom_label || room.name || room.room_type || "Pièce";
  // B3 — au chargement Pièce 1 = 0%, pas (1/N)*100
  const progressPct = Math.round(((stepIndex - 1) / totalSteps) * 100);

  // s32 Phase 5 — ouvrir la modale récap brief avant POST /visuals/generate.
  // On fetch GET /chat pour récupérer l'extra_context, puis on construit la
  // synthèse via buildHumanReadableBrief.
  // En cas d'échec fetch chat → on continue sans extra_context (best-effort).
  const handleOpenBriefDialog = useCallback(async () => {
    let chatExtra: Record<string, string> = {};
    try {
      const res = await fetch(`/api/vs/rooms/${room.id}/chat`, { method: "GET" });
      if (res.ok) {
        const json = (await res.json()) as
          | { success: true; data: { extra_context: Record<string, string> } }
          | { success: false; error: string };
        if (json.success && json.data.extra_context) {
          chatExtra = json.data.extra_context;
        }
      }
    } catch (err) {
      console.warn("[VisualWizardRoomStep] fetch chat extra_context failed (non-bloquant):", err);
    }
    const briefText = buildHumanReadableBrief({
      room,
      details: room.architectural_details,
      // s32 micro-fix architecte (10/10) — profil lot inclus dans la synthèse brief.
      // Lu depuis currentLot.architectural_profile (prop propagée par parent).
      profile: currentLot?.architectural_profile ?? null,
      segments,
      styleId,
      comment,
      chatExtraContext: chatExtra,
      targetVisualCount,
    });
    setBriefDialogText(briefText);
    setBriefDialogOpen(true);
  }, [
    room,
    currentLot,
    segments,
    styleId,
    comment,
    targetVisualCount,
  ]);

  const handleBriefConfirm = useCallback(() => {
    setBriefDialogOpen(false);
    setGeneratingThis(true);
    void onGenerateThisRoom().finally(() => setGeneratingThis(false));
  }, [onGenerateThisRoom]);

  const handleBriefCancel = useCallback(() => {
    setBriefDialogOpen(false);
  }, []);

  return (
    <div className="flex flex-col gap-lg w-full" data-testid="visual-wizard-room-step">
      {/* Header progression */}
      <div className="flex flex-col gap-xs">
        <div className="flex items-baseline justify-between">
          <p className="text-xs uppercase tracking-widest text-text-muted">
            Pièce {stepIndex} / {totalSteps}
          </p>
          <p className="text-xs text-text-muted">
            {placementsWithPhoto.length} photo{placementsWithPhoto.length > 1 ? "s" : ""} placée
            {placementsWithPhoto.length > 1 ? "s" : ""}
          </p>
        </div>
        <h2
          ref={headerRef}
          tabIndex={-1}
          className="text-xl sm:text-2xl uppercase tracking-wide font-semibold font-serif text-text-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
        >
          {roomLabel}
        </h2>
        <div
          className="w-full h-1 rounded-full bg-bg-card overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
          aria-label={`Avancement de la configuration : ${progressPct} %`}
        >
          <div
            className="h-full bg-interactive-primary transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Layout V3 — canvas + panel latéral (split desktop, stack mobile) */}
      <div
        className={[
          "flex flex-col lg:flex-row gap-md transition-opacity",
          busyPlacementId !== null ? "opacity-70 pointer-events-none" : "",
        ].join(" ")}
      >
        <div className="relative flex-1 min-w-0 h-[420px] sm:h-[520px]">
          <RoomZoomCanvas
            room={room}
            planImageUrl={planImageUrl}
            lotZone={lotZone}
            placements={placements}
            selectedPlacementId={selectedPlacementId}
            onPlaceClick={onPlacementPending}
            onSelectPlacement={setSelectedPlacementId}
            onAngleDrag={onAngleDrag}
            onAngleCommit={onAngleCommit}
            isCommitting={busyPlacementId !== null}
            onClickOutsidePolygon={handleClickOutsidePolygon}
            onPlacementMoveCommit={onPlacementMoveCommit}
            onPlacementMoving={setMovingPlacementId}
            contourOffsetPreview={contourPreview}
            onContourDrag={handleContourDrag}
            onContourCommit={handleContourCommit}
            segments={segments}
            highlightedSegmentIndex={highlightedSegmentIndex}
            onSegmentHover={setHighlightedSegmentIndex}
            onVertexCommit={handleVertexCommit}
          />
          {/* s33 fix B-3 — Empty state guidance au 1er accès pièce.
              Affiché uniquement si aucune photo n'est encore placée ET
              aucun pending non plus → l'utilisateur arrive face à un canvas
              "vide" et ne sait pas par où commencer. Disparaît dès la 1re
              prise de vue placée. Pointer-events-none pour ne pas bloquer
              le clic-pour-placer du canvas en dessous. */}
          {placements.length === 0 && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none px-md"
              role="status"
              aria-live="polite"
              data-testid="wizard-empty-state"
            >
              <div className="max-w-sm bg-bg-card/95 border border-interactive-primary/30 rounded-md shadow-md px-md py-sm text-center">
                <svg
                  className="w-6 h-6 mx-auto mb-xs text-interactive-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                  />
                </svg>
                <p className="text-sm text-text-default font-medium mb-2xs">
                  Cliquez sur le plan pour placer une prise de vue
                </p>
                <p className="text-xs text-text-muted">
                  Puis déposez la photo source de l&apos;intérieur depuis cet
                  emplacement.
                </p>
              </div>
            </div>
          )}
          {/* A7 — toast clic hors polygone (auto-clear 2s) */}
          {outsideHint && (
            <div
              className="absolute bottom-md left-1/2 -translate-x-1/2 pointer-events-none"
              role="status"
              aria-live="polite"
            >
              <p className="text-xs text-text-default bg-bg-card/95 px-md py-xs rounded-md border border-warning/40 shadow-md">
                {outsideHint}
              </p>
            </div>
          )}
          {/* V3.1 D2 — hint drag mobile (1ère apparition, auto-clear 5s) */}
          {showMobileDragHint && (
            <div
              className="absolute top-md left-1/2 -translate-x-1/2 pointer-events-none animate-in fade-in duration-200"
              role="status"
              aria-live="polite"
              data-testid="wizard-mobile-drag-hint"
            >
              <p className="text-xs text-text-default bg-bg-card/95 px-md py-xs rounded-md border border-interactive-primary/40 shadow-md">
                Glissez le contour pour le recaler.
              </p>
            </div>
          )}
          {/* C4 itér. — hint sommet drag (1ère apparition desktop+mobile, auto-clear 5s) */}
          {showVertexDragHint && !showMobileDragHint && (
            <div
              className="absolute top-md left-1/2 -translate-x-1/2 pointer-events-none animate-in fade-in duration-200"
              role="status"
              aria-live="polite"
              data-testid="wizard-vertex-drag-hint"
            >
              <p className="text-xs text-text-default bg-bg-card/95 px-md py-xs rounded-md border border-interactive-primary/40 shadow-md">
                Glissez un sommet blanc pour ajuster la forme du contour.
              </p>
            </div>
          )}
          {/* B9 itér.4 — toast feedback skip pièce (auto-clear 3s) */}
          {skipToast && (
            <div
              className="absolute bottom-md left-1/2 -translate-x-1/2 pointer-events-none"
              role="status"
              aria-live="polite"
              data-testid="wizard-skip-toast"
            >
              <p className="text-xs text-text-default bg-bg-card/95 px-md py-xs rounded-md border border-interactive-primary/40 shadow-md">
                {skipToast}
              </p>
            </div>
          )}
        </div>

        {/* s32 (Phase 9) — Panel latéral : segments OU chat architecte (toggle) */}
        {panelMode === "segments" ? (
          <RoomSegmentsPanel
            polygon={room.polygon}
            segments={segments}
            loading={segmentsLoading}
            highlightedSegmentIndex={highlightedSegmentIndex}
            onRowHover={setHighlightedSegmentIndex}
            onSegmentTypeChange={handleSegmentTypeChange}
            onOpenChat={handleOpenChat}
            chatActive={false}
          />
        ) : (
          <ArchitectChatPanel
            roomId={room.id}
            onFieldUpdate={(u) => void handleChatFieldUpdate(u)}
            onBriefValidated={handleChatBriefValidated}
            onClose={handleCloseChat}
          />
        )}
      </div>

      {/* s32 (Phase 9) — toast feedback chat update_field (auto-clear 3s).
          s32 Phase 4 — bouton « Annuler » inline si chatToastUndo défini (5s). */}
      {chatToast && (
        <div
          role="status"
          aria-live="polite"
          data-testid="wizard-chat-toast"
          className="fixed bottom-md right-md mb-[60px] sm:mb-0 z-50 max-w-sm"
        >
          <div
            className={[
              "flex items-center gap-sm text-xs text-text-default bg-bg-card/95 px-md py-sm rounded-md border shadow-md",
              chatToastType === "error"
                ? "border-error/40 bg-error/5"
                : "border-success/40 bg-success/5",
            ].join(" ")}
          >
            <p className="flex-1 min-w-0">{chatToast}</p>
            {chatToastUndo && chatToastType === "success" && (
              <button
                type="button"
                onClick={() => void handleChatToastUndo()}
                data-testid="wizard-chat-toast-undo"
                className="text-xs font-semibold text-success hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success px-xs py-2xs rounded"
              >
                Annuler
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setChatToast(null);
                setChatToastUndo(null);
              }}
              aria-label="Fermer la notification"
              className="text-text-muted hover:text-text-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Bandeau info drag direct + reset offset */}
      <div className="flex flex-wrap items-center gap-sm text-xs text-text-muted">
        <span>
          Astuce : faites glisser l&apos;intérieur du contour pour le recaler sur les murs réels.
        </span>
        {(room.polygon_offset_x ?? 0) !== 0 || (room.polygon_offset_y ?? 0) !== 0 ? (
          <span className="text-text-muted">
            · Contour ajusté
            <button
              type="button"
              onClick={async () => {
                try {
                  await fetch(`/api/vs/rooms/${room.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ polygon_offset_x: null, polygon_offset_y: null }),
                  });
                  setContourPreview(null);
                } catch (err) {
                  console.error("[VisualWizardRoomStep] reset offset failed:", err);
                }
              }}
              className="ml-xs min-h-[44px] inline-flex items-center px-sm text-xs text-interactive-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
              data-testid="wizard-reset-contour-offset"
            >
              réinitialiser
            </button>
          </span>
        ) : null}
      </div>

      {/* Liste pastilles + uploads */}
      <section
        aria-labelledby="placements-list-title"
        className="flex flex-col gap-sm"
      >
        <h3
          id="placements-list-title"
          className="text-sm uppercase tracking-wide font-semibold text-text-default"
        >
          Photos pour cette pièce
        </h3>
        {placements.length === 0 ? (
          <p className="text-sm text-text-muted bg-bg-card border border-border-default border-dashed rounded-md p-md">
            Cliquez sur le plan pour placer une prise de vue, puis déposez la photo.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-sm">
            {placements.map((p, idx) => {
              const hasPhoto = p.is_placed_on_plan && p.file_path !== "";
              const isBusy = busyPlacementId === p.id;
              const placementError = errorPlacementIds.get(p.id) ?? null;
              const showDragHint = recentlyCreatedIds.has(p.id);
              const photoUrl = hasPhoto
                ? `/api/vs/files?path=${encodeURIComponent(p.file_path)}`
                : null;
              return (
                <li
                  key={p.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(p.id, el);
                    else cardRefs.current.delete(p.id);
                  }}
                  className={[
                    "flex gap-sm p-sm rounded-md border bg-bg-card transition-shadow",
                    movingPlacementId === p.id
                      ? "border-warning ring-2 ring-warning/40"
                      : selectedPlacementId === p.id
                      ? "border-interactive-primary ring-2 ring-interactive-primary/30"
                      : placementError
                      ? "border-error/50"
                      : "border-border-default",
                  ].join(" ")}
                  data-testid={`placement-item-${idx + 1}`}
                >
                  <div className="relative w-16 h-16 rounded-md overflow-hidden bg-bg-default border border-border-default flex-shrink-0">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl}
                        alt={`Photo position ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-text-muted">
                        {idx + 1}
                      </div>
                    )}
                    <span
                      className={[
                        "absolute -top-1 -left-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white",
                        hasPhoto ? "bg-success" : "bg-interactive-primary",
                      ].join(" ")}
                      aria-label={hasPhoto ? "Photo uploadée" : "En attente d'upload"}
                    >
                      {hasPhoto ? "✓" : idx + 1}
                    </span>
                  </div>
                  <div className="flex flex-col gap-xs flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-default truncate">
                      Position {idx + 1}
                    </p>
                    <p className="text-xs text-text-muted">
                      {p.angle_degrees !== null
                        ? `Angle ${Math.round(p.angle_degrees)}°`
                        : "Faites tourner la flèche pour orienter."}
                    </p>
                    {/* B6 + B2 itér.4 — hint drag pendant 3s après création (inconditionnel) */}
                    {showDragHint && (
                      <p className="text-xs text-interactive-primary">
                        Faites glisser la pointe pour ajuster.
                      </p>
                    )}
                    {/* B10 — message erreur + bouton réessayer par placement */}
                    {placementError && (
                      <p className="text-xs text-error" role="alert">
                        {placementError}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-xs mt-xs">
                      <input
                        ref={(el) => {
                          if (el) fileInputsRef.current.set(p.id, el);
                          else fileInputsRef.current.delete(p.id);
                        }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(e) => handleFileChange(p.id, e)}
                        aria-label={
                          hasPhoto
                            ? `Remplacer la photo position ${idx + 1}`
                            : `Uploader la photo position ${idx + 1}`
                        }
                      />
                      {placementError ? (
                        <button
                          type="button"
                          onClick={() => handleRetryUpload(p.id)}
                          disabled={isBusy}
                          className="text-xs px-sm py-xs rounded-md bg-error text-text-inverse hover:bg-error/90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
                          data-testid={`placement-retry-${idx + 1}`}
                        >
                          Réessayer
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => triggerFilePicker(p.id)}
                          disabled={isBusy}
                          className="text-xs px-sm py-xs rounded-md bg-interactive-primary text-text-inverse hover:bg-interactive-hover disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
                        >
                          {isBusy
                            ? "..."
                            : hasPhoto
                            ? "Remplacer"
                            : "Uploader"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        disabled={isBusy}
                        className="text-xs px-sm py-xs rounded-md text-error hover:bg-error/10 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Style picker */}
      <section className="rounded-md border border-border-default bg-bg-card p-md">
        <RoomStylePicker
          selectedStyleId={styleId}
          onSelect={onStyleSelect}
        />
      </section>

      {/* s33 Lot F #F-4 — Sélecteur "Visuels par pièce" déplacé dans le footer
          du wizard (à côté du bouton "Générer"). Audit @ux : la section
          inline ici perturbait la lecture (entre style picker et détails).
          Le sélecteur est plus naturel à côté du CTA principal de génération. */}

      {/* s32 #3 (autopilot) — Détails pièce : meublé + commentaires libres */}
      <section
        aria-labelledby="room-details-title"
        className="rounded-md border border-border-default bg-bg-card p-md flex flex-col gap-md"
      >
        <h3
          id="room-details-title"
          className="text-sm uppercase tracking-wide font-semibold text-text-default"
        >
          Détails de la pièce
        </h3>

        {/* Toggle meublé / non-meublé */}
        <div className="flex flex-col gap-xs">
          <p className="text-xs text-text-muted">
            État actuel de la pièce sur les photos
          </p>
          <div
            role="radiogroup"
            aria-label="État actuel de la pièce"
            className="inline-flex rounded-md border border-border-default isolate self-start"
          >
            <button
              type="button"
              role="radio"
              aria-checked={room.is_furnished === true}
              onClick={() => void onFurnishedChange(true)}
              className={[
                "min-h-[44px] px-md py-sm text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary",
                room.is_furnished
                  ? "bg-interactive-primary text-text-inverse"
                  : "bg-bg-card text-text-default hover:bg-bg-default",
              ].join(" ")}
              data-testid="wizard-furnished-yes"
            >
              Meublée
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={room.is_furnished === false}
              onClick={() => void onFurnishedChange(false)}
              className={[
                "min-h-[44px] px-md py-sm text-sm font-medium border-l border-border-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary",
                !room.is_furnished
                  ? "bg-interactive-primary text-text-inverse"
                  : "bg-bg-card text-text-default hover:bg-bg-default",
              ].join(" ")}
              data-testid="wizard-furnished-no"
            >
              Non meublée
            </button>
          </div>
          <p className="text-xs text-text-muted">
            {room.is_furnished
              ? "L'IA améliorera le mobilier existant en respectant la disposition."
              : "L'IA apportera le mobilier complet du style choisi."}
          </p>
        </div>

        {/* Commentaire libre */}
        <div className="flex flex-col gap-xs">
          <label
            htmlFor={`room-comment-${room.id}`}
            className="text-xs text-text-muted"
          >
            Instructions pour l&apos;IA (optionnel)
          </label>
          <textarea
            id={`room-comment-${room.id}`}
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value.slice(0, 500))}
            placeholder="Ex : éclairage tamisé souhaité, vue mer côté gauche, garder le canapé bleu..."
            rows={3}
            maxLength={500}
            data-testid="wizard-room-comment"
            aria-describedby={`room-comment-counter-${room.id}`}
            className="w-full px-md py-sm text-sm rounded-md border border-border-default bg-bg-default text-text-default placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary resize-y"
          />
          <p
            id={`room-comment-counter-${room.id}`}
            className="text-xs text-text-muted text-right"
          >
            {commentDraft.length} / 500
          </p>
        </div>
      </section>

      {/* s32 (Thomas prod) — Détails architecturaux : sol, murs, luminosité, particularités */}
      {onArchitecturalDetailsChange && (
        <RoomArchitecturalDetails
          room={room}
          onChange={(d) => void onArchitecturalDetailsChange(d)}
          visionAnalyzing={visionAnalyzing}
          hasPhotoSource={placements.some(
            (p) => p.is_placed_on_plan && p.file_path !== ""
          )}
        />
      )}

      {/* Footer navigation */}
      <div
        className="flex flex-col gap-md pt-sm border-t border-border-default"
        data-testid="wizard-footer"
      >
        {/* s33 Lot F #F-4 — Sélecteur "Visuels par pièce" dans le footer (à
            côté du CTA Générer). Avant : section inline entre style picker et
            détails (perturbait la lecture). Après : compact, immédiatement
            visible avant l'action de génération. */}
        <div
          className="flex flex-wrap items-center justify-between gap-sm"
          data-testid="wizard-footer-target-count"
        >
          <div className="flex flex-col gap-2xs">
            <span
              id="room-target-count-title"
              className="text-xs font-medium text-text-default"
            >
              Visuels à générer pour cette pièce
            </span>
            <span className="text-xs text-text-muted">
              Plus de visuels = plus de variations d&apos;angles et de cadrages.
            </span>
          </div>
          <div
            role="radiogroup"
            aria-labelledby="room-target-count-title"
            aria-label="Nombre de visuels à générer pour cette pièce"
            className="inline-flex rounded-md border border-border-default isolate self-start [&>button:first-child]:rounded-l-md [&>button:last-child]:rounded-r-md"
          >
            {[1, 2, 3, 4, 5].map((n) => {
              const selected = targetVisualCount === n;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => void onTargetVisualCountChange(n)}
                  data-testid={`wizard-target-count-${n}`}
                  className={[
                    "relative min-h-[44px] min-w-[44px] px-md py-sm text-sm font-medium border-r last:border-r-0 border-border-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary focus-visible:z-10",
                    selected
                      ? "bg-interactive-primary text-text-inverse"
                      : "bg-bg-card text-text-default hover:bg-bg-default",
                  ].join(" ")}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-sm">
          <div className="flex items-center gap-sm flex-wrap">
            {onPrevRoom && (
              <button
                type="button"
                onClick={onPrevRoom}
                className="min-h-[44px] px-md py-sm rounded-md text-sm font-medium border border-border-default text-text-default hover:bg-bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary"
              >
                ← Précédent
              </button>
            )}
            {/* s32 #5 (autopilot) — skip pièce (confirm two-step inline) */}
            <button
              type="button"
              onClick={handleSkipClick}
              disabled={skipping}
              data-testid="wizard-skip-room"
              aria-pressed={confirmSkip}
              className={[
                "min-h-[44px] px-md py-sm rounded-md text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary disabled:opacity-50",
                confirmSkip
                  ? "bg-warning text-text-inverse hover:bg-warning/90"
                  : "border border-border-default text-text-muted hover:text-text-default hover:bg-bg-card",
              ].join(" ")}
            >
              {skipping
                ? "Passage en cours..."
                : confirmSkip
                ? "Confirmer — ignorer cette pièce"
                : "Passer cette pièce"}
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-xs sm:gap-sm">
            {/* s33 fix B-4 — checklist ✓/✗ visible quand pré-requis incomplets.
                Avant : un seul message texte (« Ajoutez au moins une photo. »).
                Après : checklist explicite qui liste TOUS les pré-requis pour
                que l'utilisateur sache exactement où il en est. */}
            {disabledReason && !chatBriefValidated && (
              <ul
                className="flex flex-col gap-2xs text-xs text-text-muted sm:text-right"
                aria-label="Pré-requis pour générer cette pièce"
                data-testid="wizard-generate-checklist"
              >
                {generateChecklist.map((item, idx) => (
                  <li
                    key={idx}
                    className="inline-flex items-center gap-2xs sm:justify-end"
                  >
                    <span
                      aria-hidden="true"
                      className={
                        item.ok
                          ? "text-success font-semibold"
                          : "text-text-muted"
                      }
                    >
                      {item.ok ? "✓" : "○"}
                    </span>
                    <span className={item.ok ? "text-text-default" : ""}>
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {/* s32 Phase 9 — bouton Générer dynamique :
                - état initial : gris-bleu « Générer quand même » (toujours actif)
                - signal validate_brief LLM (chatBriefValidated=true) : vert
                  « Générer — brief complet » */}
            <button
              type="button"
              onClick={() => {
                // s32 Phase 5 — ouverture modale récap au lieu de POST direct.
                void handleOpenBriefDialog();
              }}
              disabled={generatingThis}
              data-testid="wizard-generate-this-room"
              data-brief-validated={chatBriefValidated ? "true" : "false"}
              className={[
                "inline-flex items-center justify-center gap-xs min-h-[44px] px-xl py-sm rounded-md text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300 ease-out",
                chatBriefValidated
                  ? "bg-success text-bg-canvas hover:opacity-90"
                  : "bg-bg-card border border-border-default text-text-default hover:bg-bg-subtle",
              ].join(" ")}
            >
              {chatBriefValidated && !generatingThis && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 8.5l3 3 7-7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {generatingThis
                ? "Lancement..."
                : chatBriefValidated
                ? "Générer — brief complet"
                : "Générer quand même"}
            </button>
          </div>
        </div>
      </div>

      {/* s32 Phase 5 — modale récap brief avant POST /visuals/generate */}
      <BriefSummaryDialog
        open={briefDialogOpen}
        briefText={briefDialogText}
        onConfirm={handleBriefConfirm}
        onCancel={handleBriefCancel}
      />
    </div>
  );
}
