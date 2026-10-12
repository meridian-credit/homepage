"use client";
import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

/* 같은 호스트의 /api/auth 로 간다. */
export const authClient = createAuthClient({ plugins: [usernameClient()] });
