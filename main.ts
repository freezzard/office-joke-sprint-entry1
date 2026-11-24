/**
 * One-Line Office Joke: 24-Hour Sprint
 *
 * Entry program for u-pucuys-one-line-office-joke-24-hour-sprint-aaf86162.
 *
 * The program holds one original one-line office joke, checks it against the
 * bounty gate (UTF-8 text, 1 to 200 characters, a single line, not only white
 * space), and writes it to /output/entry.txt. The run is fully deterministic:
 * the same literal line is normalised, validated, and written on every run,
 * so two runs produce byte-identical output.
 *
 * The summary printed on stdout names the byte count, the sha256 of the file,
 * the character and word counts, the office details found, and how many of
 * the validation rules passed. The joke text itself is only ever written to
 * the output file, never printed to stdout.
 *
 * Run with: node main.ts
 * Output: /output/entry.txt (JOKE_OUTPUT_PATH overrides the path for local runs)
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const JOKE_OUTPUT_PATH = process.env.JOKE_OUTPUT_PATH ?? "/output/entry.txt";
const MAX_ENTRY_CHARS = 200;
const MIN_ENTRY_CHARS = 1;
const MIN_OFFICE_TERM_HITS = 2;
const MIN_CLOSING_WORDS = 4;
const MIN_WORDS = 8;
const MAX_WORDS = 40;

const JOKE_LINE =
  'The office fridge says "label your food", yet the yoghurt from 2019 in there has now outlasted three managers.';

const OFFICE_TERMS: string[] = [
  "office",
  "fridge",
  "manager",
  "meeting",
  "email",
  "calendar",
  "printer",
  "standup",
  "slack",
  "deadline",
  "spreadsheet",
  "sync",
  "inbox",
  "cubicle",
  "timesheet",
  "review",
  "lunch",
  "kitchen",
  "badge",
  "commute",
];

interface LineFinding {
  ruleId: string;
  passed: boolean;
  note: string;
}

interface EntryReport {
  text: string;
  chars: number;
  words: number;
  officeHits: string[];
  findings: LineFinding[];
}

interface RuleEntry {
  ruleId: string;
  label: string;
  test: (text: string) => boolean;
}

function countChars(text: string): number {
  const charList = [...text];
  const charCount = charList.length;
  return charCount;
}

function splitWords(text: string): string[] {
  const wordList = text.split(" ").filter((wordEntry) => wordEntry.length > 0);
  return wordList;
}

function countWords(text: string): number {
  const wordList = splitWords(text);
  const wordCount = wordList.length;
  return wordCount;
}

function collapseWhitespace(text: string): string {
  const collapsedText = text.replace(/\s+/g, " ").trim();
  return collapsedText;
}

function hasNonBlankText(text: string): boolean {
  const trimmedLength = text.trim().length;
  const nonBlank = trimmedLength > 0;
  return nonBlank;
}

function hasSingleLine(text: string): boolean {
  const newlineAbsent = text.includes("\n") === false;
  const carriageAbsent = text.includes("\r") === false;
  const singleLine = newlineAbsent && carriageAbsent;
  return singleLine;
}

function hasTerminalPunctuation(text: string): boolean {
  const closingMark = text.slice(-1);
  const terminalMarks = [".", "!", "?"];
  const terminalFound = terminalMarks.includes(closingMark);
  return terminalFound;
}

function hasBalancedDoubleQuotes(text: string): boolean {
  const quoteMarks = [...text].filter((markEntry) => markEntry === '"');
  const quoteCount = quoteMarks.length;
  const balancedQuotes = quoteCount % 2 === 0;
  return balancedQuotes;
}

function hasNoDoubleSpace(text: string): boolean {
  const doubleSpaceAbsent = text.includes("  ") === false;
  return doubleSpaceAbsent;
}

function officeTermHits(lowerText: string): string[] {
  const foundTerms: string[] = [];
  for (let termIndex = 0; termIndex < OFFICE_TERMS.length; termIndex += 1) {
    const termProbe = OFFICE_TERMS[termIndex];
    if (lowerText.includes(termProbe)) {
      foundTerms.push(termProbe);
    }
  }
  return foundTerms;
}

function hasEnoughOfficeTerms(text: string): boolean {
  const lowerText = text.toLowerCase();
  const hits = officeTermHits(lowerText);
  const enoughHits = hits.length >= MIN_OFFICE_TERM_HITS;
  return enoughHits;
}

function hasWordBand(text: string): boolean {
  const wordCount = countWords(text);
  const insideBand = wordCount >= MIN_WORDS && wordCount <= MAX_WORDS;
  return insideBand;
}

function hasSetupAndPayoff(text: string): boolean {
  const segments = text.split(",");
  if (segments.length < 2) {
    return false;
  }
  const closingSegment = segments[segments.length - 1] ?? "";
  const closingWords = countWords(closingSegment);
  const payoffPresent = closingWords >= MIN_CLOSING_WORDS;
  return payoffPresent;
}

function hasNoAdjacentRepeat(text: string): boolean {
  const words = splitWords(text);
  for (let wordIndex = 1; wordIndex < words.length; wordIndex += 1) {
    const earlierWord = words[wordIndex - 1].toLowerCase();
    const laterWord = words[wordIndex].toLowerCase();
    if (earlierWord === laterWord) {
      return false;
    }
  }
  const repeatAbsent = true;
  return repeatAbsent;
}

function hasNoControlChars(text: string): boolean {
  const charList = [...text];
  for (let charIndex = 0; charIndex < charList.length; charIndex += 1) {
    const codePoint = charList[charIndex].codePointAt(0) ?? 0;
    const tabAllowed = charList[charIndex] === "\t";
    if (codePoint < 32 && tabAllowed === false) {
      return false;
    }
  }
  const controlAbsent = true;
  return controlAbsent;
}

const RULE_TABLE: RuleEntry[] = [
  {
    ruleId: "non-blank",
    label: "more than white space alone",
    test: (text: string): boolean => hasNonBlankText(text),
  },
  {
    ruleId: "min-length",
    label: "at least 1 character",
    test: (text: string): boolean => countChars(text) >= MIN_ENTRY_CHARS,
  },
  {
    ruleId: "max-length",
    label: "at most 200 characters",
    test: (text: string): boolean => countChars(text) <= MAX_ENTRY_CHARS,
  },
  {
    ruleId: "single-line",
    label: "exactly one line, no line breaks",
    test: (text: string): boolean => hasSingleLine(text),
  },
  {
    ruleId: "terminal-punctuation",
    label: "ends with terminal punctuation",
    test: (text: string): boolean => hasTerminalPunctuation(text),
  },
  {
    ruleId: "balanced-quotes",
    label: "double quotes are balanced",
    test: (text: string): boolean => hasBalancedDoubleQuotes(text),
  },
  {
    ruleId: "no-double-space",
    label: "no doubled spaces inside the line",
    test: (text: string): boolean => hasNoDoubleSpace(text),
  },
  {
    ruleId: "office-terms",
    label: "names at least two office details",
    test: (text: string): boolean => hasEnoughOfficeTerms(text),
  },
  {
    ruleId: "word-band",
    label: "between 8 and 40 words, tight for one line",
    test: (text: string): boolean => hasWordBand(text),
  },
  {
    ruleId: "setup-and-payoff",
    label: "setup clause followed by a payoff clause",
    test: (text: string): boolean => hasSetupAndPayoff(text),
  },
  {
    ruleId: "no-adjacent-repeat",
    label: "no word repeated straight after itself",
    test: (text: string): boolean => hasNoAdjacentRepeat(text),
  },
  {
    ruleId: "no-control-chars",
    label: "no control characters in the text",
    test: (text: string): boolean => hasNoControlChars(text),
  },
];

function buildReport(text: string): EntryReport {
  const findings: LineFinding[] = RULE_TABLE.map((ruleEntry) => {
    const passedFlag = ruleEntry.test(text);
    const findingEntry: LineFinding = {
      ruleId: ruleEntry.ruleId,
      passed: passedFlag,
      note: ruleEntry.label,
    };
    return findingEntry;
  });
  const report: EntryReport = {
    text,
    chars: countChars(text),
    words: countWords(text),
    officeHits: officeTermHits(text.toLowerCase()),
    findings,
  };
  return report;
}

function countPassedRules(report: EntryReport): number {
  const passedFindings = report.findings.filter(
    (findingEntry) => findingEntry.passed === true,
  );
  const passedCount = passedFindings.length;
  return passedCount;
}

function validateReport(report: EntryReport): void {
  const failedFindings: LineFinding[] = report.findings.filter(
    (findingEntry) => findingEntry.passed === false,
  );
  if (failedFindings.length === 0) {
    return;
  }
  const failureNotes = failedFindings.map(
    (findingEntry) => `${findingEntry.ruleId}: ${findingEntry.note}`,
  );
  const joinedNotes = failureNotes.join("; ");
  throw new Error(`entry validation failed: ${joinedNotes}`);
}

function writeEntryFile(text: string): { bytes: number; sha256: string } {
  const entryDir = dirname(JOKE_OUTPUT_PATH);
  try { mkdirSync(entryDir, { recursive: true }); writeFileSync(JOKE_OUTPUT_PATH, text, "utf8"); } catch (writeFailure) {
    throw new Error(`cannot write entry file: ${String(writeFailure)}`);
  }
  const writtenBytes = readFileSync(JOKE_OUTPUT_PATH);
  const writtenText = writtenBytes.toString("utf8");
  if (writtenText !== text) {
    throw new Error("entry file round-trip mismatch");
  }
  const digest = createHash("sha256").update(writtenBytes).digest("hex");
  const result = { bytes: writtenBytes.length, sha256: digest };
  return result;
}

function main(): void {
  const normalizedLine = collapseWhitespace(JOKE_LINE);
  const report = buildReport(normalizedLine);
  validateReport(report);
  const written = writeEntryFile(normalizedLine);
  const passedRules = countPassedRules(report);
  const totalRules = report.findings.length;
  const summaryLine = `entry written: ${written.bytes} bytes sha256 ${written.sha256} chars ${report.chars} words ${report.words} office terms ${report.officeHits.join(",")} rules ${passedRules}/${totalRules}`;
  console.log(summaryLine);
}

try { main(); } catch (caughtFailure) { console.error(`entry failed: ${String(caughtFailure)}`); process.exit(1); }
