// --- [STEP 1: 설정] ---
const SHEET_ID = '1yYj3isFTv2FUO1XVn-apd6QDIkzCZApVdugFb8PqmVc';
const PLAYER_SHEET_NAME = 'Players';
const MATCH_SHEET_NAME = 'Matches'; // [신규] Matches 시트 이름

// [신규] 2개의 시트 URL
const PLAYER_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${PLAYER_SHEET_NAME}`;
const MATCH_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${MATCH_SHEET_NAME}`;

// --- [STEP 2: 전역 변수 설정] ---
let allPlayers = []; // 모든 플레이어 데이터를 저장할 배열
let allMatches = []; // [신규] 모든 경기 기록을 저장할 배열
let sortState = {
    column: 'accountName',
    order: 'asc' 
};
const tierRank = {
    'C': 10, 'GM': 9, 'M': 8, 'D': 7, 'E': 6, 'P': 5, 'G': 4, 'S': 3, 'B': 2, 'I': 1, 'N/A': 0
};

// --- [STEP 3: 데이터 가져오기 (대규모 수정)] ---
window.addEventListener('DOMContentLoaded', () => {
    fetchAllData(); // [신규] 2개 시트를 모두 불러오는 함수 호출
});

/**
 * [신규] Players와 Matches 2개 시트 데이터를 동시에 불러옵니다.
 */
async function fetchAllData() {
    try {
        // Promise.all을 사용해 두 개의 fetch를 동시에 실행
        const [playerResponse, matchResponse] = await Promise.all([
            fetch(PLAYER_URL),
            fetch(MATCH_URL)
        ]);

        if (!playerResponse.ok) throw new Error('Players 시트 응답 실패');
        if (!matchResponse.ok) throw new Error('Matches 시트 응답 실패');

        // 1. Players 데이터 처리
        let playerText = await playerResponse.text();
        if (!playerText.includes('google.visualization.Query.setResponse')) {
            throw new Error('Players 시트가 유효한 데이터를 반환하지 않았습니다. 공유 설정을 확인하세요.');
        }
        const playerData = JSON.parse(playerText.substring(47, playerText.length - 2));
        processPlayerData(playerData.table.rows); // 플레이어 데이터 저장

        // 2. Matches 데이터 처리
        let matchText = await matchResponse.text();
         if (!matchText.includes('google.visualization.Query.setResponse')) {
            throw new Error('Matches 시트가 유효한 데이터를 반환하지 않았습니다. 공유 설정을 확인하세요.');
        }
        const matchData = JSON.parse(matchText.substring(47, matchText.length - 2));
        processMatchData(matchData.table.rows); // 경기 기록 저장

        // 3. 모든 데이터가 준비되면 정렬 리스너 추가 및 테이블 렌더링
        addSortListeners();
        renderTable();

    } catch (error) {
        console.error(error);
        const tableBody = document.getElementById('leaderboard-body');
        tableBody.innerHTML = `<tr><td colspan="6" class="loading" style="color: red;">[오류] ${error.message}</td></tr>`;
    }
}


// --- [STEP 4: 티어 값 변환 헬퍼 (수정 없음)] ---
function getTierValue(tierString) {
    if (!tierString) return 0;
    const match = tierString.match(/^([A-Z]+)(\d)?$/);
    if (!match) return tierRank[tierString] || 0; 
    const letter = match[1];
    const num = parseInt(match[2]);
    const base = tierRank[letter] || 0;
    if (!num) return base;
    const division = (5 - num) * 0.1;
    return base + division;
}
function getTierClass(tierString) {
    if (!tierString) return 'tier-unranked';
    const match = tierString.match(/^([A-Z]+)/);
    if (!match) return 'tier-unranked';
    const letter = match[1];
    switch(letter) {
        case 'C': return 'tier-challenger';
        case 'GM': return 'tier-grandmaster';
        case 'M': return 'tier-master';
        case 'D': return 'tier-diamond';
        case 'E': return 'tier-emerald';
        case 'P': return 'tier-platinum';
        case 'G': return 'tier-gold';
        case 'S': return 'tier-silver';
        case 'B': return 'tier-bronze';
        case 'I': return 'tier-iron';
        default: return 'tier-unranked';
    }
}

// --- [STEP 5: 데이터 처리 함수 (분리)] ---

/**
 * [수정] Players 시트 데이터를 'allPlayers' 배열에 저장
 */
function processPlayerData(rows) {
    allPlayers = rows
        .map((row) => {
            const accountName = (row.c[5] && row.c[5].v) ? row.c[5].v : null;
            if (!accountName) return null; 

            const currentTier = (row.c[4] && row.c[4].v) ? row.c[4].v : 'N/A';
            const position1 = (row.c[9] && row.c[9].v) ? row.c[9].v : 'N/A'; 
            const position2 = (row.c[10] && row.c[10].v) ? row.c[10].v : ''; 
            const totalGames = (row.c[13] && row.c[13].v) ? row.c[13].v : 0; 
            const wins = (row.c[14] && row.c[14].v) ? row.c[14].v : 0; 
            const losses = (row.c[15] && row.c[15].v) ? row.c[15].v : 0; 
            const winRateRaw = (row.c[17] && row.c[17].v) ? row.c[17].v : 0; 
            const winRate = (winRateRaw * 100).toFixed(1);

            return {
                accountName,
                currentTier,
                tierValue: getTierValue(currentTier),
                position: `${position1} / ${position2}`.replace(' / ', '').replace('/ N/A', '').replace('N/A / ', ''),
                totalGames,
                wins,
                losses,
                winRate,
                winRateRaw
            };
        })
        .filter(player => player !== null);
}

/**
 * [신규] Matches 시트 데이터를 'allMatches' 배열에 저장
 */
function processMatchData(rows) {
    allMatches = rows
        .map(row => {
            // Apps Script가 A, B, C, D 열에 데이터를 넣었는지 확인
            const date = (row.c[0] && row.c[0].f) ? row.c[0].f : null; // f = 'YYYY-MM-DD' 형식의 문자열
            const accountName = (row.c[1] && row.c[1].v) ? row.c[1].v : null;
            const champion = (row.c[2] && row.c[2].v) ? row.c[2].v : 'N/A';
            const result = (row.c[3] && row.c[3].v) ? row.c[3].v : 'N/A';

            if (!date || !accountName) return null;
            return { date, accountName, champion, result };
        })
        .filter(match => match !== null);
    
    // [신규] 모든 경기 기록을 날짜순(최신순)으로 *미리* 정렬 (효율성)
    allMatches.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// --- [신규] STEP 6: Matches 데이터 계산 헬퍼 ---

/**
 * [신규] 특정 플레이어의 최근 5경기 HTML을 반환
 */
function getRecentGamesHTML(accountName) {
    // allMatches 배열에서 해당 플레이어의 경기를 찾음 (이미 최신순 정렬)
    const playerGames = allMatches.filter(m => m.accountName === accountName);
    const recent5 = playerGames.slice(0, 5); // 상위 5개
    
    if (recent5.length === 0) return '<span style="color: #777;">(기록 없음)</span>';

    // "승" / "패" 아이콘으로 변환
    return recent5.map(game => {
        if (game.result === '승리') {
            return '<span class="recent-win">승</span>';
        } else if (game.result === '패배') {
            return '<span class="recent-loss">패</span>';
        }
        return '<span class="recent-draw">-</span>'; // 혹시 모를 무승부
    }).join(' ');
}

/**
 * [신규] 특정 플레이어의 모스트 5 챔프 HTML을 반환
 */
function getMostChampsHTML(accountName) {
    const champCounts = {}; // {"챔피언이름": 횟수}
    
    // 해당 플레이어의 모든 경기를 순회하며 챔피언 픽 횟수를 계산
    allMatches
        .filter(m => m.accountName === accountName)
        .forEach(game => {
            const champ = game.champion || 'N/A';
            champCounts[champ] = (champCounts[champ] || 0) + 1;
        });
    
    // 횟수를 기준으로 내림차순 정렬
    const sortedChamps = Object.entries(champCounts)
        .sort((a, b) => b[1] - a[1]); // [["녹턴", 10], ["쉔", 8], ...]
    
    const top5 = sortedChamps.slice(0, 5); // 상위 5개
    
    if (top5.length === 0) return '<span style="color: #777;">(기록 없음)</span>';

    // HTML로 변환
    return top5.map(entry => {
        return `<div class="most-champ-item">
                    <span class="champ-name">${entry[0]}</span>
                    <span class="champ-count">${entry[1]}회</span>
                </div>`;
    }).join('');
}


// --- [STEP 7: 테이블 렌더링 (호버 카드 수정)] ---
function renderTable() {
    const tableBody = document.getElementById('leaderboard-body');
    tableBody.innerHTML = ''; 

    // 정렬 로직 (수정 없음)
    allPlayers.sort((a, b) => {
        let valA = a[sortState.column];
        let valB = b[sortState.column];
        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }
        if (sortState.column === 'tier') {
            valA = a.tierValue;
            valB = b.tierValue;
        }
        if (sortState.column === 'winRate') {
            valA = a.winRateRaw;
            valB = b.winRateRaw;
        }
        if (valA < valB) return sortState.order === 'asc' ? -1 : 1;
        if (valA > valB) return sortState.order === 'asc' ? 1 : -1;
        return 0;
    });

    // HTML 생성
    allPlayers.forEach((player, index) => {
        const tr = document.createElement('tr');
        
        // --- [★★★ 2단 레이아웃 호버 카드 HTML ★★★] ---
        const hoverCardHTML = `
            <div class="player-card">
                <h3>${player.accountName}</h3>
                <div class="card-body">
                    <div class="card-column-left">
                        <div class="stat"><strong>티어</strong> <span>${player.currentTier}</span></div>
                        <div class="stat"><strong>주 포지션</strong> <span>${player.position}</span></div>
                        <hr class="card-divider">
                        <div class="stat"><strong>총 전적</strong> <span>${player.totalGames}경기</span></div>
                        <div class="stat"><strong>승 / 패</strong> <span>${player.wins}승 ${player.losses}패</span></div>
                        <div class="stat"><strong>승률</strong> <span>${player.winRate}%</span></div>
                    </div>
                    <div class="card-column-right">
                        <div class="stat">
                            <strong>최근 5경기</strong>
                            <div class="recent-games">${getRecentGamesHTML(player.accountName)}</div>
                        </div>
                        <div class="stat">
                            <strong>모스트 5</strong>
                            <div class="most-champs">${getMostChampsHTML(player.accountName)}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 테이블 각 칸(cell) 생성
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td class="player-name-cell">
                ${player.accountName}
                ${hoverCardHTML}
            </td>
            <td><span class="tier-badge ${getTierClass(player.currentTier)}">${player.currentTier}</span></td>
            <td>${player.totalGames}경기</td>
            <td>${player.wins}승 ${player.losses}패</td>
            <td>${player.winRate}%</td>
        `;
        tableBody.appendChild(tr);
    });
    
    updateSortIndicators();
}

// --- [STEP 8: 정렬 기능 (수정 없음)] ---
function addSortListeners() {
    document.querySelectorAll('#leaderboard-table th.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            if (sortState.column === column) {
                sortState.order = sortState.order === 'asc' ? 'desc' : 'asc';
            } else {
                sortState.column = column;
                sortState.order = (column === 'accountName') ? 'asc' : 'desc';
            }
            renderTable();
        });
    });
}
function updateSortIndicators() {
    document.querySelectorAll('#leaderboard-table th.sortable').forEach(header => {
        const column = header.dataset.sort;
        header.classList.remove('active-sort');
        header.innerHTML = header.innerHTML.replace(' <span class="sort-arrow">▴</span>', '');
        header.innerHTML = header.innerHTML.replace(' <span class="sort-arrow">▾</span>', '');
        if (column === sortState.column) {
            header.classList.add('active-sort');
            const arrow = sortState.order === 'asc' ? '▴' : '▾';
            header.innerHTML += ` <span class="sort-arrow">${arrow}</span>`;
        }
    });
}