/* 계산 결과 공유: 입력값을 링크에 담아 공유하고, 그 링크로 들어오면 같은 값으로 계산해서 보여 줘요. */
(function () {
  const main = document.querySelector("main");
  const result = main && main.querySelector('[aria-live="polite"]');
  if (!main || !result) return;

  // 영어 페이지(<html lang="en">)에서는 영어 문구를 써요
  const EN = (document.documentElement.lang || "").startsWith("en");
  const T = EN
    ? { btn: "Share result", copied: "Link copied. Paste it into any chat or message.", prompt: "Copy this link to share" }
    : { btn: "결과 공유하기", copied: "결과 링크를 복사했어요. 카톡이나 메시지에 붙여넣으세요.", prompt: "이 링크를 복사해서 보내세요" };

  // 공유할 입력칸: id가 있는 입력·선택·체크박스, 그리고 +/- 버튼의 숫자
  const fields = () => [
    ...main.querySelectorAll("input[id]:not([type=search]), select[id]"),
    ...main.querySelectorAll(".stepper output[id]"),
  ];
  // 상환 방식·공제 방식·탭처럼 눌린 버튼으로 고르는 값
  const CHOICE_ATTRS = ["method", "deduct", "age", "tab"];

  function collect() {
    const p = new URLSearchParams();
    for (const el of fields()) {
      if (el.type === "checkbox") p.set(el.id, el.checked ? "1" : "0");
      else if (el.value !== "") p.set(el.id, String(el.value).replace(/,/g, ""));
    }
    for (const a of CHOICE_ATTRS) {
      const on = main.querySelector(`[data-${a}][aria-pressed="true"], [data-${a}][aria-selected="true"]`) ||
        document.querySelector(`[data-${a}][aria-selected="true"]`);
      if (on) p.set("_" + a, on.dataset[a]);
    }
    return p;
  }

  function restore() {
    const p = new URLSearchParams(location.search);
    if (![...p.keys()].length) return;
    // 1) +/- 숫자
    for (const el of main.querySelectorAll(".stepper output[id]")) {
      if (p.has(el.id)) el.value = p.get(el.id);
    }
    // 2) 버튼으로 고르는 값
    for (const a of CHOICE_ATTRS) {
      const v = p.get("_" + a);
      if (v) {
        const b = document.querySelector(`[data-${a}="${CSS.escape(v)}"]`);
        if (b) b.click();
      }
    }
    // 3) 입력칸 (입력 이벤트로 다시 계산)
    for (const el of main.querySelectorAll("input[id]:not([type=search]), select[id]")) {
      if (!p.has(el.id)) continue;
      const v = p.get(el.id);
      if (el.type === "checkbox") {
        el.checked = v === "1";
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        el.value = /^\d+$/.test(v) && el.inputMode === "numeric" ? Number(v).toLocaleString(EN ? "en-US" : "ko-KR") : v;
        el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
      }
    }
    if (typeof window.render === "function") window.render();
  }

  function summary() {
    const title = (main.querySelector("h1") || {}).textContent || document.title;
    const head = result.querySelector(".result-head");
    const big = result.querySelector(".big");
    const line = big ? `${head ? head.textContent.trim() + " " : ""}${big.textContent.trim()}` : "";
    return { title: title.trim(), text: line ? `[${title.trim()}] ${line}` : title.trim() };
  }

  function toast(msg) {
    let t = document.getElementById("shareToast");
    if (!t) {
      t = document.createElement("div");
      t.id = "shareToast";
      t.className = "share-toast";
      t.setAttribute("role", "status");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), 1800);
  }

  async function share() {
    const url = `${location.origin}${location.pathname}?${collect().toString()}`;
    const { title, text } = summary();
    if (window.gtag) gtag("event", "share", { method: navigator.share ? "native" : "copy", content_type: location.pathname });
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast(T.copied);
    } catch (e) {
      window.prompt(T.prompt, url);
    }
  }

  // 결과 영역 맨 아래에 버튼 추가
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "share-btn";
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/></svg>' + T.btn;
  btn.addEventListener("click", share);
  result.appendChild(btn);

  restore();
})();
