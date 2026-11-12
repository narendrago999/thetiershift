(() => {
  'use strict';
  const GA_ID = 'G-3EZB1M014N';
  const hasAnalyticsConsent = () => {
    try { return window.localStorage.getItem('tiershift-analytics-consent') === 'granted'; }
    catch (error) { return false; }
  };
  const send = (name, params = {}) => {
    if (!hasAnalyticsConsent() || typeof window.gtag !== 'function') return;
    window.gtag('event', name, { ...params, page_path: location.pathname, send_to: GA_ID });
  };
  const labelFor = el => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('href') || 'unknown').trim().replace(/\\s+/g, ' ').slice(0, 70);
  document.addEventListener('click', event => {
    const el = event.target.closest('a,button');
    if (!el) return;
    const href = el.getAttribute('href') || '';
    const text = labelFor(el);
    if (href.startsWith('mailto:')) {
      send('lead_contact_click', { method: 'email_link', link_text: text });
      return;
    }
    if (href === '/contact/') {
      send('contact_page_click', { cta_text: text, link_location: el.closest('header') ? 'navigation' : 'content' });
    }
    if (href === '/#contact' || href === '#contact' || href.endsWith('/#contact')) {
      send('contact_cta_click', { cta_text: text, link_location: el.closest('header') ? 'navigation' : 'content' });
    }
    if (el.matches('.ts-global-cta,.ts-global-mobile-cta')) {
      send('navigation_cta_click', { cta_text: text });
    }
    if (href.startsWith('/problems/')) send('problem_guide_click', { destination: href, link_text: text });
    if (href.startsWith('/services/')) send('service_page_click', { destination: href, link_text: text });
    if (href === '/solution-finder/' || href === '/solution-lab/' || href === '/ai-tools/' || href === '/insights/') {
      send('experience_navigation_click', { destination: href, link_text: text });
    }
    const labButtons = {
      'run-pipeline': 'pipeline_diagnostic',
      'replay-batch': 'duplicate_batch_replay',
      'dedupe-batch': 'duplicate_deduplication',
      'reset-batch': 'duplicate_simulation_reset',
      'check-access': 'ai_access_check',
      'run-fabric': 'fabric_architecture_review',
      'run-spark': 'spark_tuning_review',
      'run-bi': 'power_bi_model_review',
      'run-ai': 'enterprise_ai_control_review'
    };
    if (labButtons[el.id]) send('solution_lab_interaction', { lab_action: labButtons[el.id] });
  }, true);
  document.addEventListener('tier_solution_finder_complete', event => {
    const d = event.detail || {};
    send('solution_finder_complete', { problem_area: d.area || 'unspecified', symptom_code: d.symptom || 'unspecified' });
  });
  document.addEventListener('tier_solution_finder_step', event => {
    send('solution_finder_step', { step_number: Number((event.detail || {}).step) || 0 });
  });
})();