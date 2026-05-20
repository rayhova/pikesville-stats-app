import "server-only";

import { getOpenAIEnv, isOpenAIConfigured } from "@/lib/env";

const REWRITE_RULES: Array<[RegExp, string]> = [
  [/\bis horrible on defense\b/gi, "needs to improve defensive effort"],
  [/\bterrible on defense\b/gi, "needs to improve defensive consistency"],
  [/\bbad on defense\b/gi, "needs to improve on the defensive end"],
  [/\bdoesn't guard\b/gi, "needs to defend with more consistency"],
  [/\blazy\b/gi, "inconsistent with effort"],
  [/\bno effort\b/gi, "needs better effort"],
  [/\bdoesn't try\b/gi, "needs to compete more consistently"],
  [/\bselfish\b/gi, "needs to do a better job balancing his own offense with creating for teammates"],
  [/\btakes really bad shots\b/gi, "needs to improve shot selection"],
  [/\bbad shots\b/gi, "shot selection needs to improve"],
  [/\bawful shots\b/gi, "shot selection needs to improve"],
  [/\bterrible shots\b/gi, "shot selection needs to improve"],
  [/\bforces shots\b/gi, "can force offense at times and needs to make better reads"],
  [/\bawful\b/gi, "needs significant improvement"],
  [/\bterrible\b/gi, "needs major improvement"],
  [/\bhorrible\b/gi, "needs major improvement"],
  [/\bsucks\b/gi, "has struggled"],
  [/\btrash\b/gi, "has been inconsistent"],
  [/\bstupid fouls?\b/gi, "avoidable fouls"],
  [/\bidiotic fouls?\b/gi, "avoidable fouls"],
  [/\blowes? assignments?\b/gi, "needs to be more reliable with assignments"],
  [/\bdoesn't communicate\b/gi, "needs to communicate more consistently"],
  [/\bnever communicates\b/gi, "needs to communicate much more consistently"],
  [/\bpoor decision making\b/gi, "needs to improve decision-making"],
  [/\bbad decision making\b/gi, "needs to improve decision-making"],
  [/\btoo much settling for long 3s\b/gi, "can settle too much for long 3s, which can make his game too one-dimensional"],
  [/\beasy to guard when he is not attempting to get to the basket\b/gi, "more guardable when he is not putting pressure on the basket"],
  [/\bif he wants to play college basketball, that'?s the only road I see for him to get there\b/gi, "point guard appears to be the clearest path to playing at the next level"],
  [/\bthat cannot happen\b/gi, "that cannot continue"],
  [/\bmust decide that he will be a “plus” player on the defensive end of the floor no matter what happens at the other end\b/gi, "must find a way to remain a positive defensive player regardless of how things are going offensively"],
];

function rewriteSentenceFallback(sentence: string) {
  let rewritten = sentence.trim();
  if (!rewritten) {
    return rewritten;
  }

  for (const [pattern, replacement] of REWRITE_RULES) {
    rewritten = rewritten.replace(pattern, replacement);
  }

  rewritten = rewritten
    .replace(/\b(can be|is|was)\s+too\s+passive\b/gi, "needs to be more assertive")
    .replace(/\b(can be|is|was)\s+too\s+hesitant\b/gi, "needs to play more decisively")
    .replace(/\b(can be|is|was)\s+out of shape\b/gi, "needs to improve conditioning")
    .replace(/\b(can be|is|was)\s+undisciplined\b/gi, "needs to be more disciplined")
    .replace(/\b(can be|is|was)\s+careless\b/gi, "needs to value possessions more consistently")
    .replace(/\bwhen his shot wasn'?t falling, it often affected his play on the defensive end\b/gi, "when his shot is not falling, he can let it affect his play on the defensive end")
    .replace(/\bit often affected his play on the defensive end\b/gi, "it can affect his play on the defensive end")
    .replace(/\bthe only road I see for him to get there\b/gi, "the clearest path to getting there")
    .replace(/\bcan he improve his handle dramatically and play point guard next year\?/gi, "the next step is to improve his handle significantly and see if he can grow into more point guard responsibility next year")
    .replace(/\bhe must decide that he will be\b/gi, "he must become")
    .replace(/\bmust decide\b/gi, "must commit");

  if (/^[*-]\s*/.test(rewritten)) {
    const prefix = rewritten.match(/^[*-]\s*/)?.[0] ?? "";
    const body = rewritten.slice(prefix.length);
    return `${prefix}${body.charAt(0).toUpperCase()}${body.slice(1)}`;
  }

  return `${rewritten.charAt(0).toUpperCase()}${rewritten.slice(1)}`;
}

function softenEvaluationFallback(input: string) {
  const normalized = input.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return "Needs to continue improving through consistent work, attention to detail, and accountability.";
  }

  const blocks = normalized
    .split("\n")
    .map((line) => rewriteSentenceFallback(line))
    .join("\n")
    .trim();

  return blocks || normalized;
}

async function rewriteWithOpenAI(input: string) {
  const { apiKey } = getOpenAIEnv();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-5.4-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "Rewrite coach evaluations into a player-facing version that stays honest, firm, and professional. Preserve the same level of detail, roughly the same length, and the same basketball meaning. Do not summarize into generic encouragement and do not sound childish. Keep positive lines close to the original. Rework critical lines into strong developmental language that a player can read directly. For example: 'horrible on defense' should become 'needs to improve defensive effort'; 'selfish and takes really bad shots' should become 'needs to improve shot selection and do a better job creating for teammates'; 'that is the only road I see for him' should become 'that appears to be the clearest path for him.' Prefer line-by-line rephrasing over shortening. Return plain text only.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: input,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI rewrite failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    output_text?: string;
  };

  return data.output_text?.trim() || softenEvaluationFallback(input);
}

export async function generatePlayerViewEvaluation(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  if (!isOpenAIConfigured()) {
    return softenEvaluationFallback(trimmed);
  }

  try {
    return await rewriteWithOpenAI(trimmed);
  } catch {
    return softenEvaluationFallback(trimmed);
  }
}
