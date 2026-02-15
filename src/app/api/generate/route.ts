import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const GENERATION_PROMPT = `Olet strategiatyöpajan assistentti. Analysoi alla oleva työpajamateriaali ja generoi strukturoitu JSON-vastaus.

MATERIAALI:
{CONTENT}

GENEROI JSON seuraavassa formaatissa (vastaa VAIN JSON, ei muuta):

{
  "postIts": [
    {
      "text": "Lyhyt post-it teksti (max 50 merkkiä)",
      "color": "yellow|green|blue|red|purple|orange",
      "category": "arvo|tavoite|riski|idea|ratkaisu|toimenpide"
    }
  ],
  "milestones": [
    {
      "title": "Virstanpylväs otsikko",
      "date": "YYYY-MM-DD",
      "description": "Lyhyt kuvaus",
      "status": "planned"
    }
  ],
  "summary": "1-3 lauseen yhteenveto työpajasta",
  "decision": "Päätös jos tehty (esim. 'Perustetaan sivutoiminen yritys')",
  "nextSteps": ["Askel 1", "Askel 2", "Askel 3"],
  "risks": ["Riski 1", "Riski 2"],
  "insights": ["Oivallus 1", "Oivallus 2"]
}

OHJEET:
- Luo 8-15 post-itia kattamaan kaikki avainpointit
- Käytä eri värejä kategorioideni mukaan:
  - yellow = yleiset muistiinpanot
  - green = arvot ja positiiviset
  - blue = tavoitteet ja visiot
  - red = riskit ja pelot
  - purple = ideat ja innovaatiot
  - orange = toimenpiteet ja askeleet
- Milestoneissa käytä realistisia päivämääriä (aloita tästä päivästä eteenpäin)
- Tiivistä mutta säilytä oleelliset yksityiskohdat`;

export async function POST(request: NextRequest) {
  try {
    const { workshopContent } = await request.json();

    if (!workshopContent?.trim()) {
      return NextResponse.json(
        { error: "No workshop content provided" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const prompt = GENERATION_PROMPT.replace("{CONTENT}", workshopContent);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from response");
    }

    const generatedContent = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ content: generatedContent });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
