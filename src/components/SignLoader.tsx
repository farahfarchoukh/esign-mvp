"use client";

import dynamic from "next/dynamic";

const SignView = dynamic(() => import("./SignView"), {
  ssr: false,
  loading: () => <p className="text-slate-500">Loading document…</p>,
});

export default function SignLoader({ token }: { token: string }) {
  return <SignView token={token} />;
}
