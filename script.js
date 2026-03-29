document.addEventListener('DOMContentLoaded', () => {
    const handleInput = document.getElementById('handle-input');
    const getContestBtn = document.getElementById('get-contest-btn');
    const loader = document.getElementById('loader');
    
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
    const sourceGroup = document.getElementsByName('source');
    const normalFilters = document.getElementById('normal-filters');
    const divisionGroup = document.getElementById('division-group');
    const recencyFilter = document.getElementById('recency-filter');

    let contestHistory = [];
    let lastFetchedHandles = "";

    // Handle normal filters visibility
    sourceGroup.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'gym') {
                normalFilters.classList.add('collapsed');
            } else {
                normalFilters.classList.remove('collapsed');
            }
        });
    });

    getContestBtn.addEventListener('click', handleGetContest);

    handleInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleGetContest();
        }
    });

    handleInput.addEventListener('blur', fetchUserProfiles);

    clearHistoryBtn.addEventListener('click', () => {
        contestHistory = [];
        renderHistory();
    });

    async function fetchUserProfiles() {
        const handleString = handleInput.value.trim();
        if (!handleString) {
            userProfilesContainer.classList.add('hidden');
            userProfilesContainer.innerHTML = '';
            lastFetchedHandles = "";
            return;
        }

        // Prevent redundant fetching if handles haven't changed
        if (handleString === lastFetchedHandles) return;
        lastFetchedHandles = handleString;

        const handles = handleString.split(',').map(h => h.trim()).filter(h => h);
        if (handles.length === 0) return;

        try {
            const res = await fetch(`https://codeforces.com/api/user.info?handles=${handles.join(';')}`);
            const data = await res.json();

            if (data.status === 'OK') {
                renderUserProfiles(data.result);
            } else {
                userProfilesContainer.classList.add('hidden');
            }
        } catch(err) {
            // Ignore fetch errors for visual profiles
        }
    }

    function renderUserProfiles(users) {
        userProfilesContainer.innerHTML = '';
        users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-profile-card';
            
            const imgUrl = user.titlePhoto || user.avatar || 'https://userpic.codeforces.org/no-avatar.jpg';
            const rating = user.rating ? `${user.rating} (${user.rank || 'Unrated'})` : 'Unrated';
            
            // Color based on standard CF rating colors approximate
            let color = 'var(--text-secondary)';
            if (user.rating >= 2400) color = '#ff3333'; // Red
            else if (user.rating >= 2100) color = '#ff8c00'; // Orange
            else if (user.rating >= 1900) color = '#aa00aa'; // Violet
            else if (user.rating >= 1600) color = '#0000ff'; // Blue
            else if (user.rating >= 1400) color = '#03a89e'; // Cyan
            else if (user.rating >= 1200) color = '#008000'; // Green

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

    function getSelectedSource() {
        for (const radio of sourceGroup) {
            if (radio.checked) return radio.value;
        }
        return 'normal';
    }

    function getSelectedDivisions() {
        const checkboxes = divisionGroup.querySelectorAll('input[type="checkbox"]');
        const selected = new Set();
        checkboxes.forEach(cb => {
            if (cb.checked) selected.add(cb.value);
        });
        return selected;
    }

    function categorizeContest(name) {
        if (name.includes('Div. 1')) return 'div1';
        if (name.includes('Div. 2')) return 'div2';
        if (name.includes('Div. 3')) return 'div3';
        if (name.includes('Div. 4')) return 'div4';
        if (name.includes('Educational')) return 'edu';
        if (name.includes('Global')) return 'global';
        return 'other';
    }

    function getBadgeText(type, isGym) {
        if (isGym) return "Gym";
        const map = {
            'div1': 'Div. 1', 'div2': 'Div. 2', 'div3': 'Div. 3', 'div4': 'Div. 4',
            'edu': 'Educational', 'global': 'Global', 'other': 'Other'
        };
        return map[type] || 'Contest';
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
        const handleString = handleInput.value.trim();
        const source = getSelectedSource();
        const divisions = getSelectedDivisions();
        const recencyVal = recencyFilter.value;

        if (source !== 'gym' && divisions.size === 0) {
            showError("Please select at least one contest division.");
            return;
        }

        if (handleString !== lastFetchedHandles) {
            fetchUserProfiles();
        }

        // Reset UI Context
        hideError();
        emptyState.classList.add('hidden');
        resultContainer.classList.add('hidden');
        loader.classList.remove('hidden');
        getContestBtn.disabled = true;

        try {
            const attemptedContests = new Set();
            const attemptedProblemNames = new Set();

            if (handleString) {
                const handles = handleString.split(',').map(h => h.trim()).filter(h => h);

                if (handles.length > 0) {
                    const fetchUserPromises = handles.map(async (handle) => {
                        const subsRes = await fetch(`https://codeforces.com/api/user.status?handle=${handle}`);
                        const subsData = await subsRes.json();

                        if (subsData.status !== 'OK') {
                            throw new Error(subsData.comment || `Failed to fetch user ${handle}. Double check the handle.`);
                        }
                        return subsData.result;
                    });

                    const allUsersSubmissions = await Promise.all(fetchUserPromises);

                    for (const userSubmissions of allUsersSubmissions) {
                        for (const sub of userSubmissions) {
                            if (sub.contestId) {
                                attemptedContests.add(sub.contestId);
                            }
                            if (sub.problem && sub.problem.name) {
                                attemptedProblemNames.add(sub.problem.name);
                            }
                        }
                    }
                }
            }

            const fetchGym = source === 'gym' || source === 'both';
            const fetchNormal = source === 'normal' || source === 'both';

            let allContests = [];
            const fetchPromises = [];
            let problemListPromise = null;

            if (fetchNormal) {
                fetchPromises.push(fetch('https://codeforces.com/api/contest.list?gym=false').then(res => res.json()));
                problemListPromise = fetch('https://codeforces.com/api/problemset.problems').then(res => res.json());
            }
            if (fetchGym) {
                fetchPromises.push(fetch('https://codeforces.com/api/contest.list?gym=true').then(res => res.json()));
            }

            const results = await Promise.all(fetchPromises);
            let problemSetData = null;
            if (problemListPromise) {
                problemSetData = await problemListPromise;
            }

            for (const data of results) {
                if (data.status !== 'OK') {
                    throw new Error("Failed to fetch contest list from Codeforces.");
                }
                allContests = allContests.concat(data.result);
            }

            const contestProblemsMap = new Map();
            if (problemSetData && problemSetData.status === 'OK' && problemSetData.result.problems) {
                for (const p of problemSetData.result.problems) {
                    if (!contestProblemsMap.has(p.contestId)) {
                        contestProblemsMap.set(p.contestId, []);
                    }
                    contestProblemsMap.get(p.contestId).push(p.name);
                }
            }

            const validContests = allContests.filter(c => {
                if (c.phase !== 'FINISHED') return false;
                if (attemptedContests.has(c.id)) return false;

                if (recencyVal !== 'all' && c.startTimeSeconds) {
                    const oneYearInSeconds = 365.25 * 24 * 60 * 60;
                    const cutoffTime = (Date.now() / 1000) - (parseFloat(recencyVal) * oneYearInSeconds);
                    if (c.startTimeSeconds < cutoffTime) return false;
                }

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

                    const type = categorizeContest(c.name);
                    if (divisions.has(type)) return true;
                }

                return false;
            });

            if (validContests.length === 0) {
                throw new Error("No contests found matching your criteria! Try broadening your filters.");
            }

            const randomIndex = Math.floor(Math.random() * validContests.length);
            const selectedContest = validContests[randomIndex];
            const isSelectedGym = selectedContest.id >= 100000;
            const contestCategory = isSelectedGym ? 'gym' : categorizeContest(selectedContest.name);

            renderContest(selectedContest, contestCategory, isSelectedGym);
            addToHistory(selectedContest, contestCategory, isSelectedGym);

            loader.classList.add('hidden');
            resultContainer.classList.remove('hidden');

        } catch (err) {
            loader.classList.add('hidden');
            emptyState.classList.remove('hidden');
            showError(err.message || "An unexpected error occurred. Please try again.");
        } finally {
            getContestBtn.disabled = false;
        }
    }

    function renderContest(contest, category, isGym) {
        contestNameEl.textContent = contest.name;
        resultBadge.textContent = getBadgeText(category, isGym);
        
        typeBadge.textContent = contest.type || (isGym ? 'GYM' : 'CF');
        durationBadge.textContent = formatDuration(contest.durationSeconds);

        if (isGym) {
            virtualLinkEl.href = `https://codeforces.com/gymRegistration/${contest.id}/virtual/true`;
            contestLinkEl.href = `https://codeforces.com/gym/${contest.id}`;
        } else {
            virtualLinkEl.href = `https://codeforces.com/contestRegistration/${contest.id}/virtual/true`;
            contestLinkEl.href = `https://codeforces.com/contest/${contest.id}`;
        }
    }

    function addToHistory(contest, category, isGym) {
        if (contestHistory.length > 0 && contestHistory[0].id === contest.id) {
            return;
        }

        contestHistory.unshift({
            id: contest.id,
            name: contest.name,
            category: category,
            isGym: isGym,
            type: contest.type || (isGym ? 'GYM' : 'CF'),
            duration: formatDuration(contest.durationSeconds),
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
            
            const badge = getBadgeText(item.category, item.isGym);
            const link = item.isGym 
                ? `https://codeforces.com/gym/${item.id}` 
                : `https://codeforces.com/contest/${item.id}`;

            div.innerHTML = `
                <div class="history-card-header">
                    <span class="history-type">${badge} &bull; ${item.type}</span>
                    <span class="text-secondary" style="font-size: 0.8rem">${item.timestamp}</span>
                </div>
                <h4>${item.name}</h4>
                <div class="text-secondary" style="font-size: 0.85rem; margin-top: auto;">
                    Duration: ${item.duration}
                </div>
            `;
            
            div.addEventListener('click', () => {
                window.open(link, '_blank');
            });
            
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
