const { Client } = require('live-football-api');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const client = new Client('sk_live_1e6a6e1c6a0d3c2b8f5a9d4e7c3b2a1f0e');

    // Today's date
    const today = new Date().toISOString().split('T')[0];

    const result = await client.matches(today, 'en');

    return res.status(200).json({
      success: true,
      data: result.data.matches || result.data || [],
      count: result.data.matches? result.data.matches.length : 0,
      date: today,
      source: 'live-football-api'
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
}
