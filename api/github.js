const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json", "cache-control": "no-store" }
});

export default async function handler(request) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!token || !repository || !/^[^/]+\/[^/]+$/.test(repository)) {
    return json({ error: "GitHub integration is not configured on the server." }, 503);
  }
  let input;
  try { input = await request.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
  if (typeof input?.title !== "string" || !input.title.trim()) return json({ error: "A feedback title is required." }, 400);
  const response = await fetch(`https://api.github.com/repos/${repository}/issues`, {
    method: "POST",
    headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "content-type": "application/json", "x-github-api-version": "2022-11-28" },
    body: JSON.stringify({ title: input.title.trim().slice(0, 200), body: typeof input.body === "string" ? input.body.slice(0, 10000) : "" })
  });
  if (!response.ok) return json({ error: "GitHub could not create the issue.", detail: await response.text() }, response.status);
  const issue = await response.json();
  return json({ url: issue.html_url, number: issue.number });
}
