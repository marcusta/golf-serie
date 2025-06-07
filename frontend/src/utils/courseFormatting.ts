import type { Course } from "../api/courses";
import type { TeeTime } from "../api/tee-times";

export interface FormattedCourse {
  id: string;
  name: string;
  holes: Array<{ number: number; par: number }>;
}

export function formatCourseFromTeeTime(
  teeTime: TeeTime | null,
  course?: Course | null
): FormattedCourse | null {
  if (!teeTime) return null;

  return {
    id: teeTime.id.toString(),
    name: course ? course.name : `${teeTime.course_name} ${teeTime.teetime}`,
    holes: teeTime.pars.map((par, index) => ({
      number: index + 1,
      par,
    })),
  };
}
