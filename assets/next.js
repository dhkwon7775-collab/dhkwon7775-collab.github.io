/* 다음에 할 계산: 지금 넣은 값을 다음 계산기로 넘겨서, 열자마자 계산된 상태로 보여 줘요. */
(function () {
  const main = document.querySelector("main");
  const result = main && main.querySelector('[aria-live="polite"]');
  if (!main || !result) return;

  const $ = (id) => document.getElementById(id);
  const val = (id) => ($(id) ? $(id).value : "");
  const money = (id) => Number(String(val(id)).replace(/[^0-9]/g, "")) || 0;
  const dec = (id) => Number(String(val(id)).replace(/[^0-9.]/g, "")) || 0;
  const won = (n) => Math.round(n).toLocaleString("ko-KR") + "원";
  const man = (n) => {
    const eok = Math.floor(n / 1e8), m = Math.round((n % 1e8) / 1e4);
    return ((eok ? eok + "억 " : "") + (m ? m.toLocaleString() + "만 " : "")).trim() + " 원";
  };
  const pressed = (attr) => {
    const b = document.querySelector(`[data-${attr}][aria-pressed="true"], [data-${attr}][aria-selected="true"]`);
    return b ? b.dataset[attr] : "";
  };

  // 페이지별 다음 계산 목록: [주소, 아이콘, 제목, 설명, 넘길 값]
  const NEXT = {
    "/salary/": () => {
      const s = money("salary"), nontax = money("nontax");
      return [
        ["/yearend/", "💸", "올해 연말정산 환급액", `총급여 ${man(Math.max(0, s - nontax * 12))}으로 계산`, { gross: Math.max(0, s - nontax * 12), family: val("family") }],
        ["/severance/", "🧾", "퇴직금", `월급 ${won(s / 12)}으로 계산`, { wage: Math.round(s / 12) }],
      ];
    },
    "/severance/": () => {
      const w = money("wage");
      return [
        ["/unemployment/", "📋", "실업급여", `월급 ${won(w)}으로 받을 금액 계산`, { wage: w }],
        ["/leave/", "🌴", "남은 연차·연차수당", "같은 입사일로 계산", { start: val("start"), ref: val("end"), wage: w }],
      ];
    },
    "/parental/": () => {
      const w = money("wage");
      return [
        ["/salary/", "💰", "평소 월급 실수령액", `통상임금 ${won(w)} 기준 연봉으로 계산`, { salary: w * 12, nontax: 0 }],
        ["/dday/", "📅", "복직일 D-day", "휴직 기간이 끝나는 날까지 남은 날", null],
      ];
    },
    "/unemployment/": () => {
      const w = money("wage");
      return [["/severance/", "🧾", "퇴직금", `월급 ${won(w)}으로 계산`, { wage: w }]];
    },
    "/hourly/": () => {
      const r = typeof window.calc === "function" ? window.calc(money("wage"), dec("hours"), Number(val("days"))) : null;
      const m = r ? r.monthGross : 0;
      return [
        ["/severance/", "🧾", "알바 퇴직금", `월급 ${won(m)}으로 계산 (1년 이상 일했다면)`, { wage: m }],
        ["/unemployment/", "📋", "실업급여", `월급 ${won(m)}, 하루 ${Math.min(8, dec("hours"))}시간으로 계산`, { wage: m, hours: Math.min(8, Math.round(dec("hours"))) || 8 }],
      ];
    },
    "/leave/": () => {
      const w = money("wage");
      const list = [["/severance/", "🧾", "퇴직금", "같은 입사일로 계산", w ? { start: val("start"), wage: w } : { start: val("start") }]];
      if (w) list.push(["/salary/", "💰", "연봉 실수령액", `연봉 ${man(w * 12)}으로 계산`, { salary: w * 12 }]);
      return list;
    },
    "/yearend/": () => {
      const g = money("gross");
      return [
        ["/salary/", "💰", "연봉 실수령액", `총급여 ${man(g)}의 월 실수령액`, { salary: g, nontax: 0, family: val("family") }],
        ["/guide/pension-savings-vs-irp/", "📖", "연금저축 vs IRP 차이", "세액공제 한도와 고르는 법", null],
      ];
    },
    "/loan/": () => [
      ["/rent/", "🔑", "전월세 전환", "전세를 월세로 바꾸면 얼마인지", null],
      ["/subscription/", "🏠", "청약 가점", "무주택기간·부양가족·통장 84점 만점", null],
    ],
    "/rent/": () => {
      const tab = pressed("tab") || "toMonthly";
      const J = money("jeonse"), D = money("deposit"), M = money("monthly"), r = dec("convRate") / 100;
      const gap = tab === "toJeonse" ? (r > 0 ? (M * 12) / r : 0) : Math.max(0, J - D);
      return [
        ["/loan/", "🏦", "전세대출 이자", `${man(gap)}을 연 ${dec("loanRate")}%, 2년 만기일시로 빌리면`, { amount: Math.round(gap), rate: dec("loanRate"), term: 2, termUnit: 12, _method: "bullet" }],
        ["/brokerage/", "🤝", "중개수수료(복비)", tab === "toJeonse" ? "이 월세 계약의 복비 최대 금액" : `전세 ${man(J)} 계약의 복비`, tab === "toJeonse" ? { deposit: D, rent: M, _tab: "monthly" } : { price: J, _tab: "jeonse" }],
      ];
    },
    "/savings/": () => {
      const dep = pressed("tab") === "deposit", amt = dep ? money("principal") : money("monthly") * Number(val("months"));
      return [
        ["/loan/", "🏦", "대출 이자", amt ? `${man(amt)}을 빌리면 이자는 얼마인지` : "상환 방식별 월 상환금 비교", amt ? { amount: amt } : null],
        ["/salary/", "💰", "연봉 실수령액", "매달 저축할 수 있는 돈부터 확인", null],
      ];
    },
    "/brokerage/": () => {
      const tab = pressed("tab") || "sale", P = money("price");
      if (tab === "sale") return [
        ["/loan/", "🏦", "주택담보대출 이자", P ? `집값 ${man(P)}의 70%를 빌리면` : "상환 방식별 월 상환금 비교", P ? { amount: Math.round(P * 0.7 / 1e6) * 1e6 } : null],
        ["/area/", "📐", "평수", "전용 84㎡는 몇 평?", null],
      ];
      if (tab === "jeonse") return [
        ["/rent/", "🔑", "전세를 월세로 바꾸면", `보증금 ${man(P)} 기준`, P ? { jeonse: P } : null],
        ["/loan/", "🏦", "전세대출 이자", "2년 만기일시 이자 계산", P ? { amount: Math.round(P * 0.8 / 1e6) * 1e6, term: 2, termUnit: 12, _method: "bullet" } : null],
      ];
      return [
        ["/rent/", "🔑", "월세를 전세로 바꾸면", "법정 전환율로 계산", { deposit: money("deposit"), monthly: money("rent"), _tab: "toJeonse" }],
        ["/area/", "📐", "평수", "전용 84㎡는 몇 평?", null],
      ];
    },
    "/subscription/": () => [
      ["/loan/", "🏦", "주택담보대출 이자", "상환 방식별 월 상환금 비교", null],
      ["/area/", "📐", "평수", "전용 84㎡는 몇 평?", null],
    ],
    "/area/": () => [
      ["/subscription/", "🏠", "청약 가점", "무주택기간·부양가족·통장 84점 만점", null],
      ["/rent/", "🔑", "전월세 전환", "전세↔월세 금액과 법정 전환율", null],
    ],
    "/age/": () => {
      let target = "";
      try {
        const b = window.toDate(val("birth")), ref = window.toDate(val("ref"));
        if (b && ref && b <= ref) target = window.calc(b, ref).next.toISOString().slice(0, 10);
      } catch (e) {}
      return [["/dday/", "📅", "다음 생일 D-day", target ? `${target.replace(/-/g, ".")}까지 남은 날` : "기념일·D-day 계산", target ? { target, _tab: "dday" } : null]];
    },
    "/dday/": () => [
      ["/age/", "🎂", "만 나이", "생년월일로 만 나이와 다음 생일", null],
      ["/count/", "📝", "글자수 세기", "자기소개서 글자수·바이트", null],
    ],
  };

  const make = NEXT[location.pathname];
  if (!make) return;

  const box = document.createElement("section");
  box.className = "card next-calc";
  box.innerHTML = '<h2>이어서 계산해 보세요</h2><div class="next-list"></div>';
  result.insertAdjacentElement("afterend", box);
  const list = box.querySelector(".next-list");

  function update() {
    let items = [];
    try { items = make(); } catch (e) { items = []; }
    list.innerHTML = items.map(([href, ico, title, desc, params]) => {
      let url = href;
      if (params) {
        const p = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) if (v !== "" && v != null) p.set(k, String(v));
        if ([...p.keys()].length) url += "?" + p.toString();
      }
      return `<a href="${url}"><span class="ico">${ico}</span><span class="t"><b>${title}</b><span>${desc}</span></span><span class="chev">›</span></a>`;
    }).join("");
    box.style.display = items.length ? "" : "none";
  }

  // 입력이 바뀔 때마다 넘길 값을 새로 반영
  let timer;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(update, 120); };
  main.addEventListener("input", schedule);
  main.addEventListener("change", schedule);
  document.addEventListener("click", (e) => { if (e.target.closest("button")) schedule(); });
  update();
  setTimeout(update, 300); // 공유 링크로 값이 채워진 뒤 한 번 더
})();
