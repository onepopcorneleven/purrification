import fs from "node:fs/promises";
import path from "node:path";
import ImageGallery from "./ImageGallery";

export const dynamic = "force-dynamic";

async function listDiagnosisImages(): Promise<string[]> {
  const dir = path.join(process.cwd(), "public", "images", "diagnoses");
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  return entries
    .filter((name) => name.toLowerCase().endsWith(".png"))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => `/images/diagnoses/${name}`);
}

export default async function AllImagesPage() {
  const images = await listDiagnosisImages();

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--color-bg-base)",
        color: "var(--color-text-primary)",
        padding: "1rem",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-cinzel)",
          fontSize: "1.1rem",
          marginBottom: "0.25rem",
        }}
      >
        Debug: all diagnosis images
      </h1>
      <p
        style={{
          fontSize: "0.85rem",
          opacity: 0.7,
          marginBottom: "1rem",
        }}
      >
        {images.length} file{images.length === 1 ? "" : "s"} in{" "}
        <code>public/images/diagnoses/</code>. Not linked anywhere — direct URL
        only.
      </p>
      <ImageGallery images={images} />
    </main>
  );
}
