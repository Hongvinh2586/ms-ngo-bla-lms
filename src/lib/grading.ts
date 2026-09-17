import type {
  FillBlankData,
  MatchingData,
  MultipleChoiceData,
  PublicQuestionData,
  QuestionRow,
  StudentAnswer,
  TrueFalseData,
} from "@/lib/types";

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface GradeResult {
  isCorrect: boolean;
  pointsAwarded: number;
}

/**
 * Grades one answer against its question's stored answer key. Only ever
 * called on the server (the answer key never reaches the browser).
 */
export function gradeAnswer(question: QuestionRow, answer: StudentAnswer | undefined): GradeResult {
  const points = question.points ?? 1;

  if (!answer) {
    return { isCorrect: false, pointsAwarded: 0 };
  }

  switch (question.type) {
    case "multiple_choice": {
      const data = question.data as MultipleChoiceData;
      const correct =
        answer.type === "multiple_choice" && answer.selectedIndex === data.correctIndex;
      return { isCorrect: correct, pointsAwarded: correct ? points : 0 };
    }

    case "true_false": {
      const data = question.data as TrueFalseData;
      const correct = answer.type === "true_false" && answer.value === data.correctAnswer;
      return { isCorrect: correct, pointsAwarded: correct ? points : 0 };
    }

    case "fill_blank":
    case "sentence_completion": {
      const data = question.data as FillBlankData;
      const accepted = (data.acceptedAnswers ?? []).map(normalize);
      const given =
        (answer.type === "fill_blank" || answer.type === "sentence_completion") &&
        normalize(answer.text || "");
      const correct = typeof given === "string" && accepted.includes(given);
      return { isCorrect: correct, pointsAwarded: correct ? points : 0 };
    }

    case "matching": {
      const data = question.data as MatchingData;
      const pairs = data.pairs ?? [];
      if (pairs.length === 0 || answer.type !== "matching") {
        return { isCorrect: false, pointsAwarded: 0 };
      }
      const perPair = points / pairs.length;
      let awarded = 0;
      for (const pair of pairs) {
        if (normalize(answer.matches[pair.left] ?? "") === normalize(pair.right)) {
          awarded += perPair;
        }
      }
      // Round to avoid ugly floating point remainders like 0.6666666.
      awarded = Math.round(awarded * 100) / 100;
      return { isCorrect: awarded === points, pointsAwarded: awarded };
    }

    default:
      return { isCorrect: false, pointsAwarded: 0 };
  }
}

/** Strips the correct-answer fields from a question's `data`, for sending
 *  to the browser while a student is taking the quiz. */
export function toSafeQuestionData(question: QuestionRow): PublicQuestionData {
  switch (question.type) {
    case "multiple_choice": {
      const data = question.data as MultipleChoiceData;
      return { options: data.options };
    }
    case "true_false":
      return {};
    case "fill_blank":
    case "sentence_completion":
      return {};
    case "matching": {
      const data = question.data as MatchingData;
      const pairs = data.pairs ?? [];
      const rights = pairs.map((p) => p.right);
      // Shuffle so the correct order isn't given away by position.
      for (let i = rights.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rights[i], rights[j]] = [rights[j], rights[i]];
      }
      return {
        lefts: pairs.map((p) => p.left),
        rights,
      };
    }
    default:
      return {};
  }
}
