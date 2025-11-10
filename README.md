# allyvia-frontend

Frontend for the Allyvia web app

# Local Installation

1. Clone repo
2. Create `.env` file and copy + paste content from `.env.example` into `.env`
3. Run `npm install`
4. Run `npm start`
5. The frontend should be running at: `localhost:3000/`

## QuickBooks Integration

In order for the Quickbooks integration to work, the frontend, backend, and [Quickbooks developer portal](https://developer.intuit.com/app/developer/homepage) all need to have a reference to the same address to complete the 0Auth flow and connect our web app to Quickbooks:

Frontend: `VITE_APP_QB_CALLBACK_URL`
Backend:`QUICKBOOKS_REDIRECT_URI`

The url in the `.env.example` is currently the value that should be used for the `.env`.

## Google reCAPTCHA

Add the site key to your frontend `.env`:

```
VITE_RECAPTCHA_SITE_KEY=<your_recaptcha_site_key>
```

The Login and Signup screens render Google reCAPTCHA when a site key is present. Pair this with backend settings:

- `RECAPTCHA_ENABLED=true`
- `RECAPTCHA_SECRET=<your_recaptcha_secret_key>`

Install the reCAPTCHA widget dependency if not already installed:

```bash
npm install react-google-recaptcha
```
