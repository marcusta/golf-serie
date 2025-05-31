import { useState } from "react";
import { ScoreEntry } from "./ScoreEntry";

const demoCourse = {
  id: "1",
  name: "Demo Golf Course",
  holes: Array.from({ length: 18 }, (_, i) => ({
    number: i + 1,
    par: Math.floor(Math.random() * 2) + 3, // Random par 3-4
  })),
};

const demoPlayers = [
  {
    participantId: "1",
    participantName: "John Smith",
    scores: Array(18).fill(null),
  },
  {
    participantId: "2",
    participantName: "Jane Doe",
    scores: Array(18).fill(null),
  },
  {
    participantId: "3",
    participantName: "Bob Johnson",
    scores: Array(18).fill(null),
  },
  {
    participantId: "4",
    participantName: "Alice Brown",
    scores: Array(18).fill(null),
  },
];

export function ScoreEntryDemo() {
  const [teeTimeGroup, setTeeTimeGroup] = useState({
    id: "1",
    players: demoPlayers,
  });

  const handleScoreUpdate = (
    participantId: string,
    hole: number,
    score: number | null
  ) => {
    setTeeTimeGroup((prev) => ({
      ...prev,
      players: prev.players.map((player) =>
        player.participantId === participantId
          ? {
              ...player,
              scores: player.scores.map((s, i) => (i === hole - 1 ? score : s)),
            }
          : player
      ),
    }));
  };

  const handleComplete = () => {
    console.log("Score entry completed!", teeTimeGroup);
    // Here you would typically save the scores to your backend
  };

  return (
    <div className="max-w-md mx-auto">
      <ScoreEntry
        teeTimeGroup={teeTimeGroup}
        course={demoCourse}
        onScoreUpdate={handleScoreUpdate}
        onComplete={handleComplete}
      />
    </div>
  );
}
