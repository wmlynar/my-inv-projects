const md5 = require("md5");

function extractCookie(setCookieHeader, name) {
  if (!setCookieHeader) return null;
  const parts = setCookieHeader.split(/,(?=[^ ;]+=)/);
  for (const part of parts) {
    const match = part.match(new RegExp(`${name}=([^;]+)`));
    if (match) return match[1];
  }
  return null;
}

class APIClient {
  constructor(apiHost, username, password, language = "en") {
    this.apiHost = apiHost;
    this.username = username;
    this.password = password;
    this.sessionId = null;
    this.language = language;
  }

  encryptPassword(password) {
    return md5(password);
  }

  async login() {
    const url = `${this.apiHost}/admin/login`;
    const body = {
      username: this.username,
      password: this.encryptPassword(this.password)
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    const setCookieHeader = response.headers.get("set-cookie");
    this.sessionId = extractCookie(setCookieHeader, "JSESSIONID");

    if (!this.sessionId) {
      throw new Error("Missing JSESSIONID cookie");
    }

    await response.json().catch(() => null);
  }

  async apiCall(path, options = {}, allowRetry = true) {
    if (!this.sessionId) {
      await this.login();
    }

    const doRequest = async () => {
      const headers = {
        "Content-Type": "application/json",
        Language: this.language || "en",
        ...(options.headers || {}),
        Cookie: `JSESSIONID=${this.sessionId}`
      };

      const url = `${this.apiHost}${path}`;
      return fetch(url, { ...options, headers });
    };

    const response = await doRequest();
    const text = await response.text();
    let json = null;

    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    const invalidSession = json && json.code === 9005;
    if (invalidSession && allowRetry) {
      this.sessionId = null;
      await this.login();
      return this.apiCall(path, options, false);
    }

    if (!response.ok) {
      const msg = text || `HTTP ${response.status}`;
      throw new Error(`API error: ${msg}`);
    }

    return json;
  }

  async getWorkSiteList() {
    const path = "/api/work-sites/sites";
    const responseJson = await this.apiCall(path, {
      method: "POST",
      body: JSON.stringify({})
    });

    const data = Array.isArray(responseJson && responseJson.data) ? responseJson.data : [];

    return data.map((site) => ({
      workSiteId: site.id,
      workSiteName: site.siteId,
      filled: site.filled === 1
    }));
  }

  async setWorkSiteFilled(worksiteName) {
    const path = "/api/work-sites/worksiteFiled";
    const requestData = { workSiteIds: [worksiteName] };
    return this.apiCall(path, { method: "POST", body: JSON.stringify(requestData) });
  }

  async setWorkSiteEmpty(worksiteName) {
    const path = "/api/work-sites/worksiteUnFiled";
    const requestData = { workSiteIds: [worksiteName] };
    return this.apiCall(path, { method: "POST", body: JSON.stringify(requestData) });
  }
}

module.exports = { APIClient };
