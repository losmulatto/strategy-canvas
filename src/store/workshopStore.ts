"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================================================
// Types
// ============================================================================

export interface ExerciseData {
  notes: string;
  answers: Record<string, string>; // For scenarios, questions
  weights: Record<string, number>; // For criteria weights
  selections: string[]; // For option selections
}

export interface AIGeneratedContent {
  postIts: Array<{
    text: string;
    color: "yellow" | "green" | "blue" | "red" | "purple" | "orange";
    category: string;
  }>;
  milestones: Array<{
    title: string;
    date: string;
    description: string;
    status: "planned" | "in-progress" | "completed";
  }>;
  summary: string;
  decision?: string;
  nextSteps: string[];
  risks: string[];
  insights: string[];
}

interface WorkshopState {
  // Exercise data indexed by exercise ID
  exerciseData: Record<string, ExerciseData>;

  // AI-generated content
  generatedContent: AIGeneratedContent | null;

  // Generation status
  isGenerating: boolean;
  lastGeneratedAt: number | null;

  // Actions
  updateExerciseData: (exerciseId: string, data: Partial<ExerciseData>) => void;
  setGeneratedContent: (content: AIGeneratedContent) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  clearGenerated: () => void;

  // Helpers
  getAllNotes: () => string;
  getAllAnswers: () => Record<string, Record<string, string>>;
  getWorkshopSummary: () => string;
}

// ============================================================================
// Color mapping
// ============================================================================

export const COLOR_MAP: Record<string, string> = {
  yellow: "#fef08a",
  green: "#bbf7d0",
  blue: "#bfdbfe",
  red: "#fecaca",
  purple: "#e9d5ff",
  orange: "#fed7aa",
};

// ============================================================================
// Store
// ============================================================================

export const useWorkshopStore = create<WorkshopState>()(
  persist(
    (set, get) => ({
      exerciseData: {},
      generatedContent: null,
      isGenerating: false,
      lastGeneratedAt: null,

      updateExerciseData: (exerciseId, data) =>
        set((state) => {
          const existing = state.exerciseData[exerciseId] || {
            notes: "",
            answers: {},
            weights: {},
            selections: [],
          };
          return {
            exerciseData: {
              ...state.exerciseData,
              [exerciseId]: {
                ...existing,
                ...data,
              },
            },
          };
        }),

      setGeneratedContent: (content) =>
        set({
          generatedContent: content,
          lastGeneratedAt: Date.now(),
        }),

      setIsGenerating: (isGenerating) => set({ isGenerating }),

      clearGenerated: () =>
        set({
          generatedContent: null,
          lastGeneratedAt: null,
        }),

      getAllNotes: () => {
        const { exerciseData } = get();
        return Object.entries(exerciseData)
          .filter(([_, data]) => data.notes?.trim())
          .map(([id, data]) => `[${id}] ${data.notes}`)
          .join("\n\n");
      },

      getAllAnswers: () => {
        const { exerciseData } = get();
        const result: Record<string, Record<string, string>> = {};
        Object.entries(exerciseData).forEach(([id, data]) => {
          if (Object.keys(data.answers).length > 0) {
            result[id] = data.answers;
          }
        });
        return result;
      },

      getWorkshopSummary: () => {
        const { exerciseData } = get();
        const sections: string[] = [];

        // Part 1: Values
        const values = exerciseData["1.1"];
        if (values?.notes) {
          sections.push(`## Arvot ja suunta\n${values.notes}`);
        }

        // Part 1.2: Goals
        const goals = exerciseData["1.2"];
        if (goals) {
          const answers = Object.entries(goals.answers)
            .map(([q, a]) => `- ${q}: ${a}`)
            .join("\n");
          if (answers) sections.push(`## Tavoitteet\n${answers}`);
        }

        // Part 2: Options
        const options = exerciseData["2.1"];
        if (options?.selections?.length) {
          sections.push(`## Valitut vaihtoehdot\n${options.selections.join(", ")}`);
        }

        // Part 2.2: Matrix weights
        const matrix = exerciseData["2.2"];
        if (matrix?.weights) {
          const weights = Object.entries(matrix.weights)
            .map(([c, w]) => `- ${c}: ${w}/5`)
            .join("\n");
          if (weights) sections.push(`## Painotukset\n${weights}`);
        }

        // Part 2.3: Fears
        const fears = exerciseData["2.3"];
        if (fears?.notes) {
          sections.push(`## Pelot ja riskit\n${fears.notes}`);
        }

        // Part 3: Commitment
        const commitment = exerciseData["3.1"];
        if (commitment?.notes) {
          sections.push(`## Päätös\n${commitment.notes}`);
        }

        // Part 3.2: Next steps
        const nextSteps = exerciseData["3.2"];
        if (nextSteps?.notes) {
          sections.push(`## Seuraavat askeleet\n${nextSteps.notes}`);
        }

        // LDJ sections
        const ldjProblems = exerciseData["LDJ.1"];
        if (ldjProblems?.notes) {
          sections.push(`## LDJ: Ongelmat\n${ldjProblems.notes}`);
        }

        const ldjSolutions = exerciseData["LDJ.5"];
        if (ldjSolutions?.notes) {
          sections.push(`## LDJ: Ratkaisut\n${ldjSolutions.notes}`);
        }

        const ldjActions = exerciseData["LDJ.8"];
        if (ldjActions?.notes) {
          sections.push(`## LDJ: Toimenpiteet\n${ldjActions.notes}`);
        }

        return sections.join("\n\n") || "Ei vielä syötteitä.";
      },
    }),
    {
      name: "strategy-canvas-workshop",
    }
  )
);
