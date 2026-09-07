# Waqar Electronics

The public storefront is the root `index.html` site, with product/category content powered by `js/products.js` and `js/app.js`. The offline-first admin console is available at `/admin/` and is linked from the storefront footer.

## Local development

Run the included dependency-free local server:

```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1
```

Open **http://localhost:8000/** for the storefront or **http://localhost:8000/admin/** for the admin console. Python 3 can be used instead with `python server.py`; Node/npm are only needed for `npm run check`.

## Deployment

The repository has a configured Vercel homepage: **https://waqar-electronics.vercel.app**. After this branch is pushed, import the `rehmanali984-offline-admin-panel` branch in Vercel to preview it, or merge it into `main` according to your release process. The admin console path will be `/admin/`.

GitHub feedback uses the server-side `/api/github` route. Configure `GITHUB_TOKEN` and `GITHUB_REPOSITORY` (`owner/repository`) as Vercel environment variables; the token is never sent to the browser. The local Python/PowerShell servers are for development only.