import SignLoader from "@/components/SignLoader";

export default function SignPage({ params }: { params: { token: string } }) {
  return <SignLoader token={params.token} />;
}
