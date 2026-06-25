import { NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/openapi — OpenAPI 3.0 spec for the e-Sign API, served as JSON.
// Rendered by /api-docs via Swagger UI. Kept hand-written (no codegen dep).
export async function GET() {
  const spec = {
    openapi: "3.0.3",
    info: {
      title: "CORE Cashless e-Sign API",
      version: "1.0.0",
      description:
        "REST API for the CORE Cashless e-signature workflow: upload a PDF, " +
        "place fields and assign them to recipients, send signing links by email, " +
        "let recipients fill/sign in the browser, and download the stamped PDF. " +
        "Simple e-signature only — no digital certificates / PKI.",
    },
    servers: [{ url: "/", description: "This server" }],
    tags: [
      { name: "Documents", description: "Upload, list, edit and send documents" },
      { name: "Files", description: "Stream original and signed PDFs" },
      { name: "Signing", description: "Recipient-facing signing endpoints" },
    ],
    components: {
      schemas: {
        Error: {
          type: "object",
          properties: { error: { type: "string" } },
          required: ["error"],
        },
        Recipient: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            status: { type: "string", enum: ["PENDING", "SIGNED"] },
            signedAt: { type: "string", format: "date-time", nullable: true },
            signingToken: { type: "string" },
          },
        },
        Field: {
          type: "object",
          description:
            "A field placed on the PDF. Geometry is normalized as top-left-origin " +
            "fractions of the page (xFrac/yFrac = top-left corner, wFrac/hFrac = size).",
          properties: {
            id: { type: "string" },
            recipientId: { type: "string", nullable: true },
            type: {
              type: "string",
              enum: ["SIGNATURE", "CHECKBOX", "TEXT", "DATE", "RADIO"],
            },
            page: { type: "integer", minimum: 0 },
            xFrac: { type: "number" },
            yFrac: { type: "number" },
            wFrac: { type: "number" },
            hFrac: { type: "number" },
            value: { type: "string", nullable: true },
            required: { type: "boolean" },
            groupName: { type: "string", nullable: true },
            optionLabel: { type: "string", nullable: true },
            autoFill: {
              type: "string",
              nullable: true,
              enum: ["NAME", "EMAIL", "DATE"],
              description: "If set, the server fills this value authoritatively.",
            },
          },
        },
        Document: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            status: {
              type: "string",
              enum: ["DRAFT", "SENT", "COMPLETED"],
            },
            senderEmail: { type: "string", format: "email" },
            signedPath: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            recipients: {
              type: "array",
              items: { $ref: "#/components/schemas/Recipient" },
            },
            fields: {
              type: "array",
              items: { $ref: "#/components/schemas/Field" },
            },
          },
        },
      },
    },
    paths: {
      "/api/documents": {
        get: {
          tags: ["Documents"],
          summary: "List documents",
          description: "Returns all documents (newest first) with recipients and a field count.",
          responses: {
            "200": {
              description: "Array of documents",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Document" },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Documents"],
          summary: "Upload a PDF",
          description:
            "Multipart upload. Creates a DRAFT document, saves the file to " +
            "./uploads/{id}.pdf, and returns the new document id.",
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    file: {
                      type: "string",
                      format: "binary",
                      description: "The PDF file (required).",
                    },
                    senderEmail: {
                      type: "string",
                      format: "email",
                      description: "Sender's email (optional; defaults if omitted).",
                    },
                  },
                  required: ["file"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { id: { type: "string" } },
                  },
                },
              },
            },
            "400": {
              description: "No file uploaded, or file is not a PDF",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
          },
        },
      },
      "/api/documents/{id}": {
        get: {
          tags: ["Documents"],
          summary: "Get a document",
          description: "Returns one document with its fields and recipients.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Document id.",
            },
          ],
          responses: {
            "200": {
              description: "The document",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/Document" } },
              },
            },
            "404": {
              description: "Not found",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
          },
        },
      },
      "/api/documents/{id}/fields": {
        put: {
          tags: ["Documents"],
          summary: "Replace fields and upsert recipients",
          description:
            "Replaces the document's fields and upserts its recipients. " +
            "Only allowed while the document is in DRAFT status.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Document id.",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    recipients: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Recipient" },
                    },
                    fields: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Field" },
                    },
                  },
                  required: ["recipients", "fields"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "The updated document with recipients and fields",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/Document" } },
              },
            },
            "400": {
              description: "Document already sent; fields are locked",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
            "404": {
              description: "Not found",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
          },
        },
      },
      "/api/documents/{id}/send": {
        post: {
          tags: ["Documents"],
          summary: "Send for signature",
          description:
            "Creates/keeps per-recipient signing tokens, emails each recipient " +
            "their unique signing link, and sets the document status to SENT.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Document id.",
            },
          ],
          responses: {
            "200": {
              description: "Sent",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "SENT" },
                    },
                  },
                },
              },
            },
            "400": {
              description: "No recipients, or document not sendable",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
            "404": {
              description: "Not found",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
          },
        },
      },
      "/api/documents/{id}/file": {
        get: {
          tags: ["Files"],
          summary: "Stream the original PDF",
          description:
            "Streams the original uploaded PDF. If a ?token= query is supplied it " +
            "is validated against the document's recipients (basic scoping).",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Document id.",
            },
            {
              name: "token",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Optional recipient signing token used to scope access.",
            },
          ],
          responses: {
            "200": {
              description: "The PDF bytes",
              content: { "application/pdf": { schema: { type: "string", format: "binary" } } },
            },
            "403": {
              description: "Invalid token for this document",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
            "404": {
              description: "Document or file not found",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
          },
        },
      },
      "/api/documents/{id}/download": {
        get: {
          tags: ["Files"],
          summary: "Download the signed PDF",
          description:
            "Streams the stamped/signed PDF as an attachment. Falls back to the " +
            "original PDF if no signed version exists yet.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Document id.",
            },
          ],
          responses: {
            "200": {
              description: "The signed PDF bytes",
              content: { "application/pdf": { schema: { type: "string", format: "binary" } } },
            },
            "404": {
              description: "Document or file not found",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
          },
        },
      },
      "/api/sign/{token}": {
        get: {
          tags: ["Signing"],
          summary: "Get signing context",
          description:
            "Returns the recipient, basic document info, and only that recipient's " +
            "fields (with auto-fill fields pre-resolved server-side).",
          parameters: [
            {
              name: "token",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Per-recipient signing token.",
            },
          ],
          responses: {
            "200": {
              description: "Signing context",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      recipient: { $ref: "#/components/schemas/Recipient" },
                      document: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          title: { type: "string" },
                          status: { type: "string" },
                        },
                      },
                      fields: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Field" },
                      },
                    },
                  },
                },
              },
            },
            "404": {
              description: "Invalid signing link",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
          },
        },
        post: {
          tags: ["Signing"],
          summary: "Submit signed values",
          description:
            "Persists the recipient's field values, marks them SIGNED, and stamps " +
            "the values into the PDF. When all recipients have signed, the document " +
            "becomes COMPLETED and the sender is emailed a download link. " +
            "For SIGNATURE the value is a PNG data URL; CHECKBOX is 'true'/'false'; " +
            "TEXT/DATE is the text; RADIO is keyed as 'group:<groupName>' -> chosen option.",
          parameters: [
            {
              name: "token",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Per-recipient signing token.",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    values: {
                      type: "object",
                      additionalProperties: { type: "string" },
                      description:
                        "Map of fieldId (or 'group:<groupName>' for radios) -> value.",
                    },
                  },
                  required: ["values"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Signed",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "SIGNED" },
                      completed: { type: "boolean" },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Already signed, or required fields missing",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: { type: "string" },
                      missing: { type: "array", items: { type: "string" } },
                    },
                  },
                },
              },
            },
            "404": {
              description: "Invalid signing link",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
          },
        },
      },
    },
  };

  return NextResponse.json(spec);
}
