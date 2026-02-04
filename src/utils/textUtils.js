// Helper to strip "junk" from music titles (parens, feats, etc)
export const simplifyTarget = (str) => {
    if (!str) return '';
    let s = str.toLowerCase();
    
    // Remove content in brackets/parens often containing "Radio Edit", "Remix", "Live"
    s = s.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '');
    
    // Remove "feat." sections if they are usually at the end or separated
    // Matches "feat. X", "ft. X"
    // Matches "feat. X", "ft. X" - Use word boundaries to avoid matching inside words like "Daft"
    s = s.replace(/\b(feat|ft|featuring)\.?\s.*/g, '');

    return normalizeString(s);
};

export const normalizeString = (str) => {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9\s]/g, '') // Remove special chars
        .replace(/\s+/g, ' ') // Collapse spaces
        .trim();
};

export const removeStopWords = (str) => {
    // Extended stop words for music
    const stopWords = [
        'the', 'le', 'la', 'les', 'un', 'une', 'des', 
        'and', 'et', 'feat', 'ft', 'featuring', 'vs', 'with', 'y', 'en', 'de', 'du'
    ];
    const words = normalizeString(str).split(' ');
    // Keep words if removing everything leaves nothing
    const filtered = words.filter(w => !stopWords.includes(w));
    return filtered.length > 0 ? filtered.join(' ') : words.join(' ');
};

const levenshtein = (a, b) => {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

export const checkGuess = (input, target) => {
    if (!input || !target) return 'none';

    // 1. Heavy Cleanup on Target (Ignore "Radio Edit", "Feat X")
    const simpleTarget = simplifyTarget(target);
    // Standard cleanup on input
    const cleanInput = removeStopWords(input);
    const cleanTarget = removeStopWords(simpleTarget);
    
    // If target becomes empty (rare, maybe title was just "The"?), fallback to raw normalized
    const workingTarget = cleanTarget.length > 0 ? cleanTarget : normalizeString(target);

    // 2. Exact Match Check
    if (cleanInput === workingTarget) return 'exact';
    
    // 3. Input Includes Target (e.g. Input: "Daft Punk Get Lucky", Target: "Daft Punk")
    // Use word boundary check or simple includes?
    // "Daft Punk" in "Daft Punk Get Lucky" -> YES
    // "One" in "One More Time" -> YES (Risk: "One" is common... need length check)
    // Constraint: Target must be robust enough (exclude short words if we do this?)
    // User wants "Daft Punk" found in "Daft Punk Get Lucky".
    
    if (cleanInput.includes(workingTarget)) {
        // Only allow if target is significant enough
        if (workingTarget.length >= 3) return 'exact';
    }

    // 4. Target Includes Input (Partial Match hint)
    // e.g. Input "Lucky", Target "Get Lucky" -> "Presque"
    if (workingTarget.includes(cleanInput) && cleanInput.length >= 4) {
        return 'close';
    }

    // 5. Typos (Levenshtein) - Standard
    const dist = levenshtein(cleanInput, workingTarget);
    // Allow error proportional to length
    const threshold = Math.floor(workingTarget.length * 0.25) + 1; 
    
    if (dist <= threshold) return 'exact';

    // 6. Sliding Window Levenshtein (For "Same as it was" vs "As It Was")
    // If input is longer than target, check if a *substring* of input matches target with fuzzy logic
    const inputWords = cleanInput.split(' ');
    const targetWords = workingTarget.split(' ');
    
    if (inputWords.length > targetWords.length) {
        // Construct windows of same word count
        const windowSize = targetWords.length;
        
        for (let i = 0; i <= inputWords.length - windowSize; i++) {
            const windowPhrase = inputWords.slice(i, i + windowSize).join(' ');
             const windowDist = levenshtein(windowPhrase, workingTarget);
             // Use same threshold
             if (windowDist <= threshold) return 'exact';
        }
    }

    // 7. Jumbled Word Check (Order Independent)
    // "Feeling i gotta" matches "I Gotta Feeling"
    // Condition: All words in Target (longer than 1 char) must be found in Input (fuzzy)
    // OR significant percentage of target words found.
    
    // Filter out very short words from target for this check to avoid false positives on "a", "i"
    // actually "I" is in "I Gotta Feeling", but let's trust "removeStopWords" kept significant ones.
    // If removeStopWords kept 'i', it's there.
    
    let matchedWordsCount = 0;
    const significantTargetWords = targetWords.filter(w => w.length >= 2); // strictly > 1 char
    
    // If target is only short words (e.g. "To U"), treat differently? 
    // Usually simple targets are caught by exact match. This is for composite.
    
    if (significantTargetWords.length >= 2) {
        for (const tWord of significantTargetWords) {
            // Check if tWord exists in inputWords (fuzzy)
            const found = inputWords.some(iWord => {
                if (iWord === tWord) return true;
                const d = levenshtein(iWord, tWord);
                // stricter threshold for single words
                return d <= 1; // Allow max 1 char typo for individual words
            });
            if (found) matchedWordsCount++;
        }

        // If all significant words are found
        if (matchedWordsCount === significantTargetWords.length) {
            return 'exact';
        }
        
        // Partial check: if > 66% words found
        if (matchedWordsCount / significantTargetWords.length > 0.66) {
             return 'close';
        }
    }

    return 'none';
};

// --- New Progressive Matching Logic ---

export const tokenize = (str) => {
    // 1. Simplify (remove parens etc)
    const simple = simplifyTarget(str);
    // 2. Remove Stop Words (The, Le, La...) to avoid requiring them
    const clean = removeStopWords(simple);
    
    return clean.split(' ').filter(w => w.length > 0);
};

export const checkProgress = (input, targetTokens) => {
    // Returns indices of targetTokens that are found in input
    if (!input || !targetTokens || targetTokens.length === 0) return [];

    const inputWords = normalizeString(input).split(' ').filter(w => w.length > 0);
    const foundIndices = [];

    targetTokens.forEach((tWord, index) => {
        // Skip already found? No, this function just checks CURRENT input.
        // Logic: specific word match.
        
        // Stop words handling:
        // If tWord is a stopword (e.g. "the"), effectively it's "free" or "ignored"?
        // If we want "The Weeknd", finding "Weeknd" is enough.
        // So we should strictly track *significant* tokens matching.
        // But if my tokenizer keeps "the", I must find "the".
        // Better strategy: Tokenize should REMOVE stop words.
        
        const isFound = inputWords.some(iWord => {
            if (iWord === tWord) return true;
            // Fuzzy check
            // Only allow typos on longer words
            if (tWord.length >= 3) {
                 const d = levenshtein(iWord, tWord);
                 // allow 1 char error per 4 chars
                 return d <= Math.floor(tWord.length / 4) + 1 && d <= 2; 
            }
            return false;
        });

        if (isFound) {
            foundIndices.push(index);
        }
    });

    return foundIndices;
};
