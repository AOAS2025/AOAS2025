(function () {
  const STORAGE_KEY = 'aoas_admin_token';
  const totalsGrid = document.getElementById('totalsGrid');
  const breakdownBody = document.querySelector('#breakdownTable tbody');
  const recentBody = document.querySelector('#recentInquiriesTable tbody');
  const status = document.getElementById('metricsStatus');
  const refreshButton = document.getElementById('refreshMetrics');

  function getApiUrl(pathname) {
    if (window.AOASTracker && typeof window.AOASTracker.resolveApiUrl === 'function') {
      return window.AOASTracker.resolveApiUrl(pathname);
    }
    return pathname;
  }

  function getToken() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  }

  function redirectToAdmin() {
    window.location.replace('/admin');
  }

  function clearChildren(node) {
    if (!node) return;
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function appendCell(row, value) {
    const cell = document.createElement('td');
    cell.textContent = String(value || '');
    row.appendChild(cell);
  }

  function renderTotals(totals) {
    clearChildren(totalsGrid);
    const items = [
      { label: 'Total Inquiries', value: totals.inquiries || 0 },
      { label: 'Tracked Events', value: totals.events || 0 },
      { label: 'Chat Opens', value: totals.chatOpens || 0 },
      { label: 'Chat Leads', value: totals.chatLeadSubmits || 0 },
      { label: 'Form Submits', value: totals.contactFormSubmits || 0 },
    ];

    items.forEach((item) => {
      const article = document.createElement('article');
      article.className = 'metric-card';

      const heading = document.createElement('h3');
      heading.textContent = item.label;
      article.appendChild(heading);

      const value = document.createElement('p');
      value.textContent = String(item.value);
      article.appendChild(value);

      totalsGrid.appendChild(article);
    });
  }

  function renderBreakdowns(breakdowns) {
    clearChildren(breakdownBody);
    const groups = [
      ['Inquiries by Service', breakdowns.inquiriesByService],
      ['Inquiries by Source', breakdowns.inquiriesBySource],
      ['Inquiries by Country', breakdowns.inquiriesByCountry],
      ['Event Counts', breakdowns.eventCounts],
    ];

    groups.forEach(([title, values]) => {
      const titleRow = document.createElement('tr');
      appendCell(titleRow, title);
      appendCell(titleRow, '');
      breakdownBody.appendChild(titleRow);

      Object.entries(values || {}).forEach(([key, value]) => {
        const row = document.createElement('tr');
        appendCell(row, `- ${key}`);
        appendCell(row, value);
        breakdownBody.appendChild(row);
      });
    });
  }

  function renderRecent(recentInquiries) {
    clearChildren(recentBody);
    if (!Array.isArray(recentInquiries) || !recentInquiries.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.textContent = 'No inquiry data yet.';
      row.appendChild(cell);
      recentBody.appendChild(row);
      return;
    }

    recentInquiries.forEach((item) => {
      const row = document.createElement('tr');
      appendCell(row, item.timestamp || '');
      appendCell(row, item.service || '');
      appendCell(row, item.source || '');
      appendCell(row, item.location || '');
      appendCell(row, item.inquiryType || '');
      recentBody.appendChild(row);
    });
  }

  async function loadMetrics() {
    const token = getToken();
    if (!token) {
      redirectToAdmin();
      return;
    }

    status.textContent = 'Loading...';
    try {
      const response = await fetch(getApiUrl('/api/metrics'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        redirectToAdmin();
        return;
      }

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to load metrics.');
      }

      const metrics = payload.metrics || {};
      renderTotals(metrics.totals || {});
      renderBreakdowns(metrics.breakdowns || {});
      renderRecent(metrics.recentInquiries || []);
      status.textContent = `Updated: ${new Date(metrics.generatedAt || Date.now()).toLocaleString()}`;
    } catch (error) {
      status.textContent = `Error: ${error.message || 'Unable to load metrics.'}`;
    }
  }

  if (refreshButton) {
    refreshButton.addEventListener('click', loadMetrics);
  }

  loadMetrics();
})();
