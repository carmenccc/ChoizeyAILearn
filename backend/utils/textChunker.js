/**
 * Split text into chunks for better AI processing.
 * @param {string} text - Full text to be chunked.
 * @param {number} chunkSize - Target size per chunk (in word)
 * @param {number} overlap - Number of words to overlap between chunks
 * @returns {Array<{content: string, chunkIndex: number, pageNumber: number}>} - Array of text chunks.
 */

export const chunkText = (text, chunkSize = 500, overlap = 50) => {
    if (!text || text.trim().length === 0) {
        return [];
    }

    // Clean text while preserving paragraph structure
    const cleanedText = text
        .replace(/\r\n/g, '\n') // Normalize line breaks
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .replace(/\n /g, '\n') // Remove space after newlines
        .replace(/ \n/g, '\n') // Remove space before newlines
        .trim();
    
    // Try to split by paragraphs (single or double new lines)
    const paragraphs = cleanedText.split(/\n+/).filter(p => p.trim().length > 0);

    const chunks = [];
    let currentChunk = [];
    let currentWordCount = 0;
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
        const paragraphWords = paragraph.trim().split(/\s+/);
        const paragraphWordCount = paragraphWords.length;

        // If single paragraph exceeds chunk size, split it by words
        if (paragraphWordCount > chunkSize) {
            if (currentChunk.length > 0) {
                chunks.push({
                    content: currentChunk.join('\n\n'),
                    chunkIndex: chunkIndex++,
                    pageNumber: 0
                });
                currentChunk = [];
                currentWordCount = 0;
            }

            // Split large paragraph into word-based chunks
            for (let i = 0; i < paragraphWords.length; i += (chunkSize - overlap)) {
                const chunkWords = paragraphWords.slice(i, i + chunkSize);
                chunks.push({
                    content: chunkWords.join(' '),
                    chunkIndex: chunkIndex++,
                    pageNumber: 0
                });

                if (i + chunkSize >= paragraphWords.length) break; // No more words left to process
            }
            continue; // Move to next paragraph
        }

        // If adding this paragraph exceeds chunk size, save current chunk
        if (currentWordCount + paragraphWordCount > chunkSize && currentChunk.length > 0) {
            chunks.push({
                content: currentChunk.join('\n\n'),
                chunkIndex: chunkIndex++,
                pageNumber: 0
            });

            // Create overlap for previous Chunk
            const prevChunkText = currentChunk.join(' ');
            const prevWords = prevChunkText.split(/\s+/);
            const overlapText = prevWords.slice(-Math.min(overlap, prevWords.length)).join(' ');

            currentChunk = [overlapText, paragraph.trim()];
            currentWordCount = overlapText.split(/\s+/).length + paragraphWordCount;
        } else {
            // Add paragraph to current chunk
            currentChunk.push(paragraph.trim());
            currentWordCount += paragraphWordCount;
        }
    }

    // Add the last chunk
    if (currentChunk.length > 0) {
        chunks.push({
            content: currentChunk.join('\n\n'),
            chunkIndex: chunkIndex,
            pageNumber: 0
        });
    }

    // Fallback: if no chunks created, split by words
    if (chunks.length === 0 && cleanedText.length > 0) {
        const allWords = cleanedText.split(/\s+/);
        for (let i = 0; i < allWords.length; i += (chunkSize - overlap)) {
            const chunkWords = allWords.slice(i, i + chunkSize);
            chunks.push({
                content: chunkWords.join(' '),
                chunkIndex: chunkIndex++,
                pageNumber: 0
            });

            if (i + chunkSize >= allWords.length) break; // No more words left to process
        }
    }

    return chunks;
};

/**
 * Find relevant chunks based on a keyword matching
 * @param {Array<Object>} chunks - Array of text chunks
 * @param {string} query - Search query
 * @param {number} maxChunks - Maximum chunks to return
 * @return {Array<Object>} - Array of relevant chunks
 */
export const findRelevantChunks = (chunks, query, maxChunks = 3) => {
    if (!chunks || chunks.length === 0 || !query || query.trim().length === 0) {
        return [];
    }

    // Common stop words to exclude
    const stopWords = new Set([
        "the", "is", "in", "at", "which", "on", "and", "a", "an", "to", "of", "for",
        "with", "that", "this", "it", "as", "by", "from", "or", "but", "be", "are",
        "was", "were", "has", "have", "had", "not", "can", "will", "would", "should",
        "do", "does", "did"
    ]);

    // Extract and clean query words
    const queryWords = query
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word));
    
    if (queryWords.length === 0) {
        // Return clean chunk objects without Mongoose metadata if no valid query words
        return chunks.slice(0, maxChunks).map(chunk => ({
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            pagenumber: chunk.pageNumber,
            _id: chunk._id
        }));
    }

    const scoredChunks = chunks.map((chunk, index) => {
        const content = chunk.content.toLowerCase();
        const contentWords = content.split(/\s+/).length;
        let score = 0;

        // Score each query word
        for (const word of queryWords) {
            // Exact word match (higher score)
            const exactMatches = (content.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
            score += exactMatches * 3;

            // Partial match (lower score)
            const partialMatches = (content.match(new RegExp(word, 'g')) || []).length;
            score += Math.max(0, partialMatches - exactMatches) * 1.5;
        }

        // Bonus: Multiple query words found
        const uniqueWordsFound = queryWords.filter(word =>
            content.includes(word)
        ).length;
        if (uniqueWordsFound > 1) {
            score += uniqueWordsFound * 2;
        }

        // Normalize score by content length to avoid bias towards longer chunks
        const normalizedScore = score / Math.sqrt(contentWords);

        // Small bonus for earlier chunks (assuming they might be more relevant)
        const positionBonus = 1 - (index / chunks.length) * 0.1;

        // Return clean object without Mongoose metadata
        return {
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            pageNumber: chunk.pageNumber,
            _id: chunk._id,
            score: normalizedScore * positionBonus,
            rawScore: score, // For debugging purposes
            matchWords: uniqueWordsFound // For debugging purposes
        };
    });

    return scoredChunks
        .filter(chunk => chunk.score > 0) // Only keep chunks with a positive score
        .sort((a, b) => {
            if (b.score !== a.score){
                return b.score - a.score;
            }
            if (b.matchedWords !== a.matchedWords){
                return b.matcedhWords - a.matchedWords;
            }
            return a.chunkIndex - b.chunkIndex;
        })
        .slice(0, maxChunks);
};