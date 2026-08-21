import { NextResponse } from "next/server";
import { handleUpload } from "@vercel/blob/client";
import { getSession } from "@/lib/auth";

// La subida del archivo va directo del navegador a Vercel Blob (no pasa por
// esta función), así que fotos y videos grandes no chocan con el límite de
// tamaño de las funciones serverless. Esta ruta solo autoriza la subida.
export async function POST(request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "video/mp4",
            "video/quicktime",
            "video/webm",
          ],
          addRandomSuffix: true,
          maximumSizeInBytes: 80 * 1024 * 1024, // 80MB
          tokenPayload: JSON.stringify({ user }),
        };
      },
      onUploadCompleted: async () => {
        // No hace falta hacer nada aquí: el cliente registra el mensaje
        // en /api/messages una vez que la subida termina.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Error al subir el archivo." },
      { status: 400 }
    );
  }
}
