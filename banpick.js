// --- [1] 설정 및 전역 변수 ---
const BANPICK_TIMER_DURATION = 30; // 밴픽 시간 (초)
const currentPatchVersion = '15.21.1'; // 사용자 요청 버전

const DDRAGON_BASE_URL = 'https://ddragon.leagueoflegends.com/cdn';
const CHAMPION_DATA_URL = `${DDRAGON_BASE_URL}/${currentPatchVersion}/data/ko_KR/champion.json`;
const CHAMPION_IMG_URL_BASE = `${DDRAGON_BASE_URL}/${currentPatchVersion}/img/champion/`;

let champions = {};
let selectedChampion = null;
let currentPreviewChampion = null;

// 밴픽 순서 정의
const banPickOrder = [
    { team: 'blue', action: 'ban', slotId: 'ban-b1' }, { team: 'red', action: 'ban', slotId: 'ban-r1' },
    { team: 'blue', action: 'ban', slotId: 'ban-b2' }, { team: 'red', action: 'ban', slotId: 'ban-r2' },
    { team: 'blue', action: 'ban', slotId: 'ban-b3' }, { team: 'red', action: 'ban', slotId: 'ban-r3' },
    { team: 'blue', action: 'pick', slotId: 'pick-b1' }, { team: 'red', action: 'pick', slotId: 'pick-r1' },
    { team: 'red', action: 'pick', slotId: 'pick-r2' }, { team: 'blue', action: 'pick', slotId: 'pick-b2' },
    { team: 'blue', action: 'pick', slotId: 'pick-b3' }, { team: 'red', action: 'pick', slotId: 'pick-r3' },
    { team: 'red', action: 'ban', slotId: 'ban-r4' }, { team: 'blue', action: 'ban', slotId: 'ban-b4' },
    { team: 'red', action: 'ban', slotId: 'ban-r5' }, { team: 'blue', action: 'ban', slotId: 'ban-b5' },
    { team: 'red', action: 'pick', slotId: 'pick-r4' }, { team: 'blue', action: 'pick', slotId: 'pick-b4' },
    { team: 'red', action: 'pick', slotId: 'pick-r5' }, { team: 'blue', action: 'pick', slotId: 'pick-b5' },
    { team: 'end', action: 'end', slotId: null }
];
let currentPhaseIndex = 0;
let timerInterval = null;
let remainingTime = BANPICK_TIMER_DURATION;

// UI 요소 캐싱
const ui = {};

// --- [2] 초기화 ---
window.addEventListener('DOMContentLoaded', () => {
    // UI 요소 캐싱
    // ui.container 삭제됨
    ui.timer = document.getElementById('timer');
    ui.phaseMessage = document.getElementById('phase-message');
    ui.championGrid = document.getElementById('champion-grid');
    ui.championSearch = document.getElementById('champion-search');
    ui.banButton = document.getElementById('ban-button');
    ui.pickButton = document.getElementById('pick-button');

    // 이벤트 리스너
    ui.championSearch.addEventListener('input', filterChampions);
    ui.banButton.addEventListener('click', handleBan);
    ui.pickButton.addEventListener('click', handlePick);

    loadChampionData();
});

// --- [3] 챔피언 데이터 로드 및 그리드 생성 ---
async function loadChampionData() {
    try {
        console.log(`[시도] 사용자 요청 버전(${currentPatchVersion}) 챔피언 데이터 로드: ${CHAMPION_DATA_URL}`);
        const response = await fetch(CHAMPION_DATA_URL);
        if (!response.ok) { throw new Error(`챔피언 데이터 로드 실패 (HTTP ${response.status}). 버전(${currentPatchVersion}) 확인 필요.`); }
        const data = await response.json();
        if (!data || !data.data) { throw new Error("챔피언 데이터 형식이 올바르지 않습니다."); }
        champions = data.data;

        for (const champId in champions) {
            champions[champId].choseong = getChoseong(champions[champId].name);
        }

        console.log(`버전 ${currentPatchVersion} 챔피언 데이터 로드 성공.`);
        renderChampionGrid();
        startBanPickPhase();

    } catch (error) {
        console.error("Error loading champion data:", error);
        ui.championGrid.innerHTML = `<div class="loading" style="color: red;">[오류] 챔피언 데이터를 불러오는 중 문제가 발생했습니다: ${error.message}. 인터넷 연결 및 요청 버전(${currentPatchVersion}) 확인.</div>`;
    }
}

function renderChampionGrid() {
    ui.championGrid.innerHTML = '';
    const championIds = Object.keys(champions).sort((a, b) => champions[a].name.localeCompare(champions[b].name));

    championIds.forEach(champId => {
        const champ = champions[champId];
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('champion-item');
        itemDiv.dataset.championId = champId;
        itemDiv.addEventListener('click', handleChampionSelect);

        const imgElement = document.createElement('img');
        imgElement.src = `${CHAMPION_IMG_URL_BASE}${champ.image.full}`;
        imgElement.alt = champ.name;
        imgElement.title = champ.name;
        imgElement.classList.add('champion-portrait');

        const nameSpan = document.createElement('span');
        nameSpan.classList.add('champion-name');
        nameSpan.textContent = champ.name;

        itemDiv.appendChild(imgElement);
        itemDiv.appendChild(nameSpan);
        ui.championGrid.appendChild(itemDiv);
    });
}

// --- [4] 챔피언 검색 (초성 추가) ---
function getChoseong(str) {
    const cho = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
    let result = "";
    for(let i=0; i<str.length; i++) {
        const code = str.charCodeAt(i)-44032;
        if(code > -1 && code < 11172) { result += cho[Math.floor(code/588)]; }
        else { result += str.charAt(i); }
    }
    return result;
}

function filterChampions() {
    const searchTerm = ui.championSearch.value.toLowerCase().replace(/\s/g, '');
    const isChoseongSearch = /[ㄱ-ㅎ]/.test(searchTerm);

    document.querySelectorAll('.champion-item').forEach(item => {
        const champId = item.dataset.championId;
        if (!champions[champId]) return;
        const champName = champions[champId].name.toLowerCase().replace(/\s/g, '');
        const champKey = champions[champId].id.toLowerCase();
        const champChoseong = champions[champId].choseong;
        let isVisible = isChoseongSearch ? champChoseong.includes(searchTerm) : (champName.includes(searchTerm) || champKey.includes(searchTerm));
        item.style.display = isVisible ? 'flex' : 'none';
    });
}

// --- [5] 밴픽 단계 관리 (수정) ---
function startBanPickPhase() {
    if (Object.keys(champions).length === 0) {
        ui.phaseMessage.textContent = "오류: 챔피언 로드 실패";
        return;
    }

    // 이전 활성 슬롯 비활성화
    const previousActiveSlot = document.querySelector('.active-slot');
    if (previousActiveSlot) { previousActiveSlot.classList.remove('active-slot'); }
    // 팀 턴 클래스 제거됨

    const phase = banPickOrder[currentPhaseIndex];
    if (phase.action === 'end') {
        ui.phaseMessage.innerHTML = "밴픽 완료!"; // innerHTML 사용
        stopTimer();
        return;
    }

    // 현재 활성 슬롯 강조
    const currentSlot = getCurrentSlotElement();
    if (currentSlot) { currentSlot.classList.add('active-slot'); }
    // 팀 턴 클래스 추가 삭제됨

    // [수정] 메시지 내용 변경 (팀 이름에 span 추가)
    const teamName = phase.team === 'blue' ? '블루팀' : '레드팀';
    const teamClass = phase.team === 'blue' ? 'blue-text' : 'red-text'; // CSS 클래스
    const actionText = phase.action === 'ban' ? '밴' : '픽';
    ui.phaseMessage.innerHTML = `<span class="${teamClass}">${teamName}</span> ${actionText} (${getPhaseNumber(phase)}/${getTotalPhases(phase.action)})`;


    startTimer();
    updateActionButtons(phase.action);
    resetChampionSelection();
    ui.championGrid.classList.remove('disabled');
}

// 현재 밴/픽 단계의 슬롯 DOM 요소 반환
function getCurrentSlotElement() {
    const phase = banPickOrder[currentPhaseIndex];
    return phase.slotId ? document.getElementById(phase.slotId) : null;
}

function getPhaseNumber(phase) { return phase.slotId.substring(phase.slotId.length - 1); }
function getTotalPhases(actionType) { return 5; }


// --- [6] 타이머 ---
function startTimer() { /* ... (이전과 동일) ... */
    stopTimer();
    remainingTime = BANPICK_TIMER_DURATION;
    ui.timer.textContent = remainingTime;
    ui.timer.classList.remove('low-time');
    timerInterval = setInterval(() => {
        remainingTime--;
        ui.timer.textContent = remainingTime;
        if (remainingTime <= 10) { ui.timer.classList.add('low-time'); }
        if (remainingTime <= 0) { handleTimeOut(); }
    }, 1000);
}
function stopTimer() { clearInterval(timerInterval); }
function handleTimeOut() { /* ... (이전과 동일) ... */
    stopTimer();
    console.log("시간 초과!");
    if (currentPreviewChampion) {
        const phase = banPickOrder[currentPhaseIndex];
        if (phase.action === 'ban') handleBan();
        else if (phase.action === 'pick') handlePick();
    } else {
        moveToNextPhase();
    }
}

// --- [7] 챔피언 선택 및 액션 ---
function handleChampionSelect(event) {
    const clickedItem = event.currentTarget;
    const championId = clickedItem.dataset.championId;
    const phase = banPickOrder[currentPhaseIndex];

    if (clickedItem.classList.contains('disabled') || phase.action === 'end') { return; }

    const previouslySelected = document.querySelector('.champion-item.selected');
    if (previouslySelected) { previouslySelected.classList.remove('selected'); }

    selectedChampion = championId;
    clickedItem.classList.add('selected');

    updateSlotPreview(championId);

    if (phase.action === 'ban') { ui.banButton.disabled = false; }
    else if (phase.action === 'pick') { ui.pickButton.disabled = false; }
}

function resetChampionSelection() {
    const previouslySelected = document.querySelector('.champion-item.selected');
    if (previouslySelected) { previouslySelected.classList.remove('selected'); }
    selectedChampion = null;
    ui.banButton.disabled = true;
    ui.pickButton.disabled = true;
    clearSlotPreview();
}

function updateSlotPreview(championId) {
    const slot = getCurrentSlotElement();
    const phase = banPickOrder[currentPhaseIndex];
    if (!slot || !championId) return;

    const champ = champions[championId];
    currentPreviewChampion = championId;

    slot.innerHTML = '';
    const img = document.createElement('img');
    img.src = `${CHAMPION_IMG_URL_BASE}${champ.image.full}`;
    img.alt = champ.name;
    img.classList.add('preview-image');
    if (phase.action === 'ban') {
        img.style.filter = 'grayscale(1)';
    }
    slot.appendChild(img);
    slot.classList.add('previewing');
}

function clearSlotPreview() {
    const slot = getCurrentSlotElement();
    if (slot && (slot.classList.contains('previewing') || (slot.classList.contains('active-slot') && !slot.classList.contains('banned') && !slot.classList.contains('picked'))) ) {
        slot.innerHTML = '';
        slot.classList.remove('previewing');
        currentPreviewChampion = null;

        const phase = banPickOrder[currentPhaseIndex];
        if (phase.action === 'pick' && phase.slotId) {
            const placeholder = document.createElement('div');
            placeholder.classList.add('pick-placeholder');
            placeholder.textContent = phase.slotId.substring(phase.slotId.length - 2).toUpperCase();
            slot.appendChild(placeholder);
        }
    }
}


function updateActionButtons(currentAction) {
    ui.banButton.style.display = (currentAction === 'ban') ? 'block' : 'none';
    ui.pickButton.style.display = (currentAction === 'pick') ? 'block' : 'none';
}

function handleBan() {
    const championToBan = currentPreviewChampion || selectedChampion;
    if (!championToBan) return;
    const phase = banPickOrder[currentPhaseIndex];
    if (phase.action !== 'ban') return;

    const banSlot = getCurrentSlotElement();
    const champ = champions[championToBan];

    banSlot.classList.remove('previewing');
    banSlot.innerHTML = `<img src="${CHAMPION_IMG_URL_BASE}${champ.image.full}" alt="${champ.name}" title="${champ.name}">`;
    banSlot.classList.add('banned', 'confirmed');

    disableChampion(championToBan);
    setTimeout(moveToNextPhase, 300);
}

function handlePick() {
    const championToPick = currentPreviewChampion || selectedChampion;
    if (!championToPick) return;
    const phase = banPickOrder[currentPhaseIndex];
    if (phase.action !== 'pick') return;

    stopTimer();

    const pickSlot = getCurrentSlotElement();
    const champ = champions[championToPick];

    pickSlot.classList.remove('previewing');
    pickSlot.innerHTML = `
        <img src="${CHAMPION_IMG_URL_BASE}${champ.image.full}" alt="${champ.name}" title="${champ.name}">
        <div class="pick-summoner-name">Summoner ${phase.slotId.substring(phase.slotId.length - 2).toUpperCase()}</div>
    `;
    pickSlot.classList.add('picked', 'confirmed');

    disableChampion(championToPick);
    setTimeout(moveToNextPhase, 300);
}

function disableChampion(championId) {
    const item = document.querySelector(`.champion-item[data-champion-id="${championId}"]`);
    if (item) {
        item.classList.add('disabled');
        item.classList.remove('selected');
    }
}

function moveToNextPhase() {
    const confirmedSlot = document.querySelector('.confirmed');
    if (confirmedSlot) confirmedSlot.classList.remove('confirmed');

    stopTimer();
    currentPhaseIndex++;
    startBanPickPhase();
}