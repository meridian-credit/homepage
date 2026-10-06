"use client";
import { createAuthClient } from "better-auth/react";

/* 같은 호스트의 /api/auth 로 간다. */
export const authClient = createAuthClient();
