import { useCourses } from "../api/courses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Map, Target, TrendingUp } from "lucide-react";

function CourseSkeleton() {
  return (
    <Card className="mb-4">
      <CardHeader>
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-4 w-[150px]" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Courses() {
  const { data: courses, isLoading, error } = useCourses();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <Map className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Courses</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <CourseSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-700">
            <Map className="h-5 w-5" />
            <p className="font-medium">Error loading courses</p>
          </div>
          <p className="text-red-600 text-sm mt-2">
            Please try refreshing the page or contact support if the problem
            persists.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <Map className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Courses</h2>
        </div>
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="p-12 text-center">
            <Map className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No courses available
            </h3>
            <p className="text-gray-600">
              Add some golf courses to get started with your scorecard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Map className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Courses</h2>
        </div>
        <Badge variant="secondary" className="text-sm">
          {courses.length} {courses.length === 1 ? "course" : "courses"}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <Card
            key={course.id}
            className="hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-green-500"
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                {course.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600 font-medium uppercase tracking-wide">
                    Front 9
                  </p>
                  <p className="text-lg font-bold text-green-700">
                    Par {course.pars.out}
                  </p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                    Back 9
                  </p>
                  <p className="text-lg font-bold text-blue-700">
                    Par {course.pars.in}
                  </p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">
                    Total
                  </p>
                  <p className="text-lg font-bold text-purple-700">
                    Par {course.pars.total}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>{course.pars.holes.length} holes</span>
                  </div>
                  <span className="text-xs">Course #{course.id}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
