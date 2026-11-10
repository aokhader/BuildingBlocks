import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { logger, metadata, schemaTask } from "@trigger.dev/sdk";
import { put } from "@vercel/blob";
import { generateText } from "ai";

import { prisma } from "../lib/prisma";
import { generateSpecPayloadSchema } from "../types/tasks";

const SYSTEM = `You are BuildingBlocks AI, a senior software architect.
Write a technical specification in Markdown for the system shown on the user's architecture canvas,
using the team's chat history for requirements and decisions.

Structure:
# <System name>
## Overview
## Components (one subsection per canvas node: responsibility, technology if implied, interfaces)
## Data Flow (walk through the edges)
## Data Model
## Non-Functional Requirements
## Open Questions

Rules:
- Base everything on the canvas and chat; mark assumptions as such.
- Output only the Markdown document, no preamble and no code fences around it.`;

export const generateSpec = schemaTask({
  id: "generate-spec",
  schema: generateSpecPayloadSchema,
  // Spec ID is the run ID, so a retry overwrites the same blob and record instead of duplicating.
  maxDuration: 300,
  run: async ({ projectId, roomId, chatHistory, nodes, edges }, { ctx }) => {
    metadata.set("status", "processing").set("projectId", projectId);
    logger.log("Generating spec", { roomId, nodes: nodes.length, edges: edges.length, messages: chatHistory.length });

    const canvas = {
      nodes: nodes.map((n) => ({ id: n.id, label: n.data?.label, shape: n.data?.shape })),
      edges: edges.map((e) => ({ source: e.source, target: e.target, label: e.data?.label })),
    };
    const chat = chatHistory.map((m) => `${m.sender} (${m.role}): ${m.content}`).join("\n");

    try {
      // .env.local names the key GOOGLE_AI_API_KEY; GEMINI_API_KEY takes precedence.
      const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY (or GOOGLE_AI_API_KEY) is not set");
      const google = createGoogleGenerativeAI({ apiKey });
      const { text } = await generateText({
        model: google("gemini-3.5-flash"),
        system: SYSTEM,
        prompt: `Canvas:\n${JSON.stringify(canvas)}\n\nChat history:\n${chat || "(none)"}`,
      });
      const content = text.trim();
      if (!content) throw new Error("Model returned an empty spec");

      // Same metadata + blob pattern as the canvas: content in the private store, URL in Prisma.
      const specId = ctx.run.id;
      const blob = await put(`specs/${projectId}/${specId}.md`, content, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "text/markdown; charset=utf-8",
      });
      await prisma.projectSpec.upsert({
        where: { id: specId },
        create: { id: specId, projectId, filePath: blob.url },
        update: { filePath: blob.url },
      });

      metadata.set("status", "complete").set("specId", specId);
      return { content, specId };
    } catch (error) {
      logger.error("Spec generation failed", { error: String(error) });
      metadata.set("status", "error");
      throw error;
    }
  },
});
