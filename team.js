// --- [1] 설정 & 전역 변수 ---
const SHEET_ID = '1yYj3isFTv2FUO1XVn-apd6QDIkzCZApVdugFb8PqmVc';
const PLAYER_SHEET_NAME = 'Players';
const PLAYER_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${PLAYER_SHEET_NAME}`;

let allPlayers = {};
let selected10 = [];
let captains = [];
let draftPool = []; // 8명
let teamA = []; // 5명
let teamB = []; // 5명
let captainA = "";
let captainB = "";

// [신규] 요청하신 드래프트 룰
const draftRounds = [
    { picks: 1 }, // 1-1
    { picks: 2 }, // 2-2
    { picks: 1 }  // 1-1
];
let currentRound = 0;
let currentPicker = null; // 'A' 또는 'B'
let picksRemaining = 0;
let isWinnerPicking = true; // 라운드 승자가 먼저 픽

const ui = {};

// --- [2] 초기화 ---
window.addEventListener('DOMContentLoaded', () => {
    // UI 요소 캐싱 (Step 1, 2)
    ui.playerSearch = document.getElementById('player-search');
    ui.playerPool = document.getElementById('player-selection-pool');
    ui.selectedPlayersList = document.getElementById('selected-players-list');
    ui.playerCount = document.getElementById('player-count');
    ui.btnStep2 = document.getElementById('btn-to-step-2');
    ui.captainSelectList = document.getElementById('captain-selection-list');
    ui.captainCount = document.getElementById('captain-count');
    ui.btnStep3 = document.getElementById('btn-to-step-3');
    ui.steps = document.querySelectorAll('.draft-step');
    ui.btnReset = document.getElementById('btn-reset-draft');

    // UI 요소 캐싱 (Step 3: 빛 경로)
    ui.lightPathContainer = document.getElementById('light-path-container');
    ui.lightPathTitle = document.getElementById('light-path-title');
    ui.lightOrb = document.getElementById('light-orb');
    ui.lightOrbAnimation = ui.lightOrb.querySelector('animateMotion');
    ui.lightPathExitA = document.querySelector('.light-path-exit.exit-a');
    ui.lightPathExitB = document.querySelector('.light-path-exit.exit-b');
    ui.btnStartLight = document.getElementById('btn-start-light');
    ui.lightPathResultText = document.getElementById('light-path-result-text');

    // UI 요소 캐싱 (Step 3: 신규 드래프트 보드)
    ui.draftBoard = document.getElementById('draft-board');
    ui.draftMessage = document.getElementById('draft-message');
    ui.teamAColumn = document.getElementById('team-a-column');
    ui.teamBColumn = document.getElementById('team-b-column');
    ui.teamAName = document.getElementById('team-a-name');
    ui.teamBName = document.getElementById('team-b-name');
    ui.teamAPlayers = document.getElementById('team-a-players');
    ui.teamBPlayers = document.getElementById('team-b-players');
    ui.draftablePool = document.getElementById('draftable-player-pool');
    ui.draftPoolCount = document.getElementById('draft-pool-count');

    // UI 요소 캐싱 (Step 4: 완료)
    ui.finalTeamA = document.getElementById('final-team-a');
    ui.finalTeamB = document.getElementById('final-team-b');
    ui.btnToBanpick = document.getElementById('btn-to-banpick');

    // 이벤트 리스너
    ui.playerSearch.addEventListener('input', filterAvailablePlayers);
    ui.btnStep2.addEventListener('click', () => goToStep(2));
    ui.btnStep3.addEventListener('click', () => goToStep(3));
    ui.btnStartLight.addEventListener('click', runLightPathGame);
    ui.btnToBanpick.addEventListener('click', () => {
        window.location.href = 'banpick.html'; // 밴픽 페이지로 이동
    });
    ui.btnReset.addEventListener('click', resetDraft);

    fetchPlayerData();
});

// --- [3] 데이터 로드 (기존과 동일) ---
async function fetchPlayerData() {
    ui.playerPool.innerHTML = '<div class="loading">...</div>';
    try {
        const response = await fetch(PLAYER_URL);
        if (!response.ok) throw new Error('Players 시트 응답 실패');
        let text = await response.text();
        if (!text.includes('google.visualization.Query.setResponse')) throw new Error('Players 시트 유효X');
        const jsonData = JSON.parse(text.substring(47, text.length - 2));
        ui.playerPool.innerHTML = '';
        jsonData.table.rows.forEach(row => {
            const name = (row.c[5] && row.c[5].v) ? row.c[5].v : null;
            if (name) { allPlayers[name] = getChoseong(name); }
        });
        const sortedNames = Object.keys(allPlayers).sort();
        sortedNames.forEach(name => {
            const item = createAvailablePlayerItem(name);
            ui.playerPool.appendChild(item);
        });
    } catch (error) { console.error(error); ui.playerPool.innerHTML = `<div class="loading" style="color: red;">[오류] ${error.message}</div>`; }
}
function getChoseong(str) { const cho = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"]; let result = ""; for(let i=0; i<str.length; i++) { const code = str.charCodeAt(i)-44032; if(code > -1 && code < 11172) { result += cho[Math.floor(code/588)]; } else { result += str.charAt(i); } } return result; }
function createAvailablePlayerItem(name) { const label = document.createElement('label'); label.classList.add('available-player-item'); label.dataset.name = name; const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = name; checkbox.addEventListener('change', togglePlayerStep1); const span = document.createElement('span'); span.textContent = name; label.appendChild(checkbox); label.appendChild(span); return label; }
function createSelectedPlayerItem(name) { const item = document.createElement('div'); item.classList.add('selected-player-item'); item.textContent = name; return item; }
function filterAvailablePlayers() { const searchTerm = ui.playerSearch.value.toLowerCase().replace(/\s/g, ''); const isChoseongSearch = /[ㄱ-ㅎ]/.test(searchTerm); ui.playerPool.querySelectorAll('.available-player-item').forEach(item => { const name = item.dataset.name; const nameLower = name.toLowerCase().replace(/\s/g, ''); const choseong = allPlayers[name]; let isVisible = isChoseongSearch ? choseong.includes(searchTerm) : nameLower.includes(searchTerm); item.style.display = isVisible ? 'flex' : 'none'; }); }

// --- [4] STEP 1, 2 로직 (기존과 동일) ---
function goToStep(stepNumber) {
    ui.steps.forEach(s => s.classList.remove('active'));
    document.getElementById(`step-${stepNumber}-players`)?.classList.add('active');
    document.getElementById(`step-${stepNumber}-captains`)?.classList.add('active');
    document.getElementById(`step-${stepNumber}-draft`)?.classList.add('active');
    document.getElementById(`step-4-complete`)?.classList.add('active');
    ui.btnReset.style.display = 'block';

    if (stepNumber === 2) setupStep2();
    if (stepNumber === 3) setupStep3();
    if (stepNumber === 4) setupStep4();
}
function togglePlayerStep1(event) { const checkbox = event.currentTarget; const name = checkbox.value; if (checkbox.checked) { if (selected10.length < 10) { selected10.push(name); checkbox.parentElement.classList.add('selected-in-list'); } else { checkbox.checked = false; alert("10명 초과"); } } else { selected10 = selected10.filter(p => p !== name); checkbox.parentElement.classList.remove('selected-in-list'); } updateSelectedPlayersUI(); }
function updateSelectedPlayersUI() { ui.selectedPlayersList.innerHTML = ''; selected10.sort().forEach(name => { ui.selectedPlayersList.appendChild(createSelectedPlayerItem(name)); }); ui.playerCount.textContent = selected10.length; ui.btnStep2.disabled = (selected10.length !== 10); }
function setupStep2() { ui.captainSelectList.innerHTML = ''; selected10.forEach(name => { const item = createCaptainSelectItem(name); ui.captainSelectList.appendChild(item); }); ui.captainCount.textContent = `0 / 2 명`; ui.btnStep3.disabled = true; }
function createCaptainSelectItem(name) { const item = document.createElement('div'); item.classList.add('player-item', 'captain-candidate'); item.textContent = name; item.dataset.name = name; item.addEventListener('click', togglePlayerStep2); return item; }
function togglePlayerStep2(event) { const item = event.currentTarget; const name = item.dataset.name; if (item.classList.contains('selected')) { item.classList.remove('selected'); captains = captains.filter(p => p !== name); } else { if (captains.length < 2) { item.classList.add('selected'); captains.push(name); } else { alert("팀장 2명만"); } } ui.captainCount.textContent = `${captains.length} / 2 명`; ui.btnStep3.disabled = (captains.length !== 2); }


// --- [5] STEP 3: 드래프트 (신규 로직) ---

// [신규] 드래프트용 플레이어/슬롯 생성
function createTeamPlayerSlot(name = null, isCaptain = false) {
    const item = document.createElement('div');
    item.classList.add('player-item', 'drafted-slot');
    if (isCaptain) {
        item.classList.add('captain');
        item.textContent = name;
    } else if (name) {
        item.classList.add('filled');
        item.textContent = name;
        // 페이드인 애니메이션
        item.style.opacity = 0;
        setTimeout(() => item.style.opacity = 1, 10);
    } else {
        item.classList.add('empty');
        item.textContent = '(빈 슬롯)';
    }
    return item;
}

function createDraftablePlayerItem(name) {
    const item = document.createElement('div');
    item.classList.add('player-item', 'draftable');
    item.textContent = name;
    item.dataset.name = name;
    item.addEventListener('click', handlePlayerPick);
    return item;
}

// [수정] 3단계 설정: 캡틴 배치, 드래프트 풀 생성, 빈 슬롯 생성
function setupStep3() {
    captainA = captains[0];
    captainB = captains[1];
    teamA.push(captainA);
    teamB.push(captainB);
    draftPool = selected10.filter(p => p !== captainA && p !== captainB).sort();

    // 1. 팀 이름 설정
    ui.teamAName.textContent = `TEAM ${captainA}`;
    ui.teamBName.textContent = `TEAM ${captainB}`;
    ui.lightPathExitA.textContent = `[${captainA} 선픽]`;
    ui.lightPathExitB.textContent = `[${captainB} 선픽]`;

    // 2. 캡틴 배치 + 4개 빈 슬롯
    ui.teamAPlayers.innerHTML = '';
    ui.teamBPlayers.innerHTML = '';
    ui.teamAPlayers.appendChild(createTeamPlayerSlot(captainA, true));
    ui.teamBPlayers.appendChild(createTeamPlayerSlot(captainB, true));
    for (let i = 0; i < 4; i++) {
        ui.teamAPlayers.appendChild(createTeamPlayerSlot());
        ui.teamBPlayers.appendChild(createTeamPlayerSlot());
    }

    // 3. 중앙 드래프트 풀(8명) 생성
    ui.draftablePool.innerHTML = '';
    draftPool.forEach(name => {
        ui.draftablePool.appendChild(createDraftablePlayerItem(name));
    });
    ui.draftPoolCount.textContent = draftPool.length;

    // 4. 드래프트 시작 (라운드 1 게임)
    ui.draftBoard.style.display = 'block';
    ui.draftMessage.textContent = "드래프트 1라운드 선픽을 결정합니다.";
    startNextRound();
}

// [수정] 다음 라운드 시작 (게임 UI 표시)
function startNextRound() {
    if (currentRound >= draftRounds.length) {
        // 모든 드래프트 완료
        goToStep(4);
        return;
    }

    // 드래프트 보드 비활성화, 게임 UI 활성화
    ui.draftBoard.style.opacity = 0.3;
    setDraftPoolClickable(false);
    ui.lightPathContainer.style.display = 'block';
    ui.btnStartLight.disabled = false;
    ui.lightPathResultText.style.display = 'none';

    // 공 위치 초기화
    ui.lightOrbAnimation.setAttribute('xlink:href', '');
    ui.lightOrb.setAttribute('cx', '150');
    ui.lightOrb.setAttribute('cy', '140');

    const roundInfo = draftRounds[currentRound];
    ui.lightPathTitle.textContent = `라운드 ${currentRound + 1} (${roundInfo.picks}명 픽)`;
}

// [유지] 빛 경로 게임 실행
function runLightPathGame() {
    ui.btnStartLight.disabled = true;
    const result = Math.random() < 0.5 ? 0 : 1; // 0: A팀 승, 1: B팀 승
    const targetPath = (result === 0) ? '#pathA' : '#pathB';
    ui.lightOrbAnimation.setAttribute('xlink:href', targetPath);
    ui.lightOrbAnimation.beginElement();
    
    setTimeout(() => {
        processLightPathResult(result === 0 ? 'A' : 'B');
    }, 3000); // 3초 (애니메이션 시간)
}

// [수정] 빛 경로 결과 처리 및 픽 시작
function processLightPathResult(winnerTeam) {
    const winnerName = (winnerTeam === 'A') ? captainA : captainB;
    const roundInfo = draftRounds[currentRound];

    // 1. 결과 텍스트 표시
    let resultText = `
        <strong class="toss-winner">${winnerName}</strong> (이)가 
        <strong class="toss-perk-first">라운드 ${currentRound + 1} 선픽</strong> 획득!
        (${roundInfo.picks}명 선픽)
    `;
    ui.lightPathResultText.innerHTML = resultText;
    ui.lightPathResultText.style.display = 'block';

    // 2. 픽 순서 및 횟수 설정
    currentPicker = winnerTeam;
    picksRemaining = roundInfo.picks;
    isWinnerPicking = true;

    // 3. 픽 시작
    setTimeout(() => {
        ui.lightPathContainer.style.display = 'none'; // 게임 숨기기
        ui.draftBoard.style.opacity = 1; // 보드 활성화
        updateDraftUI(); // 픽 UI 업데이트
    }, 2000); // 결과 확인 시간
}

// [신규] 드래프트 UI 업데이트 (메시지, 턴 표시)
function updateDraftUI() {
    const pickerName = (currentPicker === 'A') ? captainA : captainB;
    const pickType = isWinnerPicking ? "<span class='pick-type-first'>(선픽)</span>" : "<span class='pick-type-second'>(후픽)</span>";

    ui.draftMessage.innerHTML = `${pickType} [${pickerName}] 님, ${picksRemaining}명 선택하세요.`;

    // 턴 하이라이트
    ui.teamAColumn.classList.toggle('active-turn', currentPicker === 'A');
    ui.teamBColumn.classList.toggle('active-turn', currentPicker === 'B');

    // 드래프트 풀 클릭 가능/불가능
    setDraftPoolClickable(true);
}

// [신규] 드래프트 풀 클릭 가능 여부
function setDraftPoolClickable(isClickable) {
    ui.draftablePool.classList.toggle('disabled', !isClickable);
}

// [신규] 플레이어 픽 핸들러
function handlePlayerPick(event) {
    const pickedItem = event.currentTarget;
    if (pickedItem.classList.contains('disabled') || picksRemaining === 0) return;

    const playerName = pickedItem.dataset.name;

    // 1. 드래프트 풀에서 제거
    pickedItem.classList.add('disabled'); // 시각적으로 비활성화
    draftPool = draftPool.filter(p => p !== playerName);
    ui.draftPoolCount.textContent = draftPool.length;

    // 2. 해당 팀에 추가
    let targetTeamList, targetTeamUI;
    if (currentPicker === 'A') {
        targetTeamList = teamA;
        targetTeamUI = ui.teamAPlayers;
    } else {
        targetTeamList = teamB;
        targetTeamUI = ui.teamBPlayers;
    }
    
    targetTeamList.push(playerName);
    
    // 빈 슬롯 찾아서 채우기
    const emptySlot = targetTeamUI.querySelector('.drafted-slot.empty');
    if (emptySlot) {
        emptySlot.classList.remove('empty');
        emptySlot.classList.add('filled');
        emptySlot.textContent = playerName;
        // 애니메이션 효과
        emptySlot.style.opacity = 0;
        setTimeout(() => emptySlot.style.opacity = 1, 10);
    }

    picksRemaining--;
    ui.draftMessage.innerHTML = `[${(currentPicker === 'A' ? captainA : captainB)}] 님, ${picksRemaining}명 선택하세요.`;

    // 3. 턴 관리
    if (picksRemaining === 0) {
        setDraftPoolClickable(false); // 턴 넘어가기 전 클릭 방지
        
        if (isWinnerPicking) {
            // 승자 픽 -> 패자 픽
            isWinnerPicking = false;
            currentPicker = (currentPicker === 'A') ? 'B' : 'A'; // 턴 전환
            picksRemaining = draftRounds[currentRound].picks; // 픽 횟수 (동일)
            setTimeout(updateDraftUI, 500); // 0.5초 후 턴 전환
        } else {
            // 패자 픽 -> 다음 라운드
            currentRound++;
            isWinnerPicking = true; // 다음 라운드 승자 선픽
            ui.draftMessage.innerHTML = `라운드 ${currentRound + 1} 준비 중...`;
            ui.teamAColumn.classList.remove('active-turn'); // 턴 하이라이트 제거
            ui.teamBColumn.classList.remove('active-turn');
            setTimeout(startNextRound, 1000); // 1초 후 다음 라운드 게임
        }
    }
}

// --- [6] STEP 4: 완료 및 데이터 저장 ---
function setupStep4() {
    ui.finalTeamA.innerHTML = '';
    ui.finalTeamB.innerHTML = '';
    
    // 최종 팀 리스트 UI 생성 (h3 헤더 포함)
    const teamAName = `TEAM ${captainA}`;
    const teamBName = `TEAM ${captainB}`;
    
    const headerA = document.createElement('h3');
    headerA.className = 'team-header';
    headerA.textContent = teamAName;
    ui.finalTeamA.appendChild(headerA);

    const headerB = document.createElement('h3');
    headerB.className = 'team-header';
    headerB.textContent = teamBName;
    ui.finalTeamB.appendChild(headerB);

    // 캡틴 및 팀원 슬롯 추가
    ui.finalTeamA.appendChild(createTeamPlayerSlot(captainA, true));
    teamA.filter(p => p !== captainA).forEach(name => {
        ui.finalTeamA.appendChild(createTeamPlayerSlot(name, false));
    });
    
    ui.finalTeamB.appendChild(createTeamPlayerSlot(captainB, true));
    teamB.filter(p => p !== captainB).forEach(name => {
        ui.finalTeamB.appendChild(createTeamPlayerSlot(name, false));
    });

    // 밴픽 페이지로 넘겨줄 데이터를 localStorage에 저장
    try {
        const teamData = {
            teamA: { name: teamAName, players: teamA },
            teamB: { name: teamBName, players: teamB }
        };
        localStorage.setItem('banpickTeams', JSON.stringify(teamData));
        console.log("팀 데이터 저장 완료:", teamData);
    } catch (e) {
        console.error("localStorage 저장 실패:", e);
        ui.btnToBanpick.disabled = true;
        alert("팀 정보 저장에 실패했습니다. (localStorage 오류)");
    }
}


// --- [7] 리셋 (수정) ---
function resetDraft() {
    // 변수 초기화
    selected10 = []; captains = []; draftPool = []; teamA = []; teamB = [];
    currentRound = 0; currentPicker = null; picksRemaining = 0; isWinnerPicking = true;
    captainA = ""; captainB = "";

    // localStorage 클리어
    localStorage.removeItem('banpickTeams');

    // UI 초기화 (Step 1)
    goToStep(1);
    ui.btnReset.style.display = 'none';
    ui.playerSearch.value = '';
    filterAvailablePlayers();
    ui.playerPool.querySelectorAll('.available-player-item').forEach(item => {
        item.classList.remove('selected-in-list');
        item.querySelector('input[type="checkbox"]').checked = false;
    });
    updateSelectedPlayersUI();

    // UI 초기화 (Step 3)
    ui.teamAPlayers.innerHTML = '';
    ui.teamBPlayers.innerHTML = '';
    ui.teamAColumn.classList.remove('active-turn');
    ui.teamBColumn.classList.remove('active-turn');
    ui.draftMessage.textContent = "드래프트 준비 중...";
    ui.lightPathContainer.style.display = 'none';
    
    // UI 초기화 (Step 4)
    ui.finalTeamA.innerHTML = '';
    ui.finalTeamB.innerHTML = '';
}