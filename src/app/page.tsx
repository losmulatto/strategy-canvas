"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Lightbulb,
  Map,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Rocket,
  Sparkles,
  Loader2,
  Download,
  Check,
} from "lucide-react";
import { useWorkshopStore, COLOR_MAP, AIGeneratedContent } from "@/store/workshopStore";

// Dynamic imports for client-only components
const Canvas = dynamic(() => import("@/components/Canvas"), { ssr: false });
const Roadmap = dynamic(() => import("@/components/Roadmap"), { ssr: false });
const AICoach = dynamic(() => import("@/components/AICoach"), { ssr: false });
const PostItCanvas = dynamic(() => import("@/components/PostItCanvas"), { ssr: false });

// Workshop template for "Perustammeko yrityksen"
const WORKSHOP_TEMPLATE = {
  title: "Perustammeko yrityksen – ja millä mallilla?",
  sections: [
    {
      id: "arvot",
      title: "OSA 1: Arvot ja suunta",
      duration: "90 min",
      exercises: [
        {
          id: "1.1",
          title: "Yhteiset arvot",
          duration: "45 min",
          instructions: [
            "Kirjoita yksin 5 arvoa (vapaus, vaikuttavuus, turvallisuus, kasvu, tasapaino...)",
            "Keskustelkaa pareittain",
            "Muodostakaa 3-5 yhteistä ydinarvoa",
          ],
          output: "Yhteinen arvolista + mitä kukin arvo tarkoittaa käytännössä",
        },
        {
          id: "1.2",
          title: "Mitä haluamme yritykseltä?",
          duration: "45 min",
          questions: [
            "Tasainen toimeentulo vai nopea kasvu?",
            "Pieni riski vai iso potentiaali?",
            "Vaikuttavuus vai voitto?",
            "Myytävä yritys vai elämäntapa?",
            "Miltä arkemme näyttää 3v kuluttua?",
          ],
          scenarios: ["Paras mahdollinen", "Todennäköisin", "Huonoin realistinen"],
        },
      ],
    },
    {
      id: "vaihtoehdot",
      title: "OSA 2: Vaihtoehtojen tarkastelu",
      duration: "120 min",
      exercises: [
        {
          id: "2.1",
          title: "Vaihtoehtojen määrittely",
          duration: "30 min",
          options: [
            "Ei perusteta yritystä",
            "Sivutoiminen yritys",
            "Täysipäiväinen yritys",
            "Ulkopuolinen rahoitus",
            "Pienimuotoinen kokeilu ensin",
          ],
          companyTypes: ["Osakeyhtiö", "Toiminimi"],
        },
        {
          id: "2.2",
          title: "Päätösmatriisi",
          duration: "60 min",
          criteria: [
            "Arvojen toteutuminen",
            "Taloudellinen potentiaali",
            "Riski",
            "Työmäärä",
            "Oppiminen",
            "Joustavuus",
            "Stressitaso",
          ],
        },
        {
          id: "2.3",
          title: "Pelko- ja riskikartoitus",
          duration: "30 min",
          questions: [
            "Mitä pelkäämme?",
            "Mikä on pahinta mitä voi tapahtua?",
            "Kuinka todennäköistä se on?",
            "Miten voimme pienentää riskiä?",
          ],
        },
      ],
    },
    {
      id: "sitoutuminen",
      title: "OSA 3: Henkilökohtainen sitoutuminen",
      duration: "75 min",
      exercises: [
        {
          id: "3.1",
          title: "Oikea valinta meille",
          duration: "45 min",
          questions: [
            "Mikä tuntuu oikealta, vaikka pelottaa?",
            "Mikä tuntuu turvalliselta, mutta väärältä?",
            "Jos päätöstä ei tehtäisi, miltä se tuntuisi vuoden päästä?",
          ],
          vote: "Hiljainen äänestys: Valintani on ___ koska ___",
        },
        {
          id: "3.2",
          title: "Päätös ja seuraavat askeleet",
          duration: "30 min",
          ifYes: ["Ensimmäinen konkreettinen askel?", "Kuka tekee mitä?", "Mihin mennessä?"],
          ifNo: ["Mitä teemme sen sijaan?", "Milloin palaamme asiaan?"],
        },
      ],
    },
    {
      id: "ldj",
      title: "⚡ Lightning Decision Jam",
      duration: "40 min",
      exercises: [
        {
          id: "LDJ.1",
          title: "Ongelmat (hiljaa)",
          duration: "7 min",
          instructions: [
            "Jokainen kirjoittaa HILJAA post-iteille ongelmia, haasteita, huolia",
            "Yksi ongelma per post-it",
            "Ei keskustelua — työskennellään yksin",
            "Tavoite: 5-10 ongelmaa per henkilö",
          ],
          output: "Pino ongelmia post-iteillä",
        },
        {
          id: "LDJ.2",
          title: "Esittely & ryhmittely",
          duration: "5 min",
          instructions: [
            "Jokainen esittelee omat post-itit lyhyesti (max 30s/kpl)",
            "Kiinnitä taululle sitä mukaa",
            "Ryhmittele samankaltaiset yhteen",
          ],
          output: "Ongelmat ryhmitelty teemoittain",
        },
        {
          id: "LDJ.3",
          title: "Äänestys: Tärkeimmät ongelmat",
          duration: "3 min",
          instructions: [
            "Jokainen saa 2 ääntä (pistettä/tarraa)",
            "Äänestä HILJAA — ei keskustelua",
            "Voit antaa molemmat äänet samalle jos haluat",
          ],
          output: "Top 1-2 ongelmaa tunnistettu",
        },
        {
          id: "LDJ.4",
          title: "Muotoile HMW-kysymyksiksi",
          duration: "3 min",
          instructions: [
            "Ota eniten ääniä saanut ongelma",
            "Muotoile: 'Miten voisimme...?' (How Might We)",
            "Esim: 'Miten voisimme vähentää riskiä?' tai 'Miten voisimme testata ideaa halvalla?'",
          ],
          output: "1-2 HMW-kysymystä",
        },
        {
          id: "LDJ.5",
          title: "Ratkaisut (hiljaa)",
          duration: "7 min",
          instructions: [
            "Ideoi ratkaisuja HMW-kysymykseen",
            "Yksi ratkaisu per post-it",
            "HILJAA — ei keskustelua",
            "Hulluimmatkin ideat sallittu",
          ],
          output: "Pino ratkaisuehdotuksia",
        },
        {
          id: "LDJ.6",
          title: "Äänestys: Parhaat ratkaisut",
          duration: "3 min",
          instructions: [
            "Jokainen saa 2 ääntä",
            "Äänestä HILJAA",
            "Valitse ne jotka voisivat oikeasti toimia",
          ],
          output: "Top 2-3 ratkaisua tunnistettu",
        },
        {
          id: "LDJ.7",
          title: "Effort/Impact -matriisi",
          duration: "5 min",
          instructions: [
            "Piirrä 2x2 ruudukko: X = Vaiva, Y = Vaikutus",
            "Sijoita top-ratkaisut ruudukkoon yhdessä",
            "Tavoite: Löytää 'Quick Wins' (pieni vaiva, suuri vaikutus)",
          ],
          output: "Priorisoidut ratkaisut matriisissa",
        },
        {
          id: "LDJ.8",
          title: "Toimenpiteet",
          duration: "5 min",
          instructions: [
            "Valitse 1-2 Quick Win -ratkaisua",
            "Määritä: KUKA tekee MITÄ ja MILLOIN",
            "Ensimmäinen askel pitää olla konkreettinen ja tehtävissä tällä viikolla",
          ],
          output: "Selkeät toimenpiteet vastuuhenkilöineen",
        },
      ],
    },
  ],
  outputs: [
    "Yhteiset arvot kirjattuna",
    "Selkeä kuva odotuksista",
    "Arvioidut vaihtoehdot",
    "Tietoinen päätös",
    "Konkreettiset seuraavat askeleet",
    "⚡ LDJ: Priorisoidut ongelmat ja ratkaisut",
    "⚡ LDJ: Effort/Impact -matriisi",
  ],
};

type ViewType = "canvas" | "postits" | "roadmap" | "workshop";

export default function Home() {
  const [view, setView] = useState<ViewType>("workshop");
  const [showAI, setShowAI] = useState(true);
  const [currentSection, setCurrentSection] = useState(0);
  const [mounted, setMounted] = useState(false);

  const {
    generatedContent,
    isGenerating,
    setIsGenerating,
    setGeneratedContent,
    getWorkshopSummary,
  } = useWorkshopStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate visualizations from workshop data
  const handleGenerateVisualizations = useCallback(async () => {
    const workshopContent = getWorkshopSummary();

    if (workshopContent === "Ei vielä syötteitä.") {
      alert("Täytä ensin työpajan muistiinpanoja ja vastauksia.");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workshopContent }),
      });

      if (!response.ok) {
        throw new Error("Generation failed");
      }

      const { content } = await response.json();
      setGeneratedContent(content);

      // Switch to post-its view to show results
      setView("postits");
    } catch (error) {
      console.error("Generation error:", error);
      alert("Visualisointien generointi epäonnistui. Yritä uudelleen.");
    } finally {
      setIsGenerating(false);
    }
  }, [getWorkshopSummary, setGeneratedContent, setIsGenerating]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900">
        <div className="text-zinc-400">Ladataan...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-900 text-zinc-100">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <Rocket className="h-6 w-6 text-blue-500" />
          <h1 className="text-lg font-semibold">{WORKSHOP_TEMPLATE.title}</h1>
        </div>

        {/* View Tabs */}
        <div className="flex gap-1 rounded-lg bg-zinc-800 p-1">
          <button
            onClick={() => setView("workshop")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition ${
              view === "workshop"
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Lightbulb className="h-4 w-4" />
            Workshop
          </button>
          <button
            onClick={() => setView("postits")}
            className={`relative flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition ${
              view === "postits"
                ? "bg-yellow-500 text-zinc-900"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            📝
            Post-it
            {generatedContent && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-green-500" />
            )}
          </button>
          <button
            onClick={() => setView("canvas")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition ${
              view === "canvas"
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Map className="h-4 w-4" />
            Canvas
          </button>
          <button
            onClick={() => setView("roadmap")}
            className={`relative flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition ${
              view === "roadmap"
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Map className="h-4 w-4" />
            Roadmap
            {generatedContent?.milestones?.length && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-green-500" />
            )}
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Generate Button */}
          <button
            onClick={handleGenerateVisualizations}
            disabled={isGenerating}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
              isGenerating
                ? "bg-zinc-700 text-zinc-400"
                : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500"
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generoidaan...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generoi visualisoinnit
              </>
            )}
          </button>

          {/* AI Toggle */}
          <button
            onClick={() => setShowAI(!showAI)}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition ${
              showAI ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-400"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            AI Coach
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main View */}
        <main className={`flex-1 overflow-auto ${showAI ? "" : ""}`}>
          {view === "workshop" && (
            <WorkshopView
              template={WORKSHOP_TEMPLATE}
              currentSection={currentSection}
              onSectionChange={setCurrentSection}
            />
          )}
          {view === "postits" && (
            <div className="h-full">
              <PostItCanvas generatedPostIts={generatedContent?.postIts} />
            </div>
          )}
          {view === "canvas" && (
            <div className="h-full">
              <Canvas />
            </div>
          )}
          {view === "roadmap" && (
            <div className="p-4">
              <Roadmap generatedMilestones={generatedContent?.milestones} />
            </div>
          )}
        </main>

        {/* AI Coach Panel */}
        {showAI && (
          <aside className="w-96 border-l border-zinc-800 bg-zinc-950">
            <AICoach
              elements={[]}
              generatedContent={generatedContent}
            />
          </aside>
        )}
      </div>

      {/* Generated Content Banner */}
      {generatedContent && (
        <div className="border-t border-green-800 bg-green-950/50 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-green-400">
              <Check className="h-4 w-4" />
              <span>
                Visualisoinnit generoitu: {generatedContent.postIts?.length || 0} post-itia,{" "}
                {generatedContent.milestones?.length || 0} virstanpylvästä
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-green-300/70">
              {generatedContent.decision && (
                <span>📋 Päätös: {generatedContent.decision}</span>
              )}
              {generatedContent.nextSteps?.length > 0 && (
                <span>👣 {generatedContent.nextSteps.length} seuraavaa askelta</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Workshop View Component
function WorkshopView({
  template,
  currentSection,
  onSectionChange,
}: {
  template: typeof WORKSHOP_TEMPLATE;
  currentSection: number;
  onSectionChange: (idx: number) => void;
}) {
  const section = template.sections[currentSection];
  const { exerciseData } = useWorkshopStore();

  // Count completed exercises (with notes)
  const completedCount = section.exercises.filter(
    (ex) => exerciseData[ex.id]?.notes?.trim()
  ).length;

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Section Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => onSectionChange(Math.max(0, currentSection - 1))}
          disabled={currentSection === 0}
          className="flex items-center gap-1 rounded-md bg-zinc-800 px-3 py-2 text-sm disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Edellinen
        </button>

        <div className="flex gap-2">
          {template.sections.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => onSectionChange(idx)}
              className={`h-3 w-3 rounded-full transition ${
                idx === currentSection ? "bg-blue-500" : "bg-zinc-700 hover:bg-zinc-600"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() =>
            onSectionChange(Math.min(template.sections.length - 1, currentSection + 1))
          }
          disabled={currentSection === template.sections.length - 1}
          className="flex items-center gap-1 rounded-md bg-zinc-800 px-3 py-2 text-sm disabled:opacity-50"
        >
          Seuraava
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Section Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">{section.title}</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">
              {completedCount}/{section.exercises.length} täytetty
            </span>
            <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-700">
              <div
                className="h-full bg-green-500 transition-all"
                style={{
                  width: `${(completedCount / section.exercises.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
        <p className="text-zinc-400">Kesto: {section.duration}</p>
      </div>

      {/* Exercises */}
      <div className="space-y-6">
        {section.exercises.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} />
        ))}
      </div>

      {/* Outputs (show on last section) */}
      {currentSection === template.sections.length - 1 && (
        <div className="mt-8 rounded-lg border border-green-800 bg-green-950/30 p-4">
          <h3 className="mb-3 font-semibold text-green-400">
            Työpajan lopputulokset
          </h3>
          <ul className="space-y-2">
            {template.outputs.map((output, idx) => (
              <li key={idx} className="flex items-center gap-2 text-green-300">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {output}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Exercise type
interface Exercise {
  id: string;
  title: string;
  duration: string;
  instructions?: string[];
  questions?: string[];
  output?: string;
  options?: string[];
  companyTypes?: string[];
  criteria?: string[];
  scenarios?: string[];
  vote?: string;
  ifYes?: string[];
  ifNo?: string[];
}

// Exercise Card Component
function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const { exerciseData, updateExerciseData } = useWorkshopStore();
  const data = exerciseData[exercise.id] || {
    notes: "",
    answers: {},
    weights: {},
    selections: [],
  };

  const handleNotesChange = (notes: string) => {
    updateExerciseData(exercise.id, { notes });
  };

  const handleAnswerChange = (question: string, answer: string) => {
    updateExerciseData(exercise.id, {
      answers: { ...data.answers, [question]: answer },
    });
  };

  const handleWeightChange = (criterion: string, weight: number) => {
    updateExerciseData(exercise.id, {
      weights: { ...data.weights, [criterion]: weight },
    });
  };

  const handleOptionToggle = (option: string) => {
    const newSelections = data.selections.includes(option)
      ? data.selections.filter((s) => s !== option)
      : [...data.selections, option];
    updateExerciseData(exercise.id, { selections: newSelections });
  };

  const hasContent =
    data.notes?.trim() ||
    Object.keys(data.answers).length > 0 ||
    Object.keys(data.weights).length > 0 ||
    data.selections.length > 0;

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        hasContent
          ? "border-green-800 bg-green-950/20"
          : "border-zinc-800 bg-zinc-800/50"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-white">
          {hasContent && <Check className="h-4 w-4 text-green-500" />}
          {exercise.id}. {exercise.title}
        </h3>
        <span className="text-sm text-zinc-500">{exercise.duration}</span>
      </div>

      {/* Instructions */}
      {exercise.instructions && (
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-zinc-400">Ohjeet:</h4>
          <ul className="space-y-1">
            {exercise.instructions.map((inst, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                {inst}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Questions */}
      {exercise.questions && (
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-zinc-400">Kysymykset:</h4>
          <ul className="space-y-2">
            {exercise.questions.map((q, idx) => (
              <li key={idx} className="rounded bg-zinc-700/50 p-2">
                <label className="mb-1 flex items-start gap-2 text-sm text-zinc-300">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-yellow-500" />
                  {q}
                </label>
                <input
                  type="text"
                  value={data.answers[q] || ""}
                  onChange={(e) => handleAnswerChange(q, e.target.value)}
                  placeholder="Vastauksesi..."
                  className="mt-1 w-full rounded bg-zinc-600 px-2 py-1 text-sm placeholder-zinc-400"
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Options */}
      {exercise.options && (
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-zinc-400">Vaihtoehdot (valitse):</h4>
          <div className="flex flex-wrap gap-2">
            {exercise.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleOptionToggle(opt)}
                className={`rounded-full px-3 py-1 text-sm transition ${
                  data.selections.includes(opt)
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Criteria */}
      {exercise.criteria && (
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-zinc-400">Kriteerit (painoarvo 1-5):</h4>
          <div className="grid grid-cols-2 gap-2">
            {exercise.criteria.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between rounded bg-zinc-700/50 px-3 py-2">
                <span className="text-sm text-zinc-300">{c}</span>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={data.weights[c] || 3}
                  onChange={(e) => handleWeightChange(c, parseInt(e.target.value) || 3)}
                  className="w-12 rounded bg-zinc-600 px-2 py-1 text-center text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scenarios */}
      {exercise.scenarios && (
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-zinc-400">Skenaariot:</h4>
          <div className="space-y-2">
            {exercise.scenarios.map((scenario, idx) => (
              <div key={idx} className="rounded bg-zinc-700/50 p-3">
                <label className="mb-1 block text-sm font-medium text-zinc-300">
                  {scenario}:
                </label>
                <textarea
                  rows={2}
                  value={data.answers[scenario] || ""}
                  onChange={(e) => handleAnswerChange(scenario, e.target.value)}
                  placeholder="Kirjoita tähän..."
                  className="w-full rounded bg-zinc-600 px-3 py-2 text-sm placeholder-zinc-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes area */}
      <div className="mt-4 border-t border-zinc-700 pt-4">
        <label className="mb-2 block text-sm font-medium text-zinc-400">
          Muistiinpanot:
        </label>
        <textarea
          value={data.notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          rows={3}
          placeholder="Kirjoita keskustelun ydinkohdat tähän..."
          className="w-full rounded bg-zinc-700 px-3 py-2 text-sm placeholder-zinc-500"
        />
      </div>

      {/* Output */}
      {exercise.output && (
        <div className="mt-3 rounded bg-blue-950/30 p-3">
          <span className="text-sm text-blue-400">
            Tavoiteltu lopputulos: {exercise.output}
          </span>
        </div>
      )}
    </div>
  );
}
