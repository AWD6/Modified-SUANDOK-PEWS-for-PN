// --- 1. ข้อมูลกลุ่มอายุ ---
const ageGroups = [
    {
        id: 'newborn',
        name: 'Newborn',
        ageRange: 'แรกเกิด-1 เดือน',
        heartRate: { min: 80, max: 140 },
        respiratoryRate: { min: 35, max: 50 }
    },
    {
        id: 'infant',
        name: 'Infant',
        ageRange: '1-12 เดือน',
        heartRate: { min: 80, max: 140 },
        respiratoryRate: { min: 35, max: 50 }
    },
    {
        id: 'toddler',
        name: 'Toddler',
        ageRange: '13 เดือน - 3 ปี',
        heartRate: { min: 70, max: 130 },
        respiratoryRate: { min: 25, max: 40 }
    },
    {
        id: 'preschool',
        name: 'Preschool',
        ageRange: '4-6 ปี',
        heartRate: { min: 70, max: 120 },
        respiratoryRate: { min: 20, max: 30 }
    },
    {
        id: 'schoolage',
        name: 'School age',
        ageRange: '7-12 ปี',
        heartRate: { min: 70, max: 110 },
        respiratoryRate: { min: 20, max: 30 }
    },
    {
        id: 'adolescent',
        name: 'Adolescent',
        ageRange: '13-19 ปี',
        heartRate: { min: 60, max: 100 },
        respiratoryRate: { min: 20, max: 30 }
    }
];

// --- 2. ตัวเลือกพฤติกรรม ---
const behaviorOptions = [
    { score: 0, label: "เล่นเหมาะสม" },
    { score: 1, label: "หลับ (ปลุกตื่น)" },
    { score: 2, label: "ร้องไห้งอแง พักไม่ได้" },
    { score: 3, label: "ซึม/สับสน หรือ ตอบสนองต่อการกระตุ้นความปวดลดลง" }
];

// --- 3. Google Form Config ---
// ** กรุณาตรวจสอบ URL และ Field ID ให้ตรงกับฟอร์มจริงของคุณ **
const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdNjCW8kkM3zOJfxL8aC5vWoS32_FIpf4yYusaujFOKbhxQrQ/formResponse';

// --- 4. State Management ---
let state = {
    ageGroup: null,
    temperatureValue: '',
    temperatureScore: 0,
    behaviorScore: null,
    cardiovascularScore: 0,
    respiratoryScore: 0,
    additionalRisk: false,
    hn: '',
    location: '',
    locationOther: '',
    nursingNotes: '',
    symptomsChanged: 'no',
    transferDestination: '',
    transferDestinationOther: '',
    prValue: '',
    rrValue: '',
    sbpValue: '',
    dbpValue: '',
    skinColor: '',
    crt: '',
    retraction: '',
    fio2: '',
    o2: '',
    spo2: '',
    chdType: '',
    chdAlertScore: 0,
    chdAlertMessage: '',
    palsEnabled: false,
    records: [],
    parentRecordId: null,
    isReassessment: false,
    details: { temp: '', cardio: '', resp: '' }
};

let isSavingRecord = false;
const submittedRecordIds = new Set();

document.addEventListener('DOMContentLoaded', function() {
    loadRecords();
    renderAgeGrid();
    renderBehaviorGrid();
    renderRecords();
    updateTotalScore();

    // Event Listeners
    document.getElementById('hn-input-top').addEventListener('input', (e) => state.hn = e.target.value);
    
    document.getElementById('location-select').addEventListener('change', (e) => {
        state.location = e.target.value;
        const other = document.getElementById('location-other');
        other.style.display = e.target.value === 'อื่นๆ' ? 'block' : 'none';
        if (e.target.value !== 'อื่นๆ') { state.locationOther = ''; other.value = ''; }
    });
    document.getElementById('location-other').addEventListener('input', (e) => state.locationOther = e.target.value);

    // Temperature
    document.getElementById('temp-input').addEventListener('input', (e) => {
        state.temperatureValue = e.target.value;
        calculateTemperatureScore();
    });

    // Cardiovascular
    document.getElementById('pr-input').addEventListener('input', (e) => {
        state.prValue = e.target.value;
        calculateCardiovascularScore();
    });
    document.getElementById('sbp-input').addEventListener('input', (e) => state.sbpValue = e.target.value);
    document.getElementById('dbp-input').addEventListener('input', (e) => state.dbpValue = e.target.value);

    setupOptionButtons('skin-color-options', (val) => { state.skinColor = val; calculateCardiovascularScore(); });
    setupOptionButtons('crt-options', (val) => { state.crt = val; calculateCardiovascularScore(); });

    // Respiratory
    document.getElementById('rr-input').addEventListener('input', (e) => {
        state.rrValue = e.target.value;
        calculateRespiratoryScore();
    });
    document.getElementById('spo2-input').addEventListener('input', (e) => {
        state.spo2 = e.target.value;
        calculateRespiratoryScore();
        checkCyanoticCHDCondition();
    });

    setupOptionButtons('retraction-options', (val) => { state.retraction = val; calculateRespiratoryScore(); });
    setupOptionButtons('fio2-options', (val) => { state.fio2 = val; calculateRespiratoryScore(); });
    setupOptionButtons('o2-options', (val) => { state.o2 = val; calculateRespiratoryScore(); });

    // Risk & Buttons
    document.getElementById('additional-risk').addEventListener('change', (e) => {
        state.additionalRisk = e.target.checked;
        updateTotalScore();
    });

    document.getElementById('pals-button').addEventListener('click', (e) => {
        state.palsEnabled = !state.palsEnabled;
        e.target.classList.toggle('active', state.palsEnabled);
    });

    // CHD
    document.getElementById('chd-btn').addEventListener('click', () => { document.getElementById('chd-modal').style.display = 'flex'; });
    document.getElementById('modal-close').addEventListener('click', () => { document.getElementById('chd-modal').style.display = 'none'; });
    
    document.querySelectorAll('.chd-option-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.dataset.chd;
            state.chdType = type;
            const display = document.getElementById('chd-selected');
            display.style.display = 'block';
            display.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:space-between; background:#f5f3ff; padding:0.75rem; border-radius:0.5rem; border:1px solid #8b5cf6;">
                    <span style="color:#7c3aed; font-weight:bold;">${type === 'acyanotic' ? '○ Acyanotic CHD' : '● Cyanotic CHD'}</span> 
                    <button class="chd-cancel-btn" onclick="clearCHD()">ยกเลิก</button>
                </div>`;
            document.getElementById('chd-modal').style.display = 'none';
            checkCyanoticCHDCondition();
        });
    });

    document.getElementById('nursing-notes').addEventListener('input', (e) => state.nursingNotes = e.target.value);

    // Transfer (Logic เดิม 100%)
    document.getElementById('transfer-destination-select').addEventListener('change', (e) => {
        state.transferDestination = e.target.value;
        const otherInput = document.getElementById('transfer-destination-other');
        if (e.target.value === 'อื่นๆ') {
            otherInput.style.display = 'block';
        } else {
            otherInput.style.display = 'none';
            state.transferDestinationOther = '';
            otherInput.value = '';
        }
    });
    document.getElementById('transfer-destination-other').addEventListener('input', (e) => {
        state.transferDestinationOther = e.target.value;
    });

    document.querySelector('.btn-transfer').addEventListener('click', () => {
        if (!state.transferDestination) { alert('กรุณาเลือกสถานที่ส่งต่อ'); return; }
        saveRecord('Transfer');
    });

    document.querySelector('.btn-reset').addEventListener('click', () => window.location.reload());

    document.querySelectorAll('.symptom-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.symptom-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            state.symptomsChanged = this.dataset.value;
        });
    });
});

function setupOptionButtons(containerId, callback) {
    document.querySelectorAll(`#${containerId} .option-btn`).forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll(`#${containerId} .option-btn`).forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            callback(this.dataset.value);
        });
    });
}

function clearCHD() {
    state.chdType = '';
    document.getElementById('chd-selected').style.display = 'none';
    checkCyanoticCHDCondition();
}

// Helper to determine detail highlight class
function getDetailClass(currentScore, targetScore) {
    if (currentScore === targetScore) {
        return `highlight-score-${targetScore}`;
    }
    return 'highlight-normal';
}

// Modal Detail Logic
window.showDetail = function(type) {
    const modal = document.getElementById('detail-modal');
    const content = document.getElementById('detail-content');
    const title = document.getElementById('detail-title');
    let headerText = "รายละเอียดคะแนน";
    if (type === 'temp') headerText = "เกณฑ์คะแนน: อุณหภูมิร่างกาย";
    if (type === 'cardio') headerText = "เกณฑ์คะแนน: ระบบไหลเวียนโลหิต";
    if (type === 'resp') headerText = "เกณฑ์คะแนน: ระบบทางเดินหายใจ";
    title.innerText = headerText;
    content.innerHTML = state.details[type] || "กรุณากรอกข้อมูลเพื่อดูรายละเอียด";
    modal.style.display = 'flex';
};

window.closeDetailModal = function() {
    document.getElementById('detail-modal').style.display = 'none';
};

// --- Scoring Logic ---

function calculateTemperatureScore() {
    const temp = parseFloat(state.temperatureValue);
    let score = 0;
    
    // เกณฑ์: 0 (<=37.9), 1 (38.0-38.9), 2 (>=39.0)
    if (!isNaN(temp)) {
        if (temp >= 39.0) { score = 2; }
        else if (temp >= 38.0 && temp <= 38.9) { score = 1; }
        else { score = 0; }
    }
    
    // Detail String (Using symbols)
    state.details.temp = `
        <p><strong>ค่าที่ระบุ:</strong> ${state.temperatureValue || '-'} °C</p>
        <hr style="margin:0.5rem 0;">
        <p><strong>เกณฑ์การให้คะแนน:</strong></p>
        <ul style="list-style:none; padding:0;">
            <li class="${getDetailClass(score, 0)}">0 คะแนน: ≤ 37.9 °C</li>
            <li class="${getDetailClass(score, 1)}">1 คะแนน: 38.0 - 38.9 °C</li>
            <li class="${getDetailClass(score, 2)}">2 คะแนน: ≥ 39.0 °C</li>
        </ul>
        <p style="margin-top:0.5rem; font-size:1.2rem; font-weight:bold;">คะแนนที่ได้: ${score}</p>
    `;

    state.temperatureScore = score;
    document.getElementById('temp-score-val').innerText = score;
    updateTotalScore();
}

function calculateCardiovascularScore() {
    if (!state.ageGroup) return;
    const pr = parseInt(state.prValue);
    const skinColor = state.skinColor;
    const crt = state.crt;
    let prScore = 0, skinCrtScore = 0;

    // 1. PR Scoring
    const id = state.ageGroup;
    let criteria = { s0: '', s1: '', s2: '', s3: '' };
    
    if (id === 'newborn' || id === 'infant') {
        if (pr <= 140) prScore = 0;
        else if (pr >= 141 && pr <= 149) prScore = 1;
        else if (pr >= 150 && pr <= 159) prScore = 2;
        else if (pr >= 160 || pr <= 79) prScore = 3;
        criteria = { s0:'PR ≤ 140', s1:'PR 141-149', s2:'PR 150-159', s3:'PR ≥ 160 หรือ ≤ 79' };
    } else if (id === 'toddler') {
        if (pr <= 130) prScore = 0;
        else if (pr >= 131 && pr <= 139) prScore = 1;
        else if (pr >= 140 && pr <= 149) prScore = 2;
        else if (pr >= 150 || pr <= 69) prScore = 3;
        criteria = { s0:'PR ≤ 130', s1:'PR 131-139', s2:'PR 140-149', s3:'PR ≥ 150 หรือ ≤ 69' };
    } else if (id === 'preschool') {
        if (pr <= 120) prScore = 0;
        else if (pr >= 121 && pr <= 129) prScore = 1;
        else if (pr >= 130 && pr <= 139) prScore = 2;
        else if (pr >= 140 || pr <= 69) prScore = 3;
        criteria = { s0:'PR ≤ 120', s1:'PR 121-129', s2:'PR 130-139', s3:'PR ≥ 140 หรือ ≤ 69' };
    } else if (id === 'schoolage') {
        if (pr <= 110) prScore = 0;
        else if (pr >= 111 && pr <= 119) prScore = 1;
        else if (pr >= 120 && pr <= 129) prScore = 2;
        else if (pr >= 130 || pr <= 69) prScore = 3;
        criteria = { s0:'PR ≤ 110', s1:'PR 111-119', s2:'PR 120-129', s3:'PR ≥ 130 หรือ ≤ 69' };
    } else if (id === 'adolescent') {
        if (pr <= 100) prScore = 0;
        else if (pr >= 111 && pr <= 119) prScore = 1;
        else if (pr >= 120 && pr <= 129) prScore = 2;
        else if (pr >= 130 || pr <= 59) prScore = 3;
        criteria = { s0:'PR ≤ 100', s1:'PR 111-119', s2:'PR 120-129', s3:'PR ≥ 130 หรือ ≤ 59' };
    }

    // 2. Skin/CRT Scoring (Override if clicked)
    let skinCrtCriteria = { s0: 'ผิวสีชมพูดี, CRT 1-2 วินาที', s1: 'ผิวสีซีด, CRT 3 วินาที', s2: 'ผิวสีเทา, CRT ≥ 4 วินาที', s3: 'ตัวลาย' };
    
    // Default logic
    if (skinColor === 'pink' && crt === '1-2') { skinCrtScore = 0; }
    else if (skinColor === 'pale' || crt === '3') { skinCrtScore = 1; }
    else if (skinColor === 'gray' || crt === '4+') { skinCrtScore = 2; }
    else if (skinColor === 'mottled') { skinCrtScore = 3; }
    
    // Force score based on selection
    if (skinColor === 'pink') skinCrtScore = Math.max(skinCrtScore, 0);
    if (skinColor === 'pale') skinCrtScore = Math.max(skinCrtScore, 1);
    if (skinColor === 'gray') skinCrtScore = Math.max(skinCrtScore, 2);
    if (skinColor === 'mottled') skinCrtScore = Math.max(skinCrtScore, 3);
    
    if (crt === '1-2') skinCrtScore = Math.max(skinCrtScore, 0);
    if (crt === '3') skinCrtScore = Math.max(skinCrtScore, 1);
    if (crt === '4+') skinCrtScore = Math.max(skinCrtScore, 2);

    const finalScore = Math.max(prScore, skinCrtScore);
    state.cardiovascularScore = finalScore;
    document.getElementById('cardio-score-val').innerText = finalScore;

    state.details.cardio = `
        <p><strong>ข้อมูลที่ระบุ:</strong> PR: ${pr||'-'}, Skin: ${skinColor||'-'}, CRT: ${crt||'-'}</p>
        <hr style="margin:0.5rem 0;">
        <p><strong>เกณฑ์การประเมินคะแนน (${ageGroups.find(g=>g.id===state.ageGroup).ageRange}):</strong></p>
        <ul style="list-style:none; padding:0;">
            <li class="${getDetailClass(finalScore, 0)}">0 คะแนน: PR: ${criteria.s0} / ${skinCrtCriteria.s0}</li>
            <li class="${getDetailClass(finalScore, 1)}">1 คะแนน: PR: ${criteria.s1} / ${skinCrtCriteria.s1}</li>
            <li class="${getDetailClass(finalScore, 2)}">2 คะแนน: PR: ${criteria.s2} / ${skinCrtCriteria.s2}</li>
            <li class="${getDetailClass(finalScore, 3)}">3 คะแนน: PR: ${criteria.s3} / ${skinCrtCriteria.s3}</li>
        </ul>
        <p style="margin-top:0.5rem; font-size:1.2rem; font-weight:bold;">คะแนนที่ได้: ${finalScore}</p>
    `;
    updateTotalScore();
}

function calculateRespiratoryScore() {
    if (!state.ageGroup) return;
    const rr = parseInt(state.rrValue);
    const spo2 = parseFloat(state.spo2);
    let rrScore = 0, oxygenScore = 0, spo2Score = 0;

    // 1. RR Score
    const id = state.ageGroup;
    let criteria = { s0:'', s1:'', s2:'', s3:'' };
    
    if (id === 'newborn' || id === 'infant') {
        if (rr >= 35 && rr <= 50) rrScore = 0;
        else if (rr >= 51 && rr <= 59) rrScore = 1;
        else if (rr >= 60 && rr <= 69) rrScore = 2;
        else if (rr <= 30 || rr >= 70) rrScore = 3;
        criteria = { s0:'RR 35-50 tpm', s1:'RR 51-59 tpm', s2:'RR 60-69 tpm', s3:'RR ≤ 30 หรือ ≥ 70 tpm' };
    } else if (id === 'toddler') {
        if (rr >= 25 && rr <= 40) rrScore = 0;
        else if (rr >= 41 && rr <= 49) rrScore = 1;
        else if (rr >= 50 && rr <= 59) rrScore = 2;
        else if (rr <= 20 || rr >= 60) rrScore = 3;
        criteria = { s0:'RR 25-40 tpm', s1:'RR 41-49 tpm', s2:'RR 50-59 tpm', s3:'RR ≤ 20 หรือ ≥ 60 tpm' };
    } else if (['preschool', 'schoolage', 'adolescent'].includes(id)) {
        if (rr >= 20 && rr <= 30) rrScore = 0;
        else if (rr >= 31 && rr <= 39) rrScore = 1;
        else if (rr >= 40 && rr <= 49) rrScore = 2;
        else if (rr <= 16 || rr >= 50) rrScore = 3;
        criteria = { s0:'RR 20-30 tpm', s1:'RR 31-39 tpm', s2:'RR 40-49 tpm', s3:'RR ≤ 16 หรือ ≥ 50 tpm' };
    }

    // Retraction logic
    if (state.retraction === 'yes' && rrScore < 3) rrScore = Math.max(rrScore, 1);

    // Oxygen Scoring
    if (state.fio2 === '30' || state.o2 === '4') oxygenScore = Math.max(oxygenScore, 1);
    if (state.fio2 === '40' || state.o2 === '6') oxygenScore = Math.max(oxygenScore, 2);
    if (state.fio2 === '50' || state.o2 === '8') oxygenScore = Math.max(oxygenScore, 3);

    // SpO2
    if (!isNaN(spo2) && spo2 < 95) {
        spo2Score = 3;
        if (state.chdType === 'cyanotic' && spo2 < 75) spo2Score = 3; 
    }

    const finalScore = Math.max(rrScore, oxygenScore, spo2Score);
    state.respiratoryScore = finalScore;
    document.getElementById('resp-score-val').innerText = finalScore;

    const retractionText = state.retraction === 'yes' ? 'มี Retraction' : 'ไม่มี Retraction';
    const oxygenText = state.fio2 || state.o2 ? (state.fio2 ? `FiO₂ ≥ ${state.fio2}%` : `O₂ ≥ ${state.o2} LPM`) : 'Room air';
    
    // Detail String
    state.details.resp = `
        <p><strong>ข้อมูลที่ระบุ:</strong> RR: ${rr||'-'}, Retraction: ${retractionText}, FiO2/O2: ${oxygenText}, SpO2: ${spo2||'-'}%</p>
        <hr style="margin:0.5rem 0;">
        <p><strong>เกณฑ์คะแนน:</strong></p>
        <ul style="list-style:none; padding:0;">
            <li class="${getDetailClass(finalScore, 0)}">0 คะแนน: ${criteria.s0}, ไม่มี Retraction, Room air หรือ O₂ < 4 LPM</li>
            <li class="${getDetailClass(finalScore, 1)}">1 คะแนน: ${criteria.s1} หรือ ${retractionText} หรือ FiO₂ ≥ 30% หรือ O₂ ≥ 4 LPM</li>
            <li class="${getDetailClass(finalScore, 2)}">2 คะแนน: ${criteria.s2} หรือ FiO₂ ≥ 40% หรือ O₂ ≥ 6 LPM</li>
            <li class="${getDetailClass(finalScore, 3)}">3 คะแนน: ${criteria.s3} หรือ FiO₂ ≥ 50% หรือ O₂ ≥ 8 LPM หรือ SpO₂ < 95%</li>
        </ul>
        <p style="margin-top:0.5rem; font-size:1.2rem; font-weight:bold;">คะแนนที่ได้: ${finalScore}</p>
    `;
    updateTotalScore();
}

function checkCyanoticCHDCondition() {
    const spo2 = parseInt(state.spo2);
    state.chdAlertScore = 0;
    state.chdAlertMessage = '';
    if (state.chdType === 'cyanotic' && !isNaN(spo2) && spo2 < 75) {
        state.chdAlertScore = 4;
        state.chdAlertMessage = 'SpO2 < 75% ใน Cyanotic CHD: พิจารณาส่งต่อ ER ด่วน!';
    }
    updateTotalScore();
}

// --- Render & UI ---

function renderAgeGrid() {
    const grid = document.getElementById('age-grid');
    grid.innerHTML = '';
    ageGroups.forEach(age => {
        const btn = document.createElement('button');
        btn.className = 'age-button';
        btn.innerHTML = `<div class="age-name">${age.name}</div><div class="age-range">${age.ageRange}</div>`;
        btn.onclick = () => selectAge(age.id);
        grid.appendChild(btn);
    });
}

function selectAge(id) {
    if (state.ageGroup === id) {
        state.ageGroup = null;
    } else {
        state.ageGroup = id;
    }
    document.querySelectorAll('.age-button').forEach((b, i) => {
        b.classList.toggle('selected', ageGroups[i].id === state.ageGroup);
    });

    const isSelected = state.ageGroup !== null;
    ['temp-input-container','cardiovascular-input-container','respiratory-input-container'].forEach(id=>document.getElementById(id).style.display = isSelected ? 'block' : 'none');
    ['temperature-warning','cardiovascular-warning','respiratory-warning'].forEach(id=>document.getElementById(id).style.display = isSelected ? 'none' : 'block');
    
    if (isSelected) {
        const group = ageGroups.find(g => g.id === state.ageGroup);
        document.getElementById('pr-ref-range').innerText = `(ปกติ: ${group.heartRate.min}-${group.heartRate.max})`;
        document.getElementById('rr-ref-range').innerText = `(ปกติ: ${group.respiratoryRate.min}-${group.respiratoryRate.max})`;
    } else {
        document.getElementById('pr-ref-range').innerText = ``;
        document.getElementById('rr-ref-range').innerText = ``;
    }
    document.getElementById('age-error').style.display = isSelected ? 'none' : 'block';

    calculateTemperatureScore();
    calculateCardiovascularScore();
    calculateRespiratoryScore();
}

function renderBehaviorGrid() {
    const grid = document.getElementById('behavior-grid');
    grid.innerHTML = '';
    behaviorOptions.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'score-button';
        btn.innerHTML = `<div class="score-label">${opt.label}</div><div class="score-value text-blue">${opt.score}</div>`;
        btn.onclick = () => {
            if (state.behaviorScore === opt.score) {
                state.behaviorScore = null;
                btn.classList.remove('selected');
            } else {
                state.behaviorScore = opt.score;
                document.querySelectorAll('#behavior-grid .score-button').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            }
            // Update behavior score display
            document.getElementById('behav-score-val').innerText = state.behaviorScore !== null ? state.behaviorScore : 0;
            updateTotalScore();
        };
        grid.appendChild(btn);
    });
}

function updateTotalScore() {
    const temp = state.temperatureScore || 0;
    const behav = state.behaviorScore !== null ? state.behaviorScore : 0;
    const cardio = state.cardiovascularScore || 0;
    const resp = state.respiratoryScore || 0;
    const add = state.additionalRisk ? 2 : 0;
    
    let total = temp + behav + cardio + resp + add + state.chdAlertScore;

    let riskLevel = 'low';
    let rec = "รับบริการตามปกติ";
    if (total >= 4) { riskLevel = 'high'; rec = "ส่งต่อ ER"; }
    else if (total === 3) { riskLevel = 'orange'; rec = "พบแพทย์ภายใน 30 นาที"; }
    else if (total === 2) { riskLevel = 'medium'; rec = "ติดตามประเมินอาการทุก 1-2 ชั่วโมง"; }

    const display = document.getElementById('total-score-display');
    display.className = `total-score ${riskLevel}`;
    
    let chdAlertHtml = state.chdAlertMessage ? `<span class="urgent-alert-text">${state.chdAlertMessage}</span>` : '';

    display.innerHTML = `
        <div class="total-score-label">คะแนนรวม Modified SUANDOK PEWS</div>
        <div class="score-main-area">
            <div class="total-score-number">${total}</div>
            <div class="recommendation-box">
                <div class="recommendation-text">
                    ${chdAlertHtml}
                    <p>${rec}</p>
                </div>
            </div>
        </div>
        <div class="total-score-breakdown">
             <div class="breakdown-item"><span class="breakdown-label">Temp</span><span class="breakdown-value">${temp}</span></div>
             <div class="breakdown-item"><span class="breakdown-label">พฤติกรรม</span><span class="breakdown-value">${behav}</span></div>
             <div class="breakdown-item"><span class="breakdown-label">ระบบไหลเวียนโลหิต</span><span class="breakdown-value">${cardio}</span></div>
             <div class="breakdown-item"><span class="breakdown-label">ระบบทางเดินหายใจ</span><span class="breakdown-value">${resp}</span></div>
             ${add ? `<div class="breakdown-item"><span class="breakdown-label">Risk</span><span class="breakdown-value">+2</span></div>` : ''}
             ${state.chdAlertScore ? `<div class="breakdown-item breakdown-chd-alert"><span class="breakdown-label">CHD</span><span class="breakdown-value">+4</span></div>` : ''}
        </div>
    `;

    document.getElementById('nursing-notes').value = rec;
    state.nursingNotes = rec;
}

// --- Save & History Records ---

function getScoreColorClass(score) {
    if (score <= 1) return 'score-green';
    if (score === 2) return 'score-yellow';
    if (score === 3) return 'score-orange';
    return 'score-red';
}

function getRiskLevel(score) {
    if (score <= 1) return 'low';
    if (score === 2) return 'medium';
    if (score === 3) return 'orange';
    return 'high';
}

function formatDateTime(isoString) {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

async function submitToGoogleForm(record) {
    if (submittedRecordIds.has(record.id)) return;

    // --- 1. ตั้งค่า Mapping เลข Entry ID ให้ตรงกับ Google Form จริง ---
    const FORM_FIELD_IDS = {
        hn: 'entry.548024940',             // HN
        location: 'entry.1691416727',      // สถานที่
        ageGroup: 'entry.1308705625',      // ช่วงอายุ
        temp: 'entry.54134142',            // Temp
        totalScore: 'entry.968429810',     // คะแนนรวม
        vitalSigns: 'entry.385871425',     // Vital Signs (Paragraph)
        scoreDetails: 'entry.381918120',   // รายละเอียดคะแนน (Paragraph)
        chd: 'entry.2139857838',           // CHD
        pals: 'entry.1652284044',          // PALS
        notes: 'entry.1322870299',         // การพยาบาล (Paragraph)
        transfer: 'entry.565363340',       // ส่งต่อไปที่
        timestamp: 'entry.396417988',      // เวลาบันทึก
        reassessment: 'entry.913159674'    // ประเมินซ้ำ (Paragraph)
    };

    const formData = new FormData();
    const safeText = (val) => (val === undefined || val === null || String(val).trim() === '') ? '-' : String(val);

    // Mapping ค่าตัวเลือกให้ตรงกับข้อความที่ต้องการส่ง
    const ageGroupMapping = {
        'newborn': 'Newborn (แรกเกิด-1 เดือน)',
        'infant': 'Infant (1-12 เดือน)',
        'toddler': 'Toddler (13 เดือน - 3 ปี)',
        'preschool': 'Preschool (4-6 ปี)',
        'schoolage': 'School age (7-12 ปี)',
        'adolescent': 'Adolescent (13-19 ปี)'
    };

    const chdTypeMapping = {
        'acyanotic': 'Acyanotic CHD',
        'cyanotic': 'Cyanotic CHD',
        '': 'ไม่มี CHD'
    };

    // เตรียมข้อความรวม
    const extraChdScore = record.chdAlertScore > 0 ? ` (+${record.chdAlertScore} CHD Alert)` : '';
    const vitalSignsText = `Temp: ${safeText(record.temperatureValue)} | PR: ${safeText(record.prValue)} | RR: ${safeText(record.rrValue)} | BP: ${safeText(record.bloodPressure)} | SpO₂: ${safeText(record.spo2)}%`;
    const scoreDetailsText = `Temp Score: ${safeText(record.temperatureScore)} | Behav: ${safeText(record.behaviorScore)} | Cardio: ${safeText(record.cardiovascularScore)} | Resp: ${safeText(record.respiratoryScore)}${extraChdScore}`;
    const reassessmentText = record.isReassessment ? 'ใช่ (ประเมินซ้ำ)' : 'ไม่ใช่ (ประเมินครั้งแรก)';

    // Append ข้อมูลลง Form Data
    formData.append(FORM_FIELD_IDS.hn, safeText(record.hn));
    formData.append(FORM_FIELD_IDS.location, safeText(record.location));
    formData.append(FORM_FIELD_IDS.ageGroup, ageGroupMapping[record.ageGroup] || safeText(record.ageGroup));
    formData.append(FORM_FIELD_IDS.temp, safeText(record.temperatureValue));
    formData.append(FORM_FIELD_IDS.totalScore, safeText(record.totalScore));
    formData.append(FORM_FIELD_IDS.vitalSigns, vitalSignsText);
    formData.append(FORM_FIELD_IDS.scoreDetails, scoreDetailsText);
    formData.append(FORM_FIELD_IDS.chd, chdTypeMapping[record.chdType] || 'ไม่ระบุ');
    formData.append(FORM_FIELD_IDS.pals, record.palsEnabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน');
    formData.append(FORM_FIELD_IDS.notes, safeText(record.nursingNotes));
    formData.append(FORM_FIELD_IDS.transfer, safeText(record.transferDestination));
    formData.append(FORM_FIELD_IDS.timestamp, new Date(record.createdAt).toLocaleString('th-TH'));
    formData.append(FORM_FIELD_IDS.reassessment, reassessmentText);

    submittedRecordIds.add(record.id);

    try {
        await fetch(GOOGLE_FORM_URL, { method: 'POST', mode: 'no-cors', body: formData });
        console.log('Submitted to Google Form successfully');
    } catch (error) {
        console.error('Error submitting to Google Form:', error);
        submittedRecordIds.delete(record.id);
    }
}

async function saveRecord(action) {
    if (isSavingRecord) return;
    if (!state.ageGroup) { alert('กรุณาเลือกช่วงอายุ'); return; }

    isSavingRecord = true;
    const btn = document.querySelector('.btn-transfer');
    if(btn) btn.innerText = 'กำลังส่ง...';

    const bpString = (state.sbpValue && state.dbpValue) ? `${state.sbpValue}/${state.dbpValue}` : '';
    const temp = state.temperatureScore || 0;
    const behav = state.behaviorScore !== null ? state.behaviorScore : 0;
    const cardio = state.cardiovascularScore || 0;
    const resp = state.respiratoryScore || 0;
    const add = state.additionalRisk ? 2 : 0;
    const total = temp + behav + cardio + resp + add + state.chdAlertScore;

    const locationValue = state.location === 'อื่นๆ' ? `อื่นๆ: ${state.locationOther}` : state.location;
    const transferValue = state.transferDestination === 'อื่นๆ' ? `อื่นๆ: ${state.transferDestinationOther}` : state.transferDestination;

    const record = {
        id: Date.now().toString(),
        hn: state.hn,
        location: locationValue || '-',
        ageGroup: state.ageGroup || '-',
        ageGroupName: ageGroups.find(g => g.id === state.ageGroup)?.name || '-',
        temperatureValue: state.temperatureValue,
        totalScore: total,
        bloodPressure: bpString,
        prValue: state.prValue,
        rrValue: state.rrValue,
        spo2: state.spo2,
        chdType: state.chdType,
        temperatureScore: temp, 
        behaviorScore: behav,
        cardiovascularScore: cardio, 
        respiratoryScore: resp, 
        additionalRisk: state.additionalRisk,
        chdAlertScore: state.chdAlertScore,
        nursingNotes: state.nursingNotes,
        transferDestination: transferValue,
        palsEnabled: state.palsEnabled,
        isReassessment: state.isReassessment,
        parentRecordId: state.parentRecordId,
        // Added for detailed display
        skinColor: state.skinColor,
        crt: state.crt,
        retraction: state.retraction,
        fio2: state.fio2,
        o2: state.o2,
        createdAt: new Date().toISOString()
    };

    state.records.unshift(record);
    localStorage.setItem('pewsRecords', JSON.stringify(state.records));
    
    await submitToGoogleForm(record);
    renderRecords();

    alert('บันทึกสำเร็จ');
    isSavingRecord = false;
    if(btn) btn.innerText = 'ส่งต่อข้อมูล';
    
    resetForm();
}

function resetForm() {
    state.ageGroup = null;
    state.temperatureValue = ''; state.temperatureScore = 0;
    state.behaviorScore = null;
    state.cardiovascularScore = 0; state.respiratoryScore = 0;
    state.additionalRisk = false;
    state.hn = ''; state.location = ''; state.locationOther = '';
    state.nursingNotes = ''; state.symptomsChanged = 'no';
    state.transferDestination = ''; state.transferDestinationOther = '';
    state.prValue = ''; state.rrValue = ''; state.sbpValue = ''; state.dbpValue = '';
    state.skinColor = ''; state.crt = ''; state.retraction = ''; state.fio2 = ''; state.o2 = ''; state.spo2 = '';
    state.chdType = ''; state.chdAlertScore = 0; state.chdAlertMessage = '';
    state.palsEnabled = false; state.parentRecordId = null; state.isReassessment = false;

    document.getElementById('hn-input-top').value = '';
    document.getElementById('location-select').value = '';
    document.getElementById('location-other').style.display = 'none';
    document.getElementById('temp-input').value = '';
    document.getElementById('pr-input').value = '';
    document.getElementById('sbp-input').value = ''; document.getElementById('dbp-input').value = '';
    document.getElementById('rr-input').value = '';
    document.getElementById('spo2-input').value = '';
    document.getElementById('additional-risk').checked = false;
    document.getElementById('pals-button').classList.remove('active');
    document.getElementById('chd-selected').style.display = 'none';
    document.getElementById('nursing-notes').value = '';
    document.getElementById('transfer-destination-select').value = '';
    document.getElementById('transfer-destination-other').style.display = 'none';

    document.querySelectorAll('.age-button, .score-button, .option-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelectorAll('.symptom-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.symptom-btn[data-value="no"]').classList.add('active');

    // Score Displays
    document.getElementById('temp-score-val').innerText = '0';
    document.getElementById('behav-score-val').innerText = '0';
    document.getElementById('cardio-score-val').innerText = '0';
    document.getElementById('resp-score-val').innerText = '0';

    ['temp-input-container','cardiovascular-input-container','respiratory-input-container'].forEach(id=>document.getElementById(id).style.display = 'none');
    ['temperature-warning','cardiovascular-warning','respiratory-warning'].forEach(id=>document.getElementById(id).style.display = 'block');
    document.getElementById('pr-ref-range').innerText = '';
    document.getElementById('rr-ref-range').innerText = '';

    updateTotalScore();
}

function loadRecords() {
    const saved = localStorage.getItem('pewsRecords');
    if (saved) state.records = JSON.parse(saved);
}

// Render Records - Original Layout (100% matched to attached code)
function renderRecords() {
    const container = document.getElementById('records-list');
    if (!state.records || state.records.length === 0) {
        container.innerHTML = `
            <div class="empty-records">
                <div class="empty-icon">📋</div>
                <p class="empty-title">ยังไม่มีประวัติการบันทึก</p>
                <p class="empty-description">เมื่อคุณบันทึกข้อมูลผู้ป่วย ประวัติจะแสดงที่นี่</p>
            </div>
        `;
        return;
    }

    container.innerHTML = state.records.map((record) => {
        const ageGroup = ageGroups.find(a => a.id === record.ageGroup);
        const ageText = ageGroup ? `${ageGroup.name} (${ageGroup.ageRange})` : 'ไม่ระบุ';
        const isReassessment = record.isReassessment;
        const parentRecord = isReassessment ? state.records.find(r => r.id === record.parentRecordId) : null;

        let comparisonHTML = '';
        if (isReassessment && parentRecord) {
            const parentScoreClass = getScoreColorClass(parentRecord.totalScore);
            const currentScoreClass = getScoreColorClass(record.totalScore);
            
            const scoreChanged = record.totalScore !== parentRecord.totalScore;
            const scoreChangeIndicator = scoreChanged ? 
                `<div style="display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1rem; padding: 1rem; background: rgba(255, 255, 255, 0.6); border-radius: 0.5rem;">
                    <span class="score-comparison-highlight ${parentScoreClass}" style="font-size: 1.5rem; padding: 0.5rem 1rem;">${parentRecord.totalScore}</span>
                    <span style="font-size: 1.5rem; font-weight: bold; color: #6b7280;">→</span>
                    <span class="score-comparison-highlight ${currentScoreClass}" style="font-size: 1.5rem; padding: 0.5rem 1rem;">${record.totalScore}</span>
                </div>` : '';
            
            comparisonHTML = `
                <div class="comparison-container">
                    <h4>📊 เปรียบเทียบผลการประเมิน</h4>
                    ${scoreChangeIndicator}
                    <div class="comparison-grid">
                        <div class="comparison-column">
                            <div class="comparison-header">
                                <span class="comparison-badge">1</span>
                                <div>
                                    <div class="comparison-title">ครั้งที่ 1</div>
                                    <div class="comparison-time">${formatDateTime(parentRecord.createdAt)}</div>
                                </div>
                            </div>
                            <div class="comparison-data">
                                <div class="data-item">
                                    <span class="data-label">คะแนนรวม</span>
                                    <span class="score-comparison-highlight ${parentScoreClass}">${parentRecord.totalScore}</span>
                                </div>
                                <div class="data-item">
                                    <span class="data-label">Temp</span>
                                    <span class="data-value">${parentRecord.temperatureValue} °C</span>
                                </div>
                                <div class="data-item">
                                    <span class="data-label">PR</span>
                                    <span class="data-value">${parentRecord.prValue} bpm</span>
                                </div>
                                <div class="data-item">
                                    <span class="data-label">RR</span>
                                    <span class="data-value">${parentRecord.rrValue} tpm</span>
                                </div>
                                <div class="data-item">
                                    <span class="data-label">BP</span>
                                    <span class="data-value">${parentRecord.bloodPressure}</span>
                                </div>
                                <div class="data-item">
                                    <span class="data-label">SpO₂</span>
                                    <span class="data-value">${parentRecord.spo2}%</span>
                                </div>
                            </div>
                        </div>

                        <div class="comparison-arrow">→</div>

                        <div class="comparison-column highlight">
                            <div class="comparison-header">
                                <span class="comparison-badge">2</span>
                                <div>
                                    <div class="comparison-title">ครั้งที่ 2 (ประเมินซ้ำ)</div>
                                    <div class="comparison-time">${formatDateTime(record.createdAt)}</div>
                                </div>
                            </div>
                            <div class="comparison-data">
                                <div class="data-item ${record.totalScore !== parentRecord.totalScore ? 'changed' : ''}">
                                    <span class="data-label">คะแนนรวม</span>
                                    <span class="score-comparison-highlight ${currentScoreClass}">${record.totalScore}</span>
                                </div>
                                <div class="data-item ${record.temperatureValue !== parentRecord.temperatureValue ? 'changed' : ''}">
                                    <span class="data-label">Temp</span>
                                    <span class="data-value">${record.temperatureValue} °C</span>
                                </div>
                                <div class="data-item ${record.prValue !== parentRecord.prValue ? 'changed' : ''}">
                                    <span class="data-label">PR</span>
                                    <span class="data-value">${record.prValue} bpm</span>
                                </div>
                                <div class="data-item ${record.rrValue !== parentRecord.rrValue ? 'changed' : ''}">
                                    <span class="data-label">RR</span>
                                    <span class="data-value">${record.rrValue} tpm</span>
                                </div>
                                <div class="data-item ${record.bloodPressure !== parentRecord.bloodPressure ? 'changed' : ''}">
                                    <span class="data-label">BP</span>
                                    <span class="data-value">${record.bloodPressure}</span>
                                </div>
                                <div class="data-item ${record.spo2 !== parentRecord.spo2 ? 'changed' : ''}">
                                    <span class="data-label">SpO₂</span>
                                    <span class="data-value">${record.spo2}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        const riskLevel = getRiskLevel(record.totalScore);
        const scoreColorClass = riskLevel === 'low' ? 'score-green' :
                                riskLevel === 'medium' ? 'score-yellow' :
                                riskLevel === 'orange' ? 'score-orange' : 'score-red';
        
        const chdAlertInfo = record.chdAlertScore > 0 ? `<span class="chd-badge">+${record.chdAlertScore} CHD ALERT</span>` : '';

        return `
            <div class="record-card">
                <div class="record-header">
                    <div>
                        <strong>HN:</strong> ${record.hn}
                        ${isReassessment ? '<span class="reassessment-badge">ประเมินซ้ำ</span>' : ''}
                    </div>
                    <div class="record-date">${formatDateTime(record.createdAt)}</div>
                </div>

                <div class="record-details">
                    <div class="detail-row">
                        <span class="detail-label">สถานที่:</span>
                        <span>${record.location}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">ช่วงอายุ:</span>
                        <span>${ageText}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">คะแนนรวม:</span>
                        <span class="total-score-badge ${scoreColorClass}">${record.totalScore}</span>
                        ${chdAlertInfo}
                    </div>
                    ${record.nursingNotes ? `
                    <div class="detail-row">
                        <span class="detail-label">การพยาบาล:</span>
                        <span>${record.nursingNotes}</span>
                    </div>
                    ` : ''}
                    ${record.transferDestination ? `
                    <div class="detail-row">
                        <span class="detail-label">ส่งต่อ:</span>
                        <span class="transfer-badge">${record.transferDestination}</span>
                    </div>
                    ` : ''}
                    ${record.chdType ? `
                    <div class="detail-row">
                        <span class="detail-label">CHD:</span>
                        <span class="chd-badge">${record.chdType === 'acyanotic' ? '○ Acyanotic CHD' : '● Cyanotic CHD'}</span>
                    </div>
                    ` : ''}
                    ${record.palsEnabled ? `
                    <div class="detail-row">
                        <span class="detail-label">PALS:</span>
                        <span class="pals-badge">PALS</span>
                    </div>
                    ` : ''}
                </div>

                <div class="vital-signs-summary">
                    <h4>📊 สัญญาณชีพที่ประเมิน</h4>
                    <div class="vital-signs-summary-grid">
                        <div class="vital-summary-item">
                            <span class="vital-summary-label">Temp:</span>
                            <span class="vital-summary-value">${record.temperatureValue} °C</span>
                        </div>
                        <div class="vital-summary-item">
                            <span class="vital-summary-label">PR:</span>
                            <span class="vital-summary-value">${record.prValue} bpm</span>
                        </div>
                        <div class="vital-summary-item">
                            <span class="vital-summary-label">RR:</span>
                            <span class="vital-summary-value">${record.rrValue} tpm</span>
                        </div>
                        <div class="vital-summary-item">
                            <span class="vital-summary-label">BP:</span>
                            <span class="vital-summary-value">${record.bloodPressure} mmHg</span>
                        </div>
                        <div class="vital-summary-item">
                            <span class="vital-summary-label">SpO₂:</span>
                            <span class="vital-summary-value">${record.spo2}%</span>
                        </div>
                    </div>
                </div>

                ${comparisonHTML}

                <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                    <button class="reassess-btn" onclick="startReassessment('${record.id}')">
                        🔄 ประเมินซ้ำ
                    </button>
                    <button class="delete-btn" onclick="deleteRecord('${record.id}')">
                        🗑️ ลบ
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

window.deleteRecord = function(id) {
    if(confirm('ยืนยันการลบประวัติการบันทึกนี้หรือไม่?')) {
        state.records = state.records.filter(r => r.id !== id);
        localStorage.setItem('pewsRecords', JSON.stringify(state.records));
        renderRecords();
    }
};

window.startReassessment = function(recordId) {
    const record = state.records.find(r => r.id === recordId);
    if (!record) return;

    window.scrollTo({ top: 0, behavior: 'smooth' });
    resetForm();

    state.isReassessment = true;
    state.parentRecordId = recordId;
    state.hn = record.hn;
    document.getElementById('hn-input-top').value = record.hn;
    
    if(record.ageGroup) {
        selectAge(record.ageGroup);
    }
    
    alert(`เริ่มการประเมินซ้ำสำหรับ HN: ${record.hn}`);
};
