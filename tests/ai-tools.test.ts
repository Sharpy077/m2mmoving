import { describe, it, expect } from "vitest";
import { tools } from "@/lib/ai-tools";

describe("AI Tools", () => {
  describe("get_quote tool", () => {
    it("should have correct schema properties", () => {
      const tool = tools.get_quote;
      expect(tool.name).toBe("get_quote");
      expect(tool.schema.properties).toHaveProperty("originZip");
      expect(tool.schema.properties).toHaveProperty("destinationZip");
      expect(tool.schema.properties).toHaveProperty("homeSize");
      expect(tool.schema.properties).toHaveProperty("moveDate");
      expect(tool.schema.required).toContain("originZip");
    });

    it("should validate input correctly", () => {
      const validInput = {
        originZip: "94105",
        destinationZip: "94016",
        homeSize: "2br" as const,
        moveDate: "2025-03-15",
      };
      const result = tools.get_quote.validator.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should reject invalid homeSize", () => {
      const invalidInput = {
        originZip: "94105",
        destinationZip: "94016",
        homeSize: "mansion",
        moveDate: "2025-03-15",
      };
      const result = tools.get_quote.validator.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should reject short zip codes", () => {
      const invalidInput = {
        originZip: "123",
        destinationZip: "94016",
        homeSize: "2br",
        moveDate: "2025-03-15",
      };
      const result = tools.get_quote.validator.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should generate estimate for same-zip move", async () => {
      const input = {
        originZip: "94105",
        destinationZip: "94105",
        homeSize: "2br" as const,
        moveDate: "2025-03-15",
      };
      const result = await tools.get_quote.handler(input);
      expect(result.summary).toContain("$");
      expect(result.summary).toContain("2br");
      expect(result.caveats).toBeDefined();
    });

    it("should generate higher estimate for different-zip move", async () => {
      const sameZip = {
        originZip: "94105",
        destinationZip: "94105",
        homeSize: "2br" as const,
        moveDate: "2025-03-15",
      };
      const diffZip = {
        originZip: "94105",
        destinationZip: "94016",
        homeSize: "2br" as const,
        moveDate: "2025-03-15",
      };

      const sameResult = await tools.get_quote.handler(sameZip);
      const diffResult = await tools.get_quote.handler(diffZip);

      const samePrice = parseInt(sameResult.summary.match(/\$(\d+)/)?.[1] ?? "0");
      const diffPrice = parseInt(diffResult.summary.match(/\$(\d+)/)?.[1] ?? "0");

      expect(diffPrice).toBeGreaterThan(samePrice);
    });
  });
});
