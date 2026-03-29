document.addEventListener('DOMContentLoaded', () => {
    const handleInput = document.getElementById('handle-input');
    const getContestBtn = document.getElementById('get-contest-btn');
    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loader-text');
    
    // Result elements
    const emptyState = document.getElementById('empty-state');
    const resultContainer = document.getElementById('result-container');
    const contestNameEl = document.getElementById('contest-name');
    const virtualLinkEl = document.getElementById('virtual-link');
    const contestLinkEl = document.getElementById('contest-link');
    const resultBadge = document.getElementById('result-badge');
    const typeBadge = document.getElementById('type-badge');
    const durationBadge = document.getElementById('contest-duration');
    
    // History & User profiles
    const historyGrid = document.getElementById('history-grid');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const userProfilesContainer = document.getElementById('user-profiles-container');

    // Error
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');

    // Filters
    const platformRadios = document.getElementsByName('platform');
    const sourceGroup = document.getElementsByName('source');
    const cfSourceFilter = document.getElementById('cf-source-filter');
    const divisionFiltersDiv = document.getElementById('division-filters');
    const divisionLabel = document.getElementById('division-label');
    
    const cfDivisionGroup = document.getElementById('cf-division-group');
    const acDivisionGroup = document.getElementById('ac-division-group');
    const recencyFilter = document.getElementById('recency-filter');

    let contestHistory = [];
    let lastFetchedHandles = "";
    let lastFetchedPlatform = "";

    function getSelectedPlatform() {
        for (const radio of platformRadios) {
            if (radio.checked) return radio.value;
        }
        return 'codeforces';
    }

    // Platform UI Selection Logic
    platformRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const platform = e.target.value;
            
            // Hide all division groups
            cfDivisionGroup.classList.add('hidden');
            acDivisionGroup.classList.add('hidden');
            
            // Hide CF specific source filter by default
            cfSourceFilter.classList.add('collapsed');
            
            if (platform === 'codeforces') {
                cfDivisionGroup.classList.remove('hidden');
                cfSourceFilter.classList.remove('collapsed');
                divisionLabel.textContent = "CF Divisions";
            } else if (platform === 'atcoder') {
                acDivisionGroup.classList.remove('hidden');
                divisionLabel.textContent = "AtCoder Types";
            }
            
            // Trigger profile fetch again if handle is present
            if (handleInput.value.trim() !== '') {
                lastFetchedHandles = ""; // force fetch
                fetchUserProfiles();
            }
        });
    });

    // Handle CF Gym collapse
    sourceGroup.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const platform = getSelectedPlatform();
            if (platform === 'codeforces' && e.target.value === 'gym') {
                divisionFiltersDiv.classList.add('collapsed');
            } else if (platform === 'codeforces') {
                divisionFiltersDiv.classList.remove('collapsed');
            }
        });
    });

    getContestBtn.addEventListener('click', handleGetContest);
    handleInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleGetContest();
    });
    handleInput.addEventListener('blur', fetchUserProfiles);

    clearHistoryBtn.addEventListener('click', () => {
        contestHistory = [];
        renderHistory();
    });

    async function fetchUserProfiles() {
        const handleString = handleInput.value.trim();
        const platform = getSelectedPlatform();
        
        if (!handleString) {
            userProfilesContainer.classList.add('hidden');
            userProfilesContainer.innerHTML = '';
            lastFetchedHandles = "";
            return;
        }

        if (handleString === lastFetchedHandles && platform === lastFetchedPlatform) return;
        lastFetchedHandles = handleString;
        lastFetchedPlatform = platform;

        userProfilesContainer.innerHTML = '';

        if (platform === 'codeforces') {
            const handles = handleString.split(',').map(h => h.trim()).filter(h => h);
            try {
                const res = await fetch(`https://codeforces.com/api/user.info?handles=${handles.join(';')}`);
                const data = await res.json();
                if (data.status === 'OK') renderCodeforcesProfiles(data.result);
                else userProfilesContainer.classList.add('hidden');
            } catch(err) { /* ignore */ }
        } else {
             const handles = handleString.split(',').map(h => h.trim()).filter(h => h);
             if (handles.length > 0) {
                 renderGenericProfiles(handles);
             } else {
                 userProfilesContainer.classList.add('hidden');
             }
        }
    }

    function renderGenericProfiles(handles) {
        userProfilesContainer.innerHTML = '';
        handles.forEach(handle => {
            const card = document.createElement('div');
            card.className = 'user-profile-card';
            const initial = handle.charAt(0).toUpperCase();
            card.innerHTML = `
                <div class="user-avatar" style="display:flex; justify-content:center; align-items:center; background:#334155; font-weight:bold; color:white; font-size:1.2rem;">${initial}</div>
                <div class="user-info">
                    <span class="user-handle" style="color: var(--text-primary)">${handle}</span>
                    <span class="user-rating" style="text-transform: capitalize;">${getSelectedPlatform()} User</span>
                </div>
            `;
            userProfilesContainer.appendChild(card);
        });
        userProfilesContainer.classList.remove('hidden');
    }

    function renderCodeforcesProfiles(users) {
        userProfilesContainer.innerHTML = '';
        users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-profile-card';
            
            const imgUrl = user.titlePhoto || user.avatar || 'https://userpic.codeforces.org/no-avatar.jpg';
            const rating = user.rating ? `${user.rating} (${user.rank || 'Unrated'})` : 'Unrated';
            
            let color = 'var(--text-secondary)';
            if (user.rating >= 2400) color = '#ff3333';
            else if (user.rating >= 2100) color = '#ff8c00';
            else if (user.rating >= 1900) color = '#aa00aa';
            else if (user.rating >= 1600) color = '#0000ff';
            else if (user.rating >= 1400) color = '#03a89e';
            else if (user.rating >= 1200) color = '#008000';

            card.innerHTML = `
                <img src="${imgUrl}" alt="${user.handle}" class="user-avatar" onerror="this.src='https://userpic.codeforces.org/no-avatar.jpg'" />
                <div class="user-info">
                    <span class="user-handle" style="color: ${color}">${user.handle}</span>
                    <span class="user-rating">${rating}</span>
                </div>
            `;
            userProfilesContainer.appendChild(card);
        });
        userProfilesContainer.classList.remove('hidden');
    }

    function getSelectedDivisions(groupId) {
        const group = document.getElementById(groupId);
        const checkboxes = group.querySelectorAll('input[type="checkbox"]');
        const selected = new Set();
        checkboxes.forEach(cb => {
            if (cb.checked) selected.add(cb.value);
        });
        return selected;
    }

    function formatDuration(seconds) {
        if (!seconds) return "Unknown Duration";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h} Hours`;
        return `${m} Minutes`;
    }

    async function handleGetContest() {
        const platform = getSelectedPlatform();
        const handleString = handleInput.value.trim();
        const recencyVal = recencyFilter.value;
        const cutoffTime = getCutoffTime(recencyVal);

        if (handleString !== lastFetchedHandles || platform !== lastFetchedPlatform) {
            fetchUserProfiles();
        }

        hideError();
        emptyState.classList.add('hidden');
        resultContainer.classList.add('hidden');
        loader.classList.remove('hidden');
        getContestBtn.disabled = true;

        let platformName = platform === 'codeforces' ? 'Codeforces' : 'AtCoder';
        loaderText.textContent = `Fetching data from ${platformName}...`;

        try {
            const handles = handleString.split(',').map(h => h.trim()).filter(h => h);
            
            if (platform === 'codeforces') {
                await fetchCodeforcesContest(handles, cutoffTime);
            } else if (platform === 'atcoder') {
                await fetchAtcoderContest(handles, cutoffTime);
            }
        } catch (err) {
            loader.classList.add('hidden');
            emptyState.classList.remove('hidden');
            showError(err.message || "An unexpected error occurred.");
        } finally {
            getContestBtn.disabled = false;
        }
    }

    function getCutoffTime(recencyVal) {
        if (recencyVal === 'all') return 0;
        const oneYearInSeconds = 365.25 * 24 * 60 * 60;
        return (Date.now() / 1000) - (parseFloat(recencyVal) * oneYearInSeconds);
    }

    // ========== CODEFORCES LOGIC ==========
    
    function categorizeCFContest(name) {
        if (name.includes('Div. 1')) return 'div1';
        if (name.includes('Div. 2')) return 'div2';
        if (name.includes('Div. 3')) return 'div3';
        if (name.includes('Div. 4')) return 'div4';
        if (name.includes('Educational')) return 'edu';
        if (name.includes('Global')) return 'global';
        return 'other';
    }

    async function fetchCodeforcesContest(handles, cutoffTime) {
        let source = 'normal';
        for (const radio of sourceGroup) if (radio.checked) source = radio.value;
        const divisions = getSelectedDivisions('cf-division-group');
        
        if (source !== 'gym' && divisions.size === 0) {
            throw new Error("Please select at least one Codeforces contest division.");
        }

        const attemptedContests = new Set();
        const attemptedProblemNames = new Set();
        
        if (handles.length > 0) {
            const fetchUserPromises = handles.map(async (handle) => {
                const subsRes = await fetch(`https://codeforces.com/api/user.status?handle=${handle}`);
                const subsData = await subsRes.json();
                if (subsData.status !== 'OK') throw new Error(subsData.comment || `Failed to fetch user ${handle}.`);
                return subsData.result;
            });

            const allUsersSubmissions = await Promise.all(fetchUserPromises);
            for (const userSubmissions of allUsersSubmissions) {
                for (const sub of userSubmissions) {
                    if (sub.contestId) attemptedContests.add(sub.contestId);
                    if (sub.problem && sub.problem.name) attemptedProblemNames.add(sub.problem.name);
                }
            }
        }

        const fetchGym = source === 'gym' || source === 'both';
        const fetchNormal = source === 'normal' || source === 'both';

        let allContests = [];
        const fetchPromises = [];
        let problemListPromise = null;

        if (fetchNormal) {
            fetchPromises.push(fetch('https://codeforces.com/api/contest.list?gym=false').then(r => r.json()));
            problemListPromise = fetch('https://codeforces.com/api/problemset.problems').then(r => r.json());
        }
        if (fetchGym) fetchPromises.push(fetch('https://codeforces.com/api/contest.list?gym=true').then(r => r.json()));

        const results = await Promise.all(fetchPromises);
        let problemSetData = problemListPromise ? await problemListPromise : null;

        for (const data of results) {
            if (data.status !== 'OK') throw new Error("Failed to fetch contest list from Codeforces.");
            allContests = allContests.concat(data.result);
        }

        const contestProblemsMap = new Map();
        if (problemSetData && problemSetData.status === 'OK' && problemSetData.result.problems) {
            for (const p of problemSetData.result.problems) {
                if (!contestProblemsMap.has(p.contestId)) contestProblemsMap.set(p.contestId, []);
                contestProblemsMap.get(p.contestId).push(p.name);
            }
        }

        const validContests = allContests.filter(c => {
            if (c.phase !== 'FINISHED') return false;
            if (attemptedContests.has(c.id)) return false;
            if (c.startTimeSeconds < cutoffTime) return false;

            const isGym = c.id >= 100000;
            if (isGym && fetchGym) return true;

            if (!isGym && fetchNormal) {
                let hasAttemptedProblem = false;
                const cProblems = contestProblemsMap.get(c.id);
                if (cProblems) {
                    for (const pName of cProblems) {
                        if (attemptedProblemNames.has(pName)) {
                            hasAttemptedProblem = true;
                            break;
                        }
                    }
                }
                if (hasAttemptedProblem) return false;

                const type = categorizeCFContest(c.name);
                if (divisions.has(type)) return true;
            }
            return false;
        });

        if (validContests.length === 0) throw new Error("No Codeforces contests found matching your criteria.");

        const randomArray = new Uint32Array(1);
        window.crypto.getRandomValues(randomArray);
        const randomIndex = randomArray[0] % validContests.length;
        const randomContest = validContests[randomIndex];
        const isSelectedGym = randomContest.id >= 100000;
        const contestCategory = isSelectedGym ? 'gym' : categorizeCFContest(randomContest.name);

        const badgeText = isSelectedGym ? "Gym" : ({
            'div1': 'Div. 1', 'div2': 'Div. 2', 'div3': 'Div. 3', 'div4': 'Div. 4',
            'edu': 'Educational', 'global': 'Global', 'other': 'Other'
        }[contestCategory] || 'Contest');

        const vLink = isSelectedGym 
            ? `https://codeforces.com/gymRegistration/${randomContest.id}/virtual/true`
            : `https://codeforces.com/contestRegistration/${randomContest.id}/virtual/true`;
        
        const cLink = isSelectedGym 
            ? `https://codeforces.com/gym/${randomContest.id}` 
            : `https://codeforces.com/contest/${randomContest.id}`;

        displayResult(randomContest.name, badgeText, randomContest.type || (isSelectedGym ? 'GYM' : 'CF'), 'type-codeforces', randomContest.durationSeconds, vLink, cLink, 'codeforces');
    }

    // ========== ATCODER LOGIC ==========
    
    function categorizeAtCoderContest(id) {
        if (!id) return 'other';
        if (id.startsWith('abc')) return 'abc';
        if (id.startsWith('arc')) return 'arc';
        if (id.startsWith('agc')) return 'agc';
        if (id.startsWith('ahc')) return 'ahc';
        return 'other';
    }

    async function fetchAtcoderContest(handles, cutoffTime) {
        const divisions = getSelectedDivisions('ac-division-group');
        if (divisions.size === 0) throw new Error("Please select at least one AtCoder type.");

        const attemptedContests = new Set();

        if (handles.length > 0) {
            const fetchUserPromises = handles.map(async (handle) => {
                const res = await fetch(`https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${handle}&from_second=0`);
                if (!res.ok) throw new Error(`Failed to fetch user ${handle} from Kenkoooo API.`);
                return await res.json();
            });

            const allSubs = await Promise.all(fetchUserPromises);
            for (const subs of allSubs) {
                for (const sub of subs) {
                    if (sub.contest_id) attemptedContests.add(sub.contest_id);
                }
            }
        }

        const res = await fetch('https://kenkoooo.com/atcoder/resources/contests.json');
        if (!res.ok) throw new Error("Failed to fetch AtCoder contests from Kenkoooo.");
        const allContests = await res.json();

        const validContests = allContests.filter(c => {
            if (attemptedContests.has(c.id)) return false;
            
            if (cutoffTime > 0 && c.start_epoch_second < cutoffTime) return false;
            if (c.start_epoch_second > (Date.now() / 1000)) return false;

            const type = categorizeAtCoderContest(c.id);
            if (divisions.has(type)) return true;

            return false;
        });

        if (validContests.length === 0) throw new Error("No AtCoder contests found matching your criteria.");

        const randomArray = new Uint32Array(1);
        window.crypto.getRandomValues(randomArray);
        const randomIndex = randomArray[0] % validContests.length;
        const randomContest = validContests[randomIndex];
        const category = categorizeAtCoderContest(randomContest.id);
        const map = { 'abc': 'Beginner', 'arc': 'Regular', 'agc': 'Grand', 'ahc': 'Heuristic', 'other': 'Contest' };

        const cLink = `https://atcoder.jp/contests/${randomContest.id}`;
        
        displayResult(randomContest.title, map[category] || 'AtCoder', 'ATCODER', 'type-atcoder', randomContest.duration_second, cLink, cLink, 'atcoder');
    }


    // ========== DISPLAY & HISTORY ==========

    function displayResult(name, badgeText, typeText, typeClass, durationSecs, vLink, cLink, platform) {
        contestNameEl.textContent = name;
        resultBadge.textContent = badgeText;
        
        typeBadge.className = `result-badge type-badge ${typeClass}`;
        typeBadge.textContent = typeText;
        durationBadge.textContent = formatDuration(durationSecs);

        virtualLinkEl.href = vLink;
        if (platform === 'codeforces') {
            virtualLinkEl.textContent = "Start Virtual Contest";
            contestLinkEl.classList.remove('hidden');
        } else {
            virtualLinkEl.textContent = "Open Contest";
            // Both point to the same contest page for AtCoder, so hide the secondary button
            contestLinkEl.classList.add('hidden');
        }
        
        contestLinkEl.href = cLink;

        addToHistory(name, badgeText, typeText, durationSecs, cLink);

        loader.classList.add('hidden');
        resultContainer.classList.remove('hidden');
    }

    function addToHistory(name, badgeText, typeText, durationSecs, link) {
        if (contestHistory.length > 0 && contestHistory[0].name === name) return;

        contestHistory.unshift({
            name: name,
            badge: badgeText,
            type: typeText,
            duration: formatDuration(durationSecs),
            link: link,
            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        });

        if (contestHistory.length > 10) contestHistory.pop();
        renderHistory();
    }

    function renderHistory() {
        if (contestHistory.length === 0) {
            historyGrid.innerHTML = '<p class="empty-history text-secondary">No history yet in this session.</p>';
            clearHistoryBtn.classList.add('hidden');
            return;
        }

        clearHistoryBtn.classList.remove('hidden');
        historyGrid.innerHTML = '';
        
        contestHistory.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-card';
            
            div.innerHTML = `
                <div class="history-card-header">
                    <span class="history-type">${item.badge} &bull; ${item.type}</span>
                    <span class="text-secondary" style="font-size: 0.8rem">${item.timestamp}</span>
                </div>
                <h4>${item.name}</h4>
                <div class="text-secondary" style="font-size: 0.85rem; margin-top: auto;">
                    Duration: ${item.duration}
                </div>
            `;
            
            div.addEventListener('click', () => window.open(item.link, '_blank'));
            historyGrid.appendChild(div);
        });
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorContainer.classList.remove('hidden');
        errorContainer.style.animation = 'none';
        errorContainer.offsetHeight;
        errorContainer.style.animation = null;
    }

    function hideError() {
        errorContainer.classList.add('hidden');
    }
});
