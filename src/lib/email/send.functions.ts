import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { EmailTemplate } from "./templates";

const inputSchema = z.object({
  to: z.string().email(),
  template: z.any(),
});

export const sendEmail = createServerFn({ method: "POST" })
  .inputValidator((d: { to: string; template: EmailTemplate }) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const { sendEmailNow } = await import("./send.server");
    return sendEmailNow(data.to, data.template as EmailTemplate);
  });
