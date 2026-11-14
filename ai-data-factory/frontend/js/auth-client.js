/* Clerk + FastAPI integration for the TierShift static frontend. */
(function () {
  const cfg = window.TSDF_CONFIG || {};
  const authLayer = document.getElementById("authOverlay");
  const orgLayer = document.getElementById("orgOverlay");
  const clerkMount = document.getElementById("clerkMount");
  const apiBase = String(cfg.apiBaseUrl || "").replace(/\/$/, "");
  let clerk = null, currentOrg = null, organizations = [], currentUser = null, currentTeam = null, organizationMembers = [], syncing = false, lastSyncedSession = null;

  const $ = (id) => document.getElementById(id);
  const safe = (v) => String(v == null ? "" : v);
  const toast = (message, type) => {
    const region = $("toastRegion");
    if (!region) return;
    const node = document.createElement("div");
    node.className = "toast " + (type || "success");
    node.textContent = message;
    region.append(node);
    window.setTimeout(() => node.remove(), 3600);
  };
  const setAuthOpen = (open) => {
    authLayer.classList.toggle("open", open);
    authLayer.setAttribute("aria-hidden", open ? "false" : "true");
  };
  const api = async (path, options = {}) => {
    if (!clerk || !clerk.session) throw new Error("Please sign in first.");
    const token = await clerk.session.getToken();
    const response = await fetch(apiBase + "/api/v1" + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token,
        ...(options.headers || {})
      }
    });
    const payload = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || "Request failed (" + response.status + ")");
    return payload;
  };
  const showError = (error) => toast(error.message || "Something went wrong.", "warning");

  function showClerkUnavailable(message) {
    if (clerkMount) {
      clerkMount.innerHTML = "";
      const note = document.createElement("p");
      note.className = "auth-footnote";
      note.textContent = message;
      clerkMount.append(note);
    }
  }

  function updateProfile(user) {
    const name = user && (user.fullName || user.firstName || user.primaryEmailAddress?.emailAddress);
    const avatar = document.querySelector(".top-avatar");
    const profileName = document.querySelector(".user-copy strong");
    const profileMeta = document.querySelector(".user-copy small");
    if (avatar) avatar.textContent = name ? name.trim().split(/\s+/).map(x => x[0]).slice(0, 2).join("").toUpperCase() : "U";
    if (profileName) profileName.textContent = name || "Signed in";
    if (profileMeta) profileMeta.textContent = user?.primaryEmailAddress?.emailAddress || "Authenticated";
  }

  function renderOrganizations() {
    const root = $("orgList");
    if (!root) return;
    root.replaceChildren();
    organizations.forEach(org => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "org-list-item" + (currentOrg?.id === org.id ? " selected" : "");
      const title = document.createElement("strong");
      title.textContent = org.name;
      const meta = document.createElement("small");
      meta.textContent = org.type + " · " + org.role;
      button.append(title, meta);
      button.addEventListener("click", async () => {
        currentOrg = org;
        renderOrganizations();
        await loadOrganizationDetails();
      });
      root.append(button);
    });
    const name = document.querySelector("#orgSwitcher .workspace-copy strong");
    const sub = document.querySelector("#orgSwitcher .workspace-copy small");
    if (name) name.textContent = currentOrg?.name || "Select organization";
    if (sub) sub.textContent = currentOrg ? currentOrg.role + " · " + currentOrg.type : "Create or join a workspace";
  }

  async function loadOrganizations() {
    const previousOrgId = currentOrg?.id;
    organizations = await api("/organizations");
    currentOrg = organizations.find(x => x.id === previousOrgId) || organizations[0] || null;
    renderOrganizations();
    if (currentOrg) await loadOrganizationDetails();
    else {
      $("orgMembers")?.replaceChildren();
      $("orgInvitations")?.replaceChildren();
      $("orgTeams")?.replaceChildren();
      if ($("teamCreateForm")) $("teamCreateForm").style.display = "none";
      if ($("teamMemberManager")) $("teamMemberManager").style.display = "none";
      const status = $("orgManagementStatus");
      if (status) status.textContent = "Create an organization or accept an invitation to get started.";
      if ($("orgOwnerActions")) $("orgOwnerActions").style.display = "none";
      if (document.querySelector(".org-invite")) document.querySelector(".org-invite").style.display = "none";
    }
  }

  async function loadOrganizationDetails() {
    if (!currentOrg) return;
    const members = await api("/organizations/" + currentOrg.id + "/members");
    organizationMembers = members;
    const canManage = ["owner", "admin"].includes(currentOrg.role);
    const [invites, teams] = await Promise.all([
      canManage ? api("/organizations/" + currentOrg.id + "/invitations") : Promise.resolve([]),
      api("/organizations/" + currentOrg.id + "/teams")
    ]);
    renderMembers(members);
    renderInvitations(invites);
    renderTeams(teams);
    const invitePanel = document.querySelector(".org-invite");
    if (invitePanel) invitePanel.style.display = canManage ? "block" : "none";
    if ($("teamCreateForm")) $("teamCreateForm").style.display = canManage ? "grid" : "none";
    if (!currentTeam || !teams.some(t => t.id === currentTeam.id)) {
      currentTeam = null;
      if ($("teamMemberManager")) $("teamMemberManager").style.display = "none";
    }
    const status = $("orgManagementStatus");
    if (status) status.textContent = "Managing " + currentOrg.name + " · " + currentOrg.role;
    const ownerActions = $("orgOwnerActions");
    if (ownerActions) ownerActions.style.display = currentOrg.role === "owner" ? "block" : "none";
    if ($("orgRename")) $("orgRename").value = currentOrg.name;
  }

  function renderMembers(members) {
    const root = $("orgMembers");
    if (!root) return;
    root.replaceChildren();
    const transfer = $("transferTarget");
    if (transfer) { transfer.replaceChildren(); members.filter(m => m.role !== "owner").forEach(m => { const option = document.createElement("option"); option.value = m.user_id; option.textContent = m.name || m.email; transfer.append(option); }); }
    members.forEach(member => {
      const row = document.createElement("div");
      row.className = "tenant-member-row";
      const identity = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = member.name || member.email;
      const email = document.createElement("small");
      email.textContent = member.email;
      identity.append(name, email);
      row.append(identity);
      if (["owner", "admin"].includes(currentOrg.role) && member.role !== "owner" && (currentOrg.role === "owner" || member.role === "member")) {
        const select = document.createElement("select");
        if (currentOrg.role === "owner") ["member", "admin"].forEach(role => {
          const option = document.createElement("option");
          option.value = role;
          option.textContent = role[0].toUpperCase() + role.slice(1);
          option.selected = role === member.role;
          select.append(option);
        });
        if (currentOrg.role === "owner") select.addEventListener("change", async () => {
          try {
            await api("/organizations/" + currentOrg.id + "/members/" + member.user_id, { method: "PATCH", body: JSON.stringify({ role: select.value }) });
            toast("Member role updated.");
            await loadOrganizationDetails();
          } catch (error) { showError(error); }
        });
        if (currentOrg.role === "owner") row.append(select);
        const remove = document.createElement("button");
        remove.type = "button"; remove.className = "tenant-remove"; remove.textContent = "Remove";
        remove.addEventListener("click", async () => {
          if (!window.confirm("Remove " + member.email + " from this organization?")) return;
          try { await api("/organizations/" + currentOrg.id + "/members/" + member.user_id, { method: "DELETE" }); toast("Member removed."); await loadOrganizationDetails(); }
          catch (error) { showError(error); }
        });
        row.append(remove);
      } else {
        const role = document.createElement("span"); role.className = "tenant-role"; role.textContent = member.role; row.append(role);
      }
      root.append(row);
    });
  }

  async function loadTeamMembers(team) {
    currentTeam = team;
    const root = $("teamMemberManager");
    if (root) root.style.display = "block";
    if ($("selectedTeamName")) $("selectedTeamName").textContent = team.name + " · members";
    const members = await api("/teams/" + team.id + "/members");
    const isOrgAdmin = ["owner", "admin"].includes(currentOrg.role);
    const isTeamLead = members.some(m => m.user_id === currentUser?.id && m.role === "lead");
    const canManage = isOrgAdmin || isTeamLead;
    const list = $("teamMembers");
    if (list) {
      list.replaceChildren();
      members.forEach(member => {
        const row = document.createElement("div"); row.className = "tenant-member-row";
        const label = document.createElement("span"); label.textContent = (member.name || member.email) + " · " + member.role;
        row.append(label);
        if (canManage && (member.role !== "lead" || isOrgAdmin)) {
          const remove = document.createElement("button"); remove.type = "button"; remove.className = "tenant-remove"; remove.textContent = "Remove";
          remove.addEventListener("click", async () => {
            try { await api("/teams/" + team.id + "/members/" + member.user_id, { method: "DELETE" }); toast("Team member removed."); await loadTeamMembers(team); await loadOrganizationDetails(); }
            catch (error) { showError(error); }
          });
          row.append(remove);
        }
        list.append(row);
      });
    }
    const form = $("teamMemberForm");
    if (form) form.style.display = canManage ? "grid" : "none";
    const select = $("teamMemberUser");
    if (select) {
      select.replaceChildren();
      organizationMembers.filter(m => !members.some(tm => tm.user_id === m.user_id)).forEach(m => {
        const option = document.createElement("option"); option.value = m.user_id; option.textContent = m.name || m.email; select.append(option);
      });
    }
    const roleSelect = $("teamMemberRole");
    if (roleSelect) {
      roleSelect.replaceChildren();
      ["member", ...(isOrgAdmin ? ["lead"] : [])].forEach(role => { const option = document.createElement("option"); option.value = role; option.textContent = role === "lead" ? "Team lead" : "Member"; roleSelect.append(option); });
    }
  }

  function renderTeams(teams) {
    const root = $("orgTeams");
    if (!root) return;
    root.replaceChildren();
    if (!teams.length) {
      const empty = document.createElement("p"); empty.className = "org-management-status"; empty.textContent = "No teams created yet."; root.append(empty); return;
    }
    teams.forEach(team => {
      const row = document.createElement("div"); row.className = "tenant-team-row";
      const detail = document.createElement("div");
      const name = document.createElement("strong"); name.textContent = team.name;
      const description = document.createElement("small"); description.textContent = (team.description || "No description") + " · " + team.member_count + " members";
      detail.append(name, description); row.append(detail);
      const manage = document.createElement("button"); manage.type = "button"; manage.className = "auth-link"; manage.textContent = "Manage";
      manage.addEventListener("click", () => loadTeamMembers(team).catch(showError)); row.append(manage);
      if (["owner", "admin"].includes(currentOrg.role)) {
        const archive = document.createElement("button"); archive.type = "button"; archive.className = "tenant-remove"; archive.textContent = "Archive";
        archive.addEventListener("click", async () => {
          if (!window.confirm("Archive team " + team.name + "?")) return;
          try { await api("/teams/" + team.id, { method: "DELETE" }); currentTeam = null; await loadOrganizationDetails(); toast("Team archived."); }
          catch (error) { showError(error); }
        });
        row.append(archive);
      }
      root.append(row);
    });
  }

  function renderInvitations(invites) {
    const root = $("orgInvitations");
    if (!root) return;
    root.replaceChildren();
    invites.forEach(invite => {
      const row = document.createElement("div"); row.className = "tenant-invite-row";
      const label = document.createElement("span"); label.textContent = invite.email + " · " + invite.role;
      row.append(label);
      if (["owner", "admin"].includes(currentOrg.role)) {
        const revoke = document.createElement("button"); revoke.type = "button"; revoke.textContent = "Revoke";
        revoke.addEventListener("click", async () => {
          try { await api("/organizations/" + currentOrg.id + "/invitations/" + invite.id, { method: "DELETE" }); toast("Invitation revoked."); await loadOrganizationDetails(); }
          catch (error) { showError(error); }
        });
        row.append(revoke);
      }
      root.append(row);
    });
  }

  async function syncIdentity(session, user) {
    if (!session || syncing || session.id === lastSyncedSession) return;
    syncing = true;
    try {
      const token = await session.getToken();
      const response = await fetch(apiBase + "/api/v1/auth/sync", { method: "POST", headers: { Authorization: "Bearer " + token } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Account synchronization failed.");
      currentUser = data.user;
      lastSyncedSession = session.id;
      updateProfile(user);
      setAuthOpen(false);
      await loadOrganizations();
      const params = new URLSearchParams(window.location.search);
      const inviteToken = params.get("invite");
      if (inviteToken) {
        try {
          await api("/invitations/accept", { method: "POST", body: JSON.stringify({ token: inviteToken }) });
          params.delete("invite");
          const next = window.location.pathname + (params.toString() ? "?" + params.toString() : "") + window.location.hash;
          window.history.replaceState({}, "", next);
          await loadOrganizations();
          toast("You have joined the organization.");
        } catch (inviteError) { showError(inviteError); }
      }
    } catch (error) {
      lastSyncedSession = null;
      setAuthOpen(true);
      showError(error);
    } finally { syncing = false; }
  }

  async function initialize() {
    document.querySelectorAll(".auth-view").forEach(el => el.style.display = "none");
    if (!cfg.clerkPublishableKey || cfg.clerkPublishableKey.includes("REPLACE_WITH")) {
      showClerkUnavailable("Authentication is not configured yet. Add the Clerk publishable key in frontend/config.js and set the API URL.");
      setAuthOpen(true);
      return;
    }
    if (!apiBase || apiBase.includes("localhost") && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      showClerkUnavailable("Set apiBaseUrl in frontend/config.js to your deployed FastAPI URL before enabling sign-in.");
      setAuthOpen(true);
      return;
    }
    try {
      const domain = atob(cfg.clerkPublishableKey.split("_")[2]).slice(0, -1);
      const loadScript = (src) => new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src; script.async = true; script.crossOrigin = "anonymous";
        script.onload = resolve; script.onerror = () => reject(new Error("Could not load Clerk authentication resources."));
        document.head.append(script);
      });
      await loadScript("https://" + domain + "/npm/@clerk/ui@1/dist/ui.browser.js");
      await loadScript("https://" + domain + "/npm/@clerk/clerk-js@6/dist/clerk.browser.js");
      clerk = window.Clerk;
      await clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } });
      const mountSignIn = () => {
        if (!clerkMount || clerkMount.dataset.mounted === "true" || clerk.isSignedIn) return;
        document.querySelectorAll(".auth-view").forEach(el => el.style.display = "none");
        clerk.mountSignIn(clerkMount, { routing: "hash", signUpUrl: "#/sign-up", forceRedirectUrl: window.location.pathname + window.location.search + window.location.hash, appearance: { variables: { colorPrimary: "#8f7cff", colorBackground: "#121e32", colorText: "#edf2fc", colorInputBackground: "#0b1424", colorInputText: "#edf2fc", borderRadius: "12px" } } });
        clerkMount.dataset.mounted = "true";
      };
      mountSignIn();
      $("accountEntry")?.addEventListener("click", () => {
        setAuthOpen(!clerk.isSignedIn);
        if (clerk.isSignedIn) clerk.openUserProfile();
      });
      clerk.addListener(async ({ session, user }) => {
        if (session && user) await syncIdentity(session, user);
        else if (session === null) { currentUser = null; currentOrg = null; organizations = []; mountSignIn(); setAuthOpen(true); }
      });
      if (clerk.session && clerk.user) await syncIdentity(clerk.session, clerk.user);
      else setAuthOpen(true);

      $("teamCreateForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        if (!currentOrg) return;
        const name = $("teamName").value.trim();
        if (!name) return;
        try {
          await api("/organizations/" + currentOrg.id + "/teams", { method: "POST", body: JSON.stringify({ name, description: $("teamDescription").value.trim() }) });
          $("teamName").value = ""; $("teamDescription").value = "";
          await loadOrganizationDetails(); toast("Team created.");
        } catch (error) { showError(error); }
      });
      $("teamMemberForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        if (!currentTeam) return;
        const memberId = $("teamMemberUser").value;
        if (!memberId) return;
        try {
          await api("/teams/" + currentTeam.id + "/members/" + memberId, { method: "PUT", body: JSON.stringify({ role: $("teamMemberRole").value }) });
          await loadTeamMembers(currentTeam); await loadOrganizationDetails(); toast("Team membership updated.");
        } catch (error) { showError(error); }
      });
      $("orgCreateForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        if (!currentUser) return toast("Sign in before creating an organization.", "warning");
        const name = $("orgName").value.trim();
        if (!name) return;
        try {
          const created = await api("/organizations", { method: "POST", body: JSON.stringify({ name, org_type: $("orgType").value }) });
          $("orgName").value = "";
          await loadOrganizations();
          currentOrg = organizations.find(x => x.id === created.id) || created;
          renderOrganizations(); await loadOrganizationDetails();
          toast("Organization created successfully.");
        } catch (error) { showError(error); }
      });

      $("inviteForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        if (!currentOrg) return toast("Select an organization first.", "warning");
        const email = $("inviteEmail").value.trim();
        const role = $("inviteRole").value;
        if (!email) return;
        try {
          const result = await api("/organizations/" + currentOrg.id + "/invitations", { method: "POST", body: JSON.stringify({ email, role }) });
          $("inviteEmail").value = "";
          await loadOrganizationDetails();
          if (result.email_sent) toast("Invitation email sent.");
          else toast("Invitation created. Development invite link: " + result.invite_url, "warning");
        } catch (error) { showError(error); }
      });

      $("orgRenameForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        if (!currentOrg) return;
        try {
          await api("/organizations/" + currentOrg.id, { method: "PATCH", body: JSON.stringify({ name: $("orgRename").value.trim() }) });
          await loadOrganizations();
          toast("Organization name updated.");
        } catch (error) { showError(error); }
      });
      $("transferOwnershipForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        if (!currentOrg || currentOrg.role !== "owner") return;
        const target = $("transferTarget").value;
        if (!target || !window.confirm("Transfer organization ownership? Your role will become Admin.")) return;
        try {
          await api("/organizations/" + currentOrg.id + "/transfer-ownership?target_user_id=" + encodeURIComponent(target), { method: "POST" });
          await loadOrganizations();
          toast("Organization ownership transferred.");
        } catch (error) { showError(error); }
      });
      $("archiveOrgButton")?.addEventListener("click", async () => {
        if (!currentOrg || currentOrg.role !== "owner" || !window.confirm("Archive this organization? Members will lose access.")) return;
        try {
          await api("/organizations/" + currentOrg.id + "/archive", { method: "POST" });
          currentOrg = null;
          await loadOrganizations();
          toast("Organization archived.");
        } catch (error) { showError(error); }
      });
      await loadOrganizations();
      if (!organizations.length) { orgLayer.classList.add("open"); orgLayer.setAttribute("aria-hidden", "false"); }
      $("orgSwitcher")?.addEventListener("click", () => { if (!clerk.isSignedIn) { orgLayer.classList.remove("open"); setAuthOpen(true); } });
      $("authClose")?.addEventListener("click", () => { if (!clerk.isSignedIn) window.setTimeout(() => setAuthOpen(true), 0); });
      authLayer?.addEventListener("click", e => { if (e.target === authLayer && !clerk.isSignedIn) window.setTimeout(() => setAuthOpen(true), 0); });
      document.addEventListener("keydown", e => { if (e.key === "Escape" && !clerk.isSignedIn) window.setTimeout(() => setAuthOpen(true), 0); });
    } catch (error) {
      showClerkUnavailable(error.message || "Clerk could not initialize. Check the publishable key and allowed domains.");
      setAuthOpen(true);
    }
  }
  window.TSDF = { api, getCurrentOrganization: () => currentOrg, refreshOrganizations: loadOrganizations };
  window.addEventListener("load", initialize);
})();
