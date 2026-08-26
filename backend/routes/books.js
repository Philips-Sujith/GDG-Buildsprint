const express = require('express');
const router = express.Router();
const Book = require('../models/Book');

/**
 * ARCHITECTURAL TRADEOFF & SEARCH STRATEGY:
 * We implement a hybrid search architecture combining MongoDB candidate retrieval with
 * a weighted tokenized JavaScript relevance scoring algorithm.
 * 
 * TRADE-OFF ANALYSIS:
 * 1. MongoDB $text index: Fast for whole words, but fails on partial/substring queries 
 *    (e.g., "eng physics" fails to match "Engineering Physics").
 * 2. Pure MongoDB $regex: Supports substring matches, but lacks domain-specific weighted 
 *    relevance ranking (e.g., prioritizing exact subject code > title > author > category).
 * 3. Our Hybrid Engine:
 *    - Uses an optimized multi-field $or regex query to fetch candidate books from MongoDB.
 *    - Tokenizes the query and evaluates each candidate against custom relevance tiers.
 *    - Delivers superior search precision (exact subject code > title prefix > partial tokens > author/category),
 *      resilient partial matching, and blazing fast performance for hackathon scale.
 */

/**
 * Tokenize and sanitize search queries into clean alphanumeric keywords
 */
function tokenizeQuery(rawQuery) {
  if (!rawQuery || typeof rawQuery !== 'string') return [];
  return rawQuery
    .toLowerCase()
    .trim()
    .split(/[\s,._\-+/]+/)
    .filter((token) => token.length > 0);
}

/**
 * Calculates a relevance score for a book based on the query tokens and full query string.
 * Higher score = higher relevance ranking.
 */
function calculateRelevanceScore(book, rawQuery, tokens) {
  const queryLower = rawQuery.toLowerCase().trim();
  const titleLower = (book.title || '').toLowerCase();
  const authorLower = (book.author || '').toLowerCase();
  const subjectCodeLower = (book.subjectCode || '').toLowerCase();
  const categoryLower = (book.category || '').toLowerCase();
  const shelfLocationLower = (book.shelfLocation || '').toLowerCase();

  let score = 0;

  // 1. SUBJECT CODE MATCHING (Highest priority - Weight: 1000+)
  if (subjectCodeLower === queryLower) {
    score += 1500; // Exact subject code match (e.g. query "CS23302" === "CS23302")
  } else if (subjectCodeLower.startsWith(queryLower)) {
    score += 800; // Prefix subject code match (e.g. query "CS233" -> "CS23302")
  } else if (subjectCodeLower.includes(queryLower)) {
    score += 500; // Substring subject code match (e.g. query "23302" -> "CS23302")
  }

  // 2. TITLE MATCHING (High priority - Weight: 300 - 800)
  if (titleLower === queryLower) {
    score += 900; // Exact full title match
  } else if (titleLower.startsWith(queryLower)) {
    score += 450; // Title begins with exact query
  } else if (titleLower.includes(queryLower)) {
    score += 300; // Title contains full phrase
  }

  // 3. TOKENIZED WORD & PARTIAL MATCHING (Handles queries like "eng physics" -> "Engineering Physics")
  let titleTokensMatched = 0;
  let allTokensMatched = true;

  const titleWords = titleLower.split(/[\s,._\-+/]+/).filter(Boolean);

  for (const token of tokens) {
    let tokenMatched = false;

    // Check if token matches subject code
    if (subjectCodeLower === token) {
      score += 400;
      tokenMatched = true;
    } else if (subjectCodeLower.includes(token)) {
      score += 200;
      tokenMatched = true;
    }

    // Check title words for exact word match or prefix match (e.g., "eng" matching "Engineering")
    let matchedInTitle = false;
    for (const word of titleWords) {
      if (word === token) {
        score += 180; // Exact word match in title
        matchedInTitle = true;
      } else if (word.startsWith(token)) {
        score += 130; // Prefix match in title word (e.g. "eng" -> "engineering")
        matchedInTitle = true;
      } else if (word.includes(token)) {
        score += 70; // Substring match inside title word
        matchedInTitle = true;
      }
    }

    if (matchedInTitle) {
      titleTokensMatched++;
      tokenMatched = true;
    }

    // Check Author
    if (authorLower === token) {
      score += 100;
      tokenMatched = true;
    } else if (authorLower.includes(token)) {
      score += 60;
      tokenMatched = true;
    }

    // Check Category
    if (categoryLower === token) {
      score += 70;
      tokenMatched = true;
    } else if (categoryLower.includes(token)) {
      score += 35;
      tokenMatched = true;
    }

    // Check Shelf Location (e.g. "A-1")
    if (shelfLocationLower === token || shelfLocationLower.includes(token)) {
      score += 40;
      tokenMatched = true;
    }

    if (!tokenMatched) {
      allTokensMatched = false;
    }
  }

  // Bonus if all query tokens were matched in the book record
  if (tokens.length > 1 && allTokensMatched) {
    score += 250;
  }

  // Bonus for matching multiple tokens in the title
  if (titleTokensMatched > 1) {
    score += titleTokensMatched * 50;
  }

  // Subtle boost for available books so in-stock items are prioritized on ties
  if (book.availableQuantity > 0) {
    score += 1;
  }

  return score;
}

/**
 * Transforms a Mongoose Book document into the required clean response structure.
 */
function formatBookResponse(book, score = undefined) {
  const formatted = {
    bookId: book._id,
    _id: book._id,
    title: book.title,
    author: book.author,
    subjectCode: book.subjectCode,
    category: book.category,
    totalQuantity: book.totalQuantity,
    availableQuantity: book.availableQuantity,
    shelfLocation: book.shelfLocation,
  };

  if (score !== undefined) {
    formatted._score = score;
  }

  return formatted;
}

/**
 * @route   GET /api/books/search
 * @desc    Search books with partial matching, subject code matching, and weighted relevance ranking
 * @access  Public
 */
router.get('/search', async (req, res) => {
  try {
    const rawQuery = (req.query.q || '').trim();
    const category = (req.query.category || '').trim();
    const inStockOnly = req.query.inStock === 'true';
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

    // If query is empty, return latest/featured books
    if (!rawQuery) {
      const filter = {};
      if (category && category !== 'All') {
        filter.category = new RegExp(`^${category}$`, 'i');
      }
      if (inStockOnly) {
        filter.availableQuantity = { $gt: 0 };
      }

      const books = await Book.find(filter).limit(limit).lean();
      return res.json({
        success: true,
        count: books.length,
        query: '',
        books: books.map((b) => formatBookResponse(b)),
      });
    }

    const tokens = tokenizeQuery(rawQuery);
    const escapedQuery = rawQuery.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    // Build MongoDB regex candidate retrieval conditions
    const tokenRegexes = tokens.map(
      (token) => new RegExp(token.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i')
    );

    const orConditions = [
      { subjectCode: new RegExp(escapedQuery, 'i') },
      { title: new RegExp(escapedQuery, 'i') },
      { author: new RegExp(escapedQuery, 'i') },
      { category: new RegExp(escapedQuery, 'i') },
      { shelfLocation: new RegExp(escapedQuery, 'i') },
    ];

    // Include individual token matches so "eng physics" finds candidates matching "eng" OR "physics"
    for (const regex of tokenRegexes) {
      orConditions.push({ title: regex });
      orConditions.push({ subjectCode: regex });
      orConditions.push({ author: regex });
      orConditions.push({ category: regex });
    }

    const mongoFilter = { $or: orConditions };

    if (category && category !== 'All') {
      mongoFilter.category = new RegExp(`^${category}$`, 'i');
    }
    if (inStockOnly) {
      mongoFilter.availableQuantity = { $gt: 0 };
    }

    // Fetch candidate books from MongoDB
    const candidateBooks = await Book.find(mongoFilter).lean();

    // Score and rank candidates using the relevance scoring algorithm
    const scoredBooks = candidateBooks
      .map((book) => {
        const score = calculateRelevanceScore(book, rawQuery, tokens);
        return { book, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => formatBookResponse(item.book, item.score));

    return res.json({
      success: true,
      count: scoredBooks.length,
      query: rawQuery,
      books: scoredBooks,
    });
  } catch (error) {
    console.error('Error in /api/books/search:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search books',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/books
 * @desc    Get all books with optional pagination and category filtering
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const category = req.query.category;
    const inStockOnly = req.query.inStock === 'true';

    const filter = {};
    if (category && category !== 'All') {
      filter.category = new RegExp(`^${category}$`, 'i');
    }
    if (inStockOnly) {
      filter.availableQuantity = { $gt: 0 };
    }

    const total = await Book.countDocuments(filter);
    const books = await Book.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      count: books.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      books: books.map((b) => formatBookResponse(b)),
    });
  } catch (error) {
    console.error('Error in /api/books:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch books',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/books/:id
 * @desc    Get single book by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).lean();
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found',
      });
    }

    return res.json({
      success: true,
      book: formatBookResponse(book),
    });
  } catch (error) {
    console.error('Error in /api/books/:id:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch book',
      error: error.message,
    });
  }
});

module.exports = router;
