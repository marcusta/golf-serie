import { DocumentService } from "../services/document-service";
import type { CreateDocumentDto, UpdateDocumentDto } from "../types";

export function createDocumentsApi(documentService: DocumentService) {
  return {
    async create(req: Request): Promise<Response> {
      try {
        const data = (await req.json()) as CreateDocumentDto;
        const document = await documentService.create(data);
        return new Response(JSON.stringify(document), {
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
        const documents = await documentService.findAll();
        return new Response(JSON.stringify(documents), {
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
        const document = await documentService.findById(id);
        if (!document) {
          return new Response(JSON.stringify({ error: "Document not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(document), {
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

    async findBySeriesId(seriesId: number): Promise<Response> {
      try {
        const documents = await documentService.findBySeriesId(seriesId);
        return new Response(JSON.stringify(documents), {
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

    async findBySeriesIdAndType(
      seriesId: number,
      type: string
    ): Promise<Response> {
      try {
        const documents = await documentService.findBySeriesIdAndType(
          seriesId,
          type
        );
        return new Response(JSON.stringify(documents), {
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

    async update(req: Request, id: number): Promise<Response> {
      try {
        const data = (await req.json()) as UpdateDocumentDto;
        const document = await documentService.update(id, data);
        return new Response(JSON.stringify(document), {
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
        await documentService.delete(id);
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

    async getDocumentTypes(seriesId: number): Promise<Response> {
      try {
        const types = await documentService.getDocumentTypes(seriesId);
        return new Response(JSON.stringify(types), {
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
  };
}
