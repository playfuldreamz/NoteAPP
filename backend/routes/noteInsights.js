const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// Helper function to parse timeRange into start date
function getStartDate(timeRange) {
  const now = new Date();
  switch (timeRange) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Default to 7 days
  }
}

// Helper function to run SQLite queries with better-sqlite3
function runQuery(query, params = []) {
  try {
    const stmt = db.prepare(query);
    return stmt.all(...params);
  } catch (error) {
    throw error;
  }
}

// Get note insights
router.get('/', async (req, res) => {
  const userId = req.user.id;
  const timeRange = req.query.timeRange || '7d';
  const startDate = getStartDate(timeRange);

  try {
    // Get notes timeline data
    const timelineQuery = `
      SELECT DATE(timestamp) as date, COUNT(*) as count
      FROM notes
      WHERE user_id = ? AND timestamp >= datetime(?)
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `;
    const timeline = await runQuery(timelineQuery, [userId, startDate.toISOString()]);    // Get tags creation timeline data for notes only
    const tagsTimelineQuery = `
      SELECT DATE(it.created_at) as date, COUNT(*) as count
      FROM item_tags it
      WHERE it.item_type = 'note'
      AND it.item_id IN (
        SELECT id FROM notes WHERE user_id = ?
      )
      AND it.created_at >= datetime(?)
      GROUP BY DATE(it.created_at)
      ORDER BY date ASC
    `;
    const tagsTimeline = await runQuery(tagsTimelineQuery, [userId, startDate.toISOString()]);

    // Get popular tags
    const tagsQuery = `
      SELECT t.name as tag, 
             COUNT(*) as count,
             (COUNT(*) * 100.0 / (
               SELECT COUNT(*) 
               FROM item_tags it2 
               JOIN notes n2 ON it2.item_id = n2.id 
               WHERE n2.user_id = ? AND n2.timestamp >= datetime(?)
               AND it2.item_type = 'note'
             )) as percentage
      FROM tags t
      JOIN item_tags it ON t.id = it.tag_id
      JOIN notes n ON it.item_id = n.id
      WHERE n.user_id = ? AND n.timestamp >= datetime(?)
      AND it.item_type = 'note'
      GROUP BY t.id, t.name
      ORDER BY count DESC
      LIMIT 10
    `;
    const tags = await runQuery(tagsQuery, [userId, startDate.toISOString(), userId, startDate.toISOString()]);

    // Get writing patterns
    const patternsQuery = `
      WITH RECURSIVE hours(hour) AS (
        SELECT 0
        UNION ALL
        SELECT hour + 1 FROM hours WHERE hour < 23
      ),
      days(day) AS (
        SELECT 'Sunday' UNION ALL SELECT 'Monday' UNION ALL SELECT 'Tuesday' 
        UNION ALL SELECT 'Wednesday' UNION ALL SELECT 'Thursday' 
        UNION ALL SELECT 'Friday' UNION ALL SELECT 'Saturday'
      ),
      day_hour_grid AS (
        SELECT day, hour FROM days CROSS JOIN hours
      ),
      note_patterns AS (
        SELECT 
          strftime('%w', timestamp) as day_num,
          CASE strftime('%w', timestamp)
            WHEN '0' THEN 'Sunday'
            WHEN '1' THEN 'Monday'
            WHEN '2' THEN 'Tuesday'
            WHEN '3' THEN 'Wednesday'
            WHEN '4' THEN 'Thursday'
            WHEN '5' THEN 'Friday'
            WHEN '6' THEN 'Saturday'
          END as day,
          CAST(strftime('%H', timestamp) AS INTEGER) as hour,
          COUNT(*) as intensity
        FROM notes
        WHERE user_id = ? AND timestamp >= datetime(?)
        GROUP BY day, hour
        HAVING intensity > 0
      ),
      active_slots AS (
        SELECT 
          day,
          json_group_array(
            json_object(
              'hour', hour,
              'intensity', intensity
            )
          ) as slots
        FROM note_patterns
        GROUP BY day
      )
      SELECT 
        day,
        slots
      FROM active_slots
      ORDER BY 
        CASE day
          WHEN 'Sunday' THEN 0
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
        END
    `;
    const patterns = await runQuery(patternsQuery, [userId, startDate.toISOString()]);

    // Parse the JSON strings in the patterns result
    const formattedPatterns = patterns.map(p => ({
      day: p.day,
      slots: JSON.parse(p.slots)
    }));

    // Get quick stats
    const statsQuery = `
      WITH note_stats AS (
        SELECT 
          COUNT(*) as total_notes,
          AVG(LENGTH(COALESCE(content, '')) - LENGTH(REPLACE(COALESCE(content, ''), ' ', '')) + 1) as avg_words,
          (SELECT COUNT(*) FROM (
            SELECT DISTINCT n2.id
            FROM notes n2
            JOIN item_tags it ON n2.id = it.item_id
            WHERE n2.user_id = ? AND n2.timestamp >= datetime(?)
            AND it.item_type = 'note'
          )) * 100.0 / NULLIF(COUNT(*), 0) as tagged_percentage,
          0 as edit_frequency
        FROM notes n
        WHERE user_id = ? AND timestamp >= datetime(?)
      )
      SELECT 
        total_notes,
        ROUND(COALESCE(avg_words, 0), 2) as avg_words_per_note,
        ROUND(COALESCE(tagged_percentage, 0), 2) as tagged_notes_percentage,
        ROUND(COALESCE(edit_frequency, 0), 2) as edit_frequency
      FROM note_stats
    `;
    const [stats] = await runQuery(statsQuery, [userId, startDate.toISOString(), userId, startDate.toISOString()]);

    res.json({
      timeRange,
      notesTimeline: timeline,
      tagsTimeline: tagsTimeline,
      popularTags: tags,
      writingPatterns: formattedPatterns,
      quickStats: stats || {
        total_notes: 0,
        avg_words_per_note: 0,
        tagged_notes_percentage: 0,
        edit_frequency: 0
      }
    });
  } catch (error) {
    console.error('Error fetching note insights:', error);
    res.status(500).json({ error: 'Failed to fetch note insights' });
  }
});

module.exports = router;
