const { Client } = require('live-football-api');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };
  try {
    const client = new Client(process.env.LIVE_FOOTBALL_API_KEY);
    const result = await client.matchesToday('m');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result.data.matches || result.data || [],
        date: new Date().toISOString().split('T')[0]
      })
    };
  } catch (e) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: false, error: e.message, data: [] })
    };
  }
};
