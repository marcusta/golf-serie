import { useState, useEffect } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle, Clock, X } from "lucide-react";
import { useCompetition } from "../../api/competitions";
import {
  useCompetitionParticipants,
  useUpdateManualScore,
  type Participant,
} from "../../api/participants";
import { useCourses } from "../../api/courses";

interface ManualScoreInputs {
  out?: string;
  in?: string;
  total?: string;
}

interface SaveStatus {
  [participantId: number]: "idle" | "saving" | "saved" | "error";
}

export default function AdminManualScoreEntry() {
  const { competitionId } = useParams({
    from: "/admin/competitions/$competitionId/manual-scores",
  });

  const competitionIdNum = parseInt(competitionId);

  const { data: competition, isLoading: competitionLoading } =
    useCompetition(competitionIdNum);
  const { data: participants, isLoading: participantsLoading } =
    useCompetitionParticipants(competitionIdNum);
  const { data: courses } = useCourses();
  const updateManualScore = useUpdateManualScore();

  // Track only the scores that are currently being edited by the user
  const [editedScores, setEditedScores] = useState<{
    [participantId: number]: ManualScoreInputs;
  }>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({});

  // Get the manual entry format from competition (default to out_in_total for backward compatibility)
  const isOutInTotalMode = competition?.manual_entry_format !== "total_only";

  // Debounced save effect - only watches editedScores
  useEffect(() => {
    if (Object.keys(editedScores).length === 0) return;

    const timeoutId = setTimeout(() => {
      Object.entries(editedScores).forEach(
        async ([participantIdStr, scoreData]) => {
          const participantId = parseInt(participantIdStr);

          setSaveStatus((prev) => ({ ...prev, [participantId]: "saving" }));

          try {
            let mutationData: { out?: number; in?: number; total: number };

            if (isOutInTotalMode) {
              // OUT/IN/TOTAL mode
              if (!scoreData.out || !scoreData.in) return;

              const out = parseInt(scoreData.out);
              const inScore = parseInt(scoreData.in);

              // Validate inputs
              if (isNaN(out) || isNaN(inScore) || out < 0 || inScore < 0) {
                setSaveStatus((prev) => ({
                  ...prev,
                  [participantId]: "error",
                }));
                return;
              }

              // Check if this score is different from what's currently saved on server
              const participant = participants?.find(
                (p) => p.id === participantId
              );
              if (
                participant &&
                participant.manual_score_out === out &&
                participant.manual_score_in === inScore
              ) {
                // No change needed - clear the edit
                setEditedScores((prev) => {
                  const newEdited = { ...prev };
                  delete newEdited[participantId];
                  return newEdited;
                });
                return;
              }

              const total = out + inScore;
              mutationData = { out, in: inScore, total };
            } else {
              // TOTAL ONLY mode
              if (!scoreData.total) return;

              const total = parseInt(scoreData.total);

              // Validate input
              if (isNaN(total) || total < 0) {
                setSaveStatus((prev) => ({
                  ...prev,
                  [participantId]: "error",
                }));
                return;
              }

              // Check if this score is different from what's currently saved on server
              const participant = participants?.find(
                (p) => p.id === participantId
              );
              if (participant && participant.manual_score_total === total) {
                // No change needed - clear the edit
                setEditedScores((prev) => {
                  const newEdited = { ...prev };
                  delete newEdited[participantId];
                  return newEdited;
                });
                return;
              }

              mutationData = { total };
            }

            await updateManualScore.mutateAsync({
              id: participantId,
              data: mutationData,
            });

            setSaveStatus((prev) => ({ ...prev, [participantId]: "saved" }));

            // Clear the edit from local state after successful save
            setEditedScores((prev) => {
              const newEdited = { ...prev };
              delete newEdited[participantId];
              return newEdited;
            });

            // Clear saved status after 2 seconds
            setTimeout(() => {
              setSaveStatus((prev) => ({ ...prev, [participantId]: "idle" }));
            }, 2000);
          } catch (error) {
            console.error("Failed to save manual score:", error);
            setSaveStatus((prev) => ({ ...prev, [participantId]: "error" }));

            // Clear error status after 3 seconds
            setTimeout(() => {
              setSaveStatus((prev) => ({ ...prev, [participantId]: "idle" }));
            }, 3000);
          }
        }
      );
    }, 750);

    return () => clearTimeout(timeoutId);
  }, [editedScores, updateManualScore, participants, isOutInTotalMode]);

  const handleScoreChange = (
    participantId: number,
    field: "out" | "in" | "total",
    value: string
  ) => {
    // Get current edit state or fall back to server data
    const currentEdit = editedScores[participantId];
    const participant = participants?.find((p) => p.id === participantId);

    const newScoreData: ManualScoreInputs = {
      out: currentEdit?.out ?? participant?.manual_score_out?.toString() ?? "",
      in: currentEdit?.in ?? participant?.manual_score_in?.toString() ?? "",
      total:
        currentEdit?.total ?? participant?.manual_score_total?.toString() ?? "",
      [field]: value,
    };

    setEditedScores((prev) => ({
      ...prev,
      [participantId]: newScoreData,
    }));
  };

  const handleClearScores = async (participantId: number) => {
    try {
      setSaveStatus((prev) => ({ ...prev, [participantId]: "saving" }));

      // Clear scores by setting all to null
      await updateManualScore.mutateAsync({
        id: participantId,
        data: { out: null, in: null, total: null },
      });

      // Clear any pending edits for this participant
      setEditedScores((prev) => {
        const newEdited = { ...prev };
        delete newEdited[participantId];
        return newEdited;
      });

      setSaveStatus((prev) => ({ ...prev, [participantId]: "saved" }));

      // Clear saved status after 2 seconds
      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, [participantId]: "idle" }));
      }, 2000);
    } catch (error) {
      console.error("Failed to clear manual scores:", error);
      setSaveStatus((prev) => ({ ...prev, [participantId]: "error" }));

      // Clear error status after 3 seconds
      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, [participantId]: "idle" }));
      }, 3000);
    }
  };

  const calculateTotal = (participantId: number): number | null => {
    if (!isOutInTotalMode) {
      // In total-only mode, show the total from edit state or server
      const currentEdit = editedScores[participantId];
      const participant = participants?.find((p) => p.id === participantId);

      const totalValue =
        currentEdit?.total ?? participant?.manual_score_total?.toString() ?? "";
      if (!totalValue) return null;

      const total = parseInt(totalValue);
      return isNaN(total) ? null : total;
    }

    // In out/in/total mode, calculate from out and in
    const currentEdit = editedScores[participantId];
    const participant = participants?.find((p) => p.id === participantId);

    const outValue =
      currentEdit?.out ?? participant?.manual_score_out?.toString() ?? "";
    const inValue =
      currentEdit?.in ?? participant?.manual_score_in?.toString() ?? "";

    if (!outValue || !inValue) return null;

    const out = parseInt(outValue);
    const inScore = parseInt(inValue);

    if (isNaN(out) || isNaN(inScore)) return null;

    return out + inScore;
  };

  const groupParticipantsByTeam = (participants: Participant[]) => {
    const grouped: { [teamName: string]: Participant[] } = {};

    participants.forEach((participant) => {
      const teamName = participant.team_name || "Unknown Team";
      if (!grouped[teamName]) {
        grouped[teamName] = [];
      }
      grouped[teamName].push(participant);
    });

    return grouped;
  };

  const getSaveStatusIcon = (participantId: number) => {
    const status = saveStatus[participantId] || "idle";

    switch (status) {
      case "saving":
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case "saved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return (
          <div className="h-4 w-4 rounded-full bg-red-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">!</span>
          </div>
        );
      default:
        return null;
    }
  };

  if (competitionLoading || participantsLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!competition) {
    return <div className="p-6">Competition not found</div>;
  }

  const course = courses?.find((c) => c.id === competition.course_id);
  const groupedParticipants = participants
    ? groupParticipantsByTeam(participants)
    : {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin/competitions"
          className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Competitions
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manual Score Entry</h1>
        <p className="text-gray-600 mt-1">
          {competition.name} • {course?.name || "Unknown Course"} •{" "}
          {competition.date}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {isOutInTotalMode
            ? "Enter OUT, IN, and TOTAL scores for each participant. Changes are automatically saved after you stop typing."
            : "Enter TOTAL scores for each participant. Changes are automatically saved after you stop typing."}
        </p>
      </div>

      {/* Participants Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team & Position
                </th>
                {isOutInTotalMode && (
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    OUT
                  </th>
                )}
                {isOutInTotalMode && (
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IN
                  </th>
                )}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  TOTAL
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(groupedParticipants).map(
                ([teamName, teamParticipants]) =>
                  teamParticipants.map((participant) => (
                    <tr key={participant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {teamName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {participant.position_name}
                          </div>
                        </div>
                      </td>
                      {isOutInTotalMode && (
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input
                            type="number"
                            min="0"
                            value={
                              editedScores[participant.id]?.out ??
                              participant.manual_score_out?.toString() ??
                              ""
                            }
                            onChange={(e) =>
                              handleScoreChange(
                                participant.id,
                                "out",
                                e.target.value
                              )
                            }
                            className="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="—"
                          />
                        </td>
                      )}
                      {isOutInTotalMode && (
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input
                            type="number"
                            min="0"
                            value={
                              editedScores[participant.id]?.in ??
                              participant.manual_score_in?.toString() ??
                              ""
                            }
                            onChange={(e) =>
                              handleScoreChange(
                                participant.id,
                                "in",
                                e.target.value
                              )
                            }
                            className="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="—"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {isOutInTotalMode ? (
                          <div className="w-16 px-2 py-1 text-center bg-gray-50 border border-gray-200 rounded text-gray-700 font-medium">
                            {calculateTotal(participant.id) || "—"}
                          </div>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            value={
                              editedScores[participant.id]?.total ??
                              participant.manual_score_total?.toString() ??
                              ""
                            }
                            onChange={(e) =>
                              handleScoreChange(
                                participant.id,
                                "total",
                                e.target.value
                              )
                            }
                            className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="—"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          {getSaveStatusIcon(participant.id)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleClearScores(participant.id)}
                          disabled={saveStatus[participant.id] === "saving"}
                          className="inline-flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Clear all manual scores for this participant"
                        >
                          <X className="h-3 w-3" />
                          Clear
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>

        {(!participants || participants.length === 0) && (
          <div className="px-6 py-8 text-center text-gray-500">
            No participants found for this competition.
          </div>
        )}
      </div>
    </div>
  );
}
