import { useState } from "react";
import ParticipantAssignment from "./ParticipantAssignment";
import type { Team } from "../api/teams";
import type { TeeTime } from "../api/tee-times";

// Sample data for demonstration
const sampleTeams: Team[] = [
  { id: 1, name: "Linköping 1", created_at: "", updated_at: "" },
  { id: 2, name: "N&S GK 1", created_at: "", updated_at: "" },
  { id: 3, name: "Kinda GK", created_at: "", updated_at: "" },
  { id: 4, name: "Åtvidaberg GK", created_at: "", updated_at: "" },
];

const sampleParticipantTypes = [
  { id: "1", name: "Singel 1" },
  { id: "2", name: "Singel 2" },
  { id: "3", name: "Bästboll 1" },
];

const sampleTeeTimes: TeeTime[] = [
  {
    id: 1,
    teetime: "13:00",
    competition_id: 1,
    start_hole: 1,
    created_at: "",
    updated_at: "",
    course_name: "Sample Course",
    pars: [4, 3, 5, 4, 4, 3, 5, 4, 4],
    participants: [],
  },
  {
    id: 2,
    teetime: "13:10",
    competition_id: 1,
    start_hole: 1,
    created_at: "",
    updated_at: "",
    course_name: "Sample Course",
    pars: [4, 3, 5, 4, 4, 3, 5, 4, 4],
    participants: [],
  },
  {
    id: 3,
    teetime: "13:20",
    competition_id: 1,
    start_hole: 10,
    created_at: "",
    updated_at: "",
    course_name: "Sample Course",
    pars: [4, 3, 5, 4, 4, 3, 5, 4, 4],
    participants: [],
  },
  {
    id: 4,
    teetime: "13:30",
    competition_id: 1,
    start_hole: 10,
    created_at: "",
    updated_at: "",
    course_name: "Sample Course",
    pars: [4, 3, 5, 4, 4, 3, 5, 4, 4],
    participants: [],
  },
];

export default function ParticipantAssignmentDemo() {
  const [selectedTeams] = useState<Team[]>(sampleTeams);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Participant Assignment Demo
        </h1>
        <p className="text-gray-600">
          This demo showcases the participant assignment interface with sample
          data.
        </p>
      </div>

      <div className="space-y-6">
        {/* Sample Data Overview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Sample Data
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Teams ({sampleTeams.length})
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {sampleTeams.map((team) => (
                  <li key={team.id}>• {team.name}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Participant Types ({sampleParticipantTypes.length})
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {sampleParticipantTypes.map((type) => (
                  <li key={type.id}>• {type.name}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Tee Times ({sampleTeeTimes.length})
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {sampleTeeTimes.map((teeTime) => (
                  <li key={teeTime.id}>• {teeTime.teetime}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Expected Participants
              </h4>
              <p className="text-sm text-gray-600">
                {sampleTeams.length} teams × {sampleParticipantTypes.length}{" "}
                types = {sampleTeams.length * sampleParticipantTypes.length}{" "}
                participants
              </p>
            </div>
          </div>
        </div>

        {/* Participant Assignment Component */}
        <ParticipantAssignment
          selectedTeams={selectedTeams}
          participantTypes={sampleParticipantTypes}
          teeTimes={sampleTeeTimes}
          onAssignmentsChange={(assignments) => {
            console.log("Demo: Assignments changed:", assignments);
          }}
        />
      </div>
    </div>
  );
}
