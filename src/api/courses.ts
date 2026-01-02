import { CourseService } from "../services/course-service";
import { CourseTeeService } from "../services/course-tee.service";
import type {
  CreateCourseDto,
  UpdateCourseDto,
  CreateCourseTeeDto,
  UpdateCourseTeeDto,
  CreateCourseTeeRatingDto,
  UpdateCourseTeeRatingDto,
  TeeRatingGender,
} from "../types";

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
        const body = await req.json();
        // Support both old format (just array) and new format (object with pars and stroke_index)
        let pars: number[];
        let strokeIndex: number[] | undefined;

        if (Array.isArray(body)) {
          // Old format: just pars array
          pars = body;
        } else {
          // New format: { pars: number[], stroke_index?: number[] }
          pars = body.pars;
          strokeIndex = body.stroke_index;
        }

        const course = await courseService.updateHoles(id, pars, strokeIndex);
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

    // Course Tee Rating endpoints
    async getTeeRatings(courseId: number, teeId: number): Promise<Response> {
      if (!courseTeeService) {
        return new Response(JSON.stringify({ error: "Tee service not available" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        // Verify the tee belongs to the course
        const tee = courseTeeService.findById(teeId);
        if (!tee || tee.course_id !== courseId) {
          return new Response(JSON.stringify({ error: "Tee not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const ratings = courseTeeService.getRatingsForTee(teeId);
        return new Response(JSON.stringify(ratings), {
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

    async getTeeRatingByGender(courseId: number, teeId: number, gender: string): Promise<Response> {
      if (!courseTeeService) {
        return new Response(JSON.stringify({ error: "Tee service not available" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        // Validate gender
        if (!["men", "women"].includes(gender)) {
          return new Response(JSON.stringify({ error: "Gender must be 'men' or 'women'" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Verify the tee belongs to the course
        const tee = courseTeeService.findById(teeId);
        if (!tee || tee.course_id !== courseId) {
          return new Response(JSON.stringify({ error: "Tee not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const rating = courseTeeService.getRatingByGender(teeId, gender as TeeRatingGender);
        if (!rating) {
          return new Response(JSON.stringify({ error: "Rating not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify(rating), {
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

    async upsertTeeRating(req: Request, courseId: number, teeId: number): Promise<Response> {
      if (!courseTeeService) {
        return new Response(JSON.stringify({ error: "Tee service not available" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        // Verify the tee belongs to the course
        const tee = courseTeeService.findById(teeId);
        if (!tee || tee.course_id !== courseId) {
          return new Response(JSON.stringify({ error: "Tee not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const data = (await req.json()) as CreateCourseTeeRatingDto;
        const rating = courseTeeService.upsertRating(teeId, data);
        return new Response(JSON.stringify(rating), {
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

    async updateTeeRating(req: Request, courseId: number, teeId: number, ratingId: number): Promise<Response> {
      if (!courseTeeService) {
        return new Response(JSON.stringify({ error: "Tee service not available" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        // Verify the tee belongs to the course
        const tee = courseTeeService.findById(teeId);
        if (!tee || tee.course_id !== courseId) {
          return new Response(JSON.stringify({ error: "Tee not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Verify the rating belongs to the tee
        const existingRating = courseTeeService.getRatingById(ratingId);
        if (!existingRating || existingRating.tee_id !== teeId) {
          return new Response(JSON.stringify({ error: "Rating not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const data = (await req.json()) as UpdateCourseTeeRatingDto;
        const rating = courseTeeService.updateRating(ratingId, data);
        return new Response(JSON.stringify(rating), {
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

    async deleteTeeRating(courseId: number, teeId: number, gender: string): Promise<Response> {
      if (!courseTeeService) {
        return new Response(JSON.stringify({ error: "Tee service not available" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        // Validate gender
        if (!["men", "women"].includes(gender)) {
          return new Response(JSON.stringify({ error: "Gender must be 'men' or 'women'" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Verify the tee belongs to the course
        const tee = courseTeeService.findById(teeId);
        if (!tee || tee.course_id !== courseId) {
          return new Response(JSON.stringify({ error: "Tee not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Check if rating exists
        const rating = courseTeeService.getRatingByGender(teeId, gender as TeeRatingGender);
        if (!rating) {
          return new Response(JSON.stringify({ error: "Rating not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        courseTeeService.deleteRatingByGender(teeId, gender as TeeRatingGender);
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
