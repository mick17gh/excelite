/**
 * SMS Service using Mnotify API
 * Documentation: https://readthedocs.mnotify.com/
 */

const MNOTIFY_API_URL = "https://api.mnotify.com/api/sms/quick";
const MNOTIFY_API_KEY = process.env.MNOTIFY_API_KEY;
const MNOTIFY_SENDER_ID = process.env.MNOTIFY_SENDER_ID || "WORKCONNECT";

interface SMSResponse {
  success: boolean;
  message: string;
  messageId?: string;
}

interface BulkSMSRequest {
  to: string[];
  message: string;
}

/**
 * Format phone number to international format for Mnotify
 */
function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  const digits = phone.replace(/\D/g, "");
  
  // If it starts with 0, replace with 233
  if (digits.startsWith("0")) {
    return "233" + digits.slice(1);
  }
  
  // If it already starts with 233, return as is
  if (digits.startsWith("233")) {
    return digits;
  }
  
  // Otherwise, assume it's a local number and add 233
  return "233" + digits;
}

/**
 * Send a single SMS message
 */
export async function sendSMS(to: string, message: string): Promise<SMSResponse> {
  if (!MNOTIFY_API_KEY) {
    console.warn("[SMS] MNOTIFY_API_KEY not configured");
    return { success: false, message: "SMS service not configured" };
  }

  const formattedPhone = formatPhoneNumber(to);
  console.log("[SMS] Sending to:", formattedPhone);
  console.log("[SMS] Sender ID:", MNOTIFY_SENDER_ID);

  try {
    const response = await fetch(`${MNOTIFY_API_URL}?key=${MNOTIFY_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: [formattedPhone],
        sender: MNOTIFY_SENDER_ID,
        message: message,
        is_schedule: false,
        schedule_date: "",
      }),
    });

    const data = await response.json();
    console.log("[SMS] mNotify response:", JSON.stringify(data));

    if (data.code === "ok" || data.status === "success" || response.ok) {
      console.log("[SMS] SMS sent successfully to:", formattedPhone);
      return { success: true, message: "SMS sent successfully" };
    }

    console.error("[SMS] SMS sending failed:", data);
    return {
      success: false,
      message: data.message || "SMS sending failed",
    };
  } catch (error) {
    console.error("[SMS] Error sending SMS:", error);
    return { success: false, message: "Failed to send SMS" };
  }
}

/**
 * Send bulk SMS messages
 */
export async function sendBulkSMS({ to, message }: BulkSMSRequest): Promise<SMSResponse> {
  if (!MNOTIFY_API_KEY) {
    console.warn("[SMS] MNOTIFY_API_KEY not configured");
    return { success: false, message: "SMS service not configured" };
  }

  const formattedPhones = to.map(formatPhoneNumber);

  try {
    const response = await fetch(`${MNOTIFY_API_URL}?key=${MNOTIFY_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: formattedPhones,
        sender: MNOTIFY_SENDER_ID,
        message: message,
        is_schedule: false,
        schedule_date: "",
      }),
    });

    const data = await response.json();

    if (data.code === "ok" || data.status === "success") {
      return { success: true, message: `SMS sent to ${to.length} recipients` };
    }

    return {
      success: false,
      message: data.message || "Bulk SMS sending failed",
    };
  } catch (error) {
    console.error("[SMS] Error sending bulk SMS:", error);
    return { success: false, message: "Failed to send bulk SMS" };
  }
}
