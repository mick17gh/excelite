"use server";

import { sendEmail } from "@/lib/services/email";
import { EXCELITE_BRAND } from "@/lib/excelite-config";

export interface DemoRequestInput {
  name: string;
  businessName: string;
  phone: string;
  businessType: string;
  preferredDate: string;
  contactPreference: "WhatsApp" | "Phone Call";
  interests: string[];
}

export async function submitDemoRequest(input: DemoRequestInput) {
  const name = input.name?.trim();
  const businessName = input.businessName?.trim();
  const phone = input.phone?.trim();
  const businessType = input.businessType?.trim();
  const preferredDate = input.preferredDate?.trim();
  const contactPreference = input.contactPreference;
  const interests = Array.isArray(input.interests) ? input.interests : [];

  if (!name || !businessName || !phone || !businessType || !preferredDate || !contactPreference) {
    return { success: false, error: "Please fill in all required fields." };
  }

  if (contactPreference !== "WhatsApp" && contactPreference !== "Phone Call") {
    return { success: false, error: "Please choose how you prefer we contact you." };
  }

  const interestList =
    interests.length > 0 ? interests.map((i) => `• ${i}`).join("<br>") : "Not specified";

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #222831;">
  <h2 style="color: #16A34A;">New Excelite Demo Request</h2>
  <p><strong>Name:</strong> ${escapeHtml(name)}</p>
  <p><strong>Business Name:</strong> ${escapeHtml(businessName)}</p>
  <p><strong>Phone / WhatsApp:</strong> ${escapeHtml(phone)}</p>
  <p><strong>Business Type:</strong> ${escapeHtml(businessType)}</p>
  <p><strong>Preferred Demo Date:</strong> ${escapeHtml(preferredDate)}</p>
  <p><strong>Contact Preference:</strong> ${escapeHtml(contactPreference)}</p>
  <p><strong>What they'd like to see:</strong><br>${interestList}</p>
</body>
</html>
  `;

  const text = `
New Excelite Demo Request

Name: ${name}
Business Name: ${businessName}
Phone / WhatsApp: ${phone}
Business Type: ${businessType}
Preferred Demo Date: ${preferredDate}
Contact Preference: ${contactPreference}
Interests: ${interests.length > 0 ? interests.join(", ") : "Not specified"}
  `.trim();

  const sent = await sendEmail({
    to: EXCELITE_BRAND.supportEmail,
    subject: `Demo request: ${businessName} (${name})`,
    html,
    text,
  });

  if (!sent) {
    return {
      success: false,
      error: "We couldn't send your request right now. Please try again or chat with us on WhatsApp.",
    };
  }

  return { success: true };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
