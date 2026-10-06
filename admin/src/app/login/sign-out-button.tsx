"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@admin/lib/auth-client";

export default function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/login");
        router.refresh();
      }}
    >
      다른 계정으로 로그인
    </button>
  );
}
