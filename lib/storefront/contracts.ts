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
      banners: z.array(
        z.object({
          id: z.string(),
          url: z.string(),
          sortOrder: z.number(),
        })
      ),
    }),
    template: z.object({
      id: z.string(),
      available: z.array(z.string()),
    }),
  }),
});

const publicMenuOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: z.number(),
  priceDelta: z.number(),
  sku: z.string().nullable(),
  isDefault: z.boolean(),
});

const publicMenuOptionGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: z.number(),
  isRequired: z.boolean(),
  minSelections: z.number(),
  maxSelections: z.number(),
  options: z.array(publicMenuOptionSchema),
});

export const publicMenuSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      price: z.number(),
      description: z.string().nullable(),
      imageUrl: z.string().nullable(),
      sku: z.string().optional(),
      category: z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .nullable()
        .optional(),
      optionGroups: z.array(publicMenuOptionGroupSchema).optional(),
    })
  ),
});

export const storefrontConfigBundleSchema = z.object({
  data: publicStoreConfigSchema.shape.data,
  menu: publicMenuSchema.shape.data,
  meta: z.object({
    version: z.string(),
    apiBaseUrl: z.string(),
    publicEndpoints: z.record(z.string(), z.string()).nullable(),
    notes: z.record(z.string(), z.string()).optional(),
  }),
});

export const publicTrackSchema = z.object({
  data: z.object({
    orderNumber: z.string(),
    status: z.string(),
    paymentStatus: z.string(),
    timeline: z.array(z.object({ code: z.string(), reached: z.boolean() })),
  }),
});
