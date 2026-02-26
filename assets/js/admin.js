(function () {
  const STORAGE_KEY = 'aoas_admin_token';
  const THEME_STORAGE_KEY = 'aoas_admin_theme';
  const MAX_UPLOAD_BYTES = 7 * 1024 * 1024;
  const MAX_PROFILE_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
  const FILTER_DEBOUNCE_MS = 200;
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || '';

  const state = {
    token: localStorage.getItem(STORAGE_KEY) || '',
    user: null,
    sections: [],
    participants: [],
    accounts: [],
    clientRequests: [],
    hiredProfiles: [],
    counts: {
      participants: 0,
      sections: 0,
      subAccounts: 0,
    },
    activeView: 'overview',
    editingParticipantId: '',
    profilePictureDraft: null,
    resumeDraft: null,
    participantMetaExpanded: {
      skills: new Set(),
      sections: new Set(),
    },
    participantFilters: {
      search: '',
      section: '',
      status: '',
    },
    clientPoolFilters: {
      search: '',
      section: '',
      status: '',
    },
    selectedClientParticipantIds: new Set(),
    searchDebounceHandle: 0,
    clientSearchDebounceHandle: 0,
    mobileNavOpen: false,
    theme: '',
    themeManual: savedTheme === 'light' || savedTheme === 'dark',
  };

  const els = {
    loginScreen: document.getElementById('loginScreen'),
    loginForm: document.getElementById('loginForm'),
    loginUsername: document.getElementById('loginUsername'),
    loginPassword: document.getElementById('loginPassword'),
    loginMessage: document.getElementById('loginMessage'),

    appShell: document.getElementById('appShell'),
    appSidebar: document.getElementById('appSidebar'),
    sidebarScrim: document.getElementById('sidebarScrim'),
    mobileNavToggle: document.getElementById('mobileNavToggle'),
    mobileNavClose: document.getElementById('mobileNavClose'),
    navButtons: Array.from(document.querySelectorAll('.nav-btn')),
    userBadge: document.getElementById('userBadge'),
    logoutBtn: document.getElementById('logoutBtn'),
    globalMessage: document.getElementById('globalMessage'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeToggleLabel: document.getElementById('themeToggleLabel'),
    topbarTitle: document.getElementById('topbarTitle'),
    topbarEyebrow: document.getElementById('topbarEyebrow'),

    viewOverview: document.getElementById('view-overview'),
    viewParticipants: document.getElementById('view-participants'),
    viewSections: document.getElementById('view-sections'),
    viewAccounts: document.getElementById('view-accounts'),
    viewClientRequests: document.getElementById('view-client-requests'),

    statParticipants: document.getElementById('statParticipants'),
    statSections: document.getElementById('statSections'),
    statAccounts: document.getElementById('statAccounts'),
    overviewSectionChips: document.getElementById('overviewSectionChips'),
    overviewRecentList: document.getElementById('overviewRecentList'),
    overviewSectionsMeta: document.getElementById('overviewSectionsMeta'),
    overviewRecentMeta: document.getElementById('overviewRecentMeta'),

    participantsSearch: document.getElementById('participantsSearch'),
    participantsSectionFilter: document.getElementById('participantsSectionFilter'),
    participantsStatusFilter: document.getElementById('participantsStatusFilter'),
    createParticipantBtn: document.getElementById('createParticipantBtn'),
    participantsTableBody: document.getElementById('participantsTableBody'),

    sectionForm: document.getElementById('sectionForm'),
    sectionName: document.getElementById('sectionName'),
    sectionDescription: document.getElementById('sectionDescription'),
    sectionsTableBody: document.getElementById('sectionsTableBody'),

    accountForm: document.getElementById('accountForm'),
    accountUsername: document.getElementById('accountUsername'),
    accountDisplayName: document.getElementById('accountDisplayName'),
    accountPassword: document.getElementById('accountPassword'),
    accountsTableBody: document.getElementById('accountsTableBody'),

    clientPoolSearch: document.getElementById('clientPoolSearch'),
    clientPoolSectionFilter: document.getElementById('clientPoolSectionFilter'),
    clientPoolStatusFilter: document.getElementById('clientPoolStatusFilter'),
    selectVisibleCandidatesBtn: document.getElementById('selectVisibleCandidatesBtn'),
    clearSelectedCandidatesBtn: document.getElementById('clearSelectedCandidatesBtn'),
    clientPoolTableBody: document.getElementById('clientPoolTableBody'),
    clientSelectedMeta: document.getElementById('clientSelectedMeta'),
    clientRequestForm: document.getElementById('clientRequestForm'),
    clientRequestName: document.getElementById('clientRequestName'),
    clientRequestEmail: document.getElementById('clientRequestEmail'),
    clientRequestCompany: document.getElementById('clientRequestCompany'),
    clientInterviewDateTime: document.getElementById('clientInterviewDateTime'),
    clientCeoMeetingDateTime: document.getElementById('clientCeoMeetingDateTime'),
    clientCeoIncluded: document.getElementById('clientCeoIncluded'),
    clientRequestMessage: document.getElementById('clientRequestMessage'),
    clientRequestsList: document.getElementById('clientRequestsList'),
    clientRequestsMeta: document.getElementById('clientRequestsMeta'),
    hiredProfilesTableBody: document.getElementById('hiredProfilesTableBody'),
    hiredProfilesMeta: document.getElementById('hiredProfilesMeta'),

    participantModal: document.getElementById('participantModal'),
    participantModalBackdrop: document.getElementById('participantModalBackdrop'),
    participantModalClose: document.getElementById('participantModalClose'),
    participantModalTitle: document.getElementById('participantModalTitle'),
    participantProfileHero: document.getElementById('participantProfileHero'),
    participantForm: document.getElementById('participantForm'),
    participantId: document.getElementById('participantId'),
    fullName: document.getElementById('fullName'),
    contactNumber: document.getElementById('contactNumber'),
    email: document.getElementById('email'),
    gender: document.getElementById('gender'),
    address: document.getElementById('address'),
    age: document.getElementById('age'),
    birthdate: document.getElementById('birthdate'),
    status: document.getElementById('status'),
    skills: document.getElementById('skills'),
    sectionsChecklist: document.getElementById('sectionsChecklist'),
    notes: document.getElementById('notes'),
    profilePictureFile: document.getElementById('profilePictureFile'),
    profilePictureMeta: document.getElementById('profilePictureMeta'),
    resumeFile: document.getElementById('resumeFile'),
    resumeMeta: document.getElementById('resumeMeta'),
    saveParticipantBtn: document.getElementById('saveParticipantBtn'),
    deleteParticipantBtn: document.getElementById('deleteParticipantBtn'),
  };

  const MOBILE_NAV_QUERY = window.matchMedia('(max-width: 900px)');
  const SYSTEM_THEME_QUERY = window.matchMedia('(prefers-color-scheme: dark)');

  function isAdmin() {
    return Boolean(state.user && state.user.role === 'admin');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function statusLabel(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'shortlisted') return 'Shortlisted';
    if (normalized === 'on_hold') return 'On Hold';
    if (normalized === 'inactive') return 'Inactive';
    return 'Talent Pool';
  }

  function initialsFromName(name) {
    const parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);
    if (!parts.length) return 'U';
    return parts.map((part) => part.charAt(0).toUpperCase()).join('');
  }

  function isMetaExpanded(kind, participantId) {
    if (!participantId) return false;
    return state.participantMetaExpanded[kind]?.has(participantId);
  }

  function toggleMetaExpanded(kind, participantId) {
    if (!participantId || !state.participantMetaExpanded[kind]) return;
    const bucket = state.participantMetaExpanded[kind];
    if (bucket.has(participantId)) {
      bucket.delete(participantId);
    } else {
      bucket.add(participantId);
    }
  }

  function renderParticipantPills(participantId, kind, values, pillClass) {
    const list = Array.isArray(values) ? values.filter(Boolean) : [];
    if (!list.length) {
      return '<span>-</span>';
    }

    const expanded = isMetaExpanded(kind, participantId);
    const maxVisible = expanded ? list.length : 2;
    const visible = list.slice(0, maxVisible);
    const hiddenCount = Math.max(0, list.length - visible.length);

    const pills = visible
      .map((item) => `<span class="${pillClass}">${escapeHtml(item)}</span>`)
      .join('');
    const toggleButton = list.length > 2
      ? `<button type="button" class="btn btn-light btn-inline-more" data-action="toggle-${kind}" data-id="${escapeHtml(participantId)}">${expanded ? 'See less' : `See more (${hiddenCount})`}</button>`
      : '';

    return `${pills}${toggleButton}`;
  }

  function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function setMessage(target, text, isError) {
    if (!target) return;
    target.textContent = text || '';
    target.style.color = isError ? '#ef4444' : '#64748b';
  }

  function setGlobalMessage(text, isError) {
    setMessage(els.globalMessage, text, isError);
  }

  function normalizeTheme(value) {
    return value === 'dark' ? 'dark' : 'light';
  }

  function updateThemeToggleUi() {
    if (!els.themeToggleBtn) return;
    const darkActive = state.theme === 'dark';
    els.themeToggleBtn.setAttribute('aria-pressed', darkActive ? 'true' : 'false');
    els.themeToggleBtn.setAttribute('aria-label', darkActive ? 'Switch to light mode' : 'Switch to dark mode');
    if (els.themeToggleLabel) {
      els.themeToggleLabel.textContent = darkActive ? 'Light' : 'Dark';
    }
  }

  function applyTheme(theme, options = {}) {
    const normalized = normalizeTheme(theme);
    const shouldPersist = options.persist === true;
    state.theme = normalized;
    document.documentElement.setAttribute('data-theme', normalized);
    updateThemeToggleUi();

    if (shouldPersist) {
      state.themeManual = true;
      localStorage.setItem(THEME_STORAGE_KEY, normalized);
    }
  }

  function initializeTheme() {
    const fromStorage = normalizeTheme(savedTheme);
    if (savedTheme === 'dark' || savedTheme === 'light') {
      applyTheme(fromStorage);
      return;
    }

    const fromSystem = SYSTEM_THEME_QUERY.matches ? 'dark' : 'light';
    applyTheme(fromSystem);
  }

  function handleThemeToggle() {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme, { persist: true });
  }

  function handleSystemThemeChange(event) {
    if (state.themeManual) {
      return;
    }
    applyTheme(event.matches ? 'dark' : 'light');
  }

  function isMobileNavViewport() {
    return MOBILE_NAV_QUERY.matches;
  }

  function setMobileNavOpen(shouldOpen) {
    const canOpen = !els.appShell.hidden && isMobileNavViewport();
    const isOpen = Boolean(shouldOpen) && canOpen;
    state.mobileNavOpen = isOpen;

    els.appShell.classList.toggle('sidebar-open', isOpen);
    document.body.classList.toggle('admin-drawer-open', isOpen);

    if (els.mobileNavToggle) {
      els.mobileNavToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      els.mobileNavToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
    }
  }

  function closeMobileNav() {
    setMobileNavOpen(false);
  }

  function toggleMobileNav() {
    setMobileNavOpen(!state.mobileNavOpen);
  }

  function syncMobileNavForViewport() {
    if (!isMobileNavViewport()) {
      closeMobileNav();
    } else if (els.mobileNavToggle) {
      els.mobileNavToggle.setAttribute('aria-expanded', state.mobileNavOpen ? 'true' : 'false');
    }
  }

  function showLogin() {
    closeMobileNav();
    els.loginScreen.hidden = false;
    els.appShell.hidden = true;
  }

  function showApp() {
    els.loginScreen.hidden = true;
    els.appShell.hidden = false;
    closeMobileNav();
  }

  function setAuthToken(token) {
    state.token = token || '';
    if (state.token) {
      localStorage.setItem(STORAGE_KEY, state.token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function clearAuth() {
    setAuthToken('');
    state.user = null;
    state.sections = [];
    state.participants = [];
    state.accounts = [];
    state.clientRequests = [];
    state.hiredProfiles = [];
    state.selectedClientParticipantIds = new Set();
    state.participantMetaExpanded.skills = new Set();
    state.participantMetaExpanded.sections = new Set();
    showLogin();
  }

  function requestHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) {
      headers.Authorization = `Bearer ${state.token}`;
    }
    return headers;
  }

  function normalizeApiPath(path) {
    const raw = String(path || '').trim();
    if (!raw || raw === '/') return raw;

    const queryIndex = raw.indexOf('?');
    const hashIndex = raw.indexOf('#');
    let cutIndex = -1;
    if (queryIndex >= 0 && hashIndex >= 0) {
      cutIndex = Math.min(queryIndex, hashIndex);
    } else if (queryIndex >= 0) {
      cutIndex = queryIndex;
    } else if (hashIndex >= 0) {
      cutIndex = hashIndex;
    }

    const pathname = cutIndex >= 0 ? raw.slice(0, cutIndex) : raw;
    const suffix = cutIndex >= 0 ? raw.slice(cutIndex) : '';
    if (!pathname || pathname === '/') {
      return `${pathname}${suffix}`;
    }

    return `${pathname.replace(/\/+$/g, '')}${suffix}`;
  }

  function addTrailingSlash(path) {
    const raw = String(path || '').trim();
    if (!raw || raw === '/') return raw;

    const queryIndex = raw.indexOf('?');
    const hashIndex = raw.indexOf('#');
    let cutIndex = -1;
    if (queryIndex >= 0 && hashIndex >= 0) {
      cutIndex = Math.min(queryIndex, hashIndex);
    } else if (queryIndex >= 0) {
      cutIndex = queryIndex;
    } else if (hashIndex >= 0) {
      cutIndex = hashIndex;
    }

    const pathname = cutIndex >= 0 ? raw.slice(0, cutIndex) : raw;
    const suffix = cutIndex >= 0 ? raw.slice(cutIndex) : '';
    if (!pathname || pathname === '/' || pathname.endsWith('/')) {
      return `${pathname}${suffix}`;
    }

    return `${pathname}/${suffix}`;
  }

  async function fetchApi(path, options) {
    const response = await fetch(path, {
      method: options.method || 'GET',
      headers: options.headers || requestHeaders(),
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    return { response, payload };
  }

  async function api(path, options = {}) {
    const normalizedPath = normalizeApiPath(path);
    const method = String(options.method || 'GET').toUpperCase();

    let { response, payload } = await fetchApi(normalizedPath, options);
    if (response.status === 404 && method === 'GET' && normalizedPath.startsWith('/api/')) {
      const fallbackPath = addTrailingSlash(normalizedPath);
      if (fallbackPath !== normalizedPath) {
        const retry = await fetchApi(fallbackPath, options);
        response = retry.response;
        payload = retry.payload;
      }
    }

    if (!response.ok || payload.success === false) {
      const error = new Error(payload.error || `Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }

    return payload;
  }

  function sectionNameById(sectionId) {
    const section = state.sections.find((entry) => entry.id === sectionId);
    return section ? section.name : sectionId;
  }

  function getFilteredParticipants() {
    const search = state.participantFilters.search.toLowerCase();
    const section = state.participantFilters.section.toLowerCase();
    const status = state.participantFilters.status.toLowerCase();

    return state.participants.filter((participant) => {
      if (section && (!Array.isArray(participant.sections) || !participant.sections.includes(section))) {
        return false;
      }

      if (status && String(participant.status || '').toLowerCase() !== status) {
        return false;
      }

      if (!search) {
        return true;
      }

      const blob = [
        participant.fullName,
        participant.contactNumber,
        participant.email,
        participant.gender,
        participant.address,
        participant.notes,
        ...(Array.isArray(participant.skills) ? participant.skills : []),
        ...(Array.isArray(participant.sections) ? participant.sections.map((id) => sectionNameById(id)) : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return blob.includes(search);
    });
  }

  function renderStats() {
    els.statParticipants.textContent = String(state.counts.participants || state.participants.length);
    els.statSections.textContent = String(state.counts.sections || state.sections.length);
    els.statAccounts.textContent = String(state.counts.subAccounts || state.accounts.length || 0);
  }

  function renderUser() {
    if (!state.user) {
      els.userBadge.innerHTML = '';
      return;
    }
    const roleText = state.user.role === 'admin' ? 'Admin' : '';
    const displayName = escapeHtml(state.user.displayName || state.user.username);
    els.userBadge.innerHTML = `
      <strong>${displayName}</strong>
      <span>${escapeHtml(roleText)}</span>
    `;
  }

  function renderSectionFilterOptions() {
    const current = state.participantFilters.section;
    els.participantsSectionFilter.innerHTML = [
      '<option value="">All sections</option>',
      ...state.sections.map((section) => `<option value="${escapeHtml(section.id)}">${escapeHtml(section.name)}</option>`),
    ].join('');

    if ([...els.participantsSectionFilter.options].some((option) => option.value === current)) {
      els.participantsSectionFilter.value = current;
    }

    // Keep internal filter state in sync after section create/delete updates.
    state.participantFilters.section = String(els.participantsSectionFilter.value || '').trim();
  }

  function formatDateTime(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function requestStatusLabel(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'approved') return 'Approved';
    if (normalized === 'scheduled') return 'Scheduled';
    if (normalized === 'declined') return 'Declined';
    if (normalized === 'finalized') return 'Finalized';
    return 'Pending';
  }

  function updateClientSelectedMeta() {
    if (!els.clientSelectedMeta) return;
    els.clientSelectedMeta.textContent = `${state.selectedClientParticipantIds.size} selected`;
  }

  function renderClientSectionFilterOptions() {
    if (!els.clientPoolSectionFilter) return;
    const current = state.clientPoolFilters.section;
    els.clientPoolSectionFilter.innerHTML = [
      '<option value="">All sections</option>',
      ...state.sections.map((section) => `<option value="${escapeHtml(section.id)}">${escapeHtml(section.name)}</option>`),
    ].join('');

    if ([...els.clientPoolSectionFilter.options].some((option) => option.value === current)) {
      els.clientPoolSectionFilter.value = current;
    }

    state.clientPoolFilters.section = String(els.clientPoolSectionFilter.value || '').trim();
  }

  function getClientPoolParticipants() {
    const search = String(state.clientPoolFilters.search || '').toLowerCase();
    const sectionFilter = String(state.clientPoolFilters.section || '').toLowerCase();
    const statusFilter = String(state.clientPoolFilters.status || '').toLowerCase();

    return state.participants.filter((participant) => {
      const status = String(participant.status || '').toLowerCase();
      const sectionIds = Array.isArray(participant.sections) ? participant.sections : [];

      if (sectionFilter && !sectionIds.includes(sectionFilter)) {
        return false;
      }

      if (statusFilter) {
        if (status !== statusFilter) return false;
      } else if (!['shortlisted', 'talent_pool'].includes(status)) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = [
        participant.fullName,
        participant.email,
        participant.contactNumber,
        ...(Array.isArray(participant.skills) ? participant.skills : []),
        ...sectionIds.map((id) => sectionNameById(id)),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });
  }

  function renderClientPoolTable() {
    if (!els.clientPoolTableBody) return;

    const filtered = getClientPoolParticipants();
    if (!filtered.length) {
      els.clientPoolTableBody.innerHTML = `
        <tr>
          <td colspan="5">
            <p class="message">No candidate profiles match this filter.</p>
          </td>
        </tr>
      `;
      updateClientSelectedMeta();
      return;
    }

    els.clientPoolTableBody.innerHTML = filtered
      .map((participant) => {
        const sectionNames = (participant.sections || [])
          .map((sectionId) => sectionNameById(sectionId))
          .filter(Boolean);
        const sectionLabel = sectionNames.length > 1
          ? `${sectionNames[0]} +${sectionNames.length - 1} more`
          : (sectionNames[0] || '-');
        const checked = state.selectedClientParticipantIds.has(participant.id) ? 'checked' : '';

        return `
          <tr>
            <td data-label="Select">
              <input type="checkbox" data-action="toggle-client-participant" data-id="${escapeHtml(participant.id)}" ${checked}>
            </td>
            <td data-label="Name">
              <button type="button" class="btn btn-link profile-link" data-action="open-profile" data-id="${escapeHtml(participant.id)}">${escapeHtml(participant.fullName || 'Unnamed')}</button>
            </td>
            <td data-label="Email">${escapeHtml(participant.email || '-')}</td>
            <td data-label="Section">${escapeHtml(sectionLabel)}</td>
            <td data-label="Status">
              <span class="pill-status status-${escapeHtml(participant.status || 'talent_pool')}">${escapeHtml(statusLabel(participant.status))}</span>
            </td>
          </tr>
        `;
      })
      .join('');

    updateClientSelectedMeta();
  }

  function renderClientRequests() {
    if (!els.clientRequestsList) return;
    if (els.clientRequestsMeta) {
      els.clientRequestsMeta.textContent = `${state.clientRequests.length} requests`;
    }

    if (!state.clientRequests.length) {
      els.clientRequestsList.innerHTML = '<p class="message empty-state">No client requests yet.</p>';
      return;
    }

    els.clientRequestsList.innerHTML = state.clientRequests
      .map((request) => {
        const selectedProfiles = Array.isArray(request.selectedParticipants) ? request.selectedParticipants : [];
        const selectedCount = selectedProfiles.length;
        const status = String(request.status || 'pending').toLowerCase();
        const statusClass = `request-${status}`;
        const interviewAt = request.interviewDateTime ? formatDateTime(request.interviewDateTime) : 'Not set';
        const ceoAt = request.ceoMeetingDateTime ? formatDateTime(request.ceoMeetingDateTime) : 'Not set';
        const ceoMode = request.ceoIncluded ? 'Included' : 'Not required';
        const profileOptions = selectedProfiles
          .map((profile) => `
            <label class="client-request-profile-row">
              <input type="checkbox" data-manual-hire="${escapeHtml(request.id)}" value="${escapeHtml(profile.id)}">
              <span>${escapeHtml(profile.fullName || 'Unnamed')}</span>
            </label>
          `)
          .join('');

        const finalizedNames = (request.finalizedParticipantIds || [])
          .map((participantId) => {
            const matched = selectedProfiles.find((profile) => profile.id === participantId);
            return matched ? matched.fullName : participantId;
          })
          .filter(Boolean)
          .join(', ');

        const statusControls = isAdmin() && status !== 'finalized'
          ? `
            <button type="button" class="btn btn-light" data-action="set-request-status" data-status="approved" data-id="${escapeHtml(request.id)}">Mark Approved</button>
            <button type="button" class="btn btn-light" data-action="set-request-status" data-status="scheduled" data-id="${escapeHtml(request.id)}">Mark Scheduled</button>
            <button type="button" class="btn btn-light" data-action="set-request-status" data-status="declined" data-id="${escapeHtml(request.id)}">Decline</button>
          `
          : '';

        const finalizeBlock = status === 'finalized'
          ? `<p class="client-request-meta">Finalized profiles: ${escapeHtml(finalizedNames || 'No profiles recorded')}</p>`
          : `
            <div class="client-request-profiles">
              ${profileOptions || '<p class="message">No selected profiles.</p>'}
            </div>
            <div class="client-request-actions-row">
              <button type="button" class="btn btn-primary" data-action="finalize-all" data-id="${escapeHtml(request.id)}">Hire All Selected</button>
              <button type="button" class="btn btn-light" data-action="finalize-manual" data-id="${escapeHtml(request.id)}">Finalize Checked Profiles</button>
              ${statusControls}
            </div>
          `;

        return `
          <article class="client-request-item">
            <div class="client-request-head">
              <strong>${escapeHtml(request.clientName || 'Client')}</strong>
              <span class="pill-status ${statusClass}">${escapeHtml(requestStatusLabel(status))}</span>
            </div>
            <p class="client-request-meta">Email: ${escapeHtml(request.clientEmail || '-')} | Company: ${escapeHtml(request.clientCompany || '-')}</p>
            <p class="client-request-meta">Profiles selected: ${selectedCount} | Interview: ${escapeHtml(interviewAt)} | CEO meeting: ${escapeHtml(ceoAt)} (${escapeHtml(ceoMode)})</p>
            <p class="client-request-message">${escapeHtml(request.requestMessage || 'No message provided.')}</p>
            ${finalizeBlock}
          </article>
        `;
      })
      .join('');
  }

  function renderHiredProfilesTable() {
    if (!els.hiredProfilesTableBody) return;
    if (els.hiredProfilesMeta) {
      els.hiredProfilesMeta.textContent = `${state.hiredProfiles.length} hires`;
    }

    if (!state.hiredProfiles.length) {
      els.hiredProfilesTableBody.innerHTML = `
        <tr>
          <td colspan="4">
            <p class="message">No hired profiles recorded yet.</p>
          </td>
        </tr>
      `;
      return;
    }

    els.hiredProfilesTableBody.innerHTML = state.hiredProfiles
      .map((profile) => `
        <tr>
          <td data-label="Applicant"><strong>${escapeHtml(profile.participantName || '-')}</strong></td>
          <td data-label="Client">${escapeHtml(profile.clientName || '-')}</td>
          <td data-label="Company">${escapeHtml(profile.clientCompany || '-')}</td>
          <td data-label="Hired At">${escapeHtml(formatDateTime(profile.hiredAt))}</td>
        </tr>
      `)
      .join('');
  }

  function renderClientWorkspace() {
    renderClientSectionFilterOptions();
    renderClientPoolTable();
    renderClientRequests();
    renderHiredProfilesTable();
  }

  function renderOverview() {
    const sectionCounts = new Map();
    state.participants.forEach((participant) => {
      (participant.sections || []).forEach((sectionId) => {
        sectionCounts.set(sectionId, (sectionCounts.get(sectionId) || 0) + 1);
      });
    });

    if (els.overviewSectionsMeta) {
      els.overviewSectionsMeta.textContent = `${state.sections.length} sections`;
    }

    if (!state.sections.length) {
      els.overviewSectionChips.innerHTML = '<p class="message empty-state">No sections yet.</p>';
    } else {
      const maxCount = Math.max(1, ...state.sections.map((section) => sectionCounts.get(section.id) || 0));
      els.overviewSectionChips.innerHTML = state.sections
        .map((section) => {
          const count = sectionCounts.get(section.id) || 0;
          const ratio = count <= 0 ? 4 : Math.max(8, Math.round((count / maxCount) * 100));
          return `
            <div class="coverage-item">
              <div class="coverage-top">
                <strong>${escapeHtml(section.name)}</strong>
                <span>${count}</span>
              </div>
              <div class="coverage-track">
                <span style="width:${ratio}%"></span>
              </div>
            </div>
          `;
        })
        .join('');
    }

    const recent = [...state.participants]
      .sort((a, b) => Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || ''))
      .slice(0, 8);

    if (els.overviewRecentMeta) {
      els.overviewRecentMeta.textContent = `${recent.length} recent`;
    }

    if (!recent.length) {
      els.overviewRecentList.innerHTML = '<p class="message empty-state">No participants added yet.</p>';
      return;
    }

    els.overviewRecentList.innerHTML = recent
      .map((participant) => `
        <div class="compact-row">
          <div class="compact-main">
            <strong>${escapeHtml(participant.fullName || 'Unnamed')}</strong>
            <span class="compact-sub">${escapeHtml(statusLabel(participant.status))}</span>
          </div>
          <span>${escapeHtml(formatDate(participant.updatedAt))}</span>
        </div>
      `)
      .join('');
  }

  function renderParticipantsTable() {
    const filtered = getFilteredParticipants();
    if (!filtered.length) {
      els.participantsTableBody.innerHTML = `
        <tr>
          <td colspan="7">
            <p class="message">No participants found for this filter.</p>
          </td>
        </tr>
      `;
      return;
    }

    els.participantsTableBody.innerHTML = filtered
      .map((participant) => {
        const skillList = Array.isArray(participant.skills) ? participant.skills : [];
        const sectionList = (participant.sections || []).map((sectionId) => sectionNameById(sectionId));
        const contactParts = [];
        if (participant.contactNumber) {
          contactParts.push(`<div>${escapeHtml(participant.contactNumber)}</div>`);
        }
        if (participant.email) {
          contactParts.push(`<div>${escapeHtml(participant.email)}</div>`);
        }
        const contactMarkup = contactParts.length ? contactParts.join('') : '<span>-</span>';
        const actionButtons = [];
        actionButtons.push(`<button type="button" class="btn btn-light" data-action="open-profile" data-id="${escapeHtml(participant.id)}">Profile</button>`);

        if (isAdmin()) {
          if (String(participant.status || '').toLowerCase() === 'shortlisted') {
            actionButtons.push(`<button type="button" class="btn btn-light" data-action="remove-shortlist" data-id="${escapeHtml(participant.id)}">Unshortlist</button>`);
          } else {
            actionButtons.push(`<button type="button" class="btn btn-primary" data-action="quick-shortlist" data-id="${escapeHtml(participant.id)}">Shortlist</button>`);
          }
          actionButtons.push(`<button type="button" class="btn btn-light" data-action="edit" data-id="${escapeHtml(participant.id)}">Edit</button>`);
          actionButtons.push(`<button type="button" class="btn btn-danger" data-action="delete" data-id="${escapeHtml(participant.id)}">Delete</button>`);
        } else {
          actionButtons.push(`<button type="button" class="btn btn-light" data-action="view" data-id="${escapeHtml(participant.id)}">View</button>`);
        }

        const resumeButton = participant.resume && participant.resume.dataUrl
          ? `<a class="btn btn-light" href="${escapeHtml(participant.resume.dataUrl)}" download="${escapeHtml(participant.resume.fileName || 'resume')}">Resume</a>`
          : '';
        const avatar = participant.profilePicture && participant.profilePicture.dataUrl
          ? `<img class="participant-avatar" src="${escapeHtml(participant.profilePicture.dataUrl)}" alt="${escapeHtml(participant.fullName || 'Participant')} profile picture">`
          : `<span class="participant-avatar participant-avatar-fallback">${escapeHtml(initialsFromName(participant.fullName))}</span>`;
        const safeName = escapeHtml(participant.fullName || '');
        const skillMarkup = renderParticipantPills(participant.id, 'skills', skillList, 'pill pill-skill');
        const sectionMarkup = renderParticipantPills(participant.id, 'sections', sectionList, 'pill pill-section');

        return `
          <tr>
            <td data-label="Name">
              <div class="participant-name-cell">
                ${avatar}
                <button type="button" class="btn btn-link profile-link" data-action="open-profile" data-id="${escapeHtml(participant.id)}">${safeName}</button>
              </div>
            </td>
            <td data-label="Contact">
              ${contactMarkup}
            </td>
            <td data-label="Skills">
              <div class="pill-group">
                ${skillMarkup}
              </div>
            </td>
            <td data-label="Sections">
              <div class="pill-group">
                ${sectionMarkup}
              </div>
            </td>
            <td data-label="Status">
              <span class="pill-status status-${escapeHtml(participant.status || 'talent_pool')}">${escapeHtml(statusLabel(participant.status))}</span>
            </td>
            <td data-label="Updated">${escapeHtml(formatDate(participant.updatedAt))}</td>
            <td data-label="Actions">
              <div class="pill-group">
                ${actionButtons.join('')}
                ${resumeButton}
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  function renderSectionsTable() {
    const counts = new Map();
    state.participants.forEach((participant) => {
      (participant.sections || []).forEach((sectionId) => {
        counts.set(sectionId, (counts.get(sectionId) || 0) + 1);
      });
    });

    if (!state.sections.length) {
      els.sectionsTableBody.innerHTML = `
        <tr>
          <td colspan="4">
            <p class="message">No sections available.</p>
          </td>
        </tr>
      `;
      return;
    }

    els.sectionsTableBody.innerHTML = state.sections
      .map((section) => `
        <tr>
          <td data-label="Section"><strong>${escapeHtml(section.name)}</strong></td>
          <td data-label="Description">${escapeHtml(section.description || '-')}</td>
          <td data-label="Participants">${counts.get(section.id) || 0}</td>
          <td data-label="Actions">
            ${isAdmin() ? `
              <div class="pill-group">
                <button type="button" class="btn btn-light" data-action="rename-section" data-id="${escapeHtml(section.id)}">Rename</button>
                <button type="button" class="btn btn-danger" data-action="delete-section" data-id="${escapeHtml(section.id)}">Delete</button>
              </div>
            ` : '<span>-</span>'}
          </td>
        </tr>
      `)
      .join('');
  }

  function renderAccountsTable() {
    if (!isAdmin()) {
      els.accountsTableBody.innerHTML = '';
      return;
    }

    if (!state.accounts.length) {
      els.accountsTableBody.innerHTML = `
        <tr>
          <td colspan="5"><p class="message">No sub-accounts yet.</p></td>
        </tr>
      `;
      return;
    }

    els.accountsTableBody.innerHTML = state.accounts
      .map((account) => `
        <tr>
          <td data-label="Username">@${escapeHtml(account.username)}</td>
          <td data-label="Display Name">${escapeHtml(account.displayName || account.username)}</td>
          <td data-label="Status">${account.isActive ? 'Active' : 'Inactive'}</td>
          <td data-label="Created">${escapeHtml(formatDate(account.createdAt))}</td>
          <td data-label="Actions">
            <div class="pill-group">
              <button type="button" class="btn btn-light" data-action="toggle-account" data-id="${escapeHtml(account.id)}">
                ${account.isActive ? 'Disable' : 'Enable'}
              </button>
              <button type="button" class="btn btn-light" data-action="reset-account-password" data-id="${escapeHtml(account.id)}">Reset Password</button>
              <button type="button" class="btn btn-danger" data-action="delete-account" data-id="${escapeHtml(account.id)}">Delete</button>
            </div>
          </td>
        </tr>
      `)
      .join('');
  }

  function renderSectionsChecklist(selectedSections) {
    const selectedSet = new Set(selectedSections || []);
    els.sectionsChecklist.innerHTML = state.sections
      .map((section) => `
        <label class="check-item">
          <input type="checkbox" value="${escapeHtml(section.id)}" ${selectedSet.has(section.id) ? 'checked' : ''}>
          <span>${escapeHtml(section.name)}</span>
        </label>
      `)
      .join('');
  }

  function renderResumeMeta(participant) {
    if (state.resumeDraft && state.resumeDraft.remove === true) {
      els.resumeMeta.innerHTML = 'Resume will be removed when you save.';
      return;
    }

    if (state.resumeDraft && state.resumeDraft.dataUrl) {
      els.resumeMeta.innerHTML = `
        Selected file: <strong>${escapeHtml(state.resumeDraft.fileName || 'resume')}</strong>
        <button type="button" id="removeResumeBtn" class="btn btn-light">Remove</button>
      `;
      return;
    }

    const resume = participant && participant.resume;
    if (resume && resume.dataUrl) {
      els.resumeMeta.innerHTML = `
        Existing file: <a href="${escapeHtml(resume.dataUrl)}" download="${escapeHtml(resume.fileName || 'resume')}">${escapeHtml(resume.fileName || 'resume')}</a>
        <button type="button" id="removeResumeBtn" class="btn btn-light">Remove</button>
      `;
      return;
    }

    els.resumeMeta.innerHTML = 'No resume attached.';
  }

  function renderProfilePictureMeta(participant) {
    if (state.profilePictureDraft && state.profilePictureDraft.remove === true) {
      els.profilePictureMeta.innerHTML = 'Profile picture will be removed when you save.';
      return;
    }

    if (state.profilePictureDraft && state.profilePictureDraft.dataUrl) {
      els.profilePictureMeta.innerHTML = `
        <span>Selected profile picture:</span>
        <img class="profile-meta-preview" src="${escapeHtml(state.profilePictureDraft.dataUrl)}" alt="Selected profile picture preview">
        <button type="button" id="removeProfilePictureBtn" class="btn btn-light">Remove</button>
      `;
      return;
    }

    const profilePicture = participant && participant.profilePicture;
    if (profilePicture && profilePicture.dataUrl) {
      const fileName = profilePicture.fileName || 'profile-picture';
      els.profilePictureMeta.innerHTML = `
        <span>Existing profile picture:</span>
        <img class="profile-meta-preview" src="${escapeHtml(profilePicture.dataUrl)}" alt="Existing profile picture preview">
        <strong>${escapeHtml(fileName)}</strong>
        <button type="button" id="removeProfilePictureBtn" class="btn btn-light">Remove</button>
      `;
      return;
    }

    els.profilePictureMeta.innerHTML = 'No profile picture attached.';
  }

  function renderParticipantProfileHero(mode, participant) {
    if (!els.participantProfileHero) return;

    if (!participant || mode === 'create') {
      els.participantProfileHero.hidden = true;
      els.participantProfileHero.innerHTML = '';
      return;
    }

    const avatar = participant.profilePicture && participant.profilePicture.dataUrl
      ? `<img class="participant-profile-hero-avatar" src="${escapeHtml(participant.profilePicture.dataUrl)}" alt="${escapeHtml(participant.fullName || 'Participant')} profile picture">`
      : `<span class="participant-profile-hero-avatar participant-avatar participant-avatar-fallback">${escapeHtml(initialsFromName(participant.fullName))}</span>`;
    const sectionCount = Array.isArray(participant.sections) ? participant.sections.length : 0;
    const skillCount = Array.isArray(participant.skills) ? participant.skills.length : 0;

    els.participantProfileHero.innerHTML = `
      <div class="participant-profile-hero-main">
        ${avatar}
        <div class="participant-profile-hero-copy">
          <strong>${escapeHtml(participant.fullName || 'Participant')}</strong>
          <span>${escapeHtml(statusLabel(participant.status))}</span>
        </div>
      </div>
      <div class="participant-profile-hero-meta">
        <span>${sectionCount} sections</span>
        <span>${skillCount} skills</span>
        <span>Updated ${escapeHtml(formatDate(participant.updatedAt))}</span>
      </div>
    `;
    els.participantProfileHero.hidden = false;
  }

  function lockParticipantFormForViewMode(isViewMode) {
    const fields = [
      els.fullName,
      els.contactNumber,
      els.email,
      els.gender,
      els.address,
      els.age,
      els.birthdate,
      els.status,
      els.skills,
      els.notes,
      els.profilePictureFile,
      els.resumeFile,
    ];

    fields.forEach((field) => {
      field.disabled = isViewMode;
    });

    Array.from(els.sectionsChecklist.querySelectorAll('input')).forEach((checkbox) => {
      checkbox.disabled = isViewMode;
    });

    els.saveParticipantBtn.hidden = isViewMode;
    els.deleteParticipantBtn.hidden = isViewMode || !isAdmin() || !state.editingParticipantId;
  }

  function showParticipantModal() {
    els.participantModal.hidden = false;
    document.body.classList.add('admin-modal-open');
  }

  function hideParticipantModal() {
    els.participantModal.hidden = true;
    document.body.classList.remove('admin-modal-open');
    state.editingParticipantId = '';
    state.profilePictureDraft = null;
    state.resumeDraft = null;
    els.participantForm.reset();
    els.participantId.value = '';
    renderSectionsChecklist([]);
    renderParticipantProfileHero('create', null);
    renderProfilePictureMeta(null);
    renderResumeMeta(null);
    lockParticipantFormForViewMode(false);
  }

  function getParticipantById(participantId) {
    return state.participants.find((entry) => entry.id === participantId) || null;
  }

  function openParticipantModal(mode, participant) {
    const isView = mode === 'view';
    const isEdit = mode === 'edit';
    const isCreate = mode === 'create';

    state.editingParticipantId = isEdit ? participant.id : '';
    state.profilePictureDraft = null;
    state.resumeDraft = null;
    els.participantForm.reset();
    els.participantId.value = participant ? participant.id : '';

    els.fullName.value = participant?.fullName || '';
    els.contactNumber.value = participant?.contactNumber || '';
    els.email.value = participant?.email || '';
    els.gender.value = participant?.gender || '';
    els.address.value = participant?.address || '';
    els.age.value = participant?.age === null || participant?.age === undefined ? '' : String(participant.age);
    els.birthdate.value = participant?.birthdate || '';
    els.status.value = participant?.status || 'talent_pool';
    els.skills.value = Array.isArray(participant?.skills) ? participant.skills.join(', ') : '';
    els.notes.value = participant?.notes || '';

    renderSectionsChecklist(participant?.sections || []);
    renderParticipantProfileHero(mode, participant || null);
    renderProfilePictureMeta(participant || null);
    renderResumeMeta(participant || null);

    if (isCreate) {
      els.participantModalTitle.textContent = 'Add Participant';
    } else if (isEdit) {
      els.participantModalTitle.textContent = 'Edit Participant';
    } else {
      els.participantModalTitle.textContent = 'Participant Profile';
    }

    lockParticipantFormForViewMode(isView);
    showParticipantModal();
  }

  function collectSelectedSectionIds() {
    return Array.from(els.sectionsChecklist.querySelectorAll('input[type="checkbox"]:checked'))
      .map((input) => input.value);
  }

  function collectParticipantPayload() {
    const payload = {
      fullName: String(els.fullName.value || '').trim(),
      contactNumber: String(els.contactNumber.value || '').trim(),
      email: String(els.email.value || '').trim(),
      gender: String(els.gender.value || '').trim(),
      address: String(els.address.value || '').trim(),
      age: String(els.age.value || '').trim(),
      birthdate: String(els.birthdate.value || '').trim(),
      skills: String(els.skills.value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      sections: collectSelectedSectionIds(),
      status: String(els.status.value || 'talent_pool').trim(),
      notes: String(els.notes.value || '').trim(),
    };

    if (state.resumeDraft !== null) {
      payload.resume = state.resumeDraft;
    }

    if (state.profilePictureDraft !== null) {
      payload.profilePicture = state.profilePictureDraft;
    }

    return payload;
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  }

  async function loadDashboardData() {
    const [dashboardRes, sectionsRes, participantsRes] = await Promise.all([
      api('/api/admin/dashboard'),
      api('/api/admin/sections'),
      api('/api/admin/participants'),
    ]);

    state.sections = sectionsRes.sections || [];
    state.participants = participantsRes.participants || [];
    state.clientRequests = [];
    state.hiredProfiles = [];
    state.counts = dashboardRes.counts || {
      participants: state.participants.length,
      sections: state.sections.length,
      subAccounts: state.accounts.length,
    };

    if (isAdmin()) {
      const accountsRes = await api('/api/admin/accounts');
      state.accounts = accountsRes.accounts || [];
      state.counts.subAccounts = state.accounts.length;
    } else {
      state.accounts = [];
    }

    try {
      const clientRequestsRes = await api('/api/admin/client-requests');
      state.clientRequests = clientRequestsRes.requests || [];
      state.hiredProfiles = clientRequestsRes.hiredProfiles || [];
    } catch (error) {
      state.clientRequests = [];
      state.hiredProfiles = [];
      console.warn('Client request workspace unavailable:', error.message || error);
    }

    const validParticipantIds = new Set(state.participants.map((participant) => participant.id));
    state.selectedClientParticipantIds = new Set(
      Array.from(state.selectedClientParticipantIds).filter((participantId) => validParticipantIds.has(participantId)),
    );
    state.participantMetaExpanded.skills = new Set(
      Array.from(state.participantMetaExpanded.skills).filter((participantId) => validParticipantIds.has(participantId)),
    );
    state.participantMetaExpanded.sections = new Set(
      Array.from(state.participantMetaExpanded.sections).filter((participantId) => validParticipantIds.has(participantId)),
    );

    renderSectionFilterOptions();
    renderClientSectionFilterOptions();
    renderStats();
    renderOverview();
    renderParticipantsTable();
    renderSectionsTable();
    renderAccountsTable();
    renderClientWorkspace();
  }

  function renderView() {
    const views = [
      { id: 'overview', el: els.viewOverview, title: 'Overview' },
      { id: 'participants', el: els.viewParticipants, title: 'Participants' },
      { id: 'sections', el: els.viewSections, title: 'Sections' },
      { id: 'client-requests', el: els.viewClientRequests, title: 'Client Requests' },
      { id: 'accounts', el: els.viewAccounts, title: 'Accounts' },
    ];

    views.forEach((view) => {
      view.el.classList.toggle('active', view.id === state.activeView);
    });

    els.navButtons.forEach((button) => {
      button.classList.toggle('active', button.getAttribute('data-view') === state.activeView);
    });

    const activeView = views.find((view) => view.id === state.activeView);
    if (activeView && els.topbarTitle) {
      els.topbarTitle.textContent = activeView.title;
    }
    if (els.topbarEyebrow) {
      els.topbarEyebrow.textContent = 'Applicant Talent Pipeline';
    }
  }

  function syncClientRequestDefaults() {
    if (!state.user) return;
    if (els.clientRequestName && !els.clientRequestName.value) {
      els.clientRequestName.value = String(state.user.displayName || state.user.username || '').trim();
    }
  }

  function applyRoleAccess() {
    const admin = isAdmin();
    const accountsNav = els.navButtons.find((button) => button.getAttribute('data-view') === 'accounts');
    document.body.classList.toggle('is-viewer', !admin);
    els.createParticipantBtn.hidden = !admin;
    els.sectionForm.hidden = !admin;
    els.accountForm.hidden = !admin;
    if (accountsNav) {
      accountsNav.hidden = !admin;
    }

    syncClientRequestDefaults();

    if (!admin && state.activeView === 'accounts') {
      state.activeView = 'overview';
      renderView();
    }
  }

  async function refreshAndRender() {
    await loadDashboardData();
    renderUser();
    applyRoleAccess();
    renderView();
  }

  async function handleLogin(event) {
    event.preventDefault();
    setMessage(els.loginMessage, '', false);

    const username = String(els.loginUsername.value || '').trim();
    const password = String(els.loginPassword.value || '');
    if (!username || !password) {
      setMessage(els.loginMessage, 'Username and password are required.', true);
      return;
    }

    try {
      const response = await api('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { username, password },
      });

      setAuthToken(response.token);
      state.user = response.user;
      els.loginPassword.value = '';
      showApp();
      await refreshAndRender();
      setGlobalMessage('Signed in successfully.', false);
    } catch (error) {
      if (els.appShell.hidden) {
        setMessage(els.loginMessage, error.message || 'Login failed.', true);
      } else {
        setGlobalMessage(error.message || 'Failed to load dashboard data.', true);
      }
    }
  }

  async function bootstrapSession() {
    if (!state.token) {
      showLogin();
      return;
    }

    try {
      const me = await api('/api/admin/me');
      state.user = me.user;
      showApp();
      await refreshAndRender();
    } catch {
      clearAuth();
      setMessage(els.loginMessage, 'Session expired. Please sign in again.', true);
    }
  }

  async function handleParticipantSubmit(event) {
    event.preventDefault();
    if (!isAdmin()) return;

    const payload = collectParticipantPayload();
    if (!payload.fullName) {
      setGlobalMessage('Full name is required.', true);
      return;
    }

    try {
      if (state.editingParticipantId) {
        await api('/api/admin/participants', {
          method: 'PUT',
          body: {
            id: state.editingParticipantId,
            ...payload,
          },
        });
        setGlobalMessage('Participant updated.', false);
      } else {
        await api('/api/admin/participants', {
          method: 'POST',
          body: payload,
        });
        setGlobalMessage('Participant created.', false);
      }

      hideParticipantModal();
      await refreshAndRender();
    } catch (error) {
      const rawMessage = String(error.message || 'Failed to save participant.');
      if (/profile_picture/i.test(rawMessage)) {
        setGlobalMessage('Profile picture column is missing in database. Run docs/SUPABASE_SETUP.sql, then try again.', true);
      } else {
        setGlobalMessage(rawMessage, true);
      }
    }
  }

  async function removeParticipant(participantId) {
    if (!participantId || !isAdmin()) return;
    const confirmed = window.confirm('Delete this participant?');
    if (!confirmed) return;

    try {
      await api('/api/admin/participants', {
        method: 'DELETE',
        body: { id: participantId },
      });
      hideParticipantModal();
      await refreshAndRender();
      setGlobalMessage('Participant deleted.', false);
    } catch (error) {
      setGlobalMessage(error.message || 'Failed to delete participant.', true);
    }
  }

  async function quickUpdateParticipantStatus(participantId, status) {
    if (!participantId || !isAdmin()) return;

    try {
      await api('/api/admin/participants', {
        method: 'PUT',
        body: {
          id: participantId,
          status,
        },
      });
      await refreshAndRender();
      setGlobalMessage(`Participant moved to ${statusLabel(status)}.`, false);
    } catch (error) {
      setGlobalMessage(error.message || 'Failed to update participant status.', true);
    }
  }

  async function handleSectionCreate(event) {
    event.preventDefault();
    if (!isAdmin()) return;

    const name = String(els.sectionName.value || '').trim();
    const description = String(els.sectionDescription.value || '').trim();
    if (!name) {
      setGlobalMessage('Section name is required.', true);
      return;
    }

    try {
      await api('/api/admin/sections', {
        method: 'POST',
        body: { name, description },
      });
      els.sectionForm.reset();
      await refreshAndRender();
      setGlobalMessage('Section added.', false);
    } catch (error) {
      setGlobalMessage(error.message || 'Failed to add section.', true);
    }
  }

  async function handleAccountCreate(event) {
    event.preventDefault();
    if (!isAdmin()) return;

    const username = String(els.accountUsername.value || '').trim();
    const displayName = String(els.accountDisplayName.value || '').trim();
    const password = String(els.accountPassword.value || '');

    if (!username || !password) {
      setGlobalMessage('Username and password are required.', true);
      return;
    }

    try {
      await api('/api/admin/accounts', {
        method: 'POST',
        body: { username, displayName, password },
      });
      els.accountForm.reset();
      await refreshAndRender();
      setGlobalMessage('Sub-account created.', false);
    } catch (error) {
      setGlobalMessage(error.message || 'Failed to create sub-account.', true);
    }
  }

  async function handleParticipantsTableClick(event) {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;

    const action = actionButton.getAttribute('data-action');
    const participantId = actionButton.getAttribute('data-id');
    const participant = getParticipantById(participantId);
    if (!participant && !['toggle-skills', 'toggle-sections'].includes(action)) return;

    if (action === 'toggle-skills') {
      toggleMetaExpanded('skills', participantId);
      renderParticipantsTable();
      return;
    }

    if (action === 'toggle-sections') {
      toggleMetaExpanded('sections', participantId);
      renderParticipantsTable();
      return;
    }

    if (!participant) return;

    if (action === 'open-profile') {
      openParticipantModal('view', participant);
      return;
    }

    if (action === 'view') {
      openParticipantModal('view', participant);
      return;
    }

    if (action === 'edit') {
      openParticipantModal('edit', participant);
      return;
    }

    if (action === 'delete') {
      await removeParticipant(participantId);
      return;
    }

    if (action === 'quick-shortlist') {
      await quickUpdateParticipantStatus(participantId, 'shortlisted');
      return;
    }

    if (action === 'remove-shortlist') {
      await quickUpdateParticipantStatus(participantId, 'talent_pool');
    }
  }

  async function handleSectionsTableClick(event) {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton || !isAdmin()) return;

    const action = actionButton.getAttribute('data-action');
    const sectionId = actionButton.getAttribute('data-id');
    if (!sectionId) return;

    if (action === 'delete-section') {
      const confirmed = window.confirm('Delete this section? Participants will be unlinked.');
      if (!confirmed) return;

      try {
        await api('/api/admin/sections', {
          method: 'DELETE',
          body: { id: sectionId },
        });
        await refreshAndRender();
        setGlobalMessage('Section deleted.', false);
      } catch (error) {
        setGlobalMessage(error.message || 'Failed to delete section.', true);
      }
      return;
    }

    if (action === 'rename-section') {
      const section = state.sections.find((entry) => entry.id === sectionId);
      if (!section) return;

      const name = window.prompt('Section name:', section.name || '');
      if (!name) return;

      const description = window.prompt('Section description:', section.description || '') || '';
      try {
        await api('/api/admin/sections', {
          method: 'PUT',
          body: { id: sectionId, name, description },
        });
        await refreshAndRender();
        setGlobalMessage('Section updated.', false);
      } catch (error) {
        setGlobalMessage(error.message || 'Failed to update section.', true);
      }
    }
  }

  async function handleAccountsTableClick(event) {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton || !isAdmin()) return;

    const action = actionButton.getAttribute('data-action');
    const accountId = actionButton.getAttribute('data-id');
    const account = state.accounts.find((entry) => entry.id === accountId);
    if (!account) return;

    if (action === 'toggle-account') {
      try {
        await api('/api/admin/accounts', {
          method: 'PUT',
          body: { id: accountId, isActive: !account.isActive },
        });
        await refreshAndRender();
        setGlobalMessage('Account status updated.', false);
      } catch (error) {
        setGlobalMessage(error.message || 'Failed to update account.', true);
      }
      return;
    }

    if (action === 'reset-account-password') {
      const password = window.prompt(`Set new password for ${account.username}:`, '');
      if (!password) return;
      try {
        await api('/api/admin/accounts', {
          method: 'PUT',
          body: { id: accountId, password },
        });
        setGlobalMessage('Password updated.', false);
      } catch (error) {
        setGlobalMessage(error.message || 'Failed to reset password.', true);
      }
      return;
    }

    if (action === 'delete-account') {
      const confirmed = window.confirm(`Delete sub-account "${account.username}"?`);
      if (!confirmed) return;

      try {
        await api('/api/admin/accounts', {
          method: 'DELETE',
          body: { id: accountId },
        });
        await refreshAndRender();
        setGlobalMessage('Sub-account deleted.', false);
      } catch (error) {
        setGlobalMessage(error.message || 'Failed to delete account.', true);
      }
    }
  }

  async function handleResumeFileChange(event) {
    if (!isAdmin()) return;
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      setGlobalMessage('Resume file is too large (max 7 MB).', true);
      els.resumeFile.value = '';
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      state.resumeDraft = {
        fileName: file.name,
        mimeType: file.type || '',
        size: file.size,
        dataUrl,
      };
      renderResumeMeta(null);
      setGlobalMessage('Resume attached. Save participant to persist this file.', false);
    } catch (error) {
      setGlobalMessage(error.message || 'Failed to read file.', true);
    }
  }

  async function handleProfilePictureFileChange(event) {
    if (!isAdmin()) return;
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!String(file.type || '').toLowerCase().startsWith('image/')) {
      setGlobalMessage('Profile picture must be an image file.', true);
      els.profilePictureFile.value = '';
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_UPLOAD_BYTES) {
      setGlobalMessage('Profile picture is too large (max 5 MB).', true);
      els.profilePictureFile.value = '';
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      state.profilePictureDraft = {
        fileName: file.name,
        mimeType: file.type || '',
        size: file.size,
        dataUrl,
      };
      renderProfilePictureMeta(null);
      setGlobalMessage('Profile picture attached. Save participant to persist this file.', false);
    } catch (error) {
      setGlobalMessage(error.message || 'Failed to read profile picture file.', true);
    }
  }

  function handleProfilePictureMetaClick(event) {
    const removeBtn = event.target.closest('#removeProfilePictureBtn');
    if (!removeBtn || !isAdmin()) return;
    state.profilePictureDraft = { remove: true };
    els.profilePictureFile.value = '';
    renderProfilePictureMeta(null);
  }

  function handleResumeMetaClick(event) {
    const removeBtn = event.target.closest('#removeResumeBtn');
    if (!removeBtn || !isAdmin()) return;
    state.resumeDraft = { remove: true };
    els.resumeFile.value = '';
    renderResumeMeta(null);
  }

  function handleNavClick(event) {
    const target = event.target.closest('[data-view]');
    if (!target) return;

    const nextView = target.getAttribute('data-view');
    if (!isAdmin() && nextView === 'accounts') {
      return;
    }

    state.activeView = nextView;
    renderView();
    closeMobileNav();
  }

  function applyParticipantFiltersFromInputs() {
    state.participantFilters.search = String(els.participantsSearch.value || '').trim();
    state.participantFilters.section = String(els.participantsSectionFilter.value || '').trim();
    state.participantFilters.status = String(els.participantsStatusFilter.value || '').trim();
    renderParticipantsTable();
  }

  function handleSearchInput() {
    if (state.searchDebounceHandle) {
      clearTimeout(state.searchDebounceHandle);
    }
    state.searchDebounceHandle = window.setTimeout(() => {
      applyParticipantFiltersFromInputs();
    }, FILTER_DEBOUNCE_MS);
  }

  function applyClientPoolFiltersFromInputs() {
    state.clientPoolFilters.search = String(els.clientPoolSearch?.value || '').trim();
    state.clientPoolFilters.section = String(els.clientPoolSectionFilter?.value || '').trim();
    state.clientPoolFilters.status = String(els.clientPoolStatusFilter?.value || '').trim();
    renderClientPoolTable();
  }

  function handleClientPoolSearchInput() {
    if (state.clientSearchDebounceHandle) {
      clearTimeout(state.clientSearchDebounceHandle);
    }
    state.clientSearchDebounceHandle = window.setTimeout(() => {
      applyClientPoolFiltersFromInputs();
    }, FILTER_DEBOUNCE_MS);
  }

  function handleClientPoolTableChange(event) {
    const checkbox = event.target.closest('input[data-action="toggle-client-participant"]');
    if (!checkbox) return;

    const participantId = String(checkbox.getAttribute('data-id') || '').trim();
    if (!participantId) return;

    if (checkbox.checked) {
      state.selectedClientParticipantIds.add(participantId);
    } else {
      state.selectedClientParticipantIds.delete(participantId);
    }
    updateClientSelectedMeta();
  }

  function handleClientPoolTableClick(event) {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;

    const action = String(actionButton.getAttribute('data-action') || '').trim();
    if (action !== 'open-profile') return;

    const participantId = String(actionButton.getAttribute('data-id') || '').trim();
    const participant = getParticipantById(participantId);
    if (!participant) return;
    openParticipantModal('view', participant);
  }

  function handleSelectVisibleCandidates() {
    const visible = getClientPoolParticipants();
    visible.forEach((participant) => {
      if (participant.id) {
        state.selectedClientParticipantIds.add(participant.id);
      }
    });
    renderClientPoolTable();
  }

  function handleClearSelectedCandidates() {
    state.selectedClientParticipantIds = new Set();
    renderClientPoolTable();
  }

  function collectClientRequestPayload() {
    const selectedParticipantIds = Array.from(state.selectedClientParticipantIds);
    if (!selectedParticipantIds.length) {
      throw new Error('Please select at least one candidate profile.');
    }

    const clientName = String(els.clientRequestName?.value || '').trim();
    const clientEmail = String(els.clientRequestEmail?.value || '').trim();
    const clientCompany = String(els.clientRequestCompany?.value || '').trim();
    const requestMessage = String(els.clientRequestMessage?.value || '').trim();
    const interviewDateTime = String(els.clientInterviewDateTime?.value || '').trim();
    const ceoMeetingDateTime = String(els.clientCeoMeetingDateTime?.value || '').trim();
    const ceoIncluded = Boolean(els.clientCeoIncluded?.checked);

    if (!clientName || !clientEmail) {
      throw new Error('Client name and client email are required.');
    }

    if (requestMessage.length < 8) {
      throw new Error('Please add a clear request message for management.');
    }

    return {
      selectedParticipantIds,
      clientName,
      clientEmail,
      clientCompany,
      message: requestMessage,
      interviewDateTime,
      ceoMeetingDateTime,
      ceoIncluded,
    };
  }

  async function handleClientRequestSubmit(event) {
    event.preventDefault();

    try {
      const payload = collectClientRequestPayload();
      await api('/api/admin/client-requests', {
        method: 'POST',
        body: payload,
      });

      state.selectedClientParticipantIds = new Set();
      if (els.clientRequestMessage) {
        els.clientRequestMessage.value = '';
      }
      if (els.clientInterviewDateTime) {
        els.clientInterviewDateTime.value = '';
      }
      if (els.clientCeoMeetingDateTime) {
        els.clientCeoMeetingDateTime.value = '';
      }
      if (els.clientCeoIncluded) {
        els.clientCeoIncluded.checked = true;
      }

      await refreshAndRender();
      setGlobalMessage('Client request submitted. Management has been notified.', false);
    } catch (error) {
      setGlobalMessage(error.message || 'Failed to submit client request.', true);
    }
  }

  function collectManualHireIds(requestId) {
    if (!els.clientRequestsList) return [];
    return Array.from(els.clientRequestsList.querySelectorAll('input[data-manual-hire]'))
      .filter((input) => input.getAttribute('data-manual-hire') === requestId && input.checked)
      .map((input) => String(input.value || '').trim())
      .filter(Boolean);
  }

  async function finalizeClientRequestSelection(requestId, hireMode, hiredParticipantIds = []) {
    await api(`/api/admin/client-requests/${encodeURIComponent(requestId)}/finalize`, {
      method: 'POST',
      body: {
        hireMode,
        hiredParticipantIds,
      },
    });
  }

  async function setClientRequestStatus(requestId, status) {
    await api(`/api/admin/client-requests/${encodeURIComponent(requestId)}/status`, {
      method: 'PUT',
      body: { status },
    });
  }

  async function handleClientRequestsListClick(event) {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;

    const action = String(actionButton.getAttribute('data-action') || '').trim();
    const requestId = String(actionButton.getAttribute('data-id') || '').trim();
    if (!action || !requestId) return;

    try {
      if (action === 'finalize-all') {
        await finalizeClientRequestSelection(requestId, 'all');
        await refreshAndRender();
        setGlobalMessage('Hiring finalized for all selected profiles. Notification sent.', false);
        return;
      }

      if (action === 'finalize-manual') {
        const selectedIds = collectManualHireIds(requestId);
        if (!selectedIds.length) {
          setGlobalMessage('Select at least one profile before manual finalization.', true);
          return;
        }

        await finalizeClientRequestSelection(requestId, 'manual', selectedIds);
        await refreshAndRender();
        setGlobalMessage('Manual hiring finalization saved. Notification sent.', false);
        return;
      }

      if (action === 'set-request-status') {
        const status = String(actionButton.getAttribute('data-status') || '').trim();
        if (!status || !isAdmin()) return;

        await setClientRequestStatus(requestId, status);
        await refreshAndRender();
        setGlobalMessage(`Request status updated to ${requestStatusLabel(status)}.`, false);
      }
    } catch (error) {
      setGlobalMessage(error.message || 'Failed to update client request.', true);
    }
  }

  function bindEvents() {
    els.loginForm.addEventListener('submit', handleLogin);

    els.logoutBtn.addEventListener('click', () => {
      closeMobileNav();
      clearAuth();
      setMessage(els.loginMessage, 'You have been signed out.', false);
    });

    if (els.themeToggleBtn) {
      els.themeToggleBtn.addEventListener('click', handleThemeToggle);
    }

    if (els.mobileNavToggle) {
      els.mobileNavToggle.addEventListener('click', toggleMobileNav);
    }
    if (els.mobileNavClose) {
      els.mobileNavClose.addEventListener('click', closeMobileNav);
    }
    if (els.sidebarScrim) {
      els.sidebarScrim.addEventListener('click', closeMobileNav);
    }

    els.navButtons.forEach((button) => {
      button.addEventListener('click', handleNavClick);
    });

    els.participantsSearch.addEventListener('input', handleSearchInput);
    els.participantsSectionFilter.addEventListener('change', applyParticipantFiltersFromInputs);
    els.participantsStatusFilter.addEventListener('change', applyParticipantFiltersFromInputs);

    if (els.clientPoolSearch) {
      els.clientPoolSearch.addEventListener('input', handleClientPoolSearchInput);
    }
    if (els.clientPoolSectionFilter) {
      els.clientPoolSectionFilter.addEventListener('change', applyClientPoolFiltersFromInputs);
    }
    if (els.clientPoolStatusFilter) {
      els.clientPoolStatusFilter.addEventListener('change', applyClientPoolFiltersFromInputs);
    }
    if (els.selectVisibleCandidatesBtn) {
      els.selectVisibleCandidatesBtn.addEventListener('click', handleSelectVisibleCandidates);
    }
    if (els.clearSelectedCandidatesBtn) {
      els.clearSelectedCandidatesBtn.addEventListener('click', handleClearSelectedCandidates);
    }
    if (els.clientPoolTableBody) {
      els.clientPoolTableBody.addEventListener('change', handleClientPoolTableChange);
      els.clientPoolTableBody.addEventListener('click', handleClientPoolTableClick);
    }
    if (els.clientRequestForm) {
      els.clientRequestForm.addEventListener('submit', handleClientRequestSubmit);
    }
    if (els.clientRequestsList) {
      els.clientRequestsList.addEventListener('click', handleClientRequestsListClick);
    }

    els.createParticipantBtn.addEventListener('click', () => {
      if (!isAdmin()) return;
      openParticipantModal('create', null);
    });

    els.participantsTableBody.addEventListener('click', handleParticipantsTableClick);
    els.sectionsTableBody.addEventListener('click', handleSectionsTableClick);
    els.accountsTableBody.addEventListener('click', handleAccountsTableClick);

    els.sectionForm.addEventListener('submit', handleSectionCreate);
    els.accountForm.addEventListener('submit', handleAccountCreate);

    els.participantForm.addEventListener('submit', handleParticipantSubmit);
    els.deleteParticipantBtn.addEventListener('click', async () => {
      if (!state.editingParticipantId) return;
      await removeParticipant(state.editingParticipantId);
    });
    els.participantModalClose.addEventListener('click', hideParticipantModal);
    els.participantModalBackdrop.addEventListener('click', hideParticipantModal);
    els.profilePictureFile.addEventListener('change', handleProfilePictureFileChange);
    els.profilePictureMeta.addEventListener('click', handleProfilePictureMetaClick);
    els.resumeFile.addEventListener('change', handleResumeFileChange);
    els.resumeMeta.addEventListener('click', handleResumeMetaClick);
    if (typeof MOBILE_NAV_QUERY.addEventListener === 'function') {
      MOBILE_NAV_QUERY.addEventListener('change', syncMobileNavForViewport);
    } else if (typeof MOBILE_NAV_QUERY.addListener === 'function') {
      MOBILE_NAV_QUERY.addListener(syncMobileNavForViewport);
    }
    if (typeof SYSTEM_THEME_QUERY.addEventListener === 'function') {
      SYSTEM_THEME_QUERY.addEventListener('change', handleSystemThemeChange);
    } else if (typeof SYSTEM_THEME_QUERY.addListener === 'function') {
      SYSTEM_THEME_QUERY.addListener(handleSystemThemeChange);
    }
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (!els.participantModal.hidden) {
        hideParticipantModal();
        return;
      }

      if (state.mobileNavOpen) {
        closeMobileNav();
      }
    });
  }

  function initialize() {
    initializeTheme();
    bindEvents();
    syncMobileNavForViewport();
    bootstrapSession();
  }

  initialize();
})();
