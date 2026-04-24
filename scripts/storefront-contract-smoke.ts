import { publicMenuSchema, publicStoreConfigSchema, publicTrackSchema } from "@/lib/storefront/contracts";

async function run() {
  const baseUrl = process.env.STOREFRONT_SMOKE_BASE_URL;
  const organizationId = process.env.STOREFRONT_SMOKE_ORG_ID;
  const orderNumber = process.env.STOREFRONT_SMOKE_ORDER_NUMBER;
  const phone = process.env.STOREFRONT_SMOKE_PHONE;

  if (!baseUrl || !organizationId) {
    throw new Error("Set STOREFRONT_SMOKE_BASE_URL and STOREFRONT_SMOKE_ORG_ID");
  }

  const [configRes, menuRes] = await Promise.all([
    fetch(`${baseUrl}/api/public/store/${organizationId}/config`),
    fetch(`${baseUrl}/api/public/store/${organizationId}/menu`),
  ]);

  const configJson = await configRes.json();
  const menuJson = await menuRes.json();
  publicStoreConfigSchema.parse(configJson);
  publicMenuSchema.parse(menuJson);

  if (orderNumber && phone) {
    const trackRes = await fetch(`${baseUrl}/api/public/orders/${orderNumber}/track?phone=${encodeURIComponent(phone)}`);
    const trackJson = await trackRes.json();
    publicTrackSchema.parse(trackJson);
  }

  console.log("Storefront contract smoke passed.");
}

run().catch((error) => {
  console.error("Storefront contract smoke failed:", error);
  process.exit(1);
});
