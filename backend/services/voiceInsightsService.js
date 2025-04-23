const db = require('../database/connection');

const getVoiceInsights = async (userId, timeRange) => {
  let days;
  let hours;
  
  if (timeRange === '24h') {
    days = 1;
    hours = 24;
  } else {
    days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    hours = days * 24;
  }
  
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hours);

  try {
    // Get all transcripts within the time range
    const query = `
      SELECT 
        t.id, 
        t.title, 
        t.text, 
        t.duration, 
        t.date as created_at,
        json_group_array(json_object('id', tg.id, 'name', tg.name)) AS tags
      FROM transcripts t
      LEFT JOIN item_tags it ON t.id = it.item_id AND it.item_type = 'transcript'
      LEFT JOIN tags tg ON it.tag_id = tg.id
      WHERE t.user_id = ? AND t.date >= datetime(?)
      GROUP BY t.id
      ORDER BY t.date ASC
    `;

    // Get tag creation data for transcripts
    const tagCreationQuery = `
      SELECT strftime('%Y-%m-%d', it.created_at) as date, COUNT(*) as count
      FROM item_tags it
      JOIN tags t ON it.tag_id = t.id
      WHERE it.item_type = 'transcript'
      AND EXISTS (SELECT 1 FROM transcripts tr WHERE tr.id = it.item_id AND tr.user_id = ?)
      AND it.created_at >= datetime(?)
      GROUP BY strftime('%Y-%m-%d', it.created_at)
      ORDER BY date ASC
    `;

    // Use better-sqlite3 API to get transcripts
    const stmt = db.prepare(query);
    const transcripts = stmt.all(userId, startDate.toISOString());

    // Get tag creation timeline data using better-sqlite3 API
    const tagStmt = db.prepare(tagCreationQuery);
    const tagTimeline = tagStmt.all(userId, startDate.toISOString());

    // Process transcripts
    const timelineMap = new Map();
    const topicsMap = new Map();
    let totalTags = 0;

    transcripts.forEach(transcript => {
      // Parse tags
      const tags = JSON.parse(transcript.tags).filter(tag => tag.id !== null);
      
      // Timeline data
      const date = new Date(transcript.created_at).toISOString().split('T')[0];
      const existing = timelineMap.get(date) || { date, duration: 0, count: 0 };
      existing.duration += transcript.duration || 0;
      existing.count += 1;
      timelineMap.set(date, existing);

      // Topics data
      tags.forEach(tag => {
        totalTags++;
        if (!topicsMap.has(tag.name)) {
          topicsMap.set(tag.name, { name: tag.name, count: 0 });
        }
        topicsMap.get(tag.name).count++;
      });
    });
    
    // Calculate popular topics
    const popularTopics = Array.from(topicsMap.entries())
      .map(([topic, data]) => ({
        topic,
        count: data.count,
        percentage: Math.round((data.count / Math.max(1, totalTags)) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
        
    // Calculate recording patterns
    const patterns = {};
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const activeDays = new Set(transcripts.map(t => new Date(t.created_at).getDay())).size || 1;
    
    transcripts.forEach(transcript => {
      const date = new Date(transcript.created_at);
      const day = daysOfWeek[date.getDay()];
      const hour = date.getHours();
      const slot = Math.floor(hour / 6);

      if (!patterns[day]) {
        patterns[day] = { 
          day, 
          slots: Array(4).fill(0).map((_, i) => ({ hour: i * 6, intensity: 0 }))
        };
      }
      
      patterns[day].slots[slot].intensity = Math.min(3, patterns[day].slots[slot].intensity + 1);
    });

    // Calculate quick stats
    const totalDurationSeconds = transcripts.reduce((sum, t) => sum + (t.duration || 0), 0);
    const totalDurationHours = totalDurationSeconds / (60 * 60);  // Convert seconds to hours
    const weeklyRecordingTime = (totalDurationHours * 7) / activeDays;
    
    const avgRecordingLength = transcripts.length > 0 
      ? (totalDurationSeconds / transcripts.length) / 60  // Convert seconds to minutes
      : 0;

    const transcriptsWithTags = transcripts.filter(t => {
      const tags = JSON.parse(t.tags).filter(tag => tag.id !== null);
      return tags.length > 0;
    }).length;
    const taggedNotesPercentage = Math.round((transcriptsWithTags / Math.max(1, transcripts.length)) * 100);

    return {
      recordingTimeline: Array.from(timelineMap.values()),
      tagsTimeline: tagTimeline.map(item => ({
        date: item.date,
        count: item.count
      })),
      popularTopics,
      recordingPatterns: Object.values(patterns),
      quickStats: {
        weeklyRecordingTime: Number(weeklyRecordingTime.toFixed(1)),
        avgRecordingLength: Number(avgRecordingLength.toFixed(1)),
        taggedNotesPercentage
      }
    };
  } catch (error) {
    console.error('Error getting voice insights:', error);
    throw error;
  }
};

module.exports = {
  getVoiceInsights
};
