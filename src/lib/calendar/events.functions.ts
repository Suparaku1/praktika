import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

const inputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().min(1), // YYYY-MM-DD or ISO
  endDate: z.string().optional(),
  attendees: z.array(z.string().email()).optional(),
  timezone: z.string().default("Europe/Tirane"),
});

type Input = z.input<typeof inputSchema>;

function toDateOnly(d: string): string {
  return d.length >= 10 ? d.slice(0, 10) : d;
}

export const createCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Input) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const calKey = process.env.GOOGLE_CALENDAR_API_KEY;
    if (!lovableKey || !calKey) {
      console.error("[calendar] LOVABLE_API_KEY or GOOGLE_CALENDAR_API_KEY not configured");
      return { ok: false, error: "not_configured" as const };
    }

    const startDay = toDateOnly(data.startDate);
    // Google Calendar all-day events use exclusive end date
    const endDay = data.endDate ? toDateOnly(data.endDate) : startDay;
    const endExclusive = new Date(endDay + "T00:00:00Z");
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    const endExclusiveStr = endExclusive.toISOString().slice(0, 10);

    const body = {
      summary: data.title,
      description: data.description,
      location: data.location,
      start: { date: startDay },
      end: { date: endExclusiveStr },
      attendees: (data.attendees ?? []).map((email) => ({ email })),
      reminders: { useDefault: true },
    };

    try {
      const res = await fetch(
        `${GATEWAY_URL}/calendars/primary/events?sendUpdates=all`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": calKey,
          },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const txt = await res.text();
        console.error(`[calendar] create ${res.status}: ${txt}`);
        return { ok: false as const, error: `http_${res.status}` };
      }
      const json = (await res.json()) as { id?: string; htmlLink?: string };
      return { ok: true as const, id: json.id, url: json.htmlLink };
    } catch (err) {
      console.error("[calendar] create failed", err);
      return { ok: false as const, error: "exception" };
    }
  });