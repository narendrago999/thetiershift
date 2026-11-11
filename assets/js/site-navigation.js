/* TierShift: single shared site navigation for every public page */
(() => {
  const logo = '<a class="ts-brand" href="/" aria-label="TierShift Technologies home"><svg class="ts-brand-mark" viewBox="0 0 40 40" width="40" height="40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#101B32" stroke="#5575F7" stroke-width="1.5" stroke-opacity=".4"/><rect x="9" y="10" width="22" height="4.5" rx="2.25" fill="url(#tsBrandGradient)"/><rect x="14" y="17" width="12" height="4" rx="2" fill="#5575F7" opacity=".95"/><rect x="16.5" y="23.5" width="7" height="3.5" rx="1.75" fill="#16B8A6"/><path d="M20 34V27M20 27l-4 4M20 27l4 4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="29" cy="12" r="1.5" fill="#16B8A6"/><defs><linearGradient id="tsBrandGradient" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#5575F7"/><stop offset="100%" stop-color="#16B8A6"/></linearGradient></defs></svg><span class="ts-brand-copy"><span class="ts-brand-name">Tier<span>Shift</span></span><span class="ts-brand-tag">TECHNOLOGIES</span></span></a>';
  const menu = '<header class="ts-global-header"><div class="ts-global-inner">'+logo+
    '<nav class="ts-global-nav" aria-label="Main navigation">'+
    '<a href="/">Home</a>'+
    '<div class="ts-global-group"><a href="/#services" class="ts-global-trigger" aria-haspopup="true">Services <span class="ts-global-chevron"></span></a><div class="ts-global-dropdown"><div><strong>CORE SERVICES</strong><a href="/services/ai-agents-agentic-workforce/">AI Agents &amp; Agentic Workforce</a><a href="/services/data-engineering/">Data Engineering &amp; Data Platforms</a><a href="/services/business-intelligence/">Business Intelligence &amp; Analytics</a></div><div><strong>ADDITIONAL SERVICES</strong><a href="/services/ai-engineering/">AI Engineering &amp; Automation</a><a href="/services/cloud-infrastructure/">Cloud Infrastructure</a><a href="/services/data-management-operations/">Data Management &amp; Operations</a><a href="/services/digital-experience-web-solutions/">Digital Experience &amp; Web Solutions</a><a href="/services/software-web-development/">Software &amp; Web Development</a><a href="/services/it-consulting-digital-transformation/">IT Consulting &amp; Digital Transformation</a></div></div></div>'+
    '<a href="/insights/">Insights</a>'+
    '<div class="ts-global-group"><a href="/about/" class="ts-global-trigger" aria-haspopup="true">Company <span class="ts-global-chevron"></span></a><div class="ts-global-dropdown ts-global-company"><div><strong>COMPANY</strong><a href="/about/">About Us</a><a href="/careers/">Careers</a></div></div></div>'+
    '<a href="/#contact">Contact</a></nav>'+
    '<a class="ts-global-cta" href="/#contact">Let’s Talk <span aria-hidden="true">→</span></a>'+
    '<button class="ts-global-toggle" type="button" aria-label="Open navigation" aria-expanded="false"><span></span><span></span><span></span></button>'+
    '</div><div class="ts-global-mobile"><nav aria-label="Mobile navigation">'+
    '<a href="/">Home</a><details><summary>Services</summary><div class="ts-mobile-sub"><a href="/#services">All Services</a><a href="/services/ai-agents-agentic-workforce/">AI Agents &amp; Agentic Workforce</a><a href="/services/data-engineering/">Data Engineering &amp; Data Platforms</a><a href="/services/business-intelligence/">Business Intelligence &amp; Analytics</a><a href="/services/ai-engineering/">AI Engineering &amp; Automation</a><a href="/services/cloud-infrastructure/">Cloud Infrastructure</a><a href="/services/data-management-operations/">Data Management &amp; Operations</a><a href="/services/digital-experience-web-solutions/">Digital Experience &amp; Web Solutions</a><a href="/services/software-web-development/">Software &amp; Web Development</a><a href="/services/it-consulting-digital-transformation/">IT Consulting &amp; Digital Transformation</a></div></details>'+
    '<a href="/insights/">Insights</a><details><summary>Company</summary><div class="ts-mobile-sub"><a href="/about/">About Us</a><a href="/careers/">Careers</a></div></details><a href="/#contact">Contact</a><a class="ts-global-mobile-cta" href="/#contact">Let’s Talk →</a></nav></div></header>';
  const replace = () => {
    const old = document.querySelector('header');
    if (!old) return;
    const holder = document.createElement('div'); holder.innerHTML = menu;
    const header = holder.firstElementChild;
    old.replaceWith(header);
    const toggle = header.querySelector('.ts-global-toggle');
    const mobile = header.querySelector('.ts-global-mobile');
    toggle.addEventListener('click', () => {
      const open = header.classList.toggle('ts-menu-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      mobile.hidden = !open;
    });
    mobile.hidden = true;
    mobile.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      header.classList.remove('ts-menu-open'); mobile.hidden = true;
      toggle.setAttribute('aria-expanded','false'); toggle.setAttribute('aria-label','Open navigation');
    }));
    document.addEventListener('keydown', e => { if(e.key==='Escape'){header.classList.remove('ts-menu-open');mobile.hidden=true;toggle.setAttribute('aria-expanded','false');} });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', replace, {once:true}); else replace();
})();