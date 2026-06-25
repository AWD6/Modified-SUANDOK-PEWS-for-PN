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
        ageRange: '13-15 ปี',
        heartRate: { min: 60, max: 100 },
        respiratoryRate: { min: 20, max: 30 }
    }
];

// --- 2. ตัวเลือกพฤติกรรม (เปลี่ยนคำอธิบายคะแนน 0) ---
const behaviorOptions = [
    { score: 0, label: "Alert, Reactive to Stimuli" },
    { score: 1, label: "หลับ (ปลุกตื่น)" },
    { score: 2, label: "ร้องไห้งอแง พักไม่ได้" },
    { score: 3, label: "ซึม/สับสน หรือ ตอบสนองต่อการกระตุ้นความปวดลดลง" }
];

// --- 3. Google Form Config (อัปเดตตามฟอร์มล่าสุด) ---
const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScyj9izfifLzdbCFd9TmaisQFGADhHIuRjaeqeIbopi5CgLOQ/formResponse';


// --- 4. State Management (เพิ่ม termCondition) ---
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
    termCondition: null, // 'term' หรือ 'preterm'
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

    // Term / Preterm Toggle Listener
    setupOptionButtons('term-options', (val) => {
        state.termCondition = val;
        calculateRespiratoryScore();
    });

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

    // Transfer
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
            updateTotalScore(); 
        });
    });
});

function setupOptionButtons(containerId, callback) {
    document.querySelectorAll(`#${containerId} .option-btn`).forEach(btn => {
        btn.addEventListener('click', function() {
            // Check toggle logic for Term/Preterm buttons to act like radio buttons
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

function getDetailClass(currentScore, targetScore) {
    return (currentScore === targetScore) ? `highlight-score-${targetScore}` : 'highlight-normal';
}

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
    
    if (!isNaN(temp)) {
        if (temp >= 39.0) { score = 2; }
        else if (temp >= 37.6 && temp <= 38.9) { score = 1; }
        else if (temp >= 36.5 && temp <= 37.5) { score = 0; } 
        else if (temp < 36.0) { score = 1; }
        else { score = 0; } // 36.0 - 36.4
    }
    
    state.details.temp = `
        <p><strong>ค่าที่ระบุ:</strong> ${state.temperatureValue || '-'} °C</p>
        <hr style="margin:0.5rem 0;">
        <p><strong>เกณฑ์การให้คะแนน:</strong></p>
        <ul style="list-style:none; padding:0;">
            <li class="${getDetailClass(score, 1)}">1 คะแนน: < 36.0 °C</li>
            <li class="${getDetailClass(score, 0)}">0 คะแนน: 36.5 - 37.5 °C</li>
            <li class="${getDetailClass(score, 1)}">1 คะแนน: 37.6 - 38.9 °C</li>
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

    const id = state.ageGroup;
    let criteria = { s0: '', s1: '', s2: '', s3: '' };
    
    if (id === 'newborn') {
        if (pr >= 120 && pr <= 160) prScore = 0;
        else if (pr >= 161 && pr <= 169) prScore = 1;
        else if (pr >= 170 && pr <= 179) prScore = 2;
        else if (pr >= 180 || pr < 120) prScore = 3; 
        criteria = { s0:'PR 120-160', s1:'PR 161-169', s2:'PR 170-179', s3:'PR ≥ 180 หรือ < 120' };
    } else if (id === 'infant') {
        if (pr >= 80 && pr <= 140) prScore = 0;
        else if (pr >= 141 && pr <= 149) prScore = 1;
        else if (pr >= 150 && pr <= 159) prScore = 2;
        else if (pr >= 160 || pr <= 79) prScore = 3;
        criteria = { s0:'PR 80-140', s1:'PR 141-149', s2:'PR 150-159', s3:'PR ≥ 160 หรือ ≤ 79' };
    } else if (id === 'toddler') {
        if (pr >= 70 && pr <= 130) prScore = 0;
        else if (pr >= 131 && pr <= 139) prScore = 1;
        else if (pr >= 140 && pr <= 149) prScore = 2;
        else if (pr >= 150 || pr <= 69) prScore = 3;
        criteria = { s0:'PR 70-130', s1:'PR 131-139', s2:'PR 140-149', s3:'PR ≥ 150 หรือ ≤ 69' };
    } else if (id === 'preschool') {
        if (pr >= 70 && pr <= 120) prScore = 0;
        else if (pr >= 121 && pr <= 129) prScore = 1;
        else if (pr >= 130 && pr <= 139) prScore = 2;
        else if (pr >= 140 || pr <= 69) prScore = 3;
        criteria = { s0:'PR 70-120', s1:'PR 121-129', s2:'PR 130-139', s3:'PR ≥ 140 หรือ ≤ 69' };
    } else if (id === 'schoolage') {
        if (pr >= 70 && pr <= 110) prScore = 0;
        else if (pr >= 111 && pr <= 119) prScore = 1;
        else if (pr >= 120 && pr <= 129) prScore = 2;
        else if (pr >= 130 || pr <= 69) prScore = 3;
        criteria = { s0:'PR 70-110', s1:'PR 111-119', s2:'PR 120-129', s3:'PR ≥ 130 หรือ ≤ 69' };
    } else if (id === 'adolescent') {
        if (pr >= 60 && pr <= 100) prScore = 0;
        else if (pr >= 101 && pr <= 109) prScore = 1; // Corrected range
        else if (pr >= 110 && pr <= 119) prScore = 2; // Corrected range
        else if (pr >= 120 || pr <= 59) prScore = 3;
        criteria = { s0:'PR 60-100', s1:'PR 101-109', s2:'PR 110-119', s3:'PR ≥ 120 หรือ ≤ 59' };
    }

    if (skinColor === 'gray' || skinColor === 'mottled') skinCrtScore = 3;
    else if (skinColor === 'pale' || crt === '4+') skinCrtScore = 2;
    else if (crt === '3') skinCrtScore = 1;

    const totalCardio = Math.max(prScore, skinCrtScore);
    state.details.cardio = `
        <p><strong>ชีพจร (PR):</strong> ${state.prValue || '-'} ครั้ง/นาที</p>
        <p><strong>สีผิว:</strong> ${skinColor || '-'} | <strong>CRT:</strong> ${crt || '-'}</p>
        <hr style="margin:0.5rem 0;">
        <p><strong>เกณฑ์ PR:</strong></p>
        <ul style="list-style:none; padding:0;">
            <li class="${getDetailClass(prScore, 0)}">0 คะแนน: ${criteria.s0}</li>
            <li class="${getDetailClass(prScore, 1)}">1 คะแนน: ${criteria.s1}</li>
            <li class="${getDetailClass(prScore, 2)}">2 คะแนน: ${criteria.s2}</li>
            <li class="${getDetailClass(prScore, 3)}">3 คะแนน: ${criteria.s3}</li>
        </ul>
        <p style="margin-top:0.5rem;"><strong>เกณฑ์ สีผิว/CRT:</strong></p>
        <ul style="list-style:none; padding:0;">
            <li class="${getDetailClass(skinCrtScore, 3)}">3 คะแนน: สีเทา/ตัวลาย</li>
            <li class="${getDetailClass(skinCrtScore, 2)}">2 คะแนน: สีซีด หรือ CRT ≥ 4 วินาที</li>
            <li class="${getDetailClass(skinCrtScore, 1)}">1 คะแนน: CRT 3 วินาที</li>
            <li class="${getDetailClass(skinCrtScore, 0)}">0 คะแนน: ปกติ</li>
        </ul>
        <p style="margin-top:0.5rem; font-size:1.2rem; font-weight:bold;">คะแนนสูงสุดที่ใช้: ${totalCardio}</p>
    `;
    state.cardiovascularScore = totalCardio;
    document.getElementById('cardio-score-val').innerText = totalCardio;
    updateTotalScore();
}

function calculateRespiratoryScore() {
    if (!state.ageGroup) return;
    const rr = parseInt(state.rrValue);
    const retraction = state.retraction;
    const fio2 = state.fio2;
    const o2 = state.o2;
    let rrScore = 0, supportScore = 0;

    const id = state.ageGroup;
    let criteria = { s0: '', s1: '', s2: '', s3: '' };

    if (id === 'newborn') {
        if (rr >= 30 && rr <= 60) rrScore = 0;
        else if (rr >= 61 && rr <= 69) rrScore = 1;
        else if (rr >= 70 && rr <= 79) rrScore = 2;
        else if (rr >= 80 || rr < 30) rrScore = 3;
        criteria = { s0:'RR 30-60', s1:'RR 61-69', s2:'RR 70-79', s3:'RR ≥ 80 หรือ < 30' };
    } else if (id === 'infant') {
        if (rr >= 35 && rr <= 50) rrScore = 0;
        else if (rr >= 51 && rr <= 59) rrScore = 1;
        else if (rr >= 60 && rr <= 69) rrScore = 2;
        else if (rr >= 70 || rr <= 34) rrScore = 3;
        criteria = { s0:'RR 35-50', s1:'RR 51-59', s2:'RR 60-69', s3:'RR ≥ 70 หรือ ≤ 34' };
    } else if (id === 'toddler') {
        if (rr >= 25 && rr <= 40) rrScore = 0;
        else if (rr >= 41 && rr <= 49) rrScore = 1;
        else if (rr >= 50 && rr <= 59) rrScore = 2;
        else if (rr >= 60 || rr <= 24) rrScore = 3;
        criteria = { s0:'RR 25-40', s1:'RR 41-49', s2:'RR 50-59', s3:'RR ≥ 60 หรือ ≤ 24' };
    } else if (id === 'preschool') {
        if (rr >= 20 && rr <= 30) rrScore = 0;
        else if (rr >= 31 && rr <= 39) rrScore = 1;
        else if (rr >= 40 && rr <= 49) rrScore = 2;
        else if (rr >= 50 || rr <= 19) rrScore = 3;
        criteria = { s0:'RR 20-30', s1:'RR 31-39', s2:'RR 40-49', s3:'RR ≥ 50 หรือ ≤ 19' };
    } else if (id === 'schoolage') {
        if (rr >= 20 && rr <= 30) rrScore = 0;
        else if (rr >= 31 && rr <= 39) rrScore = 1;
        else if (rr >= 40 && rr <= 49) rrScore = 2;
        else if (rr >= 50 || rr <= 19) rrScore = 3;
        criteria = { s0:'RR 20-30', s1:'RR 31-39', s2:'RR 40-49', s3:'RR ≥ 50 หรือ ≤ 19' };
    } else if (id === 'adolescent') {
        if (rr >= 20 && rr <= 30) rrScore = 0;
        else if (rr >= 31 && rr <= 39) rrScore = 1;
        else if (rr >= 40 && rr <= 49) rrScore = 2;
        else if (rr >= 50 || rr <= 19) rrScore = 3;
        criteria = { s0:'RR 20-30', s1:'RR 31-39', s2:'RR 40-49', s3:'RR ≥ 50 หรือ ≤ 19' };
    }

    if (fio2 === '50' || o2 === '8') supportScore = 3;
    else if (fio2 === '40' || o2 === '6') supportScore = 2;
    else if (retraction === 'yes' || fio2 === '30' || o2 === '4') supportScore = 1;

    const totalResp = Math.max(rrScore, supportScore);
    state.details.resp = `
        <p><strong>หายใจ (RR):</strong> ${state.rrValue || '-'} ครั้ง/นาที</p>
        <p><strong>Retraction:</strong> ${retraction === 'yes' ? 'มี' : 'ไม่มี'}</p>
        <p><strong>O₂ Support:</strong> FiO₂ ${fio2 || 'RA'} | Flow ${o2 || '0'} LPM</p>
        <hr style="margin:0.5rem 0;">
        <p><strong>เกณฑ์ RR:</strong></p>
        <ul style="list-style:none; padding:0;">
            <li class="${getDetailClass(rrScore, 0)}">0 คะแนน: ${criteria.s0}</li>
            <li class="${getDetailClass(rrScore, 1)}">1 คะแนน: ${criteria.s1}</li>
            <li class="${getDetailClass(rrScore, 2)}">2 คะแนน: ${criteria.s2}</li>
            <li class="${getDetailClass(rrScore, 3)}">3 คะแนน: ${criteria.s3}</li>
        </ul>
        <p style="margin-top:0.5rem;"><strong>เกณฑ์ O₂ Support/Retraction:</strong></p>
        <ul style="list-style:none; padding:0;">
            <li class="${getDetailClass(supportScore, 3)}">3 คะแนน: FiO₂ ≥ 50% หรือ O₂ ≥ 8 LPM</li>
            <li class="${getDetailClass(supportScore, 2)}">2 คะแนน: FiO₂ ≥ 40% หรือ O₂ ≥ 6 LPM</li>
            <li class="${getDetailClass(supportScore, 1)}">1 คะแนน: มี Retraction หรือ FiO₂ ≥ 30% หรือ O₂ ≥ 4 LPM</li>
        </ul>
        <p style="margin-top:0.5rem; font-size:1.2rem; font-weight:bold;">คะแนนสูงสุดที่ใช้: ${totalResp}</p>
    `;
    state.respiratoryScore = totalResp;
    document.getElementById('resp-score-val').innerText = totalResp;
    updateTotalScore();
}

function checkCyanoticCHDCondition() {
    const spo2 = parseFloat(state.spo2);
    if (state.chdType === 'cyanotic' && !isNaN(spo2) && spo2 < 75) {
        state.chdAlertScore = 4;
        state.chdAlertMessage = "⚠️ Cyanotic CHD & SpO₂ < 75% (Critical)";
    } else {
        state.chdAlertScore = 0;
        state.chdAlertMessage = "";
    }
    updateTotalScore();
}

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
    state.ageGroup = (state.ageGroup === id) ? null : id;
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
        </div>
    `;

    let finalNote = rec;
    document.getElementById('nursing-notes').value = finalNote;
    state.nursingNotes = finalNote;
}

function loadRecords() {
    const saved = localStorage.getItem('pewsRecords');
    if (saved) state.records = JSON.parse(saved);
}

function renderRecords() {
    const list = document.getElementById('records-list');
    list.innerHTML = '';
    state.records.slice(0, 10).forEach(rec => {
        const card = document.createElement('div');
        card.className = 'record-card';
        card.innerHTML = `
            <div class="record-header">
                <span>HN: ${rec.hn || '-'}</span>
                <span class="record-date">${new Date(rec.createdAt).toLocaleString('th-TH')}</span>
                <span class="total-score-badge ${getScoreColorClass(rec.totalScore)}">Score: ${rec.totalScore}</span>
            </div>
            <div class="record-details">
                <div class="detail-row"><span class="detail-label">สถานที่:</span> ${rec.location}</div>
                <div class="detail-row"><span class="detail-label">อายุ:</span> ${rec.ageGroupName}</div>
                <div class="detail-row"><span class="detail-label">Note:</span> ${rec.nursingNotes}</div>
            </div>
        `;
        list.appendChild(card);
    });
}

function getScoreColorClass(score) {
    if (score <= 1) return 'score-green';
    if (score === 2) return 'score-yellow';
    if (score === 3) return 'score-orange';
    return 'score-red';
}

async function submitToGoogleForm(record) {
    if (submittedRecordIds.has(record.id)) return;

    const FORM_FIELD_IDS = {
        hn: 'entry.548024940',
        location: 'entry.1691416727',
        ageGroup: 'entry.1308705625',
        temp: 'entry.54134142',
        totalScore: 'entry.968429810',
        vitalSigns: 'entry.385871425',
        scoreDetails: 'entry.381918120',
        chd: 'entry.2139857838',
        pals: 'entry.1652284044',
        notes: 'entry.1322870299',
        transfer: 'entry.565363340',
        timestamp: 'entry.396417988',
        reassessment: 'entry.913159674'
    };

    const formData = new FormData();
    const safeText = (val) => (val === undefined || val === null || String(val).trim() === '') ? '-' : String(val);

    const ageGroupMapping = {
        'newborn': 'Newborn (แรกเกิด-1 เดือน)',
        'infant': 'Infant (1-12 เดือน)',
        'toddler': 'Toddler (13 เดือน - 3 ปี)',
        'preschool': 'Preschool (4-6 ปี)',
        'schoolage': 'School age (7-12 ปี)',
        'adolescent': 'Adolescent (13-15 ปี)'
    };

    const chdTypeMapping = { 'acyanotic': 'Acyanotic CHD', 'cyanotic': 'Cyanotic CHD', '': 'ไม่มี CHD' };
    const vitalSignsText = `Temp: ${safeText(record.temperatureValue)} | PR: ${safeText(record.prValue)} | RR: ${safeText(record.rrValue)} | BP: ${safeText(record.bloodPressure)} | SpO₂: ${safeText(record.spo2)}%`;
    const scoreDetailsText = `Temp Score: ${safeText(record.temperatureScore)} | Behav: ${safeText(record.behaviorScore)} | Cardio: ${safeText(record.cardiovascularScore)} | Resp: ${safeText(record.respiratoryScore)}`;

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
    formData.append(FORM_FIELD_IDS.reassessment, record.isReassessment ? 'ใช่' : 'ไม่ใช่');

    submittedRecordIds.add(record.id);
    try {
        await fetch(GOOGLE_FORM_URL, { method: 'POST', mode: 'no-cors', body: formData });
    } catch (error) {
        console.error('Error:', error);
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
        symptomsChanged: state.symptomsChanged,
        transferDestination: transferValue,
        palsEnabled: state.palsEnabled,
        isReassessment: state.isReassessment,
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
    window.location.reload();
}
