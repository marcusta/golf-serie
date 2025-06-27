import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Competition {
  id: number;
  name: string;
  date: string;
  participant_count: number;
  course?: {
    id: number;
    name: string;
  };
}

interface TodayCompetitionBannerProps {
  competition: Competition;
  className?: string;
}

export function TodayCompetitionBanner({
  competition,
  className,
}: TodayCompetitionBannerProps) {
  const competitionDate = new Date(competition.date);

  return (
    <section className={cn("mb-6", className)}>
      <div className="relative overflow-hidden bg-gradient-to-r from-coral to-flag rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-coral">
        {/* Animated background pattern */}
        <div className="absolute inset-0 bg-scorecard-transparent bg-[radial-gradient(circle_at_30%_40%,rgba(248,249,250,0.1)_0%,transparent_50%)] opacity-50" />

        {/* Pulse animation ring */}
        <div className="absolute top-4 right-4 flex items-center justify-center">
          <div className="relative">
            <div className="w-3 h-3 bg-fairway rounded-full"></div>
            <div className="absolute inset-0 w-3 h-3 bg-fairway rounded-full animate-ping opacity-75"></div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-scorecard rounded-lg shadow-sm">
              <Zap className="h-5 w-5 text-fairway" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 bg-scorecard rounded-full text-fairway text-label-sm font-bold uppercase tracking-wider shadow-sm">
                Happening Today
              </span>
            </div>
          </div>

          {/* Competition Name */}
          <h3 className="text-scorecard text-display-md font-bold mb-3 hover:text-scorecard/90 transition-colors">
            {competition.name}
          </h3>

          {/* Competition Details */}
          <div className="flex flex-wrap items-center gap-4 text-scorecard/90 text-body-sm mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                {competitionDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            {competition.course && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{competition.course.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{competition.participant_count} participants</span>
            </div>
          </div>

          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Link
              to={`/player/competitions/${competition.id}`}
              className="flex-1 px-4 py-3 bg-scorecard text-fairway rounded-lg font-medium text-label-md text-center hover:bg-scorecard/90 transition-colors shadow-sm"
            >
              📋 View Startlist
            </Link>
            <Link
              to={`/player/competitions/${competition.id}`}
              hash="teamresult"
              className="flex-1 px-4 py-3 bg-scorecard text-fairway rounded-lg font-medium text-label-md text-center hover:bg-scorecard/90 transition-colors shadow-sm"
            >
              🏆 Team Standings
            </Link>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-scorecard-transparent rounded-full blur-xl" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-charcoal-transparent rounded-full blur-lg" />
      </div>
    </section>
  );
}

export default TodayCompetitionBanner;
