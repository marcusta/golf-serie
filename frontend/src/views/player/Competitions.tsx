import { Link } from "@tanstack/react-router";
import { useCompetitions } from "../../api/competitions";
import { useCourses } from "../../api/courses";
import { Calendar, Users, ChevronRight } from "lucide-react";

export default function PlayerCompetitions() {
  const { data: competitions, isLoading, error } = useCompetitions();
  const { data: courses } = useCourses();

  if (isLoading)
    return (
      <div className="text-charcoal font-primary">Loading competitions...</div>
    );
  if (error)
    return (
      <div className="text-flag font-primary">Error loading competitions</div>
    );

  const getCourse = (courseId: number) => {
    return courses?.find((course) => course.id === courseId);
  };

  const getCompetitionStatus = (date: string) => {
    const competitionDate = new Date(date);
    const today = new Date();
    const diffTime = competitionDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: "completed",
        label: "Completed",
        color: "text-charcoal bg-soft-grey bg-opacity-30",
      };
    } else if (diffDays === 0) {
      return {
        status: "today",
        label: "Today",
        color: "text-scorecard bg-turf",
      };
    } else if (diffDays <= 7) {
      return {
        status: "upcoming",
        label: `In ${diffDays} days`,
        color: "text-scorecard bg-coral",
      };
    } else {
      return {
        status: "future",
        label: "Upcoming",
        color: "text-fairway bg-rough bg-opacity-50",
      };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-fairway font-display">
            Competitions
          </h2>
          <p className="text-turf font-primary">
            Browse and join golf competitions
          </p>
        </div>
        <div className="text-sm text-turf font-primary">
          {competitions?.length || 0} competitions available
        </div>
      </div>

      <div className="grid gap-4">
        {competitions?.map((competition) => {
          const course = getCourse(competition.course_id);
          const status = getCompetitionStatus(competition.date);

          return (
            <Link
              key={competition.id}
              to={`/player/competitions/${competition.id}`}
              className="block bg-scorecard rounded-xl border border-soft-grey hover:border-turf hover:shadow-md hover:bg-rough hover:bg-opacity-10 transition-all duration-200"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-fairway font-display">
                        {competition.name}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium font-primary ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-turf font-primary">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(competition.date).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {competition.participant_count} participants
                      </div>
                    </div>

                    {course && (
                      <div className="mt-3 text-sm text-charcoal font-primary">
                        <span className="font-medium">Course:</span>{" "}
                        {course.name}
                        {course.pars && (
                          <span className="ml-2">Par {course.pars.total}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center">
                    <ChevronRight className="h-5 w-5 text-turf" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {(!competitions || competitions.length === 0) && (
        <div className="text-center py-12">
          <div className="text-turf mb-4">
            <Calendar className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-fairway mb-2 font-display">
            No competitions available
          </h3>
          <p className="text-turf font-primary">
            Check back later for upcoming golf competitions.
          </p>
        </div>
      )}
    </div>
  );
}
