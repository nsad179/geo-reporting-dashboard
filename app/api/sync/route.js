import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { api, property, key } = body;
    
    if (api === 'ahrefs') {
      const url = `https://api.ahrefs.com/v3/site-explorer/metrics?target=${encodeURIComponent(property)}&output=json`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${key}` }
      });
      if (!response.ok) {
        throw new Error(`Ahrefs returned status ${response.status}`);
      }
      const data = await response.json();
      return NextResponse.json({
        success: true,
        data: {
          backlinks: data.backlinks || 0,
          domainRating: data.domain_rating || 0
        }
      });
    }
    

    if (api === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: 'Suggest 5 highly actionable GEO (Generative Engine Optimization) recommendations for B2B search visibility in HTML format. Return only 5 <li> blocks containing <h4> and <p>.'
            }
          ]
        })
      });
      if (!response.ok) {
        throw new Error(`OpenAI returned status ${response.status}`);
      }
      const data = await response.json();
      return NextResponse.json({
        success: true,
        html: data.choices[0].message.content
      });
    }
    
    return NextResponse.json({ success: false, error: 'Invalid API' }, { status: 400 });
  } catch (error) {
    console.error("API proxy error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

