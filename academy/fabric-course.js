(() => {
  const key = "tiershift-fabric-course-progress-v1";
  const lessonInputs = [...document.querySelectorAll("[data-lesson]")];
  const total = lessonInputs.length;
  const read = () => { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } };
  let state = read();
  const update = () => {
    let done = 0;
    lessonInputs.forEach(input => {
      const checked = Boolean(state[input.dataset.lesson]);
      input.checked = checked;
      input.closest(".fc-lesson").classList.toggle("completed", checked);
      if (checked) done++;
    });
    const pct = total ? Math.round(done / total * 100) : 0;
    document.getElementById("fc-progress-pct").textContent = pct + "%";
    document.getElementById("fc-progress-bar").style.width = pct + "%";
    document.getElementById("fc-progress-text").textContent = done + " of " + total + " lessons complete";
  };
  lessonInputs.forEach(input => input.addEventListener("change", () => {
    if (input.checked) state[input.dataset.lesson] = true;
    else delete state[input.dataset.lesson];
    try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
    update();
  }));
  document.getElementById("fc-reset").addEventListener("click", () => {
    if (!window.confirm("Reset all Microsoft Fabric course progress on this device?")) return;
    state = {};
    try { localStorage.removeItem(key); } catch {}
    update();
  });
  const navLinks = [...document.querySelectorAll("#fc-module-nav a")];
  const sections = navLinks.map(a => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + entry.target.id));
        }
      });
    }, {rootMargin:"-18% 0px -70% 0px"});
    sections.forEach(section => observer.observe(section));
  }
  const quiz = document.getElementById("fc-quiz");
  quiz.addEventListener("submit", event => {
    event.preventDefault();
    const answers = {q1:"b",q2:"b",q3:"b",q4:"a",q5:"c",q6:"b",q7:"b",q8:"a"};
    const form = new FormData(quiz);
    const unanswered = Object.keys(answers).filter(q => !form.get(q));
    const result = document.getElementById("fc-quiz-result");
    if (unanswered.length) {
      result.className = "fc-quiz-incorrect";
      result.textContent = "Please answer all " + Object.keys(answers).length + " questions before checking your result.";
      return;
    }
    const score = Object.keys(answers).filter(q => form.get(q) === answers[q]).length;
    result.className = score >= 6 ? "fc-quiz-correct" : "fc-quiz-incorrect";
    result.textContent = "You scored " + score + " / " + Object.keys(answers).length + ". " + (score >= 7 ? "Excellent understanding. Review the lessons you found challenging and continue to the capstone." : score >= 5 ? "Good start. Revisit the explanations for the questions you missed, then try again." : "Use this as a revision guide. Review the modules and retake the knowledge check.");
  });
  update();
  if (location.hash && location.hash.startsWith("#module-")) {
    const target = document.querySelector(location.hash);
    if (target) setTimeout(() => target.scrollIntoView({behavior:"smooth"}), 150);
  }
})();