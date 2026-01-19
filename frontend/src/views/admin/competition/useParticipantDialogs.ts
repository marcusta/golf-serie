import { useState, useCallback } from "react";

interface HandicapDialogState {
  id: number;
  name: string;
  handicap_index?: number;
}

interface ScoreDialogState {
  id: number;
  name: string;
  score: number[];
}

interface DQDialogState {
  id: number;
  name: string;
  isDQ: boolean;
}

interface QRDialogState {
  open: boolean;
  url: string;
  title: string;
  description: string;
}

export function useParticipantDialogs(onRefetch: () => void) {
  const [editHandicapDialogOpen, setEditHandicapDialogOpen] = useState(false);
  const [selectedParticipantForHandicap, setSelectedParticipantForHandicap] = useState<HandicapDialogState | null>(null);

  const [editScoreDialogOpen, setEditScoreDialogOpen] = useState(false);
  const [selectedParticipantForScore, setSelectedParticipantForScore] = useState<ScoreDialogState | null>(null);

  const [dqDialogOpen, setDqDialogOpen] = useState(false);
  const [selectedParticipantForDQ, setSelectedParticipantForDQ] = useState<DQDialogState | null>(null);

  const [qrDialogState, setQrDialogState] = useState<QRDialogState>({
    open: false,
    url: "",
    title: "",
    description: "",
  });

  const openHandicapDialog = useCallback((participant: HandicapDialogState) => {
    setSelectedParticipantForHandicap(participant);
    setEditHandicapDialogOpen(true);
  }, []);

  const closeHandicapDialog = useCallback((open: boolean) => {
    setEditHandicapDialogOpen(open);
    if (!open) onRefetch();
  }, [onRefetch]);

  const openScoreDialog = useCallback((participant: ScoreDialogState) => {
    setSelectedParticipantForScore(participant);
    setEditScoreDialogOpen(true);
  }, []);

  const closeScoreDialog = useCallback((open: boolean) => {
    setEditScoreDialogOpen(open);
    if (!open) onRefetch();
  }, [onRefetch]);

  const openDQDialog = useCallback((participant: DQDialogState) => {
    setSelectedParticipantForDQ(participant);
    setDqDialogOpen(true);
  }, []);

  const closeDQDialog = useCallback((open: boolean) => {
    setDqDialogOpen(open);
    if (!open) onRefetch();
  }, [onRefetch]);

  const openQRDialog = useCallback((url: string, title: string, description: string) => {
    setQrDialogState({ open: true, url, title, description });
  }, []);

  const closeQRDialog = useCallback((open: boolean) => {
    setQrDialogState((prev) => ({ ...prev, open }));
  }, []);

  return {
    // Handicap dialog
    editHandicapDialogOpen,
    selectedParticipantForHandicap,
    openHandicapDialog,
    closeHandicapDialog,
    // Score dialog
    editScoreDialogOpen,
    selectedParticipantForScore,
    openScoreDialog,
    closeScoreDialog,
    // DQ dialog
    dqDialogOpen,
    selectedParticipantForDQ,
    openDQDialog,
    closeDQDialog,
    // QR dialog
    qrDialogState,
    openQRDialog,
    closeQRDialog,
  };
}

export default useParticipantDialogs;
