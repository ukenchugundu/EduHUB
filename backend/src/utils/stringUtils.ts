// Levenshtein distance calculation for plagiarism detection
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator, // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

// Normalize code for comparison
export function normalizeCode(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "") // Remove block comments
    .replace(/\/\/.*$/gm, "") // Remove line comments
    .replace(/#.*$/gm, "") // Remove Python comments
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/[{}();,]/g, "") // Remove common syntax
    .toLowerCase()
    .trim();
}

// Calculate similarity percentage
export function calculateSimilarity(code1: string, code2: string): number {
  const norm1 = normalizeCode(code1);
  const norm2 = normalizeCode(code2);

  if (norm1.length === 0 || norm2.length === 0) return 0;

  const distance = levenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);

  return 1 - distance / maxLength;
}

// Find common subsequences
export function findCommonSubsequences(
  str1: string,
  str2: string,
  minLength: number = 10,
): string[] {
  const common: string[] = [];

  for (let i = 0; i <= str1.length - minLength; i++) {
    for (let len = minLength; len <= str1.length - i; len++) {
      const substring = str1.substr(i, len);
      if (str2.includes(substring)) {
        common.push(substring);
      }
    }
  }

  return [...new Set(common)].sort((a, b) => b.length - a.length);
}

// Tokenize code for advanced comparison
export function tokenizeCode(code: string): string[] {
  return code
    .replace(/[^\w\s]/g, " ") // Replace non-alphanumeric with spaces
    .split(/\s+/)
    .filter((token) => token.length > 2) // Filter short tokens
    .map((token) => token.toLowerCase());
}

// Jaccard similarity for token-based comparison
export function jaccardSimilarity(
  tokens1: string[],
  tokens2: string[],
): number {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}
