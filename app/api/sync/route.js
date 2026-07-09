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
    
    if (api === 'gsc') {
      const resQueries = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          startDate: '2026-06-01',
          endDate: '2026-06-30',
          dimensions: ['query'],
          rowLimit: 10
        })
      });
      
      let prompts = [];
      if (resQueries.ok) {
        const dataQueries = await resQueries.json();
        prompts = (dataQueries.rows || []).map(r => ({
          query: r.keys[0],
          impressions: r.impressions,
          clicks: r.clicks,
          position: r.position
        }));
      } else {
        throw new Error(`GSC queries returned status ${resQueries.status}`);
      }

      const resPages = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          startDate: '2026-06-01',
          endDate: '2026-06-30',
          dimensions: ['page'],
          rowLimit: 6
        })
      });
      
      let pages = [];
      if (resPages.ok) {
        const dataPages = await resPages.json();
        pages = (dataPages.rows || []).map(r => ({
          page: r.keys[0].replace(/^https?:\/\/[^\/]+/, ''),
          impressions: r.impressions,
          clicks: r.clicks,
          position: r.position
        }));
      }

      return NextResponse.json({
        success: true,
        data: { prompts, pages }
      });
    }
    
    if (api === 'bing') {
      // Fetch Prompts (Queries)
      const urlQueries = `https://ssl.bing.com/webmaster/api.svc/json/GetQueryStats?siteUrl=${encodeURIComponent(property)}&apikey=${key}`;
      const resQueries = await fetch(urlQueries);
      if (!resQueries.ok) throw new Error(`Bing queries returned status ${resQueries.status}`);
      const dataQueries = await resQueries.json();
      const listQueries = dataQueries.d || dataQueries || [];
      const prompts = listQueries.map(item => ({
        query: item.Query || item.query || 'Unknown Query',
        impressions: item.Impressions || item.impressions || 0,
        clicks: item.Clicks || item.clicks || 0,
        position: item.AvgPosition || item.position || 0
      }));

      // Fetch Pages (Citations)
      const urlPages = `https://ssl.bing.com/webmaster/api.svc/json/GetPageStats?siteUrl=${encodeURIComponent(property)}&apikey=${key}`;
      const resPages = await fetch(urlPages);
      let pages = [];
      if (resPages.ok) {
        const dataPages = await resPages.json();
        const listPages = dataPages.d || dataPages || [];
        pages = listPages.map(item => ({
          page: (item.Query || item.query || item.url || item.Url || 'Unknown Page').replace(/^https?:\/\/[^\/]+/, ''),
          impressions: item.Impressions || item.impressions || 0,
          clicks: item.Clicks || item.clicks || 0,
          position: item.AvgPosition || item.position || 0
        }));
      }

      return NextResponse.json({
        success: true,
        data: { prompts, pages }
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

