import { z } from "zod";

export const publicStoreConfigSchema = z.object({
  data: z.object({
    organizationId: z.string(),
    enabled: z.boolean(),
    store: z.object({
      name: z.string(),
      description: z.string().nullable(),
      logoUrl: z.string().nullable(),
      bannerUrl: z.string().nullable(),
    }),
    template: z.object({
      id: z.string(),
      available: z.array(z.string()),
    }),
  }),
});

export const publicMenuSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      price: z.number(),
      description: z.string().nullable(),
      imageUrl: z.string().nullable(),
    })
  ),
});

export const publicTrackSchema = z.object({
  data: z.object({
    orderNumber: z.string(),
    status: z.string(),
    paymentStatus: z.string(),
    timeline: z.array(z.object({ code: z.string(), reached: z.boolean() })),
  }),
});
