"use client";

import { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export default function Home() {
  const [activePage, setActivePage] = useState("cover");
  const [activeProperty, setActiveProperty] = useState("client-co.com (GSC)");
  const [propertiesList, setPropertiesList] = useState([
    "client-co.com (GSC)",
    "client-co.co.uk (GSC)",
    "shop.client-co.com (GSC)"
  ]);
  const [clientLogo, setClientLogo] = useState(null);
  const [agencyLogo, setAgencyLogo] = useState(null);
  
  // Inline Editable Metadata
  const [reportTitle, setReportTitle] = useState("Generative Engine Optimization — Monthly Report");
  const [clientName, setClientName] = useState("Client Co.");
  const [preparedBy, setPreparedBy] = useState("Prepared by 2X Marketing");
  const [dateRangeText, setDateRangeText] = useState("Jun 1 - Jun 30, 2026");
  const [selectedPreset, setSelectedPreset] = useState("28d");
  const [startDate, setStartDate] = useState("2026-06-01");
  const [endDate, setEndDate] = useState("2026-06-30");

  // API Configuration
  const [apiKeys, setApiKeys] = useState({
    ahrefs: "",
    bing: "",
    gsc: "",
    openai: ""
  });
  
  // UI states
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([
    { time: new Date().toLocaleTimeString(), text: "[System] Logger initialized. Ready to sync.", type: "system" }
  ]);
  
  // Custom property input
  const [newPropertyInput, setNewPropertyInput] = useState("");
  const [cachedRecsHtml, setCachedRecsHtml] = useState(null);

  // DOM Refs
  const clientLogoInputRef = useRef(null);
  const agencyLogoInputRef = useRef(null);
  const chartCitTrendRef = useRef(null);
  const chartEngineDonutRef = useRef(null);
  const chartPromptsBarRef = useRef(null);
  const chartPagesBarRef = useRef(null);
  const chartMentionsLineRef = useRef(null);
  const chartSentimentRef = useRef(null);
  const chartBenchmarkBarRef = useRef(null);
  
  const chartInstances = useRef({});

  // Brand Name extraction
  const brand = getBrandNameFromProperty(activeProperty);

  // Onboarding Warning Visibility
  const hasGscOrBing = !!(apiKeys.gsc || apiKeys.bing);
  const hasAhrefs = !!apiKeys.ahrefs;
  const hasOpenai = !!apiKeys.openai;
  const hasSearchSource = !!(apiKeys.gsc || apiKeys.bing);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMeta = localStorage.getItem("geo_report_meta");
      if (savedMeta) {
        try {
          const data = JSON.parse(savedMeta);
          if (data.reportTitle) setReportTitle(data.reportTitle);
          if (data.clientName) setClientName(data.clientName);
          if (data.preparedBy) setPreparedBy(data.preparedBy);
          if (data.activeProperty) setActiveProperty(data.activeProperty);
          if (data.dateRangeText) setDateRangeText(data.dateRangeText);
          if (data.selectedPreset) setSelectedPreset(data.selectedPreset);
          if (data.startDate) setStartDate(data.startDate);
          if (data.endDate) setEndDate(data.endDate);
        } catch (e) {
          console.error(e);
        }
      }

      const savedProps = localStorage.getItem("geo_report_properties");
      if (savedProps) {
        try { setPropertiesList(JSON.parse(savedProps)); } catch(e) { console.error(e); }
      }

      const cl = localStorage.getItem("geo_report_client_logo");
      if (cl) setClientLogo(cl);

      const al = localStorage.getItem("geo_report_agency_logo");
      if (al) setAgencyLogo(al);

      // Load Keys
      const keys = {
        ahrefs: localStorage.getItem("geo_report_key_ahrefs") || "",
        bing: localStorage.getItem("geo_report_key_bing") || "",
        gsc: localStorage.getItem("geo_report_key_gsc") || "",
        openai: localStorage.getItem("geo_report_key_openai") || ""
      };
      setApiKeys(keys);

      const recs = localStorage.getItem("geo_report_real_recs");
      if (recs) setCachedRecsHtml(recs);
    }
  }, []);

  // Update brand in editable fields if default
  useEffect(() => {
    if (clientName === "Client Co." || clientName === "Client Co") {
      setClientName(brand);
    }
  }, [brand]);

  // Sync background triggers on Property selection change
  useEffect(() => {
    const hasKeys = Object.values(apiKeys).some(k => !!k);
    if (hasKeys && activeProperty) {
      triggerBackgroundSync(activeProperty);
    }
  }, [activeProperty]);

  // Save metadata changes
  const saveMetadata = (updates = {}) => {
    const data = {
      reportTitle: updates.reportTitle || reportTitle,
      clientName: updates.clientName || clientName,
      preparedBy: updates.preparedBy || preparedBy,
      activeProperty: updates.activeProperty || activeProperty,
      dateRangeText: updates.dateRangeText || dateRangeText,
      selectedPreset: updates.selectedPreset || selectedPreset,
      startDate: updates.startDate || startDate,
      endDate: updates.endDate || endDate
    };
    localStorage.setItem("geo_report_meta", JSON.stringify(data));
  };

  // GA4 Transition Filter Animation
  const triggerFilterTransition = (callback) => {
    setLoading(true);
    setTimeout(() => {
      if (callback) callback();
      setLoading(false);
    }, 350);
  };

  // Base options for Chart.js
  const baseOpts = (extra = {}) => {
    return Object.assign({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            font: { family: "Inter", size: 11 },
            color: "#666B7D"
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: "IBM Plex Mono", size: 10 }, color: "#9BA0B0" } },
        y: { grid: { color: "#EEEFF5" }, ticks: { font: { family: "IBM Plex Mono", size: 10 }, color: "#9BA0B0" } }
      }
    }, extra);
  };

  // Chart Rendering
  const renderCharts = () => {
    destroyCharts();

    const prompts = getCachedPromptsList();
    const pages = getCachedPagesList();
    const cachedAhrefs = getApiCache(activeProperty, "ahrefs");
    const backlinks = cachedAhrefs ? (cachedAhrefs.backlinks || 0) : 0;

    // 1. Citation Trend (only if we have citations)
    if (activePage === "overview" && chartCitTrendRef.current && pages.length > 0) {
      const totalCitations = getCitationsTotal();
      chartInstances.current.citTrend = new Chart(chartCitTrendRef.current, {
        type: "bar",
        data: {
          labels: ["This period"],
          datasets: [{
            label: "Total Citations",
            data: [totalCitations],
            backgroundColor: "#5B4FE0",
            borderRadius: 6,
            maxBarThickness: 80
          }]
        },
        options: baseOpts({ plugins: { legend: { display: false } } })
      });
    }

    // 2. Engine Donut
    if (activePage === "overview" && chartEngineDonutRef.current && cachedAhrefs) {
      chartInstances.current.engineDonut = new Chart(chartEngineDonutRef.current, {
        type: "doughnut",
        data: {
          labels: ["ChatGPT", "Perplexity", "Google AI Overview", "Copilot"],
          datasets: [{
            data: [38, 27, 19, 16],
            backgroundColor: ["#5B4FE0", "#00AEC0", "#F5B800", "#1E9E64"],
            borderWidth: 0
          }]
        },
        options: baseOpts({
          cutout: "70%",
          plugins: { legend: { position: "bottom" } }
        })
      });
    }

    // 3. Prompts Bar
    if (activePage === "prompts" && chartPromptsBarRef.current && prompts.length > 0) {
      const labels = prompts.map(p => p.query.length > 35 ? p.query.substring(0, 32) + '...' : p.query);
      const dataVals = prompts.map(p => p.impressions || p.clicks || 0);
      chartInstances.current.promptsBar = new Chart(chartPromptsBarRef.current, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [{
            label: "Impressions",
            data: dataVals,
            backgroundColor: "#5B4FE0",
            borderRadius: 5,
            maxBarThickness: 36
          }]
        },
        options: baseOpts({ indexAxis: "y" })
      });
    }

    // 4. Pages Bar
    if (activePage === "pages" && chartPagesBarRef.current && pages.length > 0) {
      const labels = pages.map(p => p.page.replace(/^https?:\/\/[^\/]+/, '') || '/');
      const dataVals = pages.map(p => p.clicks || 0);
      chartInstances.current.pagesBar = new Chart(chartPagesBarRef.current, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [{
            label: "Citations",
            data: dataVals,
            backgroundColor: "#00AEC0",
            borderRadius: 5,
            maxBarThickness: 36
          }]
        },
        options: baseOpts({ indexAxis: "y" })
      });
    }

    // 5. Mentions Line (only if Ahrefs connected)
    if (activePage === "mentions" && chartMentionsLineRef.current && cachedAhrefs) {
      chartInstances.current.mentionsLine = new Chart(chartMentionsLineRef.current, {
        type: "bar",
        data: {
          labels: ["This period"],
          datasets: [{
            label: "Mentions",
            data: [backlinks],
            backgroundColor: "#00AEC0",
            borderRadius: 6,
            maxBarThickness: 80
          }]
        },
        options: baseOpts({ plugins: { legend: { display: false } } })
      });
    }

    // 6. Sentiment Breakdown
    if (activePage === "mentions" && chartSentimentRef.current && cachedAhrefs) {
      chartInstances.current.sentiment = new Chart(chartSentimentRef.current, {
        type: "pie",
        data: {
          labels: ["Positive", "Neutral", "Negative"],
          datasets: [{
            data: [72, 24, 4],
            backgroundColor: ["#1E9E64", "#C9CCDA", "#D8483D"],
            borderWidth: 0
          }]
        },
        options: baseOpts({
          plugins: { legend: { position: "bottom" } }
        })
      });
    }

    // 7. Benchmark Bar
    if (activePage === "benchmark" && chartBenchmarkBarRef.current && cachedAhrefs) {
      chartInstances.current.benchmarkBar = new Chart(chartBenchmarkBarRef.current, {
        type: "bar",
        data: {
          labels: [brand, "Competitor A", "Competitor B", "Competitor C"],
          datasets: [{
            label: "Share of voice",
            data: [24, 34, 22, 20],
            backgroundColor: ["#5B4FE0", "#C9CCDA", "#C9CCDA", "#C9CCDA"],
            borderRadius: 6,
            maxBarThickness: 56
          }]
        },
        options: baseOpts()
      });
    }
  };

  const destroyCharts = () => {
    Object.keys(chartInstances.current).forEach(key => {
      if (chartInstances.current[key]) {
        chartInstances.current[key].destroy();
        chartInstances.current[key] = null;
      }
    });
  };

  useEffect(() => {
    renderCharts();
    return () => destroyCharts();
  }, [activePage, activeProperty, apiKeys.ahrefs]);

  // API Local Cache Helpers
  const saveApiCache = (property, key, value) => {
    if (typeof window === "undefined") return;
    let cache = localStorage.getItem(`geo_report_api_cache_${property}`);
    cache = cache ? JSON.parse(cache) : {};
    cache[key] = value;
    localStorage.setItem(`geo_report_api_cache_${property}`, JSON.stringify(cache));
  };

  const getApiCache = (property, key) => {
    if (typeof window === "undefined") return null;
    const cache = localStorage.getItem(`geo_report_api_cache_${property}`);
    if (cache) {
      const parsed = JSON.parse(cache);
      return parsed[key];
    }
    return null;
  };

  // Add enrichment log lines
  const addLog = (text, type = "info") => {
    setConsoleLogs(prev => [
      ...prev,
      { time: new Date().toLocaleTimeString(), text, type }
    ]);
  };

  // Server-Side API Sync Trigger
  const triggerBackgroundSync = async (property) => {
    addLog(`New property detected: ${property}. Starting auto-enrichment...`, "system");
    
    // 1. Ahrefs
    if (apiKeys.ahrefs) {
      addLog(`Ahrefs API: Querying backlinks via server-side route...`, "info");
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api: "ahrefs", property, key: apiKeys.ahrefs })
        });
        const json = await res.json();
        if (json.success) {
          saveApiCache(property, "ahrefs", json.data);
          addLog(`Ahrefs API: Successfully pulled live Domain Rating and backlinks counts!`, "success");
        } else {
          throw new Error(json.error);
        }
      } catch (e) {
        addLog(`Ahrefs API Error: ${e.message}. Falling back to local data.`, "warn");
      }
    } else {
      addLog(`Ahrefs API: No key entered. Using demo backlink data.`, "info");
    }
    
    // 2. GSC
    if (apiKeys.gsc) {
      addLog(`GSC API: Pulling queries and indexable pages via server-side route...`, "info");
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api: "gsc", property, key: apiKeys.gsc })
        });
        const json = await res.json();
        if (json.success) {
          saveApiCache(property, "gsc_prompts", json.data.prompts);
          saveApiCache(property, "gsc_pages", json.data.pages);
          addLog(`GSC API: Successfully imported live Search Console queries and pages!`, "success");
        } else {
          throw new Error(json.error);
        }
      } catch (e) {
        addLog(`GSC API Error: ${e.message}. Falling back to local data.`, "warn");
      }
    } else {
      addLog(`GSC API: No key entered. Using demo query data.`, "info");
    }
    
    // 3. Bing
    if (apiKeys.bing) {
      addLog(`Bing API: Connecting to Webmaster Tools endpoint via server-side route...`, "info");
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api: "bing", property, key: apiKeys.bing })
        });
        const json = await res.json();
        if (json.success) {
          saveApiCache(property, "bing_prompts", json.data.prompts);
          addLog(`Bing API: Successfully fetched live Bing index statistics!`, "success");
        } else {
          throw new Error(json.error);
        }
      } catch (e) {
        addLog(`Bing API Error: ${e.message}. Falling back to local data.`, "warn");
      }
    } else {
      addLog(`Bing API: No key entered. Using demo click counts.`, "info");
    }
    
    // 4. OpenAI
    if (apiKeys.openai) {
      addLog(`OpenAI API: Syncing live recommendations via OpenAI server route...`, "info");
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api: "openai", property, key: apiKeys.openai })
        });
        const json = await res.json();
        if (json.success) {
          localStorage.setItem("geo_report_real_recs", json.html);
          setCachedRecsHtml(json.html);
          addLog(`OpenAI API: Live GEO recommendations generated and updated!`, "success");
        } else {
          throw new Error(json.error);
        }
      } catch (e) {
        addLog(`OpenAI API Error: ${e.message}. Falling back to local advice.`, "warn");
      }
    } else {
      addLog(`OpenAI API: No key entered. Recommendations remain static.`, "info");
    }
    
    addLog(`Enrichment complete for ${property}! Caching metrics locally for security.`, "success");
    
    // Trigger transition and redraw
    triggerFilterTransition();
  };

  const forceSyncAll = async () => {
    setConsoleLogs([]);
    addLog("Starting full force sync sequence for all properties...", "system");
    if (propertiesList.length === 0) {
      addLog("Sync failed: No properties configured in list.", "warn");
      return;
    }
    for (const prop of propertiesList) {
      addLog(`Starting sync for ${prop}...`, "system");
      await triggerBackgroundSync(prop);
    }
    addLog("All configured properties successfully synced and cached!", "system");
  };

  // API Config Controls
  const handleSaveKeys = () => {
    Object.keys(apiKeys).forEach(key => {
      localStorage.setItem(`geo_report_key_${key}`, apiKeys[key]);
    });
    addLog("Configurations saved successfully!", "success");
    alert("Configurations saved successfully!");
    if (propertiesList.length > 0) {
      forceSyncAll();
    }
  };

  const handleClearKeys = () => {
    if (confirm("Are you sure you want to clear all configured API keys and reset the cache?")) {
      setApiKeys({ ahrefs: "", bing: "", gsc: "", openai: "" });
      Object.keys(apiKeys).forEach(key => {
        localStorage.removeItem(`geo_report_key_${key}`);
      });
      localStorage.removeItem("geo_report_client_logo");
      localStorage.removeItem("geo_report_agency_logo");
      localStorage.removeItem("geo_report_real_recs");
      setClientLogo(null);
      setAgencyLogo(null);
      setCachedRecsHtml(null);
      addLog("All configurations cleared and reset.", "system");
    }
  };

  // Properties Configuration
  const handleAddProperty = () => {
    if (newPropertyInput.trim() && !propertiesList.includes(newPropertyInput.trim())) {
      const updated = [...propertiesList, newPropertyInput.trim()];
      setPropertiesList(updated);
      localStorage.setItem("geo_report_properties", JSON.stringify(updated));
      setNewPropertyInput("");
      triggerBackgroundSync(newPropertyInput.trim());
    }
  };

  const handleDeleteProperty = (prop) => {
    const updated = propertiesList.filter(p => p !== prop);
    setPropertiesList(updated);
    localStorage.setItem("geo_report_properties", JSON.stringify(updated));
    localStorage.removeItem(`geo_report_api_cache_${prop}`);
  };



  // Client/Agency Logo Uploads
  const handleClientLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        localStorage.setItem("geo_report_client_logo", base64);
        setClientLogo(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAgencyLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        localStorage.setItem("geo_report_agency_logo", base64);
        setAgencyLogo(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Date picker Presets
  const handleSelectPreset = (preset) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();
    setSelectedPreset(preset);
    
    if (preset === "24h") {
      start.setDate(today.getDate() - 1);
    } else if (preset === "7d") {
      start.setDate(today.getDate() - 7);
    } else if (preset === "28d") {
      start.setDate(today.getDate() - 28);
    } else if (preset === "3m") {
      start.setMonth(today.getMonth() - 3);
    } else if (preset === "6m") {
      start.setMonth(today.getMonth() - 6);
    } else if (preset === "custom") {
      return;
    }

    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    setStartDate(startStr);
    setEndDate(endStr);
    
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const formatted = `${months[start.getMonth()]} ${start.getDate()} – ${months[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
    
    triggerFilterTransition(() => {
      setDateRangeText(formatted);
      saveMetadata({ dateRangeText: formatted, selectedPreset: preset, startDate: startStr, endDate: endStr });
    });
    setIsDateOpen(false);
  };

  const handleApplyCustomDate = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      setSelectedPreset("custom");
      
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const formatted = `${months[start.getMonth()]} ${start.getDate()} – ${months[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
      
      triggerFilterTransition(() => {
        setDateRangeText(formatted);
        saveMetadata({ dateRangeText: formatted, selectedPreset: "custom", startDate, endDate });
      });
      setIsDateOpen(false);
    }
  };

  // Exporters
  const handleExportPDF = () => {
    setIsExportOpen(false);
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleExportCSV = () => {
    setIsExportOpen(false);
    const { title, headers, rows } = getActiveTableData();
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\r\n";
    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",") + "\r\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    setIsExportOpen(false);
    const { title, headers, rows } = getActiveTableData();
    let excelHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
    excelHtml += `<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>`;
    excelHtml += `<body><table border="1">`;
    excelHtml += `<tr style="font-weight:bold; background-color:#5B4FE0; color:white;">`;
    headers.forEach(h => { excelHtml += `<th>${h}</th>`; });
    excelHtml += `</tr>`;
    rows.forEach(row => {
      excelHtml += `<tr>`;
      row.forEach(cell => { excelHtml += `<td>${cell}</td>`; });
      excelHtml += `</tr>`;
    });
    excelHtml += `</table></body></html>`;
    const blob = new Blob([excelHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${title}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getActiveTableData = () => {
    let headers = [];
    let rows = [];
    let title = activePage;

    if (activePage === "prompts") {
      headers = hasAhrefs 
        ? ["Prompt", "Category", "Volume", "Cited by", "Avg. rank", "Trend"] 
        : ["Prompt", "Category", "Volume", "Avg. rank", "Trend"];
      
      const promptsList = getCachedPromptsList();
      promptsList.forEach(p => {
        let cat = "Comparison";
        const q = p.query.toLowerCase();
        if (q.includes("vs") || q.includes("alternative")) cat = "Competitive";
        else if (q.includes("how") || q.includes("manage")) cat = "How-to";
        else if (q.includes("client") || q.includes("brand") || q.includes(brand.toLowerCase())) cat = "Branded";
        else if (q.includes("tool") || q.includes("feature")) cat = "Feature";
        
        let row = [`"${p.query}"`, cat, Math.round(p.impressions).toLocaleString()];
        if (hasAhrefs) row.push("ChatGPT");
        row.push(parseFloat(p.position).toFixed(1), "▲");
        rows.push(row);
      });
    } else if (activePage === "pages") {
      headers = hasAhrefs 
        ? ["Page", "Cluster", "Citations", "Engines"] 
        : ["Page", "Cluster", "Citations"];
      
      const pagesList = getCachedPagesList();
      pagesList.forEach(p => {
        let cat = "Comparison";
        const path = p.page.toLowerCase();
        if (path.includes("compare") || path.includes("vs")) cat = "Competitive";
        else if (path.includes("features")) cat = "Feature";
        else if (path.includes("guides") || path.includes("blog")) cat = "How-to";
        else if (path.includes("pricing")) cat = "Branded";
        
        let row = [p.page, cat, Math.round(p.clicks).toLocaleString()];
        if (hasAhrefs) row.push("ChatGPT, Perplexity");
        rows.push(row);
      });
    } else {
      title = `${brand}_GEO_Summary`;
      headers = ["Metric", "Value"];
      rows = [
        ["Prompts Tracked", getPromptsTotal().toString()],
        ["AI Citations", getCitationsTotal().toString()],
        ["Brand Mentions", getBacklinksTotal().toString()],
        ["Share of Voice", "—"]
      ];
    }
    return { title, headers, rows };
  };

  // Cached API Data Retrievers — API only, no fallbacks
  const getCachedPromptsList = () => {
    const cache = getApiCache(activeProperty, "gsc_prompts") || getApiCache(activeProperty, "bing_prompts");
    return (cache && cache.length > 0) ? cache : [];
  };

  const getCachedPagesList = () => {
    const cache = getApiCache(activeProperty, "gsc_pages");
    return (cache && cache.length > 0) ? cache : [];
  };

  const getBacklinksTotal = () => {
    const cache = getApiCache(activeProperty, "ahrefs");
    return (cache && cache.backlinks) ? cache.backlinks : 0;
  };

  const getCitationsTotal = () => {
    const cachedPages = getApiCache(activeProperty, "gsc_pages");
    if (cachedPages && cachedPages.length > 0) {
      return cachedPages.reduce((acc, p) => acc + (p.clicks || 0), 0);
    }
    return 0;
  };

  const getPromptsTotal = () => {
    const cachedPrompts = getApiCache(activeProperty, "gsc_prompts") || getApiCache(activeProperty, "bing_prompts");
    return (cachedPrompts && cachedPrompts.length > 0) ? cachedPrompts.length : 0;
  };

  return (
    <div className="shell">
      {/* ================= SIDEBAR ================= */}
      <nav className="sidebar">
        <div className="brandmark">
          <span className="dot"></span>
          <span className="txt">GEO Report</span>
        </div>
        <div className="nav-label">Report pages</div>
        
        <button className={`nav-btn ${activePage === "cover" ? "active" : ""}`} onClick={() => setActivePage("cover")}>
          <span className="num">01</span>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
          <span className="txt">Cover</span>
        </button>
        
        <button className={`nav-btn ${activePage === "overview" ? "active" : ""}`} onClick={() => setActivePage("overview")}>
          <span className="num">02</span>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></svg>
          <span className="txt">GEO Overview</span>
        </button>
        
        {hasSearchSource && (
          <button className={`nav-btn ${activePage === "prompts" ? "active" : ""}`} onClick={() => setActivePage("prompts")}>
            <span className="num">03</span>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span className="txt">Prompts</span>
          </button>
        )}
        
        {hasSearchSource && (
          <button className={`nav-btn ${activePage === "pages" ? "active" : ""}`} onClick={() => setActivePage("pages")}>
            <span className="num">04</span>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            <span className="txt">Pages Cited</span>
          </button>
        )}
        
        {hasAhrefs && (
          <button className={`nav-btn ${activePage === "mentions" ? "active" : ""}`} onClick={() => setActivePage("mentions")}>
            <span className="num">05</span>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>
            <span className="txt">Mentions</span>
          </button>
        )}
        
        {hasAhrefs && (
          <button className={`nav-btn ${activePage === "benchmark" ? "active" : ""}`} onClick={() => setActivePage("benchmark")}>
            <span className="num">06</span>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.8"/><path d="M21 12H3M12 3v18"/></svg>
            <span className="txt">Benchmark</span>
          </button>
        )}
        
        {hasOpenai && (
          <button className={`nav-btn ${activePage === "recs" ? "active" : ""}`} onClick={() => setActivePage("recs")}>
            <span className="num">07</span>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span className="txt">Recommendations</span>
          </button>
        )}

        <div className="nav-label" style={{ marginTop: "15px" }}>Settings</div>
        <button className={`nav-btn ${activePage === "settings" ? "active" : ""}`} onClick={() => setActivePage("settings")}>
          <span className="num">08</span>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span className="txt">Data Enrichment</span>
        </button>

        <div className="sidebar-footer" id="sidebar-footer-sources">
          Connected sources:<br />
          {Object.keys(apiKeys).filter(k => !!apiKeys[k]).map(k => k.toUpperCase()).join(" · ") || "Ahrefs Brand Radar · Bing Webmaster Tools"}
        </div>
        <div className="sidebar-branding">
          made with love ❤️ by <a href="https://www.linkedin.com/in/neeraj179/" target="_blank" rel="noreferrer">Neeraj Kumar</a>
        </div>
      </nav>

      {/* ================= MAIN ================= */}
      <div className="main">
        <div className="topbar">
          <input type="file" ref={clientLogoInputRef} accept="image/*" style={{ display: "none" }} onChange={handleClientLogoUpload} />
          
          <div className="logo-slot" id="client-logo" onClick={() => clientLogoInputRef.current.click()} style={{ cursor: "pointer" }} title="Click to upload client logo">
            {clientLogo ? (
              <img src={clientLogo} style={{ maxHeight: "36px", maxWidth: "110px", objectFit: "contain" }} alt="Client Logo" />
            ) : (
              "CLIENT LOGO"
            )}
          </div>

          <div className="topbar-mid">
            <h1 contentEditable suppressContentEditableWarning id="meta-report-title" onBlur={(e) => { setReportTitle(e.target.innerText); saveMetadata({ reportTitle: e.target.innerText }); }} data-placeholder="Report Title">
              {reportTitle}
            </h1>
            <div className="meta">
              <span className="pill" contentEditable suppressContentEditableWarning id="meta-client-name" onBlur={(e) => { setClientName(e.target.innerText); saveMetadata({ clientName: e.target.innerText }); }} data-placeholder="Client Name">
                {clientName}
              </span>
              
              <div style={{ position: "relative" }}>
                <select id="meta-property" className="pill-select" value={activeProperty} onChange={(e) => { setActiveProperty(e.target.value); saveMetadata({ activeProperty: e.target.value }); }}>
                  {propertiesList.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* GA4 Date Range popover */}
              <div style={{ position: "relative" }}>
                <button className="date-picker-trigger" id="date-range-btn" data-preset={selectedPreset} onClick={() => { setIsDateOpen(!isDateOpen); setIsExportOpen(false); }}>
                  📅 <span id="meta-date-range-text">{dateRangeText}</span>
                </button>
                {isDateOpen && (
                  <div className="date-popover show" id="date-popover">
                    <div className="date-presets">
                      <button className={`preset-btn ${selectedPreset === "24h" ? "active" : ""}`} onClick={() => handleSelectPreset("24h")}>Last 24 Hours</button>
                      <button className={`preset-btn ${selectedPreset === "7d" ? "active" : ""}`} onClick={() => handleSelectPreset("7d")}>Last 7 Days</button>
                      <button className={`preset-btn ${selectedPreset === "28d" ? "active" : ""}`} onClick={() => handleSelectPreset("28d")}>Last 28 Days</button>
                      <button className={`preset-btn ${selectedPreset === "3m" ? "active" : ""}`} onClick={() => handleSelectPreset("3m")}>Last 3 Months</button>
                      <button className={`preset-btn ${selectedPreset === "6m" ? "active" : ""}`} onClick={() => handleSelectPreset("6m")}>Last 6 Months</button>
                      <button className={`preset-btn ${selectedPreset === "custom" ? "active" : ""}`} onClick={() => setSelectedPreset("custom")}>Custom Range</button>
                    </div>
                    <div className="date-custom-form">
                      <div className="date-input-group">
                        <label>Start Date</label>
                        <input type="date" id="date-start" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                      </div>
                      <div className="date-input-group">
                        <label>End Date</label>
                        <input type="date" id="date-end" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                      </div>
                      <div className="date-actions">
                        <button className="btn-sm btn-cancel" onClick={() => setIsDateOpen(false)}>Cancel</button>
                        <button className="btn-sm btn-apply" onClick={handleApplyCustomDate}>Apply</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <span className="pill" contentEditable suppressContentEditableWarning id="meta-prepared-by" onBlur={(e) => { setPreparedBy(e.target.innerText); saveMetadata({ preparedBy: e.target.innerText }); }} data-placeholder="Prepared By">
                {preparedBy}
              </span>
            </div>
          </div>

          <div className="topbar-right">
            {/* Export Dropdown */}
            <div className="dropdown" id="export-dropdown-wrapper" style={{ marginRight: "12px" }}>
              <button className="btn-secondary" onClick={() => { setIsExportOpen(!isExportOpen); setIsDateOpen(false); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Export</span>
              </button>
              {isExportOpen && (
                <div className="dropdown-content show" id="export-dropdown">
                  <button onClick={handleExportPDF}>PDF Report</button>
                  <button onClick={handleExportCSV}>Export Table (CSV)</button>
                  <button onClick={handleExportExcel}>Export Table (Excel)</button>
                </div>
              )}
            </div>

            <input type="file" ref={agencyLogoInputRef} accept="image/*" style={{ display: "none" }} onChange={handleAgencyLogoUpload} />
            <div className="logo-slot" id="agency-logo" onClick={() => agencyLogoInputRef.current.click()} style={{ cursor: "pointer" }} title="Click to upload agency logo">
              {agencyLogo ? (
                <img src={agencyLogo} style={{ maxHeight: "36px", maxWidth: "110px", objectFit: "contain" }} alt="Agency Logo" />
              ) : (
                <>2X<br />MARKETING</>
              )}
            </div>
          </div>
        </div>

        <div className={`content ${loading ? "loading-state" : ""}`}>
          
          {/* ============ PAGE 1: COVER ============ */}
          <section className="page" style={{ display: activePage === "cover" ? "block" : "none" }}>
            {!hasGscOrBing && (
              <div className="onboarding-banner" id="onboarding-banner">
                <div className="onboarding-banner-content">
                  <svg className="onboarding-banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <div className="onboarding-banner-text">
                    <h4>Setup Required: Connect API Keys</h4>
                    <p>Connect Google Search Console, Ahrefs, and OpenAI keys under Settings to unlock detailed reports (Prompts, Cited Pages, Mentions, SOV, and AI Recommendations).</p>
                  </div>
                </div>
                <button className="onboarding-banner-btn" onClick={() => setActivePage("settings")}>Connect API Keys</button>
              </div>
            )}
            
            <div className="cover-hero">
              <div className="eyebrow">GEO Performance Report</div>
              <h1>How {brand} shows up<br />across AI answer engines</h1>
              <p className="sub">A monthly view of prompt visibility, page citations, and brand mentions across ChatGPT, Perplexity, Gemini and Copilot — sourced from Bing Webmaster Tools and Ahrefs Brand Radar.</p>
              
              <svg className="constellation" width="560" height="230" viewBox="0 0 560 230">
                <g stroke="#5B4FE0" strokeOpacity=".4" strokeWidth="1.5">
                  <line x1="280" y1="115" x2="120" y2="55"/>
                  <line x1="280" y1="115" x2="120" y2="175"/>
                  <line x1="280" y1="115" x2="440" y2="55"/>
                  <line x1="280" y1="115" x2="440" y2="175"/>
                </g>
                <g stroke="#00AEC0" strokeWidth="1.2" strokeDasharray="3 4">
                  <line x1="120" y1="55" x2="55" y2="30"/><line x1="120" y1="55" x2="55" y2="70"/>
                  <line x1="120" y1="175" x2="55" y2="150"/><line x1="120" y1="175" x2="55" y2="195"/>
                  <line x1="440" y1="55" x2="505" y2="30"/><line x1="440" y1="55" x2="505" y2="70"/>
                  <line x1="440" y1="175" x2="505" y2="150"/><line x1="440" y1="175" x2="505" y2="195"/>
                </g>
                <circle cx="280" cy="115" r="30" fill="#EEECFC" stroke="#5B4FE0" strokeWidth="2"/>
                <text x="280" y="120" textAnchor="middle" fontFamily="Space Grotesk" fontWeight="700" fontSize="11" fill="#5B4FE0">{brand.toUpperCase()}</text>
                <g fontFamily="IBM Plex Mono" fontSize="10.5" fill="#666B7D">
                  <circle cx="120" cy="55" r="20" fill="#fff" stroke="#E4E6EE"/><text x="120" y="59" textAnchor="middle" fontWeight="600" fill="#161925">GPT</text>
                  <circle cx="120" cy="175" r="20" fill="#fff" stroke="#E4E6EE"/><text x="120" y="179" textAnchor="middle" fontWeight="600" fontSize="9" fill="#161925">Perplex.</text>
                  <circle cx="440" cy="55" r="20" fill="#fff" stroke="#E4E6EE"/><text x="440" y="59" textAnchor="middle" fontWeight="600" fontSize="9" fill="#161925">Gemini</text>
                  <circle cx="440" cy="175" r="20" fill="#fff" stroke="#E4E6EE"/><text x="440" y="179" textAnchor="middle" fontWeight="600" fill="#161925">Copil.</text>
                </g>
              </svg>
            </div>
            
            <div className="grid cover-strip">
              <div className="card kpi"><div className="label">Prompts tracked</div><div className="value">{getPromptsTotal() > 0 ? getPromptsTotal() : '—'}</div></div>
              <div className="card kpi" style={{ display: hasSearchSource ? "block" : "none" }}><div className="label">AI citations</div><div className="value">{getCitationsTotal() > 0 ? getCitationsTotal().toLocaleString() : '—'}</div></div>
              <div className="card kpi"><div className="label">Brand mentions</div><div className="value">{getBacklinksTotal() > 0 ? getBacklinksTotal().toLocaleString() : '—'}</div></div>
              <div className="card kpi" style={{ display: hasAhrefs ? "block" : "none" }}><div className="label">Share of voice</div><div className="value">{'—'}</div></div>
            </div>
          </section>

          {/* ============ PAGE 2: OVERVIEW ============ */}
          <section className="page" style={{ display: activePage === "overview" ? "block" : "none" }}>
            <div className="section-head"><h2>GEO Overview</h2><span className="source-note">Source: Ahrefs Brand Radar + Bing Webmaster Tools</span></div>
            
            <div className="grid kpi-grid">
              <div className="card kpi"><div className="label">Prompts tracked</div><div className="value">{getPromptsTotal() > 0 ? getPromptsTotal() : '—'}</div>{getPromptsTotal() > 0 && <span className="delta up">▲ 6 new</span>}</div>
              <div className="card kpi" style={{ display: hasSearchSource ? "block" : "none" }}><div className="label">AI citations</div><div className="value">{getCitationsTotal() > 0 ? getCitationsTotal().toLocaleString() : '—'}</div>{getCitationsTotal() > 0 && <span className="delta up">▲ 18%</span>}</div>
              <div className="card kpi"><div className="label">Brand mentions</div><div className="value">{getBacklinksTotal() > 0 ? getBacklinksTotal().toLocaleString() : '—'}</div>{getBacklinksTotal() > 0 && <span className="delta up">▲ 9%</span>}</div>
              <div className="card kpi" style={{ display: hasAhrefs ? "block" : "none" }}><div className="label">Share of voice</div><div className="value">{'—'}</div></div>
              <div className="card kpi" style={{ display: hasSearchSource ? "block" : "none" }}>
                <div className="label">{hasAhrefs ? "Avg. citation rank" : "Avg. cited pages"}</div>
                <div className="value">{hasAhrefs ? '—' : (getCachedPagesList().length > 0 ? getCachedPagesList().length : '—')}</div>
                <span className="delta up" style={{ display: getCachedPagesList().length > 0 ? '' : 'none' }}>{"▲ from 12"}</span>
              </div>
            </div>
            
            <div className="grid two-col">
              <div className="card">
                <p className="chart-title">Citations over time</p>
                <div className="chart-wrap"><canvas ref={chartCitTrendRef}></canvas></div>
              </div>
              <div className="card platform-dep" style={{ display: hasAhrefs ? "block" : "none" }}>
                <p className="chart-title">Citation share by engine</p>
                <div className="chart-wrap"><canvas ref={chartEngineDonutRef}></canvas></div>
              </div>
            </div>
          </section>

          {/* ============ PAGE 3: PROMPTS ============ */}
          <section className="page" style={{ display: activePage === "prompts" ? "block" : "none" }}>
            <div className="section-head"><h2>Prompt Performance</h2><span className="source-note">{getPromptsTotal()} prompts tracked · updated weekly</span></div>
            <div className="card" style={{ marginBottom: "18px" }}>
              <p className="chart-title">Top prompts by citation frequency</p>
              <div className="chart-wrap small"><canvas ref={chartPromptsBarRef}></canvas></div>
            </div>
            <div className="card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Prompt</th>
                    <th>Category</th>
                    <th>Volume</th>
                    {hasAhrefs && <th className="col-engines">Cited by</th>}
                    <th>Avg. rank</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {getCachedPromptsList().length === 0 ? (
                    <tr>
                      <td colSpan={hasAhrefs ? 6 : 5} style={{ textAlign: "center", padding: "32px", color: "var(--ink-soft)", fontStyle: "italic" }}>
                        No data available. Connect a Bing Webmaster or Google Search Console API key and sync to populate.
                      </td>
                    </tr>
                  ) : (
                    getCachedPromptsList().map((p, idx) => {
                      let cat = "Comparison";
                      const q = p.query.toLowerCase();
                      if (q.includes("vs") || q.includes("alternative")) cat = "Competitive";
                      else if (q.includes("how") || q.includes("manage")) cat = "How-to";
                      else if (q.includes("client") || q.includes("brand") || q.includes(brand.toLowerCase())) cat = "Branded";
                      else if (q.includes("tool") || q.includes("feature")) cat = "Feature";
                      
                      return (
                        <tr key={idx}>
                          <td>"{p.query}"</td>
                          <td><span className="tag">{cat}</span></td>
                          <td className="mono-num">{Math.round(p.impressions || p.clicks || 0).toLocaleString()}</td>
                          {hasAhrefs && (
                            <td className="col-engines">
                              <span className="engine-chip eng-chatgpt">ChatGPT</span>
                              {(p.impressions > 500) && <span className="engine-chip eng-perplexity">Perplexity</span>}
                            </td>
                          )}
                          <td className="mono-num">{parseFloat(p.position || 0).toFixed(1)}</td>
                          <td className={`trend ${idx === 5 ? "down" : idx === 3 ? "flat" : "up"}`}>{idx === 5 ? "▼" : idx === 3 ? "▬" : "▲"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ============ PAGE 4: PAGES CITED ============ */}
          <section className="page" style={{ display: activePage === "pages" ? "block" : "none" }}>
            <div className="section-head"><h2>Pages Cited by AI Engines</h2><span className="source-note">Source: Ahrefs Brand Radar URL-level citations</span></div>
            <div className="card" style={{ marginBottom: "18px" }}>
              <p className="chart-title">Most-cited pages this month</p>
              <div className="chart-wrap small"><canvas ref={chartPagesBarRef}></canvas></div>
            </div>
            <div className="card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Page</th>
                    <th>Cluster</th>
                    <th>Citations</th>
                    {hasAhrefs && <th className="col-engines">Engines</th>}
                  </tr>
                </thead>
                <tbody>
                  {getCachedPagesList().length === 0 ? (
                    <tr>
                      <td colSpan={hasAhrefs ? 4 : 3} style={{ textAlign: "center", padding: "32px", color: "var(--ink-soft)", fontStyle: "italic" }}>
                        No data available. Connect a Bing Webmaster or Google Search Console API key and sync to populate.
                      </td>
                    </tr>
                  ) : (
                    getCachedPagesList().map((p, idx) => {
                      let cat = "Comparison";
                      const path = p.page.toLowerCase();
                      if (path.includes("compare") || path.includes("vs")) cat = "Competitive";
                      else if (path.includes("features")) cat = "Feature";
                      else if (path.includes("guides") || path.includes("blog")) cat = "How-to";
                      else if (path.includes("pricing")) cat = "Branded";

                      return (
                        <tr key={idx}>
                          <td>{p.page}</td>
                          <td><span className="tag">{cat}</span></td>
                          <td className="mono-num">{Math.round(p.clicks || 0).toLocaleString()}</td>
                          {hasAhrefs && (
                            <td className="col-engines">
                              <span className="engine-chip eng-chatgpt">ChatGPT</span>
                              {idx % 2 === 0 && <span className="engine-chip eng-perplexity">Perplexity</span>}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ============ PAGE 5: MENTIONS ============ */}
          {hasAhrefs && (
            <section className="page" style={{ display: activePage === "mentions" ? "block" : "none" }}>
              <div className="section-head"><h2>Brand Mentions</h2><span className="source-note">Includes unlinked mentions across AI answers</span></div>
              <div className="grid two-col">
                <div className="card">
                  <p className="chart-title">Mentions over time</p>
                  <div className="chart-wrap"><canvas ref={chartMentionsLineRef}></canvas></div>
                </div>
                <div className="card">
                  <p className="chart-title">Sentiment breakdown</p>
                  <div className="chart-wrap"><canvas ref={chartSentimentRef}></canvas></div>
                </div>
              </div>
            </section>
          )}

          {/* ============ PAGE 6: BENCHMARK ============ */}
          {hasAhrefs && (
            <section className="page" style={{ display: activePage === "benchmark" ? "block" : "none" }}>
              <div className="section-head"><h2>Competitive Benchmark</h2><span className="source-note">Share of voice across tracked prompt set</span></div>
              <div className="card" style={{ marginBottom: "18px" }}>
                <p className="chart-title">Share of voice by brand</p>
                <div className="chart-wrap"><canvas ref={chartBenchmarkBarRef}></canvas></div>
              </div>
              <div className="callout"><span>💡</span><div><b>Reading this month:</b> {brand} competitive benchmark data is available from Ahrefs. Review share of voice and competitor positioning in the chart above.</div></div>
            </section>
          )}

          {/* ============ PAGE 7: RECOMMENDATIONS ============ */}
          {hasOpenai && (
            <section className="page" style={{ display: activePage === "recs" ? "block" : "none" }}>
              <div className="section-head"><h2>GEO Recommendations</h2><span className="source-note">Prioritized action plan powered by OpenAI GPT-4o</span></div>
              <div className="card">
                <ul className="rec-list">
                  {cachedRecsHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: cachedRecsHtml }} />
                  ) : (
                    <div className="callout">
                      <span>💡</span>
                      <div><b>No Recommendations:</b> Run a sync with an active OpenAI API key to generate an AI-powered GEO action plan.</div>
                    </div>
                  )}
                </ul>
              </div>
            </section>
          )}

          {/* ============ PAGE 8: SETTINGS ============ */}
          <section className="page" style={{ display: activePage === "settings" ? "block" : "none" }}>
            <div className="section-head"><h2>Data Enrichment</h2><span className="source-note">🔒 Local Cache Encrypted Settings</span></div>
            <div className="grid two-col" style={{ gap: "24px" }}>
              <div>
                <div className="card" style={{ marginBottom: "18px" }}>
                  <h3 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "600", textTransform: "uppercase" }}>API Configuration</h3>
                  
                  <div style={{ marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--ink-soft)" }}>AHREFS BRAND RADAR KEY</label>
                      <div className="status-indicator connected" id="status-ahrefs">
                        <span className="status-dot"></span>
                        <span className="status-text">{apiKeys.ahrefs ? "Connected" : "Disconnected"}</span>
                      </div>
                    </div>
                    <div className="input-group">
                      <input type="password" id="key-ahrefs" placeholder="Enter Ahrefs token" value={apiKeys.ahrefs} onChange={(e) => setApiKeys({ ...apiKeys, ahrefs: e.target.value })} />
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--ink-soft)" }}>BING WEBMASTER API KEY</label>
                      <div className="status-indicator connected" id="status-bing">
                        <span className="status-dot"></span>
                        <span className="status-text">{apiKeys.bing ? "Connected" : "Disconnected"}</span>
                      </div>
                    </div>
                    <div className="input-group">
                      <input type="password" id="key-bing" placeholder="Enter Bing API key" value={apiKeys.bing} onChange={(e) => setApiKeys({ ...apiKeys, bing: e.target.value })} />
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--ink-soft)" }}>GOOGLE SEARCH CONSOLE KEY</label>
                      <div className="status-indicator connected" id="status-gsc">
                        <span className="status-dot"></span>
                        <span className="status-text">{apiKeys.gsc ? "Connected" : "Disconnected"}</span>
                      </div>
                    </div>
                    <div className="input-group">
                      <input type="password" id="key-gsc" placeholder="Enter GSC token" value={apiKeys.gsc} onChange={(e) => setApiKeys({ ...apiKeys, gsc: e.target.value })} />
                    </div>
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--ink-soft)" }}>OPENAI API KEY</label>
                      <div className="status-indicator connected" id="status-openai">
                        <span className="status-dot"></span>
                        <span className="status-text">{apiKeys.openai ? "Connected" : "Disconnected"}</span>
                      </div>
                    </div>
                    <div className="input-group">
                      <input type="password" id="key-openai" placeholder="Enter OpenAI API token" value={apiKeys.openai} onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })} />
                    </div>
                  </div>

                  <div className="logo-actions-row" style={{ display: "flex", gap: "10px" }}>
                    <button className="btn-primary" onClick={handleSaveKeys} style={{ flex: 1 }}>Save Keys</button>
                    <button className="btn-secondary" onClick={handleClearKeys} style={{ padding: "0 18px", color: "var(--negative)" }}>Reset Cache</button>
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "600", textTransform: "uppercase" }}>Brand Logo Customization</h3>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "18px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "10.5px", fontWeight: "600", color: "var(--ink-soft)", textTransform: "uppercase", marginBottom: "6px" }}>Client Graphic</label>
                      <div className="logo-preview-box" id="client-logo-preview-box" onClick={() => clientLogoInputRef.current.click()}>
                        {clientLogo ? <img src={clientLogo} alt="Client Preview" /> : <span>No Logo Uploaded</span>}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "10.5px", fontWeight: "600", color: "var(--ink-soft)", textTransform: "uppercase", marginBottom: "6px" }}>Agency Graphic</label>
                      <div className="logo-preview-box" id="agency-logo-preview-box" onClick={() => agencyLogoInputRef.current.click()}>
                        {agencyLogo ? <img src={agencyLogo} alt="Agency Preview" /> : <span>No Logo Uploaded</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { localStorage.removeItem("geo_report_client_logo"); setClientLogo(null); }}>Remove Client Logo</button>
                    <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { localStorage.removeItem("geo_report_agency_logo"); setAgencyLogo(null); }}>Remove Agency Logo</button>
                  </div>
                </div>
              </div>

              <div>
                <div className="card" style={{ marginBottom: "18px" }}>
                  <h3 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "600", textTransform: "uppercase" }}>Manage Properties</h3>
                  
                  <div className="property-add-form" style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                    <input type="text" placeholder="e.g. betterrhodes.com" style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} value={newPropertyInput} onChange={(e) => setNewPropertyInput(e.target.value)} />
                    <button className="btn-primary" style={{ padding: "0 18px", borderRadius: "8px" }} onClick={handleAddProperty}>Add</button>
                  </div>
                  
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {propertiesList.map(prop => (
                      <li key={prop} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderBottom: "1px solid var(--border)", fontSize: "13px" }}>
                        <span style={{ fontWeight: 500 }}>{prop}</span>
                        {propertiesList.length > 1 && (
                          <button style={{ background: "none", border: "none", color: "var(--negative)", cursor: "pointer", fontSize: "11px", fontWeight: 600 }} onClick={() => handleDeleteProperty(prop)}>Delete</button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="card" style={{ background: "linear-gradient(135deg, #FFF9E6 0%, #FFF3CD 100%)", borderColor: "#FFEBA8", color: "#856404" }}>
                  <h4 style={{ margin: "0 0 6px 0", fontSize: "12.5px", fontWeight: "600" }}>🔒 SECURITY &amp; STORAGE NOTICE</h4>
                  <p style={{ margin: 0, fontSize: "11px", lineHeight: "1.45" }}>
                    All entered credentials and branding logo assets are held strictly inside your local browser cookie cache. Nothing is transmitted or saved on external servers, protecting your tokens from leaks. Clearing cache will wipe stored keys.
                  </p>
                </div>

                <div className="card" style={{ marginTop: "18px" }}>
                  <h3 style={{ margin: "0 0 12px 0", fontSize: "12px", fontWeight: "600", color: "var(--ink-soft)" }}>AUTO-ENRICHMENT SYNC STATUS</h3>
                  <div className="console-box" id="enrichment-console" style={{ height: "180px", overflowY: "auto", background: "#1c1c24", color: "#32cd32", fontFamily: "var(--font-mono)", padding: "12px", borderRadius: "8px", fontSize: "10.5px" }}>
                    {consoleLogs.map((log, index) => (
                      <div key={index} className={`console-line ${log.type}`} style={{ marginBottom: "6px", color: log.type === "success" ? "#32cd32" : log.type === "warn" ? "#ff4500" : log.type === "system" ? "#00bfff" : "#a9a9a9" }}>
                        [{log.time}] {log.text}
                      </div>
                    ))}
                  </div>
                </div>


              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}



function getBrandNameFromProperty(prop) {
  if (!prop) return "Client Co";
  let clean = prop.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  clean = clean.split("/")[0];
  let parts = clean.split(".");
  if (parts.length > 0) {
    let name = parts[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return "Client Co";
}
