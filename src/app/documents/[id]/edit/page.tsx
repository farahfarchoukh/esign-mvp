import EditorLoader from "@/components/EditorLoader";

export default function EditPage({ params }: { params: { id: string } }) {
  return <EditorLoader documentId={params.id} />;
}
