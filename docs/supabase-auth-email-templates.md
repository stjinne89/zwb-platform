# Supabase auth e-mailtemplates

Gebruik voor server-side auth geen standaardlink met alleen `{{ .ConfirmationURL }}`.
Die link gebruikt de PKCE `code`-flow en vereist dat de browser die de link opent
dezelfde code-verifier-cookie heeft als de browser waarin de flow gestart is. Op
iOS kan dat misgaan wanneer een link vanuit Mail in een andere browsercontext
opent.

De app ondersteunt daarom `token_hash`-links via `src/app/auth/confirm/route.ts`.
Configureer de Supabase templates onder **Authentication -> Emails** met links
zoals hieronder.

## Magic Link

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard">
  Inloggen
</a>
```

## Confirm Signup

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/welkom">
  Account bevestigen
</a>
```

## Reset Password

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/wachtwoord-resetten">
  Wachtwoord opnieuw instellen
</a>
```

## Supabase URL-instellingen

Zet in Supabase **Authentication -> URL Configuration**:

- Site URL: `https://zwb-platform.netlify.app`
- Redirect URLs: `https://zwb-platform.netlify.app/auth/confirm`
- Lokaal ontwikkelen: `http://localhost:3000/auth/confirm`

Laat `NEXT_PUBLIC_SITE_URL` in Netlify overeenkomen met de productie-URL. Lokaal
blijft de waarde in `.env.local` normaal `http://localhost:3000`.
