/* ============================================================
   Techwin System | (주)테크윈시스템
   script.js  (ES Module — Firebase Firestore)
   ============================================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

// ── Firebase 설정 ──────────────────────────────────────────
// Firebase 콘솔 > 프로젝트 설정 > 내 앱 > firebaseConfig 값으로 교체하세요.
const firebaseConfig = {
  apiKey:            'AIzaSyA8sWcTc8lLbUFqhYOuW0K8zaEAJQok6Ps',
  authDomain:        'web-techwinsystem.firebaseapp.com',
  projectId:         'web-techwinsystem',
  storageBucket:     'web-techwinsystem.firebasestorage.app',
  messagingSenderId: '217171450965',
  appId:             '1:217171450965:web:54c5fc7b2511825cf388dc',
  measurementId:     'G-EKD02H457Q',
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── HERO IMAGE SLIDER (우측) ──────────────────────────────
let hisIndex = 0;
let hisSlides = [];
let hisDots   = [];

function hisGoTo(n) {
  hisSlides[hisIndex].classList.remove('active');
  hisDots[hisIndex].classList.remove('active');
  hisIndex = (n + hisSlides.length) % hisSlides.length;
  hisSlides[hisIndex].classList.add('active');
  hisDots[hisIndex].classList.add('active');
}

window.hisGoTo = hisGoTo;

// ── DOM 준비 ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

  // 히어로 슬라이더 초기화
  hisSlides = Array.from(document.querySelectorAll('.his-slide'));
  hisDots   = Array.from(document.querySelectorAll('.his-dot'));
  if (hisSlides.length) {
    setInterval(function () { hisGoTo(hisIndex + 1); }, 4000);
  }

  // ── 스크롤 리빌 애니메이션 ──
  const revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) e.target.classList.add('visible');
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(function (el) {
    revealObserver.observe(el);
  });

  // ── 기술 솔루션 탭 전환 ──
  window.switchTab = function (btn, id) {
    document.querySelectorAll('.ttab').forEach(function (t) { t.classList.remove('active'); });
    document.querySelectorAll('.tpanel').forEach(function (p) { p.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('tab-' + id).classList.add('active');
  };

  // ── 부드러운 스크롤 ──
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ── 네비게이션 스크롤 효과 ──
  const nav = document.getElementById('mainNav');
  window.addEventListener('scroll', function () {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  });

  // ── 폼 유효성 검사 헬퍼 ──────────────────────────────
  const RE_PHONE = /^(01[016789])-?\d{3,4}-?\d{4}$/;
  const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setFieldError(id, msg) {
    const el  = document.getElementById(id);
    const err = document.getElementById(id + '-err');
    el.classList.toggle('field-error', !!msg);
    if (err) { err.textContent = msg || ''; err.style.display = msg ? 'block' : 'none'; }
  }

  // 실시간 검사 — blur 이벤트
  document.getElementById('cf-name').addEventListener('blur', function () {
    setFieldError('cf-name', this.value.trim() ? '' : '성함을 입력해 주십시오.');
  });
  document.getElementById('cf-phone').addEventListener('blur', function () {
    const v = this.value.trim();
    if (!v) setFieldError('cf-phone', '연락처를 입력해 주십시오.');
    else if (!RE_PHONE.test(v)) setFieldError('cf-phone', '올바른 연락처 형식으로 입력해 주십시오. (예: 010-1234-5678)');
    else setFieldError('cf-phone', '');
  });
  document.getElementById('cf-email').addEventListener('blur', function () {
    const v = this.value.trim();
    if (v && !RE_EMAIL.test(v)) setFieldError('cf-email', '올바른 이메일 형식이 아닙니다.');
    else setFieldError('cf-email', '');
  });
  // 입력 시작하면 오류 표시 제거
  ['cf-name','cf-phone','cf-email'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', function () {
      setFieldError(id, '');
    });
  });

  // ── 일일 제출 횟수 제한 (localStorage) ──────────────
  const DAILY_LIMIT = 10;
  const RATE_KEY    = 'twsInquiryRate';

  function getRateData() {
    try { return JSON.parse(localStorage.getItem(RATE_KEY)) || {}; } catch { return {}; }
  }
  function getTodayStr() {
    return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  }
  function isRateLimited() {
    const data = getRateData();
    return data.date === getTodayStr() && (data.count || 0) >= DAILY_LIMIT;
  }
  function incrementRate() {
    const data  = getRateData();
    const today = getTodayStr();
    const count = data.date === today ? (data.count || 0) + 1 : 1;
    localStorage.setItem(RATE_KEY, JSON.stringify({ date: today, count }));
  }

  // ── 문의 폼 → Firestore 저장 ──────────────────────────
  const submitBtn = document.getElementById('cf-submit');
  const resultBox = document.getElementById('cf-result');

  if (submitBtn) {
    submitBtn.addEventListener('click', async function () {
      const name    = document.getElementById('cf-name').value.trim();
      const company = document.getElementById('cf-company').value.trim();
      const phone   = document.getElementById('cf-phone').value.trim();
      const email   = document.getElementById('cf-email').value.trim();
      const type    = document.getElementById('cf-type').value;
      const message = document.getElementById('cf-message').value.trim();

      // ① 입력 형식 검사
      let valid = true;
      if (!name)                          { setFieldError('cf-name',  '성함을 입력해 주십시오.'); valid = false; }
      if (!phone)                         { setFieldError('cf-phone', '연락처를 입력해 주십시오.'); valid = false; }
      else if (!RE_PHONE.test(phone))     { setFieldError('cf-phone', '입력 형식이 올바르지 않습니다. (예: 010-1234-5678)'); valid = false; }
      if (email && !RE_EMAIL.test(email)) { setFieldError('cf-email', '입력 형식이 올바르지 않습니다. (예: name@company.com)'); valid = false; }
      if (!message) {
        resultBox.className = 'cf-msg cf-error';
        resultBox.textContent = '문의 내용을 입력해 주십시오.';
        valid = false;
      }
      if (!valid) {
        resultBox.className = 'cf-msg cf-error';
        resultBox.textContent = '입력 형식을 확인해 주십시오.';
        return;
      }

      // ② 일일 횟수 제한
      if (isRateLimited()) {
        resultBox.className = 'cf-msg cf-error';
        resultBox.textContent = '일시적으로 문의 접수가 원활하지 않습니다. 대표전화 또는 이메일로 직접 연락 주시면 신속히 안내해 드리겠습니다.';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = '접수 중...';
      resultBox.className = '';
      resultBox.textContent = '';

      try {
        await addDoc(collection(db, 'inquiries'), {
          name,
          company:      company || '',
          phone,
          email:        email   || '',
          inquiry_type: type    || '',
          message,
          createdAt:    serverTimestamp(),
        });

        incrementRate();
        submitBtn.textContent = '접수 완료';
        resultBox.className = 'cf-msg cf-ok';
        resultBox.textContent = '문의가 접수되었습니다. 담당자가 확인 후 연락드리겠습니다.';

        ['cf-name','cf-company','cf-phone','cf-email','cf-type','cf-message'].forEach(function (id) {
          const el = document.getElementById(id);
          if (el) { el.value = ''; el.classList.remove('field-error'); }
        });
        ['cf-name-err','cf-phone-err','cf-email-err'].forEach(function (id) {
          const el = document.getElementById(id);
          if (el) { el.textContent = ''; el.style.display = 'none'; }
        });

      } catch (err) {
        console.error('Firestore 저장 오류:', err);
        submitBtn.disabled = false;
        submitBtn.textContent = '문의 접수';
        resultBox.className = 'cf-msg cf-error';
        resultBox.textContent = '접수에 실패했습니다. 잠시 후 다시 시도해 주십시오.';
      }
    });
  }

});
