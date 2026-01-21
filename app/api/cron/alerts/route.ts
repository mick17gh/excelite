import { NextRequest, NextResponse } from "next/server";
import { runAlertChecks, sendAlertNotifications } from "@/lib/services/alert-checker";

/**
 * Cron endpoint for running automated alert checks
 * 
 * This endpoint should be called by a cron job at regular intervals (e.g., every 15 minutes).
 * 
 * Security: Protected by CRON_SECRET environment variable
 * 
 * Usage with Vercel Cron:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/alerts",
 *     "schedule": "0/15 * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log("[Cron/Alerts] Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron/Alerts] Starting alert checks...");

    // Run all alert checks
    const checkResult = await runAlertChecks();
    console.log("[Cron/Alerts] Alert checks complete:", checkResult);

    // Send email notifications for critical alerts
    const notifyResult = await sendAlertNotifications();
    console.log("[Cron/Alerts] Notifications sent:", notifyResult);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checks: {
        completed: checkResult.checked,
        alertsCreated: checkResult.alertsCreated,
        errors: checkResult.errors,
      },
      notifications: {
        sent: notifyResult.sent,
      },
    });
  } catch (error) {
    console.error("[Cron/Alerts] Error:", error);
    return NextResponse.json(
      { error: "Failed to run alert checks", details: String(error) },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
