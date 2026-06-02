import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { sendPasswordResetEmail } from "./services/email";
import { verifyCredentialPassword } from "./auth/credential-password";

export const ROLES = {
    SUPER_ADMIN: "SUPER_ADMIN",
    EXECUTIVE: "EXECUTIVE",
    OPERATIONS_MANAGER: "OPERATIONS_MANAGER",
    BRANCH_MANAGER: "BRANCH_MANAGER",
    SUPERVISOR: "SUPERVISOR",
    STAFF: "STAFF",
    KITCHEN_STAFF: "KITCHEN_STAFF",
    AUDITOR: "AUDITOR",
    DEVELOPER: "DEVELOPER",
    CALL_CENTER: "CALL_CENTER",
    WAREHOUSE_STAFF: "WAREHOUSE_STAFF",
} as const;

export type Role = keyof typeof ROLES;

export const ROLE_PERMISSIONS = {
    SUPER_ADMIN: {
        canViewAllBranches: true,
        canEditData: true,
        canDeleteData: true,
        canManageUsers: true,
        canViewReports: true,
        canViewAuditLogs: true,
        canManageSettings: true,
    },
    EXECUTIVE: {
        canViewAllBranches: true,
        canEditData: true,
        canDeleteData: false,
        canManageUsers: true,
        canViewReports: true,
        canViewAuditLogs: true,
        canManageSettings: true,
    },
    OPERATIONS_MANAGER: {
        canViewAllBranches: true,
        canEditData: true,
        canDeleteData: false,
        canManageUsers: false,
        canViewReports: true,
        canViewAuditLogs: true,
        canManageSettings: false,
    },
    BRANCH_MANAGER: {
        canViewAllBranches: false,
        canEditData: true,
        canDeleteData: false,
        canManageUsers: false,
        canViewReports: true,
        canViewAuditLogs: false,
        canManageSettings: false,
    },
    SUPERVISOR: {
        canViewAllBranches: false,
        canEditData: true,
        canDeleteData: false,
        canManageUsers: false,
        canViewReports: false,
        canViewAuditLogs: false,
        canManageSettings: false,
    },
    STAFF: {
        canViewAllBranches: false,
        canEditData: true,
        canDeleteData: false,
        canManageUsers: false,
        canViewReports: false,
        canViewAuditLogs: false,
        canManageSettings: false,
    },
    KITCHEN_STAFF: {
        canViewAllBranches: false,
        canEditData: false,
        canDeleteData: false,
        canManageUsers: false,
        canViewReports: false,
        canViewAuditLogs: false,
        canManageSettings: false,
    },
    AUDITOR: {
        canViewAllBranches: true,
        canEditData: false,
        canDeleteData: false,
        canManageUsers: false,
        canViewReports: true,
        canViewAuditLogs: true,
        canManageSettings: false,
    },
    DEVELOPER: {
        canViewAllBranches: false,
        canEditData: false,
        canDeleteData: false,
        canManageUsers: false,
        canViewReports: false,
        canViewAuditLogs: false,
        canManageSettings: false,
    },
    CALL_CENTER: {
        canViewAllBranches: true,
        canEditData: true,
        canDeleteData: false,
        canManageUsers: false,
        canViewReports: false,
        canViewAuditLogs: false,
        canManageSettings: false,
    },
    WAREHOUSE_STAFF: {
        canViewAllBranches: false,
        canEditData: true,
        canDeleteData: false,
        canManageUsers: false,
        canViewReports: false,
        canViewAuditLogs: false,
        canManageSettings: false,
    },
} as const;

export const auth = betterAuth({
    baseURL:
        process.env.BETTER_AUTH_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET,
    database: prismaAdapter(db, {
        provider: "postgresql",
    }),
    // trustedOrigins: [
    //     "http://localhost:3000",
    //     "http://127.0.0.1:3000",
    //     process.env.NEXT_PUBLIC_APP_URL || "",
    // ].filter(Boolean),
    emailAndPassword: {   
        enabled: true,
        autoSignIn: true,
        requireEmailVerification: false,
        password: {
            hash: async (password: string) => {
                return bcrypt.hash(password, 10);
            },
            verify: async ({ password, hash }: { password: string; hash: string }) => {
                return verifyCredentialPassword(password, hash);
            },
        },
        sendResetPassword: async ({ user, url }) => {
            console.log("[Auth] Sending password reset email to:", user.email);
            console.log("[Auth] Reset URL:", url);
            try {
                const result = await sendPasswordResetEmail(user.email, user.name || "User", url);
                console.log("[Auth] Password reset email sent:", result);
                if (!result) {
                    throw new Error("Email service returned false");
                }
            } catch (error) {
                console.error("[Auth] Failed to send password reset email:", error);
                throw error;
            }
        },
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
        cookieCache: {
            enabled: true,
            maxAge: 60 // 1 minute cache
        }
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: false,
                defaultValue: "BRANCH_MANAGER",
            },
            branchId: {
                type: "string",
                required: false,
            },
            phoneNumber: {
                type: "string",
                required: false,
            },
            isActive: {
                type: "boolean",
                required: false,
                defaultValue: true,
            },
        },
    },
    plugins: [
        nextCookies(),
    ]
});

export type Session = typeof auth.$Infer.Session;

export function hasPermission(role: Role, permission: keyof typeof ROLE_PERMISSIONS.SUPER_ADMIN): boolean {
    return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

export function canAccessBranch(userRole: Role, userBranchId: string | null, targetBranchId: string): boolean {
    if (ROLE_PERMISSIONS[userRole].canViewAllBranches) {
        return true;
    }
    return userBranchId === targetBranchId;
}

export function canManageBranchData(session: Session | null, targetBranchId: string): boolean {
    if (!session?.user) return false;
    const role = session.user.role as Role;
    const userBranchId = session.user.branchId ?? null;
    if (!ROLE_PERMISSIONS[role]?.canEditData) return false;
    return canAccessBranch(role, userBranchId, targetBranchId);
}

export function isInRole(session: Session | null, roles: Role[]): boolean {
    if (!session?.user) return false;
    const role = session.user.role as Role;
    return roles.includes(role);
}