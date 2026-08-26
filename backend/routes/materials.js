const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Material = require('../models/Material');

/**
 * Helper to optionally extract uploaderRegNo from Authorization JWT header if available,
 * with fallback to body value for flexible hackathon team integration.
 */
function extractUploaderRegNo(req) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.decode(token);
      if (decoded && (decoded.regNo || decoded.uploaderRegNo || decoded.id || decoded.email)) {
        return decoded.regNo || decoded.uploaderRegNo || decoded.id || decoded.email;
      }
    }
  } catch (err) {
    // Ignore JWT decode errors and fall back to body
  }
  return req.body.uploaderRegNo || 'REG' + Math.floor(100000 + Math.random() * 900000);
}

/**
 * Tokenize search query into clean keywords
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
 * Relevance scoring function for study materials
 * Priority: Exact subject code > Title prefix > Partial tokens > Substrings
 */
function calculateMaterialRelevanceScore(material, rawQuery, tokens) {
  const queryLower = rawQuery.toLowerCase().trim();
  const titleLower = (material.title || '').toLowerCase();
  const subjectCodeLower = (material.subjectCode || '').toLowerCase();

  let score = 0;

  // 1. Exact or prefix subject code match
  if (subjectCodeLower === queryLower) {
    score += 1200;
  } else if (subjectCodeLower.startsWith(queryLower)) {
    score += 600;
  } else if (subjectCodeLower.includes(queryLower)) {
    score += 350;
  }

  // 2. Full title match or prefix match
  if (titleLower === queryLower) {
    score += 800;
  } else if (titleLower.startsWith(queryLower)) {
    score += 400;
  } else if (titleLower.includes(queryLower)) {
    score += 250;
  }

  // 3. Token matching
  const titleWords = titleLower.split(/[\s,._\-+/]+/).filter(Boolean);
  let titleTokensMatched = 0;

  for (const token of tokens) {
    if (subjectCodeLower === token) {
      score += 300;
    } else if (subjectCodeLower.includes(token)) {
      score += 150;
    }

    let matchedInTitle = false;
    for (const word of titleWords) {
      if (word === token) {
        score += 150;
        matchedInTitle = true;
      } else if (word.startsWith(token)) {
        score += 100;
        matchedInTitle = true;
      } else if (word.includes(token)) {
        score += 50;
      }
    }

    if (matchedInTitle) {
      titleTokensMatched++;
    }
  }

  if (titleTokensMatched > 1) {
    score += titleTokensMatched * 40;
  }

  return score;
}

/**
 * @route   POST /api/materials
 * @desc    Upload / Contribute a new study material or notes link
 * @access  Public / Authenticated
 */
router.post('/', async (req, res) => {
  try {
    const { year, subjectCode, title, fileUrl } = req.body;
    const uploaderRegNo = req.body.uploaderRegNo || extractUploaderRegNo(req);

    // Validation
    if (!year || !subjectCode || !title || !fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: year (1-4), subjectCode, title, and fileUrl',
      });
    }

    const numericYear = parseInt(year, 10);
    if (isNaN(numericYear) || numericYear < 1 || numericYear > 4) {
      return res.status(400).json({
        success: false,
        message: 'Year must be a number between 1 and 4',
      });
    }

    const material = await Material.create({
      uploaderRegNo: uploaderRegNo.trim(),
      year: numericYear,
      subjectCode: subjectCode.trim().toUpperCase(),
      title: title.trim(),
      fileUrl: fileUrl.trim(),
      uploadDate: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'Study material contributed successfully',
      material,
    });
  } catch (error) {
    console.error('Error in POST /api/materials:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to contribute material',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/materials/search
 * @desc    Search materials with year filtering, partial matching, and relevance ranking
 * @access  Public
 */
router.get('/search', async (req, res) => {
  try {
    const rawQuery = (req.query.q || '').trim();
    const year = req.query.year ? parseInt(req.query.year, 10) : null;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

    const baseFilter = {};
    if (year && year >= 1 && year <= 4) {
      baseFilter.year = year;
    }

    if (!rawQuery) {
      const materials = await Material.find(baseFilter)
        .sort({ uploadDate: -1 })
        .limit(limit)
        .lean();

      return res.json({
        success: true,
        count: materials.length,
        query: '',
        materials,
      });
    }

    const tokens = tokenizeQuery(rawQuery);
    const escapedQuery = rawQuery.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    const tokenRegexes = tokens.map(
      (token) => new RegExp(token.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i')
    );

    const orConditions = [
      { subjectCode: new RegExp(escapedQuery, 'i') },
      { title: new RegExp(escapedQuery, 'i') },
    ];

    for (const regex of tokenRegexes) {
      orConditions.push({ subjectCode: regex });
      orConditions.push({ title: regex });
    }

    const mongoFilter = {
      ...baseFilter,
      $or: orConditions,
    };

    const candidates = await Material.find(mongoFilter).lean();

    const scoredMaterials = candidates
      .map((material) => {
        const score = calculateMaterialRelevanceScore(material, rawQuery, tokens);
        return { material, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.material);

    return res.json({
      success: true,
      count: scoredMaterials.length,
      query: rawQuery,
      materials: scoredMaterials,
    });
  } catch (error) {
    console.error('Error in /api/materials/search:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search materials',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/materials
 * @desc    Get all study materials with optional year filter
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.year) {
      const yearNum = parseInt(req.query.year, 10);
      if (!isNaN(yearNum) && yearNum >= 1 && yearNum <= 4) {
        filter.year = yearNum;
      }
    }
    if (req.query.subjectCode) {
      filter.subjectCode = req.query.subjectCode.toUpperCase();
    }

    const materials = await Material.find(filter)
      .sort({ uploadDate: -1 })
      .limit(100)
      .lean();

    return res.json({
      success: true,
      count: materials.length,
      materials,
    });
  } catch (error) {
    console.error('Error in /api/materials:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch materials',
      error: error.message,
    });
  }
});

module.exports = router;
