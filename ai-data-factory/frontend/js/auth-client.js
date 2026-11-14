/* Clerk + FastAPI integration for the TierShift static frontend. */
(function () {
  const cfg = window.TSDF_CONFIG || {};
  const authLayer = document.getElementById("authOverlay");
  const orgLayer = document.getElementById("orgOverlay");
  const clerkMount = document.getElementById("clerkMount");
  const apiBase = String(cfg.apiBaseUrl || "").replace(/\/$/, "");
  let clerk = null, currentOrg = null, organizations = [], currentUser = null, syncing = false;

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
    organizations = await api("/organizations");
    if (!currentOrg || !organizations.some(x => x.id === currentOrg.id)) currentOrg = organizations[0] || null;
    renderOrganizations();
    if (currentOrg) await loadOrganizationDetails();
    else {
      $("orgMembers")?.replaceChildren();
      $("orgInvitations")?.replaceChildren();
      const status = $("orgManagementStatus");
      if (status) status.textContent = "Create an organization or accept an invitation to get started.";
    }
  }

  async function loadOrganizationDetails() {
    if (!currentOrg) return;
    const [members, invites] = await Promise.all([
      api("/organizations/" + currentOrg.id + "/members"),
      api("/organizations/" + currentOrg.id + "/invitations")
    ]);
    renderMembers(members);
    renderInvitations(invites);
    const status = $("orgManagementStatus");
    if (status) status.textContent = "Managing " + currentOrg.name + " · " + currentOrg.role;
  }

  function renderMembers(members) {
    const root = $("orgMembers");
    if (!root) return;
    root.replaceChildren();
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
      if (currentOrg.role === "owner" && member.role !== "owner") {
        const select = document.createElement("select");
        ["member", "admin"].forEach(role => {
          const option = document.createElement("option");
          option.value = role;
          option.textContent = role[0].toUpperCase() + role.slice(1);
          option.selected = role === member.role;
          select.append(option);
        });
        select.addEventListener("change", async () => {
          try {
            await api("/organizations/" + currentOrg.id + "/members/" + member.user_id, { method: "PATCH", body: JSON.stringify({ role: select.value }) });
            toast("Member role updated.");
            await loadOrganizationDetails();
          } catch (error) { showError(error); }
        });
        row.append(select);
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
    if (!session || syncing) return;
    syncing = true;
    try {
      const token = await session.getToken();
      const response = await fetch(apiBase + "/api/v1/auth/sync", { method: "POST", headers: { Authorization: "Bearer " + token } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Account synchronization failed.");
      currentUser = data.user;
      updateProfile(user);
      setAuthOpen(false);
      await loadOrganizations();
      const params = new URLSearchParams(window.location.search);
      const inviteToken = params.get("invite");
      if (inviteToken) {
        await api("/invitations/accept", { method: "POST", body: JSON.stringify({ token: inviteToken }) });
        params.delete("invite");
        const next = window.location.pathname + (params.toString() ? "?" + params.toString() : "") + window.location.hash;
        window.history.replaceState({}, "", next);
        await loadOrganizations();
        toast("You have joined the organization.");
      }
    } catch (error) {
      setAuthOpen(true);
      showError(error);
    } finally { syncing = false; }
  }

  async function initialize() {
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
      if (clerkMount) {
        document.querySelectorAll(".auth-view").forEach(el => el.style.display = "none");
        clerk.mountSignIn(clerkMount, { signUpUrl: "#/sign-up", forceRedirectUrl: window.location.pathname });
      }
      $("accountEntry")?.addEventListener("click", () => {
        setAuthOpen(!clerk.isSignedIn);
        if (clerk.isSignedIn) clerk.openUserProfile();
      });
      clerk.addListener(async ({ session, user }) => {
        if (session && user) await syncIdentity(session, user);
        else if (session === null) setAuthOpen(true);
      });
      if (clerk.session && clerk.user) await syncIdentity(clerk.session, clerk.user);
      else setAuthOpen(true);

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

      await loadOrganizations();
    } catch (error) {
      showClerkUnavailable(error.message || "Clerk could not initialize. Check the publishable key and allowed domains.");
      setAuthOpen(true);
    }
  }
  window.TSDF = { api, getCurrentOrganization: () => currentOrg, refreshOrganizations: loadOrganizations };
  window.addEventListener("load", initialize);
})();
