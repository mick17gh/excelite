"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import {
  decodeCredentialPassword,
  encodeCredentialPassword,
  isValidFourDigitPin,
  verifyCredentialPassword,
} from "@/lib/auth/credential-password";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionOrganizationId } from "@/lib/actions/organization";

export interface UpdateProfileInput {
  name: string;
  email: string;
  phoneNumber?: string;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  criticalAlerts: boolean;
  dailyDigest: boolean;
  weeklyReports: boolean;
  lowStockAlerts: boolean;
  staffShortageAlerts: boolean;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePinInput {
  currentPin?: string;
  newPin: string;
  confirmPin: string;
}

async function syncUserPinHash(userId: string, pinHash: string | null) {
  await db.user.update({
    where: { id: userId },
    data: { pinHash },
  });

  const account = await db.account.findFirst({
    where: { userId, providerId: "credential" },
    select: { id: true, password: true },
  });

  if (account?.password) {
    const parsed = decodeCredentialPassword(account.password);
    const passwordHash = parsed?.passwordHash ?? account.password;
    await db.account.update({
      where: { id: account.id },
      data: {
        password: encodeCredentialPassword({
          passwordHash,
          pinHash,
        }),
      },
    });
  }
}

export async function getCurrentUser() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        image: true,
        branchId: true,
        organizationId: true,
        isActive: true,
        pinHash: true,
        branch: { select: { name: true } },
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const organizationId =
      user.organizationId ?? (await getSessionOrganizationId());

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        image: user.image,
        branchId: user.branchId,
        branchName: user.branch?.name || null,
        organizationId,
        isActive: user.isActive,
        hasPin: !!user.pinHash,
      },
    };
  } catch (error) {
    console.error("[getCurrentUser] Error:", error);
    return { success: false, error: "Failed to get current user" };
  }
}

export async function changePin(input: ChangePinInput) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    if (!isValidFourDigitPin(input.newPin)) {
      return { success: false, error: "PIN must be exactly 4 digits" };
    }

    if (input.newPin !== input.confirmPin) {
      return { success: false, error: "PINs do not match" };
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { pinHash: true },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.pinHash) {
      const current = input.currentPin?.trim() ?? "";
      if (!isValidFourDigitPin(current)) {
        return { success: false, error: "Enter your current PIN" };
      }
      const valid = await bcrypt.compare(current, user.pinHash);
      if (!valid) {
        return { success: false, error: "Current PIN is incorrect" };
      }
    }

    const nextPinHash = await bcrypt.hash(input.newPin, 10);
    await syncUserPinHash(session.user.id, nextPinHash);

    revalidatePath("/dashboard/account");
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("[changePin] Error:", error);
    return { success: false, error: "Failed to change PIN" };
  }
}

export async function clearMyPin(currentPin: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    if (!isValidFourDigitPin(currentPin)) {
      return { success: false, error: "Enter your current PIN" };
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { pinHash: true },
    });

    if (!user?.pinHash) {
      return { success: false, error: "No PIN is set on this account" };
    }

    const valid = await bcrypt.compare(currentPin, user.pinHash);
    if (!valid) {
      return { success: false, error: "Current PIN is incorrect" };
    }

    await syncUserPinHash(session.user.id, null);

    revalidatePath("/dashboard/account");
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error) {
    console.error("[clearMyPin] Error:", error);
    return { success: false, error: "Failed to remove PIN" };
  }
}

export async function updateProfile(input: UpdateProfileInput) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Check if email is being changed and if it's already in use
    if (input.email) {
      const existingUser = await db.user.findFirst({
        where: {
          email: input.email,
          id: { not: session.user.id },
        },
      });

      if (existingUser) {
        return { success: false, error: "Email already in use" };
      }
    }

    const user = await db.user.update({
      where: { id: session.user.id },
      data: {
        name: input.name,
        email: input.email,
        phoneNumber: input.phoneNumber,
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/account");
    return { success: true, data: user };
  } catch (error) {
    console.error("[updateProfile] Error:", error);
    return { success: false, error: "Failed to update profile" };
  }
}

export async function changePassword(input: ChangePasswordInput) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Get the user's account with password
    const account = await db.account.findFirst({
      where: {
        userId: session.user.id,
        providerId: "credential",
      },
    });

    if (!account || !account.password) {
      return { success: false, error: "No password set for this account" };
    }

    // Verify current password
    const isValid = await verifyCredentialPassword(input.currentPassword, account.password);
    if (!isValid) {
      return { success: false, error: "Current password is incorrect" };
    }

    // Validate new password
    if (input.newPassword.length < 8) {
      return { success: false, error: "New password must be at least 8 characters" };
    }

    // Hash and update the new password
    const hashedPassword = await bcrypt.hash(input.newPassword, 10);
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { pinHash: true },
    });
    const parsed = decodeCredentialPassword(account.password);
    await db.account.update({
      where: { id: account.id },
      data: {
        password: encodeCredentialPassword({
          passwordHash: hashedPassword,
          pinHash: user?.pinHash ?? parsed?.pinHash ?? null,
        }),
      },
    });

    revalidatePath("/dashboard/account");
    return { success: true };
  } catch (error) {
    console.error("[changePassword] Error:", error);
    return { success: false, error: "Failed to change password" };
  }
}

// Get user notification preferences from a JSON field or separate table
// For now, we'll use localStorage on the client side until a preferences table is added
export async function getNotificationPreferences() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Default preferences - in production, this would come from a database table
    const defaultPreferences: NotificationPreferences = {
      emailNotifications: true,
      criticalAlerts: true,
      dailyDigest: true,
      weeklyReports: true,
      lowStockAlerts: true,
      staffShortageAlerts: true,
    };

    return { success: true, data: defaultPreferences };
  } catch (error) {
    console.error("[getNotificationPreferences] Error:", error);
    return { success: false, error: "Failed to get preferences" };
  }
}

export async function updateNotificationPreferences(preferences: NotificationPreferences) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // In production, save to a user_preferences table
    // For now, we just return success as preferences will be stored client-side
    console.log("[updateNotificationPreferences] Preferences:", preferences);

    return { success: true, data: preferences };
  } catch (error) {
    console.error("[updateNotificationPreferences] Error:", error);
    return { success: false, error: "Failed to update preferences" };
  }
}

export type ActiveSessionRow = {
  id: string;
  userAgent: string;
  ipAddress: string;
  createdAt: Date;
  isCurrent: boolean;
};

export async function getActiveSessions(options?: {
  page?: number;
  pageSize?: number;
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false as const, error: "Not authenticated" };
    }

    const page = Math.max(1, options?.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, options?.pageSize ?? 10));
    const skip = (page - 1) * pageSize;

    const where = {
      userId: session.user.id,
      expiresAt: { gt: new Date() },
    };

    const [sessions, total] = await Promise.all([
      db.session.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      db.session.count({ where }),
    ]);

    const formattedSessions: ActiveSessionRow[] = sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent || "Unknown Device",
      ipAddress: s.ipAddress || "Unknown Location",
      createdAt: s.createdAt,
      isCurrent: s.token === session.session?.token,
    }));

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      success: true as const,
      data: formattedSessions,
      total,
      page,
      pageSize,
      totalPages,
    };
  } catch (error) {
    console.error("[getActiveSessions] Error:", error);
    return {
      success: false as const,
      error: "Failed to get sessions",
      data: [] as ActiveSessionRow[],
      total: 0,
      page: 1,
      pageSize: options?.pageSize ?? 10,
      totalPages: 1,
    };
  }
}

export async function revokeSession(sessionId: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Make sure the session belongs to the current user
    const targetSession = await db.session.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
      },
    });

    if (!targetSession) {
      return { success: false, error: "Session not found" };
    }

    await db.session.delete({
      where: { id: sessionId },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/account");
    return { success: true };
  } catch (error) {
    console.error("[revokeSession] Error:", error);
    return { success: false, error: "Failed to revoke session" };
  }
}
