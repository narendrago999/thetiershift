/**
 * TierShift Technologies — Main JavaScript
 * High performance vanilla JavaScript (ES6+)
 * No external dependencies or frameworks
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeroCanvas();
  initHeaderScroll();
  initMobileMenu();
  initScrollSpy();
  initScrollReveal();
  initTechFilter();
  initBackToTop();
  initDynamicYear();
  initKeyboardA11y();
});

/* ==========================================================================
   1. HERO CANVAS: Interactive 3D Connected Node Graph
   ========================================================================== */
function initHeroCanvas() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];
  let mouse = { x: null, y: null, radius: 140 };

  function resize() {
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
    createParticles();
  }

  function createParticles() {
    particles = [];
    // Density calculation based on viewport width
    const count = Math.floor((width * height) / 12000);
    const particleCount = Math.min(Math.max(count, 35), 85);

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius: Math.random() * 2 + 1.2,
        color: Math.random() > 0.4 ? 'rgba(85, 117, 247, ' : 'rgba(22, 184, 166, ',
        baseAlpha: Math.random() * 0.5 + 0.3
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Draw connecting lines between close particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 130) {
          const alpha = (1 - dist / 130) * 0.22;
          ctx.strokeStyle = `rgba(85, 117, 247, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    // Connect particles to mouse
    if (mouse.x !== null && mouse.y !== null) {
      for (let i = 0; i < particles.length; i++) {
        const dx = mouse.x - particles[i].x;
        const dy = mouse.y - particles[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius) {
          const alpha = (1 - dist / mouse.radius) * 0.35;
          ctx.strokeStyle = `rgba(22, 184, 166, ${alpha})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();

          // Subtle gentle repulsion from cursor
          const force = (mouse.radius - dist) / mouse.radius;
          particles[i].x -= (dx / dist) * force * 0.8;
          particles[i].y -= (dy / dist) * force * 0.8;
        }
      }
    }

    // Draw and update particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      p.x += p.vx;
      p.y += p.vy;

      // Bounce off canvas edges
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      // Draw particle circle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `${p.color}${p.baseAlpha})`;
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  canvas.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
  });

  resize();
  requestAnimationFrame(draw);
}


/* ==========================================================================
   2. HEADER & STICKY BEHAVIOR
   ========================================================================== */
function initHeaderScroll() {
  const header = document.getElementById('header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}


/* ==========================================================================
   3. MOBILE NAVIGATION DRAWER
   ========================================================================== */
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobileToggle');
  const menu = document.getElementById('mobileMenu');
  if (!toggleBtn || !menu) return;

  const toggle = (force) => {
    const isOpen = typeof force === 'boolean' ? force : !menu.classList.contains('open');
    menu.classList.toggle('open', isOpen);
    toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    menu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  toggleBtn.addEventListener('click', () => toggle());

  // Close when clicking any menu link
  const links = menu.querySelectorAll('a');
  links.forEach(link => {
    link.addEventListener('click', () => toggle(false));
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('open') && !menu.contains(e.target) && !toggleBtn.contains(e.target)) {
      toggle(false);
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('open')) {
      toggle(false);
    }
  });
}


/* ==========================================================================
   4. SCROLL SPY (Active Navigation Link Highlighting)
   ========================================================================== */
function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const desktopLinks = document.querySelectorAll('.nav-link');
  const mobileLinks = document.querySelectorAll('.mobile-link');

  if (!sections.length) return;

  const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -70% 0px',
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        updateActiveLink(id);
      }
    });
  }, observerOptions);

  sections.forEach(section => observer.observe(section));

  function updateActiveLink(activeId) {
    desktopLinks.forEach(link => {
      const href = link.getAttribute('href').replace('#', '');
      link.classList.toggle('active', href === activeId);
    });

    mobileLinks.forEach(link => {
      const href = link.getAttribute('href').replace('#', '');
      link.classList.toggle('active', href === activeId);
    });
  }
}


/* ==========================================================================
   5. SCROLL REVEAL ANIMATIONS
   ========================================================================== */
function initScrollReveal() {
  const elements = document.querySelectorAll('[data-reveal]');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.getAttribute('data-reveal-delay');
        if (delay) {
          setTimeout(() => {
            entry.target.classList.add('is-revealed');
          }, parseInt(delay, 10));
        } else {
          entry.target.classList.add('is-revealed');
        }
        obs.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  elements.forEach(el => observer.observe(el));
}


/* ==========================================================================
   6. TECHNOLOGY STACK CATEGORY FILTER TABS
   ========================================================================== */
function initTechFilter() {
  const tabs = document.querySelectorAll('.tech-tab');
  const cards = document.querySelectorAll('.tech-category-card');
  if (!tabs.length || !cards.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Toggle active tab
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const filter = tab.getAttribute('data-filter');

      cards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          card.classList.remove('is-hidden');
          card.style.opacity = '0';
          card.style.transform = 'translateY(15px)';
          setTimeout(() => {
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, 30);
        } else {
          card.classList.add('is-hidden');
        }
      });
    });
  });
}


/* ==========================================================================
   7. BACK TO TOP BUTTON
   ========================================================================== */
function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}


/* ==========================================================================
   8. DYNAMIC YEAR
   ========================================================================== */
function initDynamicYear() {
  const el = document.getElementById('currentYear');
  if (el) {
    el.textContent = new Date().getFullYear();
  }
}


/* ==========================================================================
   9. SERVICE MODAL DATA & HANDLERS ("Learn More")
   ========================================================================== */
const serviceData = {
  'data-engineering': {
    number: '01',
    title: 'Data Engineering & Platforms',
    category: 'Enterprise Data Architecture',
    overview: 'We architect and implement modern lakehouse and data platform solutions that unify disparate data silos, accelerate analytical performance, and provide a single source of truth for your entire organization.',
    capabilities: [
      'Microsoft Fabric workspace setup, Lakehouse & OneLake governance',
      'Databricks Lakehouse & Apache Spark distributed computing',
      'Snowflake modern data warehouse architecture & cost optimization',
      'Production ETL / ELT pipeline automation using dbt & PySpark',
      'Legacy database migrations to cloud data lakes',
      'End-to-end data governance, lineage & enterprise cataloging'
    ],
    businessValue: 'Eliminate duplicate data copies, cut query compute costs by up to 40%, and provide business stakeholders with sub-second reporting speed on certified datasets.'
  },
  'ai-automation': {
    number: '02',
    title: 'Artificial Intelligence & Automation',
    category: 'Intelligent Systems & Cognitive Automation',
    overview: 'Make your business smarter and faster with production-grade AI agents, Retrieval-Augmented Generation (RAG) knowledge bases, and cognitive workflow automation.',
    capabilities: [
      'Autonomous AI agents & task execution assistants with LangGraph',
      'Generative AI API integration & custom model prompting',
      'Enterprise RAG systems querying internal documents & SOPs',
      'Intelligent document processing (OCR, invoice & contract parsing)',
      'End-to-end business process automation (Power Automate & APIs)',
      'Human-in-the-loop validation workflows with strict safety boundaries'
    ],
    businessValue: 'Automate repetitive cognitive tasks, reduce document turnaround from days to seconds, and empower employees with instant answers from company knowledge bases.'
  },
  'bi-analytics': {
    number: '03',
    title: 'Business Intelligence & Analytics',
    category: 'Decision Intelligence & Visual Analytics',
    overview: 'Turn raw numbers into actionable executive clarity. We build high-impact interactive dashboards, automated KPI models, and predictive analytics that guide strategic decisions.',
    capabilities: [
      'Enterprise Power BI dashboard design & tabular data modeling',
      'Executive KPI scorecards & automated scheduled reporting',
      'Excel workflow modernisation & advanced DAX/Power Query models',
      'Interactive visual storytelling with drilled-down hierarchies',
      'Predictive trend analytics & revenue forecasting models',
      'Migration from legacy SSRS/Crystal Reports to interactive BI'
    ],
    businessValue: 'Replace manual spreadsheet stitching with self-refreshing executive dashboards, ensuring your leadership team makes decisions based on real-time figures.'
  },
  'cloud-infra': {
    number: '04',
    title: 'Cloud & Infrastructure',
    category: 'Secure & Scalable Cloud Solutions',
    overview: 'Design, secure, and manage high-availability cloud infrastructure on Microsoft Azure. We ensure your digital assets are scalable, resilient, compliant, and cost-efficient.',
    capabilities: [
      'Microsoft Azure Enterprise landing zones & resource governance',
      'Cloud solution architecture & multi-region high availability',
      'On-premises to cloud database and application migration',
      'Cloud database optimization, indexing & performance tuning',
      'Infrastructure as Code (IaC) with automated provisioning',
      'Continuous 24/7 telemetry monitoring, alerting & cost optimization'
    ],
    businessValue: 'Achieve 99.9% uptime, reduce cloud spend through right-sizing, and establish enterprise-grade security controls aligned with international standards.'
  },
  'software-web': {
    number: '05',
    title: 'Software & Web Development',
    category: 'Modern Web Engineering',
    overview: 'We build bespoke web applications, scalable SaaS products, and resilient backend microservices tailored to your specific business processes and workflows.',
    capabilities: [
      'Modern, responsive web applications engineered for scale',
      'Custom SaaS product development from MVP to mature product',
      'High-throughput backend development with Node.js & NestJS',
      'REST & GraphQL API design, documentation & authentication',
      'Relational & NoSQL database architecture (Postgres, SQL Server)',
      'Enterprise third-party system integrations & webhooks'
    ],
    businessValue: 'Deploy tailored digital software that matches your exact competitive workflow, without the constraints and recurring licensing fees of off-the-shelf software.'
  },
  'data-mgmt': {
    number: '06',
    title: 'Data Management & Operations',
    category: 'Data Quality & Operational Integrity',
    overview: 'Clean, dependable data is the foundation of every smart decision. We diagnose data quality issues, eliminate duplicates, and build automated validation pipelines.',
    capabilities: [
      'Comprehensive data gap analysis & maturity assessment',
      'Automated data quality rules, validation & anomaly detection',
      'Data deduplication, standardization & enrichment workflows',
      'Legacy Excel spreadsheet cleanup & relational database conversion',
      'Data debugging & reconciliation across fragmented systems',
      'Ongoing data steward operations & maintenance routines'
    ],
    businessValue: 'Prevent costly operational errors caused by bad data, ensure regulatory compliance, and give your teams complete faith in their numbers.'
  },
  'digital-exp': {
    number: '07',
    title: 'Digital Experience & Web Solutions',
    category: 'User Experience & Web Performance',
    overview: 'Elevate your online presence with conversion-focused UI/UX design, high-speed website performance, and technical SEO architecture that turns visitors into high-value clients.',
    capabilities: [
      'Enterprise UI/UX design and intuitive user journey mapping',
      'Complete website redesign & technical modernizations',
      'Technical SEO architecture, schema markup & Core Web Vitals',
      'High-speed hosting, CDN configuration & zero-downtime deployment',
      'Sub-second page load optimization & asset compression',
      'Ongoing technical maintenance, security patches & uptime monitoring'
    ],
    businessValue: 'Project an elite international brand authority, achieve 90+ Core Web Vitals scores, and maximize inbound lead conversions.'
  },
  'it-consulting': {
    number: '08',
    title: 'IT Consulting & Digital Transformation',
    category: 'Strategic Advisory & Roadmapping',
    overview: 'Navigate complex technology decisions with seasoned strategic advisors. We bridge the gap between business objectives and technical execution.',
    capabilities: [
      'Independent technology consulting & platform selection',
      'Enterprise solution architecture & target state blueprints',
      'Legacy system health assessment & modernisation roadmaps',
      'Technical feasibility studies for high-stakes capital investments',
      'Vendor evaluation & RFP technical guidance',
      'Digital transformation phasing to minimize operational disruption'
    ],
    businessValue: 'Avoid costly technology missteps, reduce risk on high-investment initiatives, and execute transformation projects with clear milestones and ROI.'
  }
};

function openServiceModal(serviceKey) {
  const service = serviceData[serviceKey];
  if (!service) return;

  const modal = document.getElementById('serviceModal');
  const body = document.getElementById('modalServiceBody');
  if (!modal || !body) return;

  const capabilitiesList = service.capabilities
    .map(c => `
      <div class="modal-cap-item">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>${c}</span>
      </div>
    `).join('');

  body.innerHTML = `
    <div class="modal-header-block">
      <div class="modal-icon-badge">
        <span style="font-family: var(--font-heading); font-weight: 700; font-size: 1.125rem;">${service.number}</span>
      </div>
      <div>
        <span class="modal-category">${service.category}</span>
        <h3 class="modal-title" id="modalServiceTitle">${service.title}</h3>
      </div>
    </div>
    
    <p class="modal-overview">${service.overview}</p>
    
    <h4 class="modal-subhead">Key Deliverables &amp; Capabilities</h4>
    <div class="modal-capabilities-grid">
      ${capabilitiesList}
    </div>
    
    <div style="background: var(--color-cloud); padding: 16px 20px; border-radius: var(--radius-sm); border-left: 3px solid var(--color-teal); margin-bottom: 24px;">
      <strong style="display: block; font-size: 0.8125rem; text-transform: uppercase; letter-spacing: 1px; color: var(--color-navy); margin-bottom: 4px;">Business Impact:</strong>
      <p style="font-size: 0.875rem; color: var(--color-slate); line-height: 1.55; margin: 0;">${service.businessValue}</p>
    </div>
    
    <div class="modal-actions">
      <button class="btn btn-outline btn-sm" onclick="closeServiceModal()">Close</button>
      <button class="btn btn-primary btn-sm" onclick="selectServiceAndContact('${service.title}')">
        <span>Discuss This Service</span>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M3.333 8h9.334M8.667 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  `;

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeServiceModal() {
  const modal = document.getElementById('serviceModal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function selectServiceAndContact(serviceTitle) {
  closeServiceModal();

  // Pre-select service in dropdown if matching
  const select = document.getElementById('serviceInterest');
  if (select) {
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].text.includes(serviceTitle) || select.options[i].value.includes(serviceTitle)) {
        select.selectedIndex = i;
        break;
      }
    }
  }

  // Smooth scroll to contact
  const contact = document.getElementById('contact');
  if (contact) {
    contact.scrollIntoView({ behavior: 'smooth' });
    // Focus on message box
    setTimeout(() => {
      const messageField = document.getElementById('projectDetails');
      if (messageField) messageField.focus();
    }, 600);
  }
}

// Modal background click close
document.addEventListener('click', (e) => {
  const modal = document.getElementById('serviceModal');
  if (modal && e.target === modal) {
    closeServiceModal();
  }
});


/* ==========================================================================
   10. CONTACT FORM SUBMISSION (mailto: handler & validation)
   ========================================================================== */
function sendEnquiry(event) {
  event.preventDefault();

  const form = document.getElementById("contactForm");
  if (!form) return;

  // Clear previous errors
  clearErrors();

  const data = new FormData(form);
  const name = (data.get("name") || "").toString().trim();
  const email = (data.get("email") || "").toString().trim();
  const company = (data.get("company") || "").toString().trim() || "Not provided";
  const service = (data.get("service") || "").toString().trim();
  const message = (data.get("message") || "").toString().trim();

  let hasError = false;

  // Validation
  if (!name) {
    showError("nameError", "fullName", "Please enter your full name.");
    hasError = true;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    showError("emailError", "businessEmail", "Please provide a valid business email address.");
    hasError = true;
  }

  if (!service) {
    showError("serviceError", "serviceInterest", "Please select a service capability.");
    hasError = true;
  }

  if (!message || message.length < 10) {
    showError("messageError", "projectDetails", "Please describe your project or requirements (at least 10 characters).");
    hasError = true;
  }

  if (hasError) return;

  // Encode Mailto parameters
  const subject = encodeURIComponent(`New Website Enquiry - ${service}`);
  const body = encodeURIComponent(
    `Name: ${name}\n` +
    `Email: ${email}\n` +
    `Company: ${company}\n` +
    `Service: ${service}\n\n` +
    `Project Details:\n${message}`
  );

  // Trigger client email application
  window.location.href = `mailto:narendrago999@gmail.com?subject=${subject}&body=${body}`;

  // Display user guidance toast notification
  showToast(
    "Email Client Opened",
    `A prefilled email message for narendrago999@gmail.com has been prepared in your default email client. Please review the details and click send.`
  );
}

function showError(errorId, inputId, message) {
  const errEl = document.getElementById(errorId);
  const inputEl = document.getElementById(inputId);
  if (errEl) errEl.textContent = message;
  if (inputEl) inputEl.classList.add("has-error");
}

function clearErrors() {
  document.querySelectorAll(".field-error").forEach(el => el.textContent = "");
  document.querySelectorAll(".has-error").forEach(el => el.classList.remove("has-error"));
}


/* ==========================================================================
   11. TOAST NOTIFICATION
   ========================================================================== */
function showToast(heading, message) {
  const toast = document.getElementById('formToast');
  const h = document.getElementById('toastHeading');
  const m = document.getElementById('toastMessage');

  if (!toast) return;

  if (h && heading) h.textContent = heading;
  if (m && message) m.textContent = message;

  toast.classList.add('visible');

  // Auto hide after 8 seconds
  setTimeout(() => {
    hideToast();
  }, 8000);
}

function hideToast() {
  const toast = document.getElementById('formToast');
  if (toast) toast.classList.remove('visible');
}


/* ==========================================================================
   12. ACCESSIBILITY KEYBOARD NAVIGATION
   ========================================================================== */
function initKeyboardA11y() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeServiceModal();
      hideToast();
    }
  });
}

// Expose modal and form functions globally for inline HTML event attributes
window.openServiceModal = openServiceModal;
window.closeServiceModal = closeServiceModal;
window.selectServiceAndContact = selectServiceAndContact;
window.sendEnquiry = sendEnquiry;
window.hideToast = hideToast;

