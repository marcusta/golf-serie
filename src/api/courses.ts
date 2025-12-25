import { CourseService } from "../services/course-service";
import { CourseTeeService } from "../services/course-tee.service";
import type { CreateCourseDto, UpdateCourseDto, CreateCourseTeeDto, UpdateCourseTeeDto } from "../types";

export function createCoursesApi(courseService: CourseService, courseTeeService?: CourseTeeService) {
  return {
    async create(req: Request): Promise<Response> {
      try {
        const data = (await req.json()) as CreateCourseDto;
        const course = await courseService.create(data);
        return new Response(JSON.stringify(course), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findAll(): Promise<Response> {
      try {
        const courses = await courseService.findAll();
        return new Response(JSON.stringify(courses), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async findById(req: Request, id: number): Promise<Response> {
      try {
        const course = await courseService.findById(id);
        if (!course) {
          return new Response(JSON.stringify({ error: "Course not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(course), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async update(req: Request, id: number): Promise<Response> {
      try {
        const data = (await req.json()) as UpdateCourseDto;
        const course = await courseService.update(id, data);
        return new Response(JSON.stringify(course), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async updateHoles(req: Request, id: number): Promise<Response> {
      try {
        const pars = (await req.json()) as number[];
        const course = await courseService.updateHoles(id, pars);
        return new Response(JSON.stringify(course), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async delete(id: number): Promise<Response> {
      try {
        await courseService.delete(id);
        return new Response(null, { status: 204 });
      } catch (error) {
        if (error instanceof Error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    // Course Tee endpoints
    async getTees(courseId: number): Promise<Response> {
      if (!courseTeeService) {
        return new Response(JSON.stringify({ error: "Tee service not available" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        const tees = courseTeeService.findByCourse(courseId);
        return new Response(JSON.stringify(tees), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async getTee(courseId: number, teeId: number): Promise<Response> {
      if (!courseTeeService) {
        return new Response(JSON.stringify({ error: "Tee service not available" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        const tee = courseTeeService.findById(teeId);
        if (!tee || tee.course_id !== courseId) {
          return new Response(JSON.stringify({ error: "Tee not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(tee), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async createTee(req: Request, courseId: number): Promise<Response> {
      if (!courseTeeService) {
        return new Response(JSON.stringify({ error: "Tee service not available" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        const data = (await req.json()) as CreateCourseTeeDto;
        const tee = courseTeeService.create(courseId, data);
        return new Response(JSON.stringify(tee), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          const status = error.message.includes("not found") ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async updateTee(req: Request, courseId: number, teeId: number): Promise<Response> {
      if (!courseTeeService) {
        return new Response(JSON.stringify({ error: "Tee service not available" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        // Verify the tee belongs to the course
        const existingTee = courseTeeService.findById(teeId);
        if (!existingTee || existingTee.course_id !== courseId) {
          return new Response(JSON.stringify({ error: "Tee not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const data = (await req.json()) as UpdateCourseTeeDto;
        const tee = courseTeeService.update(teeId, data);
        return new Response(JSON.stringify(tee), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        if (error instanceof Error) {
          const status = error.message.includes("not found") ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },

    async deleteTee(courseId: number, teeId: number): Promise<Response> {
      if (!courseTeeService) {
        return new Response(JSON.stringify({ error: "Tee service not available" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        // Verify the tee belongs to the course
        const existingTee = courseTeeService.findById(teeId);
        if (!existingTee || existingTee.course_id !== courseId) {
          return new Response(JSON.stringify({ error: "Tee not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        courseTeeService.delete(teeId);
        return new Response(null, { status: 204 });
      } catch (error) {
        if (error instanceof Error) {
          const status = error.message.includes("not found") ? 404 : 400;
          return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    },
  };
}
