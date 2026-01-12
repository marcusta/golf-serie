import { useMyRounds } from "@/api/player-profile";
import { RoundList } from "@/components/rounds/RoundList";
import { BarChart3, Loader2, TrendingUp } from "lucide-react";
import { CommonHeader } from "@/components/navigation/CommonHeader";

export default function AllRounds() {
  const { data: rounds, isLoading } = useMyRounds();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
        <CommonHeader showBackButton={false} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-turf" />
          </div>
        </div>
      </div>
    );
  }

  if (!rounds || rounds.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
        <CommonHeader showBackButton={false} />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-display-lg text-charcoal mb-2">All Rounds</h1>
            <p className="text-body-lg text-charcoal/70">
              Your complete round history
            </p>
          </div>
          <div className="bg-scorecard rounded-xl text-center py-16 px-4">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-charcoal/20" />
            <h2 className="text-display-md font-bold text-charcoal mb-2">
              No Rounds Yet
            </h2>
            <p className="text-body-lg text-charcoal/60 mb-1">
              You haven't played any competitions yet
            </p>
            <p className="text-body-sm text-charcoal/50">
              Your round history will appear here after you play
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
      <CommonHeader showBackButton={false} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-6 w-6 text-charcoal" />
            <h1 className="text-display-lg text-charcoal">All Rounds</h1>
            <span className="text-body-sm text-charcoal/60 ml-2">
              ({rounds.length} {rounds.length === 1 ? "round" : "rounds"})
            </span>
          </div>
          <p className="text-body-lg text-charcoal/70">
            Your complete round history
          </p>
        </div>
        <RoundList rounds={rounds} />
      </div>
    </div>
  );
}
