const { Client } = require('live-football-api');

exports.handler = async () => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };
  try {
    const client = new Client(process.env.LIVE_FOOTBALL_API_KEY);

    // Get today's date as YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    const result = await client.matches(today, 'en');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result.data.matches || result.data || [],
        date: today,
        raw: result
      })
    };
  } catch (e) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: e.message,
        data: []
      })
    };
  }
};
