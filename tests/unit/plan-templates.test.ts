import { ensurePlanTemplateSchema } from "@/lib/plan-templates";

describe("plan template schema", () => {
  it("converts legacy subscription plan perks arrays to jsonb", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });

    await ensurePlanTemplateSchema({ query });

    const statements = query.mock.calls.map(([sql]) => String(sql));
    const migration = statements.find((sql) => sql.includes("ALTER COLUMN plan_perks TYPE jsonb"));

    expect(migration).toBeTruthy();
    expect(migration).toContain("data_type = 'ARRAY'");
    expect(migration).toContain("udt_name = '_text'");
    expect(migration).toContain("USING COALESCE(to_jsonb(plan_perks), '[]'::jsonb)");
  });
});
