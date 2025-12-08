import { z } from "zod";

const quoteSchema = z.object({
  originZip: z.string().min(5).max(10),
  destinationZip: z.string().min(5).max(10),
  homeSize: z.enum(["studio", "1br", "2br", "3br", "4br+"]),
  moveDate: z.string().describe("ISO date for the move"),
});

export const tools = {
  get_quote: {
    name: "get_quote",
    description: "Generate a quick ballpark estimate for a move based on distance and size",
    schema: {
      type: "object",
      properties: {
        originZip: { type: "string", description: "Pickup ZIP", minLength: 5 },
        destinationZip: { type: "string", description: "Drop-off ZIP", minLength: 5 },
        homeSize: {
          type: "string",
          enum: ["studio", "1br", "2br", "3br", "4br+"],
          description: "Home size category",
        },
        moveDate: { type: "string", description: "ISO date for the move" },
      },
      required: ["originZip", "destinationZip", "homeSize", "moveDate"],
    },
    validator: quoteSchema,
    handler: async (input: z.infer<typeof quoteSchema>) => {
      const base = 150;
      const distanceFactor = input.originZip === input.destinationZip ? 1 : 1.4;
      const sizeMap: Record<string, number> = {
        studio: 0,
        "1br": 120,
        "2br": 240,
        "3br": 360,
        "4br+": 480,
      };
      const estimate = Math.round((base + (sizeMap[input.homeSize] ?? 200)) * distanceFactor);
      return {
        summary: `Rough estimate: $${estimate} - $${estimate + 200} for a ${input.homeSize} move on ${input.moveDate}.`,
        caveats: "This is a ballpark; final pricing depends on inventory and access details.",
      };
    },
  },
};

export type ToolName = keyof typeof tools;
export type ToolCallResult = Awaited<ReturnType<(typeof tools)[ToolName]["handler"]>>;
