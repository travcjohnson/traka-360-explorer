// TRAKA 360 Data Explorer - Main Application
// Uses DATA from data.js (loaded before this script)

(function() {
  'use strict';

  // State
  let currentView = 'overview';
  let currentYear = 2025;
  let searchQuery = '';
  let searchYear = '';
  let searchNationality = '';
  let currentPage = 1;
  const pageSize = 25;
  let sortField = 'rank';
  let sortAsc = true;
  let charts = {};
  let distributionYear = 'all';
  let clubYear = 'all';

  // ===== UTILITY FUNCTIONS =====
  function timeToSeconds(timeStr) {
    // Convert "HH:MM:SS" to total seconds
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }

  function formatTimeDiff(seconds) {
    // Format seconds difference as "Xh Ym Zs"
    const sign = seconds >= 0 ? '' : '-';
    const abs = Math.abs(seconds);
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    const s = abs % 60;
    if (h > 0) {
      return `${sign}${h}h ${m}m`;
    } else if (m > 0) {
      return `${sign}${m}m ${s}s`;
    }
    return `${sign}${s}s`;
  }

  // ===== INITIALIZATION =====
  function init() {
    console.log('TRAKA 360 Data Explorer initialized');
    console.log(`Loaded ${DATA.results.length} results`);
    console.log(`Repeat finishers: ${DATA.repeatFinishers.length}`);

    setupThemeToggle();
    setupNavigation();
    setupYearTabs();
    setupSearch();
    setupChat();
    setupDistributionFilter();
    setupClubFilter();

    populateOverview();
    populateYearStats(currentYear);
    populateDemographics();
    populateLeaderboard();
    populateClubs();
    populateSearch();

    createCharts();
  }

  // ===== THEME TOGGLE =====
  function setupThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && prefersDark)) {
      document.body.classList.add('dark');
    }

    toggle.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
      updateChartColors();
    });
  }

  // ===== NAVIGATION =====
  function setupNavigation() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.dataset.view;
        switchView(view);
      });
    });
  }

  function switchView(view) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-view="${view}"]`).classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${view}`).classList.add('active');
    currentView = view;
  }

  // ===== YEAR TABS =====
  function setupYearTabs() {
    const tabs = document.querySelectorAll('.year-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const year = parseInt(tab.dataset.year);
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentYear = year;
        populateYearStats(year);
        updateYearDistributionChart(year);
        updateYearClubsChart(year);
      });
    });
  }

  // ===== DISTRIBUTION FILTER =====
  function setupDistributionFilter() {
    const filter = document.getElementById('dist-year-filter');
    if (filter) {
      filter.addEventListener('change', (e) => {
        distributionYear = e.target.value;
        updateDistributionChart();
      });
    }
  }

  // ===== CLUB FILTER =====
  function setupClubFilter() {
    const filter = document.getElementById('club-year-filter');
    if (filter) {
      filter.addEventListener('change', (e) => {
        clubYear = e.target.value;
        populateClubs();
        updateClubsChart();
      });
    }
  }

  // ===== OVERVIEW =====
  function populateOverview() {
    // Hero stats
    document.getElementById('stat-total').textContent = DATA.overview.totalFinishers.toLocaleString();
    document.getElementById('stat-median').textContent = DATA.overview.medianTime;
    document.getElementById('stat-record').textContent = DATA.overview.courseRecord.time;
    document.getElementById('stat-record-holder').textContent =
      `${DATA.overview.courseRecord.name} (${DATA.overview.courseRecord.year})`;

    // Dynamic insights
    const y2023 = DATA.years[2023];
    const y2024 = DATA.years[2024];
    const y2025 = DATA.years[2025];

    // Faster insight
    document.getElementById('insight-faster').innerHTML =
      `Median dropped from <strong>${y2023.median.slice(0,5)}</strong> (2023) → <strong>${y2024.median.slice(0,5)}</strong> (2024) → <strong>${y2025.median.slice(0,5)}</strong> (2025). Nearly 3 hours faster in 2 years.`;

    // Growth insight
    const growth = Math.round(((y2025.finishers - y2023.finishers) / y2023.finishers) * 100);
    document.getElementById('insight-growth').innerHTML =
      `From <strong>${y2023.finishers}</strong> finishers in 2023 to <strong>${y2025.finishers}</strong> in 2025. That's <strong>${growth}%</strong> growth in just 2 years.`;

    // Repeats insight
    const threeYear = DATA.repeatFinishers.filter(r => r.count >= 3).length;
    const twoYear = DATA.repeatFinishers.filter(r => r.count === 2).length;
    document.getElementById('insight-repeats').innerHTML =
      `<strong>${DATA.repeatFinishers.length}</strong> riders finished multiple editions. <strong>${threeYear}</strong> completed all 3 years, <strong>${twoYear}</strong> completed 2 years.`;
  }

  // ===== YEAR STATS =====
  function populateYearStats(year) {
    const container = document.getElementById('year-stats');
    const yearData = DATA.years[year];

    if (!yearData) {
      container.innerHTML = '<div class="year-stat"><span class="value">N/A</span><span class="label">No data</span></div>';
      return;
    }

    container.innerHTML = `
      <div class="year-stat">
        <span class="value">${yearData.finishers}</span>
        <span class="label">Finishers</span>
      </div>
      <div class="year-stat">
        <span class="value">${yearData.median}</span>
        <span class="label">Median</span>
      </div>
      <div class="year-stat">
        <span class="value">${yearData.fastest}</span>
        <span class="label">Fastest</span>
      </div>
      <div class="year-stat">
        <span class="value">${yearData.slowest || 'N/A'}</span>
        <span class="label">Slowest</span>
      </div>
    `;

    // Data availability
    const avail = DATA.dataAvailability[year];
    const availContainer = document.getElementById('data-availability');
    availContainer.innerHTML = `Data available: Name, Time, Rank, Club${avail.nationality ? ', Nationality' : ''}${avail.age ? ', Age Category' : ''}`;

    // Year top 10
    const topTen = DATA.topPerYear[year] || [];
    const topTenContainer = document.getElementById('year-top-ten');
    topTenContainer.innerHTML = `<ol>${topTen.map(r =>
      `<li><span class="name">${r.name}</span><span class="time">${r.time}</span></li>`
    ).join('')}</ol>`;

    // Update labels
    document.getElementById('year-clubs-label').textContent = year;
  }

  // ===== DEMOGRAPHICS =====
  function populateDemographics() {
    // Age band table
    const tbody = document.querySelector('#age-band-table tbody');
    const bands = DATA.ageBands;

    let rows = '';
    for (const [name, data] of Object.entries(bands)) {
      rows += `
        <tr>
          <td>${name}</td>
          <td>${data.finishers}</td>
          <td>${data.median}</td>
          <td>${data.fastest}</td>
        </tr>
      `;
    }
    tbody.innerHTML = rows || '<tr><td colspan="4">No age band data available</td></tr>';

    // Nationality filter dropdown
    const natSelect = document.getElementById('filter-nationality');
    DATA.nationalities.forEach(nat => {
      const opt = document.createElement('option');
      opt.value = nat.code;
      opt.textContent = `${nat.code} (${nat.count})`;
      natSelect.appendChild(opt);
    });

    // Nationality grid
    const natGrid = document.getElementById('nationality-grid');
    natGrid.innerHTML = DATA.nationalities.map(nat =>
      `<div class="nationality-item"><span class="code">${nat.code}</span><span class="count">${nat.count}</span></div>`
    ).join('');
  }

  // ===== LEADERBOARD =====
  function populateLeaderboard() {
    // All-time top 10
    const tbody = document.querySelector('#leaderboard-table tbody');
    tbody.innerHTML = DATA.topTen.map(r => `
      <tr>
        <td>${r.rank}</td>
        <td>${r.name}</td>
        <td>${r.time}</td>
        <td>${r.year}</td>
        <td>${r.nationality || '-'}</td>
        <td>${r.club || '-'}</td>
      </tr>
    `).join('');

    // Year winners
    const winnersContainer = document.getElementById('year-winners');
    winnersContainer.innerHTML = [2023, 2024, 2025].map(year => {
      const winner = DATA.topPerYear[year]?.[0];
      if (!winner) return '';
      return `
        <div class="year-winner-card">
          <div class="year">${year}</div>
          <div class="name">${winner.name}</div>
          <div class="time">${winner.time}</div>
          <div class="club">${winner.club || '-'}</div>
        </div>
      `;
    }).join('');

    // Category leaders
    const catContainer = document.getElementById('category-leaders');
    let leaders = '<div class="demo-grid">';
    for (const [name, data] of Object.entries(DATA.ageBands)) {
      leaders += `
        <div class="demo-card">
          <h4>${name}</h4>
          <p style="font-size: 0.875rem; color: var(--muted);">
            Fastest: ${data.fastest}<br>
            Median: ${data.median}<br>
            ${data.finishers} finishers
          </p>
        </div>
      `;
    }
    leaders += '</div>';
    catContainer.innerHTML += leaders;

    // Repeat finishers
    const repeatGrid = document.getElementById('repeat-grid');
    const threeYearFinishers = DATA.repeatFinishers.filter(r => r.count >= 3);
    repeatGrid.innerHTML = threeYearFinishers.slice(0, 20).map(r => {
      const resultsHtml = r.results.map(res =>
        `<span>${res.year}: ${res.time} (#${res.rank})</span>`
      ).join('');
      return `
        <div class="repeat-card">
          <div class="name">${r.name}<span class="years-badge">${r.count} years</span></div>
          <div class="results">${resultsHtml}</div>
        </div>
      `;
    }).join('');

    if (threeYearFinishers.length === 0) {
      repeatGrid.innerHTML = '<p class="view-desc">No riders completed all 3 editions yet.</p>';
    }
  }

  // ===== CLUBS =====
  function populateClubs() {
    const clubs = clubYear === 'all'
      ? DATA.clubs.all
      : DATA.clubs.perYear[clubYear] || [];

    const tbody = document.querySelector('#club-table tbody');
    tbody.innerHTML = clubs.slice(0, 20).map((c, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${c.name}</td>
        <td>${c.count}</td>
      </tr>
    `).join('');
  }

  // ===== SEARCH =====
  function setupSearch() {
    const input = document.getElementById('search-input');
    const yearFilter = document.getElementById('filter-year');
    const natFilter = document.getElementById('filter-nationality');

    input.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      currentPage = 1;
      populateSearch();
    });

    yearFilter.addEventListener('change', (e) => {
      searchYear = e.target.value;
      currentPage = 1;
      // Warn if nationality filter is set but year is not 2025
      if (searchNationality && searchYear && searchYear !== '2025') {
        alert('Note: Nationality data is only available for 2025. Nationality filter will be ignored.');
      }
      populateSearch();
    });

    natFilter.addEventListener('change', (e) => {
      searchNationality = e.target.value;
      currentPage = 1;
      populateSearch();
    });

    // Pagination
    document.getElementById('btn-prev').addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        populateSearch();
      }
    });

    document.getElementById('btn-next').addEventListener('click', () => {
      const filtered = getFilteredResults();
      const maxPage = Math.ceil(filtered.length / pageSize);
      if (currentPage < maxPage) {
        currentPage++;
        populateSearch();
      }
    });

    // Sortable headers
    document.querySelectorAll('#results-table th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (sortField === field) {
          sortAsc = !sortAsc;
        } else {
          sortField = field;
          sortAsc = true;
        }
        populateSearch();
      });
    });
  }

  function getFilteredResults() {
    return DATA.results.filter(r => {
      const matchesQuery = !searchQuery ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.club && r.club.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesYear = !searchYear || r.year === parseInt(searchYear);
      const matchesNat = !searchNationality || r.nationality === searchNationality;
      return matchesQuery && matchesYear && matchesNat;
    });
  }

  function populateSearch() {
    let results = getFilteredResults();

    // Sort
    results.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'time') {
        aVal = a.timeSeconds;
        bVal = b.timeSeconds;
      }

      if (typeof aVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? aVal - bVal : bVal - aVal;
    });

    // Paginate
    const totalPages = Math.ceil(results.length / pageSize);
    const start = (currentPage - 1) * pageSize;
    const pageResults = results.slice(start, start + pageSize);

    // Update count
    document.getElementById('results-count').textContent = results.length;

    // Populate table
    const tbody = document.querySelector('#results-table tbody');
    tbody.innerHTML = pageResults.map(r => `
      <tr>
        <td>${r.rank}</td>
        <td>${r.name}</td>
        <td>${r.time}</td>
        <td>${r.year}</td>
        <td>${r.nationality || '-'}</td>
        <td>${r.club || '-'}</td>
      </tr>
    `).join('') || '<tr><td colspan="6" style="text-align: center; color: var(--muted);">No results found</td></tr>';

    // Update pagination
    document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages || 1}`;
    document.getElementById('btn-prev').disabled = currentPage <= 1;
    document.getElementById('btn-next').disabled = currentPage >= totalPages;
  }

  // ===== AI CHAT (Gemini Flash via secure API proxy) =====
  // API key is stored securely on server side
  let chatHistory = [];

  function buildSystemContext() {
    // Build comprehensive context for the AI
    const topTenText = DATA.topTen.map(r =>
      `${r.rank}. ${r.name} - ${r.time} (${r.year})${r.nationality ? ` [${r.nationality}]` : ''}${r.club ? ` - ${r.club}` : ''}`
    ).join('\n');

    const repeatThreeYear = DATA.repeatFinishers.filter(r => r.count >= 3);
    const repeatTwoYear = DATA.repeatFinishers.filter(r => r.count === 2);

    const natBreakdown = DATA.nationalities.slice(0, 15).map(n => `${n.code}: ${n.count}`).join(', ');

    const ageBandText = Object.entries(DATA.ageBands).map(([name, d]) =>
      `${name}: ${d.finishers} finishers, median ${d.median}, fastest ${d.fastest}`
    ).join('\n');

    const topClubs = DATA.clubs.all.slice(0, 10).map(c => `${c.name}: ${c.count}`).join(', ');

    // Create searchable mini-database of all results for specific queries
    const allResultsSummary = `Total ${DATA.results.length} finishers in database with name, time, year, rank, club. Nationality only for 2025.`;

    return `You are a helpful AI assistant for the TRAKA 360 race data explorer. You have comprehensive knowledge of race results from 2023-2025.

IMPORTANT: Be concise but insightful. Give specific names, times, and facts. Don't be generic.

=== RACE OVERVIEW ===
- TRAKA 360 is a 360km ultra-distance gravel cycling race in Spain
- Total finishers across all years: ${DATA.overview.totalFinishers}
- Course record: ${DATA.overview.courseRecord.time} by ${DATA.overview.courseRecord.name} (${DATA.overview.courseRecord.year})
- Overall median time: ${DATA.overview.medianTime}

=== YEAR-BY-YEAR STATS ===
2023: ${DATA.years[2023].finishers} finishers, median ${DATA.years[2023].median}, fastest ${DATA.years[2023].fastest}
2024: ${DATA.years[2024].finishers} finishers, median ${DATA.years[2024].median}, fastest ${DATA.years[2024].fastest}
2025: ${DATA.years[2025].finishers} finishers, median ${DATA.years[2025].median}, fastest ${DATA.years[2025].fastest}

Key insight: Participation more than doubled from 2023 to 2025 while times improved dramatically.

=== TOP 10 ALL-TIME FASTEST ===
${topTenText}

=== WINNERS BY YEAR ===
2023 Winner: ${DATA.topPerYear[2023][0].name} - ${DATA.topPerYear[2023][0].time}
2024 Winner: ${DATA.topPerYear[2024][0].name} - ${DATA.topPerYear[2024][0].time}
2025 Winner: ${DATA.topPerYear[2025][0].name} - ${DATA.topPerYear[2025][0].time} (Course Record)

=== REPEAT FINISHERS ===
- ${repeatThreeYear.length} riders completed all 3 editions
- ${repeatTwoYear.length} riders completed 2 editions
- Total ${DATA.repeatFinishers.length} riders finished multiple years

=== DETAILED REPEAT FINISHER TIMES (for improvement analysis) ===
${repeatThreeYear.map(r => {
  const times = r.results.map(res => `${res.year}: ${res.time}`).join(', ');
  return `${r.name}: ${times}`;
}).join('\n')}

To calculate "most improved": compare finish times between years. Lower time = better. Calculate difference between first and last year.

=== NATIONALITIES (2025 only - no nationality data for 2023/2024) ===
Top countries: ${natBreakdown}
Spain dominates as the host country with 156 finishers in 2025.

=== AGE CATEGORIES (2025 only) ===
${ageBandText}
Note: Senior (23-40) is by far the largest category at 53%.

=== TOP CLUBS (all years combined) ===
${topClubs}

=== DATA AVAILABILITY ===
- 2023 & 2024: name, time, rank, club only
- 2025: name, time, rank, club, nationality, age category

=== FULL RESULTS DATABASE ===
${allResultsSummary}

When answering questions:
1. Be specific - use actual names, times, rankings
2. If asked about a specific person, search the results data
3. If nationality is asked for 2023/2024, explain it's only available for 2025
4. Provide context and insights, not just raw data
5. Be conversational but data-driven`;
  }

  function buildResultsContext(query) {
    // For specific queries, include relevant results
    const q = query.toLowerCase();
    let relevantResults = [];

    // Check for nationality queries
    const natCodes = ['es', 'it', 'fr', 'de', 'gb', 'us', 'nl', 'be', 'ch', 'dk', 'au', 'pt'];
    const natNames = {
      'spain': 'ES', 'spanish': 'ES', 'italy': 'IT', 'italian': 'IT',
      'france': 'FR', 'french': 'FR', 'germany': 'DE', 'german': 'DE',
      'uk': 'GB', 'british': 'GB', 'britain': 'GB', 'england': 'GB',
      'usa': 'US', 'american': 'US', 'america': 'US', 'united states': 'US',
      'netherlands': 'NL', 'dutch': 'NL', 'belgium': 'BE', 'belgian': 'BE',
      'switzerland': 'CH', 'swiss': 'CH', 'denmark': 'DK', 'danish': 'DK',
      'australia': 'AU', 'australian': 'AU', 'portugal': 'PT', 'portuguese': 'PT'
    };

    // Find matching nationality
    let targetNat = null;
    for (const [name, code] of Object.entries(natNames)) {
      if (q.includes(name)) {
        targetNat = code;
        break;
      }
    }
    for (const code of natCodes) {
      if (q.includes(code) && q.length < 50) {
        targetNat = code.toUpperCase();
        break;
      }
    }

    if (targetNat) {
      relevantResults = DATA.results.filter(r => r.nationality === targetNat).slice(0, 20);
    }

    // Check for name searches
    const nameMatch = q.match(/(?:find|search|who is|about|results for|how did)\s+([a-z\s]+?)(?:\s+do|\s+finish|\s+perform|$|\?)/i);
    if (nameMatch) {
      const searchName = nameMatch[1].trim();
      if (searchName.length > 2) {
        relevantResults = DATA.results.filter(r =>
          r.name.toLowerCase().includes(searchName)
        ).slice(0, 10);
      }
    }

    // Check for club searches
    if (q.includes('club') || q.includes('team')) {
      const clubMatch = q.match(/(?:club|team)\s+([a-z\s]+?)(?:\s+|$|\?)/i);
      if (clubMatch) {
        const searchClub = clubMatch[1].trim();
        if (searchClub.length > 2) {
          relevantResults = DATA.results.filter(r =>
            r.club && r.club.toLowerCase().includes(searchClub)
          ).slice(0, 15);
        }
      }
    }

    // Check for year-specific queries
    if (q.includes('2023') && !q.includes('2024') && !q.includes('2025')) {
      relevantResults = DATA.results.filter(r => r.year === 2023).slice(0, 20);
    } else if (q.includes('2024') && !q.includes('2023') && !q.includes('2025')) {
      relevantResults = DATA.results.filter(r => r.year === 2024).slice(0, 20);
    } else if (q.includes('2025') && !q.includes('2023') && !q.includes('2024')) {
      relevantResults = DATA.results.filter(r => r.year === 2025).slice(0, 20);
    }

    // Check for improvement/progression queries
    if (q.includes('improv') || q.includes('progress') || q.includes('better') || q.includes('faster')) {
      const repeatFinishers = DATA.repeatFinishers.filter(r => r.count >= 2);
      const improvements = repeatFinishers.map(r => {
        const sorted = r.results.sort((a, b) => a.year - b.year);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const firstSeconds = timeToSeconds(first.time);
        const lastSeconds = timeToSeconds(last.time);
        const improvement = firstSeconds - lastSeconds; // positive = improved
        return {
          name: r.name,
          count: r.count,
          firstYear: first.year,
          firstTime: first.time,
          lastYear: last.year,
          lastTime: last.time,
          improvementSeconds: improvement,
          improvementFormatted: formatTimeDiff(improvement)
        };
      }).sort((a, b) => b.improvementSeconds - a.improvementSeconds);

      return '\n\n=== RIDER IMPROVEMENT ANALYSIS ===\n' +
        'Top 15 most improved riders (comparing first to last race):\n' +
        improvements.slice(0, 15).map((r, i) =>
          `${i+1}. ${r.name}: ${r.firstYear} (${r.firstTime}) → ${r.lastYear} (${r.lastTime}) = ${r.improvementFormatted} faster`
        ).join('\n');
    }

    if (relevantResults.length > 0) {
      return '\n\n=== RELEVANT RESULTS FOR YOUR QUERY ===\n' +
        relevantResults.map(r =>
          `${r.name} | ${r.time} | #${r.rank} | ${r.year}${r.nationality ? ` | ${r.nationality}` : ''}${r.club ? ` | ${r.club}` : ''}`
        ).join('\n');
    }
    return '';
  }

  function setupChat() {
    const input = document.getElementById('chat-input');
    const send = document.getElementById('chat-send');

    const quickAsks = document.querySelectorAll('.quick-ask');
    quickAsks.forEach(btn => {
      btn.addEventListener('click', () => {
        handleChat(btn.dataset.query);
      });
    });

    send.addEventListener('click', () => {
      const query = input.value.trim();
      if (query) {
        handleChat(query);
        input.value = '';
      }
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = input.value.trim();
        if (query) {
          handleChat(query);
          input.value = '';
        }
      }
    });
  }

  async function handleChat(query) {
    const messages = document.getElementById('chat-messages');
    messages.innerHTML += `<div class="chat-message user">${escapeHtml(query)}</div>`;

    // Show loading indicator
    const loadingId = 'loading-' + Date.now();
    messages.innerHTML += `<div class="chat-message assistant" id="${loadingId}"><span class="loading">Thinking...</span></div>`;
    messages.scrollTop = messages.scrollHeight;

    try {
      const response = await callGemini(query);
      document.getElementById(loadingId).innerHTML = formatResponse(response);
    } catch (error) {
      console.error('Gemini API error:', error);
      document.getElementById(loadingId).innerHTML = `<span style="color: #f66;">Error: ${error.message}</span><br><br>` + getFallbackResponse(query);
    }
    messages.scrollTop = messages.scrollHeight;
  }

  async function callGemini(query) {
    const systemContext = buildSystemContext();
    const resultsContext = buildResultsContext(query);
    const fullContext = systemContext + resultsContext;

    // Call our secure API proxy (rate limited, API key on server)
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query,
        context: fullContext
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 429) {
        throw new Error('Rate limit reached. Please wait a minute and try again.');
      }
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.response) {
      throw new Error('No response from AI');
    }

    return data.response;
  }

  function formatResponse(text) {
    // Convert markdown-style formatting to HTML
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>')
      .replace(/^- /gm, '• ')
      .replace(/^(\d+)\. /gm, '$1. ');
  }

  function getFallbackResponse(query) {
    // Fallback to local response if API fails
    const q = query.toLowerCase();

    if (q.includes('won') && q.includes('2025')) {
      const w = DATA.topPerYear[2025][0];
      return `<strong>${w.name}</strong> won 2025 with <strong>${w.time}</strong>, setting a new course record.`;
    }
    if (q.includes('won') && q.includes('2024')) {
      const w = DATA.topPerYear[2024][0];
      return `<strong>${w.name}</strong> won 2024 with <strong>${w.time}</strong>.`;
    }
    if (q.includes('won') && q.includes('2023')) {
      const w = DATA.topPerYear[2023][0];
      return `<strong>${w.name}</strong> won 2023 with <strong>${w.time}</strong>.`;
    }
    if (q.includes('compare') || q.includes('year')) {
      return `2023: ${DATA.years[2023].finishers} finishers, median ${DATA.years[2023].median}<br>
        2024: ${DATA.years[2024].finishers} finishers, median ${DATA.years[2024].median}<br>
        2025: ${DATA.years[2025].finishers} finishers, median ${DATA.years[2025].median}`;
    }
    if (q.includes('record')) {
      const cr = DATA.overview.courseRecord;
      return `Course record: <strong>${cr.time}</strong> by ${cr.name} (${cr.year})`;
    }
    return `Ask me about TRAKA 360 race data: winners, times, nationalities, clubs, etc.`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ===== CHARTS =====
  function createCharts() {
    const isDark = document.body.classList.contains('dark');
    Chart.defaults.color = isDark ? '#aaa' : '#666';
    Chart.defaults.borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    Chart.defaults.font.family = "'Geist Mono', monospace";

    createYearChart();
    createDistributionChart();
    createNationalityChart();
    createAgeChart();
    createYearDistributionChart(currentYear);
    createYearClubsChart(currentYear);
    createClubsChart();
  }

  function createYearChart() {
    const ctx = document.getElementById('chart-years');
    if (!ctx) return;

    const years = [2023, 2024, 2025];
    const finishers = years.map(y => DATA.years[y]?.finishers || 0);
    const medians = years.map(y => (DATA.years[y]?.median_seconds || 0) / 3600);

    charts.years = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: years,
        datasets: [{
          label: 'Finishers',
          data: finishers,
          backgroundColor: getChartColor(0.7),
          borderColor: getChartColor(1),
          borderWidth: 1,
          yAxisID: 'y'
        }, {
          label: 'Median (hours)',
          data: medians,
          type: 'line',
          borderColor: '#888',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 4,
          yAxisID: 'y1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'top' } },
        scales: {
          y: { beginAtZero: true, position: 'left', title: { display: true, text: 'Finishers' } },
          y1: { beginAtZero: false, position: 'right', grid: { display: false }, title: { display: true, text: 'Median (hours)' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  function createDistributionChart() {
    const ctx = document.getElementById('chart-distribution');
    if (!ctx) return;

    const buckets = ['11-12h', '12-13h', '13-14h', '14-15h', '15-16h', '16-17h', '17-18h', '18-19h', '19-20h', '20-25h', '25h+'];
    const data = buckets.map(b => DATA.distribution[b] || 0);

    charts.distribution = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: buckets,
        datasets: [{ label: 'Finishers', data: data, backgroundColor: getChartColor(0.7), borderColor: getChartColor(1), borderWidth: 1 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }
      }
    });
  }

  function updateDistributionChart() {
    if (!charts.distribution) return;

    const buckets = ['11-12h', '12-13h', '13-14h', '14-15h', '15-16h', '16-17h', '17-18h', '18-19h', '19-20h', '20-25h', '25h+'];
    const distData = distributionYear === 'all' ? DATA.distribution : DATA.distributionPerYear[distributionYear] || {};
    const data = buckets.map(b => distData[b] || 0);

    charts.distribution.data.datasets[0].data = data;
    charts.distribution.update();
  }

  function createNationalityChart() {
    const ctx = document.getElementById('chart-nationality');
    if (!ctx) return;

    const top10 = DATA.nationalities.slice(0, 10);
    charts.nationality = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top10.map(n => n.code),
        datasets: [{ label: 'Finishers', data: top10.map(n => n.count), backgroundColor: getChartColor(0.7), borderColor: getChartColor(1), borderWidth: 1 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true }, y: { grid: { display: false } } }
      }
    });
  }

  function createAgeChart() {
    const ctx = document.getElementById('chart-age');
    if (!ctx) return;

    const bands = Object.entries(DATA.ageBands);
    if (bands.length === 0) return;

    charts.age = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: bands.map(([name]) => name.split(' ')[0]),
        datasets: [{
          data: bands.map(([, d]) => d.finishers),
          backgroundColor: ['rgba(50,50,50,0.9)', 'rgba(80,80,80,0.9)', 'rgba(120,120,120,0.9)', 'rgba(160,160,160,0.9)', 'rgba(200,200,200,0.9)'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } }
      }
    });
  }

  function createYearDistributionChart(year) {
    const ctx = document.getElementById('chart-year-distribution');
    if (!ctx) return;

    const buckets = ['11-12h', '12-13h', '13-14h', '14-15h', '15-16h', '16-17h', '17-18h', '18-19h', '19-20h', '20-25h', '25h+'];
    const distData = DATA.distributionPerYear[year] || {};
    const data = buckets.map(b => distData[b] || 0);

    charts.yearDistribution = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: buckets,
        datasets: [{ label: 'Finishers', data: data, backgroundColor: getChartColor(0.7), borderColor: getChartColor(1), borderWidth: 1 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }
      }
    });
  }

  function updateYearDistributionChart(year) {
    if (!charts.yearDistribution) return;

    const buckets = ['11-12h', '12-13h', '13-14h', '14-15h', '15-16h', '16-17h', '17-18h', '18-19h', '19-20h', '20-25h', '25h+'];
    const distData = DATA.distributionPerYear[year] || {};
    const data = buckets.map(b => distData[b] || 0);

    charts.yearDistribution.data.datasets[0].data = data;
    charts.yearDistribution.update();
  }

  function createYearClubsChart(year) {
    const ctx = document.getElementById('chart-year-clubs');
    if (!ctx) return;

    const clubs = DATA.clubs.perYear[year] || [];
    const top10 = clubs.slice(0, 10);

    charts.yearClubs = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top10.map(c => c.name.slice(0, 20)),
        datasets: [{ label: 'Finishers', data: top10.map(c => c.count), backgroundColor: getChartColor(0.7), borderColor: getChartColor(1), borderWidth: 1 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true }, y: { grid: { display: false } } }
      }
    });
  }

  function updateYearClubsChart(year) {
    if (!charts.yearClubs) return;

    const clubs = DATA.clubs.perYear[year] || [];
    const top10 = clubs.slice(0, 10);

    charts.yearClubs.data.labels = top10.map(c => c.name.slice(0, 20));
    charts.yearClubs.data.datasets[0].data = top10.map(c => c.count);
    charts.yearClubs.update();
  }

  function createClubsChart() {
    const ctx = document.getElementById('chart-clubs');
    if (!ctx) return;

    const clubs = DATA.clubs.all.slice(0, 15);

    charts.clubs = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: clubs.map(c => c.name.slice(0, 25)),
        datasets: [{ label: 'Finishers', data: clubs.map(c => c.count), backgroundColor: getChartColor(0.7), borderColor: getChartColor(1), borderWidth: 1 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true }, y: { grid: { display: false } } }
      }
    });
  }

  function updateClubsChart() {
    if (!charts.clubs) return;

    const clubs = clubYear === 'all' ? DATA.clubs.all : DATA.clubs.perYear[clubYear] || [];
    const top15 = clubs.slice(0, 15);

    charts.clubs.data.labels = top15.map(c => c.name.slice(0, 25));
    charts.clubs.data.datasets[0].data = top15.map(c => c.count);
    charts.clubs.update();
  }

  function getChartColor(alpha = 1) {
    const isDark = document.body.classList.contains('dark');
    return isDark ? `rgba(255, 255, 255, ${alpha})` : `rgba(50, 50, 50, ${alpha})`;
  }

  function updateChartColors() {
    Object.values(charts).forEach(chart => chart.destroy());
    charts = {};
    createCharts();
  }

  // Start the app
  document.addEventListener('DOMContentLoaded', init);
})();
