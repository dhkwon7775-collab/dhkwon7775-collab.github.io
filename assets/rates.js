/* =====================================================================
   생활 계산기 요율·세율 모음 (2026년 기준)
   → 이 파일 하나만 고치면 연봉·알바·연말정산·퇴직금·실업급여·전월세 계산기에 모두 반영돼요.

   언제 확인할까요?
   - 매년 1월: minWage(최저시급), insurance(4대보험), unemployment.dailyMax(실업급여 상한), parentalLeave(육아휴직 급여), incomeTax·yearend(세법)
   - 매년 7월: insurance.pensionMax / pensionMin (국민연금 기준소득월액 상한·하한)
   - 한국은행 기준금리 발표 때: rent.baseRate, rent.baseRateDate
   - 세법 개정 때: interestTax(이자소득세) / 시·도 조례 개정 때: brokerage(중개보수 상한요율)
   - 확인을 마치면 checkedAt(기준 확인 날짜)도 바꿔요.

   고친 다음 할 일 (_tools 폴더)
   1) python -I _tools/add_extras.py <사이트 폴더>   → 계산기 위 "✓ 기준 확인" 문구를 새 숫자로
   2) python -I _tools/check_rates.py <사이트 폴더>  → 글·자주 묻는 질문에 적힌 예전 숫자 찾기
   3) 모든 html의 rates.js ?v= 값을 올려서 방문자 브라우저에 바로 반영

   표 읽는 법
   - 금액은 원, 비율은 소수 (0.0475 = 4.75%)
   - [상한, …] 구간 표에서 상한이 null이면 "그 위 전부"예요.
   ===================================================================== */
(function () {
  const R = /*JSON-START*/{
    "year": 2026,
    "checkedAt": "2026년 10월",

    "insurance": {
      "pension": 0.0475,
      "pensionMax": 6590000,
      "pensionMin": 410000,
      "health": 0.03595,
      "care": 0.1314,
      "employ": 0.009
    },

    "minWage": 10320,

    "unemployment": {
      "dailyMax": 68100,
      "replaceRate": 0.6,
      "minWageRatio": 0.8,
      "days": {
        "young": [120, 150, 180, 210, 240],
        "old": [120, 180, 210, 240, 270]
      }
    },

    "hourly": {
      "bizTax": 0.03,
      "bizLocal": 0.1
    },

    "incomeTax": {
      "brackets": [
        [14000000, 0.06, 0],
        [50000000, 0.15, 1260000],
        [88000000, 0.24, 5760000],
        [150000000, 0.35, 15440000],
        [300000000, 0.38, 19940000],
        [500000000, 0.40, 25940000],
        [1000000000, 0.42, 35940000],
        [null, 0.45, 65940000]
      ],
      "localRate": 0.1,
      "earnedDeduction": {
        "cap": 20000000,
        "tiers": [
          [5000000, 0, 0.7, 0],
          [15000000, 3500000, 0.4, 5000000],
          [45000000, 7500000, 0.15, 15000000],
          [100000000, 12000000, 0.05, 45000000],
          [null, 14750000, 0.02, 100000000]
        ]
      },
      "earnedCredit": {
        "threshold": 1300000,
        "rateLow": 0.55,
        "baseHigh": 715000,
        "rateHigh": 0.3,
        "caps": [
          [33000000, 740000, 0, 0, 740000],
          [70000000, 740000, 33000000, 0.008, 660000],
          [120000000, 660000, 70000000, 0.5, 500000],
          [null, 500000, 120000000, 0.5, 200000]
        ]
      },
      "personal": 1500000,
      "elder": 1000000,
      "childCredit": { "one": 250000, "two": 550000, "extraPerChild": 400000 },
      "standardCredit": 130000
    },

    "yearend": {
      "card": {
        "threshold": 0.25,
        "rate": { "credit": 0.15, "debit": 0.30, "market": 0.40, "transit": 0.40 },
        "incomeLine": 70000000,
        "baseLimit": { "low": 3000000, "high": 2500000 },
        "kidLimit": { "low": 500000, "high": 250000 },
        "kidLimitMax": { "low": 1000000, "high": 500000 },
        "extraLimit": { "low": 3000000, "high": 2000000 }
      },
      "pensionAccount": { "savingsMax": 6000000, "totalMax": 9000000, "incomeLine": 55000000, "rateLow": 0.15, "rateHigh": 0.12 },
      "insurance": { "max": 1000000, "rate": 0.12 },
      "medical": { "floorRatio": 0.03, "rate": 0.15 },
      "education": { "rate": 0.15 },
      "donation": { "line": 10000000, "rateLow": 0.15, "rateHigh": 0.3 },
      "rent": { "incomeMax": 80000000, "max": 10000000, "incomeLine": 55000000, "rateLow": 0.17, "rateHigh": 0.15 },
      "housing": { "incomeMax": 70000000, "max": 3000000, "rate": 0.4 }
    },

    "severance": {
      "serviceDeduction": [
        [5, 0, 1000000, 0],
        [10, 5000000, 2000000, 5],
        [20, 15000000, 2500000, 10],
        [null, 40000000, 3000000, 20]
      ],
      "convertedDeduction": [
        [8000000, 0, 1, 0],
        [70000000, 8000000, 0.6, 8000000],
        [100000000, 45200000, 0.55, 70000000],
        [300000000, 61700000, 0.45, 100000000],
        [null, 151700000, 0.35, 300000000]
      ]
    },

    "parentalLeave": {
      "tiers": [
        [3, 1.0, 2500000],
        [6, 1.0, 2000000],
        [null, 0.8, 1600000]
      ],
      "min": 700000,
      "sixSixCaps": [2000000, 2500000, 3000000, 3500000, 4000000, 4500000],
      "maxMonths": 18
    },

    "rent": {
      "baseRate": 3.0,
      "baseRateDate": "2026년 10월 22일",
      "capAdd": 2,
      "capMax": 10
    },

    "interestTax": {
      "income": 0.14,
      "localRatio": 0.1,
      "coop": 0.014
    },

    "brokerage": {
      "sale": [
        [50000000, 0.006, 250000],
        [200000000, 0.005, 800000],
        [900000000, 0.004, null],
        [1200000000, 0.005, null],
        [1500000000, 0.006, null],
        [null, 0.007, null]
      ],
      "lease": [
        [50000000, 0.005, 200000],
        [100000000, 0.004, 300000],
        [600000000, 0.003, null],
        [1200000000, 0.004, null],
        [1500000000, 0.005, null],
        [null, 0.006, null]
      ],
      "officetel": { "sale": 0.005, "lease": 0.004 },
      "other": 0.009,
      "monthlyMul": 100,
      "monthlyMulLow": 70,
      "lowLine": 50000000,
      "vat": 0.1
    }
  }/*JSON-END*/;

  const lim = (x) => (x === null ? Infinity : x);
  // [상한, 기본값, 비율, 시작점] 구간 표: 기본값 + (값 - 시작점) × 비율
  function tiered(tiers, v) {
    for (const [upTo, base, rate, from] of tiers) if (v <= lim(upTo)) return base + (v - from) * rate;
  }

  const T = R.incomeTax;

  // 근로소득공제
  function earnedDeduction(g) {
    return Math.min(tiered(T.earnedDeduction.tiers, g), T.earnedDeduction.cap);
  }
  // 종합소득세 기본세율 (과세표준 → 산출세액)
  function baseTax(t) {
    if (t <= 0) return 0;
    for (const [upTo, rate, minus] of T.brackets) if (t <= lim(upTo)) return t * rate - minus;
  }
  // 근로소득세액공제 (총급여에 따른 한도 포함)
  function earnedTaxCredit(tax, g) {
    const c = T.earnedCredit;
    const credit = tax <= c.threshold ? tax * c.rateLow : c.baseHigh + (tax - c.threshold) * c.rateHigh;
    let cap = 0;
    for (const [upTo, start, from, slope, floor] of c.caps) {
      if (g <= lim(upTo)) { cap = Math.max(start - (g - from) * slope, floor); break; }
    }
    return Math.min(credit, cap);
  }
  // 자녀세액공제 (8세 이상 자녀 수)
  function childCredit(k) {
    const c = T.childCredit;
    if (k <= 0) return 0;
    if (k === 1) return c.one;
    if (k === 2) return c.two;
    return c.two + (k - 2) * c.extraPerChild;
  }
  // 퇴직소득: 근속연수공제 [상한 연수, 기본값, 1년당, 시작 연수]
  function serviceDeduction(years) {
    for (const [upTo, base, perYear, from] of R.severance.serviceDeduction)
      if (years <= lim(upTo)) return base + perYear * (years - from);
  }
  // 퇴직소득: 환산급여공제
  function convertedDeduction(c) {
    return tiered(R.severance.convertedDeduction, c);
  }
  // 전월세 법정 전환율 상한 (%): min(10%, 기준금리 + 2%p)
  function legalConversionCap() {
    return Math.min(R.rent.capMax, R.rent.baseRate + R.rent.capAdd);
  }

  window.KR = { R, earnedDeduction, baseTax, earnedTaxCredit, childCredit, serviceDeduction, convertedDeduction, legalConversionCap };
})();
