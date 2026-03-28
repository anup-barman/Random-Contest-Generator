document.addEventListener('DOMContentLoaded', () => {
    const handleInput = document.getElementById('handle-input');
    const getContestBtn = document.getElementById('get-contest-btn');
    const loader = document.getElementById('loader');
    const resultContainer = document.getElementById('result-container');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    
    const contestNameEl = document.getElementById('contest-name');
    const virtualLinkEl = document.getElementById('virtual-link');
    const contestLinkEl = document.getElementById('contest-link');
    const resultBadge = document.getElementById('result-badge');

    const sourceGroup = document.getElementsByName('source');
    const normalFilters = document.getElementById('normal-filters');
    const divisionGroup = document.getElementById('division-group');

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

    async function handleGetContest() {
        const handleString = handleInput.value.trim();
        const source = getSelectedSource();
        const divisions = getSelectedDivisions();

        if (source !== 'gym' && divisions.size === 0) {
            showError("Please select at least one contest division.");
            return;
        }

        // Reset UI Context
        hideError();
        resultContainer.classList.add('hidden');
        loader.classList.remove('hidden');
        getContestBtn.disabled = true;

        try {
            const attemptedContests = new Set();

            // Fetch users' status/submissions only if handles are provided
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
                        }
                    }
                }
            }

            // Determine which contest lists to fetch
            const fetchGym = source === 'gym' || source === 'both';
            const fetchNormal = source === 'normal' || source === 'both';

            let allContests = [];

            const fetchPromises = [];
            if (fetchNormal) {
                fetchPromises.push(fetch('https://codeforces.com/api/contest.list?gym=false').then(res => res.json()));
            }
            if (fetchGym) {
                fetchPromises.push(fetch('https://codeforces.com/api/contest.list?gym=true').then(res => res.json()));
            }

            const results = await Promise.all(fetchPromises);
            
            for (const data of results) {
                if (data.status !== 'OK') {
                    throw new Error("Failed to fetch contest list from Codeforces.");
                }
                allContests = allContests.concat(data.result);
            }

            // Filter contests
            const validContests = allContests.filter(c => {
                if (c.phase !== 'FINISHED') return false;
                if (attemptedContests.has(c.id)) return false;

                // Handle Gym vs Normal logic based on API returns
                const isGym = c.id >= 100000;
                
                if (isGym && fetchGym) return true; 
                
                if (!isGym && fetchNormal) {
                    const type = categorizeContest(c.name);
                    if (divisions.has(type)) return true;
                }

                return false;
            });

            if (validContests.length === 0) {
                throw new Error("No contests found matching your criteria! Try broadening your filters.");
            }

            // Choose a random contest
            const randomIndex = Math.floor(Math.random() * validContests.length);
            const selectedContest = validContests[randomIndex];
            const isSelectedGym = selectedContest.id >= 100000;
            const contestCategory = isSelectedGym ? 'gym' : categorizeContest(selectedContest.name);

            // Render Result
            contestNameEl.textContent = selectedContest.name;
            resultBadge.textContent = getBadgeText(contestCategory, isSelectedGym);
            
            // Build direct target URLs
            if (isSelectedGym) {
                virtualLinkEl.href = `https://codeforces.com/gymRegistration/${selectedContest.id}/virtual/true`;
                contestLinkEl.href = `https://codeforces.com/gym/${selectedContest.id}`;
            } else {
                virtualLinkEl.href = `https://codeforces.com/contestRegistration/${selectedContest.id}/virtual/true`;
                contestLinkEl.href = `https://codeforces.com/contest/${selectedContest.id}`;
            }

            loader.classList.add('hidden');
            resultContainer.classList.remove('hidden');

        } catch (err) {
            loader.classList.add('hidden');
            showError(err.message || "An unexpected error occurred. Please try again.");
        } finally {
            getContestBtn.disabled = false;
        }
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        
        errorContainer.classList.remove('hidden');
        errorContainer.style.animation = 'none';
        errorContainer.offsetHeight; // trigger reflow
        errorContainer.style.animation = null;
    }

    function hideError() {
        errorContainer.classList.add('hidden');
    }
});
