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

Onderwerp:

```text
Je inloglink voor ZWB
```

Inhoud:

```html
<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Je inloglink voor ZWB</title>
</head>
<body style="margin:0;padding:0;background-color:#eef2f1;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f1;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="height:6px;background-color:#004653;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px 32px;">
              <img src="{{ .SiteURL }}/zwb-logo.png" width="150" height="52" alt="ZWB Cycling Community" style="display:block;border:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;color:#0a2b34;">
              <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;font-weight:bold;">
                Inloggen bij ZWB
              </h1>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.5;">
                Met de knop hieronder log je in. De link werkt één keer en verloopt na een uur.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:8px;background-color:#004653;">
                    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Inloggen
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 32px 32px;font-family:Arial,Helvetica,sans-serif;color:#4d6560;font-size:13px;line-height:1.5;">
              <p style="margin:0 0 8px 0;">
                Werkt de knop niet? Kopieer dan deze link in je browser:<br>
                <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard" style="color:#1f6068;word-break:break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email&amp;next=/dashboard</a>
              </p>
              <p style="margin:0;">
                Heb jij niet om deze link gevraagd? Dan kun je deze mail negeren.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7f9590;">
          ZWB Cycling Community
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Confirm Signup

Onderwerp:

```text
Bevestig je account bij ZWB
```

Inhoud (tabellen en inline stijlen, zodat Gmail, Outlook en Apple Mail hem
gelijk tonen; kleuren uit `src/lib/club-theme.ts`). `{{ .Data.full_name }}` is
de naam die `signUp()` als metadata meegeeft.

```html
<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Bevestig je account bij ZWB</title>
</head>
<body style="margin:0;padding:0;background-color:#eef2f1;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f1;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="height:6px;background-color:#004653;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px 32px;">
              <img src="{{ .SiteURL }}/zwb-logo.png" width="150" height="52" alt="ZWB Cycling Community" style="display:block;border:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;color:#0a2b34;">
              <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;font-weight:bold;">
                {{ if .Data.full_name }}Welkom, {{ .Data.full_name }}!{{ else }}Welkom bij ZWB!{{ end }}
              </h1>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.5;">
                Leuk dat je erbij komt. Bevestig je e-mailadres, dan is je account klaar.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:8px;background-color:#004653;">
                    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/welkom" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Account bevestigen
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;color:#0a2b34;">
              <p style="margin:0 0 8px 0;font-size:15px;line-height:1.5;font-weight:bold;">Hoe gaat het verder?</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:15px;line-height:1.5;">
                <tr>
                  <td valign="top" style="padding:0 10px 6px 0;color:#b8873d;font-weight:bold;">1</td>
                  <td style="padding:0 0 6px 0;">Je bevestigt je e-mailadres met de knop hierboven.</td>
                </tr>
                <tr>
                  <td valign="top" style="padding:0 10px 6px 0;color:#b8873d;font-weight:bold;">2</td>
                  <td style="padding:0 0 6px 0;">Een beheerder keurt je account goed. Meestal is dat snel geregeld.</td>
                </tr>
                <tr>
                  <td valign="top" style="padding:0 10px 0 0;color:#b8873d;font-weight:bold;">3</td>
                  <td>Daarna vul je je profiel aan en kun je meedoen.</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 32px 32px;font-family:Arial,Helvetica,sans-serif;color:#4d6560;font-size:13px;line-height:1.5;">
              <p style="margin:0 0 8px 0;">
                Werkt de knop niet? Kopieer dan deze link in je browser:<br>
                <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/welkom" style="color:#1f6068;word-break:break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email&amp;next=/welkom</a>
              </p>
              <p style="margin:0;">
                Heb jij je niet aangemeld bij ZWB? Dan kun je deze mail negeren.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7f9590;">
          ZWB Cycling Community
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

De link moet de `token_hash`-vorm houden (zie boven); tekst en opmaak eromheen
zijn vrij aan te passen.

## Reset Password

Onderwerp:

```text
Nieuw wachtwoord voor ZWB
```

Inhoud:

```html
<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Nieuw wachtwoord voor ZWB</title>
</head>
<body style="margin:0;padding:0;background-color:#eef2f1;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f1;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="height:6px;background-color:#004653;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px 32px;">
              <img src="{{ .SiteURL }}/zwb-logo.png" width="150" height="52" alt="ZWB Cycling Community" style="display:block;border:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;color:#0a2b34;">
              <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;font-weight:bold;">
                Wachtwoord vergeten?
              </h1>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.5;">
                Geen probleem. Met de knop hieronder kies je een nieuw wachtwoord. De link werkt één keer en verloopt na een uur.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:8px;background-color:#004653;">
                    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/wachtwoord-resetten" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Nieuw wachtwoord kiezen
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 32px 32px;font-family:Arial,Helvetica,sans-serif;color:#4d6560;font-size:13px;line-height:1.5;">
              <p style="margin:0 0 8px 0;">
                Werkt de knop niet? Kopieer dan deze link in je browser:<br>
                <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/wachtwoord-resetten" style="color:#1f6068;word-break:break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery&amp;next=/wachtwoord-resetten</a>
              </p>
              <p style="margin:0;">
                Heb jij dit niet aangevraagd? Dan kun je deze mail negeren; je wachtwoord blijft hetzelfde.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7f9590;">
          ZWB Cycling Community
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

`/auth/confirm` gebruikt het token niet bij het openen van de link. Het stuurt
door naar `/auth/doorgaan`, waar het lid op een knop drukt; pas die knop (een
POST) verzilvert het token. Zo kan een mailscanner (Outlook/Hotmail Safe Links)
die elke link vooraf opent het token niet opmaken.

Een recovery-link zet tijdelijk een Supabase-sessie zodat `updateUser` het
wachtwoord mag aanpassen. De app markeert zo'n sessie met een korte recovery
cookie en stuurt de gebruiker naar `/wachtwoord-resetten` totdat het nieuwe
wachtwoord is opgeslagen.

## Change Email Address

Onderwerp:

```text
Bevestig je nieuwe e-mailadres bij ZWB
```

De app laat leden hun e-mailadres nu niet zelf wijzigen; de template staat er zodat ook deze mail van ZWB is. Met *secure email change* aan krijgen het oude en het nieuwe adres elk een eigen link.

Inhoud:

```html
<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Bevestig je nieuwe e-mailadres bij ZWB</title>
</head>
<body style="margin:0;padding:0;background-color:#eef2f1;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f1;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="height:6px;background-color:#004653;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px 32px;">
              <img src="{{ .SiteURL }}/zwb-logo.png" width="150" height="52" alt="ZWB Cycling Community" style="display:block;border:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;color:#0a2b34;">
              <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;font-weight:bold;">
                Nieuw e-mailadres
              </h1>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.5;">
                Je e-mailadres bij ZWB wordt gewijzigd van {{ .Email }} naar {{ .NewEmail }}. Bevestig dat met de knop hieronder.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:8px;background-color:#004653;">
                    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&next=/dashboard" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Bevestigen
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 32px 32px;font-family:Arial,Helvetica,sans-serif;color:#4d6560;font-size:13px;line-height:1.5;">
              <p style="margin:0 0 8px 0;">
                Werkt de knop niet? Kopieer dan deze link in je browser:<br>
                <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&next=/dashboard" style="color:#1f6068;word-break:break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email_change&amp;next=/dashboard</a>
              </p>
              <p style="margin:0;">
                Heb jij dit niet aangevraagd? Negeer deze mail dan; er verandert niets.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7f9590;">
          ZWB Cycling Community
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Invite User

Onderwerp:

```text
Je bent uitgenodigd voor ZWB
```

Uitnodigen gebeurt nu niet vanuit de app. Een uitgenodigd lid heeft nog geen wachtwoord, dus de link gaat naar `/wachtwoord-resetten`.

Inhoud:

```html
<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Je bent uitgenodigd voor ZWB</title>
</head>
<body style="margin:0;padding:0;background-color:#eef2f1;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f1;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="height:6px;background-color:#004653;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px 32px;">
              <img src="{{ .SiteURL }}/zwb-logo.png" width="150" height="52" alt="ZWB Cycling Community" style="display:block;border:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;color:#0a2b34;">
              <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;font-weight:bold;">
                Welkom bij ZWB!
              </h1>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.5;">
                Je bent uitgenodigd voor het platform van ZWB Cycling Community. Met de knop hieronder kies je een wachtwoord, dan is je account klaar.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:8px;background-color:#004653;">
                    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/wachtwoord-resetten" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Wachtwoord kiezen
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 32px 32px;font-family:Arial,Helvetica,sans-serif;color:#4d6560;font-size:13px;line-height:1.5;">
              <p style="margin:0 0 8px 0;">
                Werkt de knop niet? Kopieer dan deze link in je browser:<br>
                <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/wachtwoord-resetten" style="color:#1f6068;word-break:break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=invite&amp;next=/wachtwoord-resetten</a>
              </p>
              <p style="margin:0;">
                Verwachtte je deze uitnodiging niet? Dan kun je deze mail negeren.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7f9590;">
          ZWB Cycling Community
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Reauthentication

Onderwerp:

```text
Je bevestigingscode voor ZWB
```

Alleen een code (`{{ .Token }}`), geen link; een mailscanner kan die dus niet opmaken.

Inhoud:

```html
<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Je bevestigingscode voor ZWB</title>
</head>
<body style="margin:0;padding:0;background-color:#eef2f1;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef2f1;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="height:6px;background-color:#004653;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px 32px;">
              <img src="{{ .SiteURL }}/zwb-logo.png" width="150" height="52" alt="ZWB Cycling Community" style="display:block;border:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0 32px;font-family:Arial,Helvetica,sans-serif;color:#0a2b34;">
              <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;font-weight:bold;">
                Je bevestigingscode
              </h1>
              <p style="margin:0 0 24px 0;font-size:16px;line-height:1.5;">
                Vul deze code in om de wijziging te bevestigen:
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;font-family:Arial,Helvetica,sans-serif;color:#0a2b34;">
              <p style="margin:0;font-size:28px;line-height:1.2;font-weight:bold;letter-spacing:4px;">{{ .Token }}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 32px 32px;font-family:Arial,Helvetica,sans-serif;color:#4d6560;font-size:13px;line-height:1.5;">
              <p style="margin:0;">
                Heb jij dit niet aangevraagd? Dan kun je deze mail negeren.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7f9590;">
          ZWB Cycling Community
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Supabase URL-instellingen

Zet in Supabase **Authentication -> URL Configuration**:

- Site URL: `https://zwb-platform.netlify.app`
- Redirect URLs: `https://zwb-platform.netlify.app/auth/confirm`
- Lokaal ontwikkelen: `http://localhost:3000/auth/confirm`

Laat `NEXT_PUBLIC_SITE_URL` in Netlify overeenkomen met de productie-URL. Lokaal
blijft de waarde in `.env.local` normaal `http://localhost:3000`.

## Eigen SMTP (maillimiet en afzender)

Zonder eigen SMTP verstuurt Supabase maar twee auth-mails per uur voor het hele
project, met `noreply@mail.app.supabase.io` als afzender. Een registratie en
één resetaanvraag zitten daarmee al aan de limiet.

ZWB heeft een eigen domein, `zwbcycling.nl`, met de mailbox bij de webhost
(SPF `include:_spf.whitelabelserver.nl`) en DMARC `p=reject`. Door die
DMARC-regel wordt mail namens `@zwbcycling.nl` zonder geldige handtekening
geweigerd, zeker door Hotmail/Outlook. Verstuur daarom via een dienst die de
mail ondertekent (DKIM) voor dat domein.

Aanbevolen: **Resend**, waar ZWB al een account heeft voor de LiveTrack-mail.
Gratis tot 3.000 mails per maand en 100 per dag.

1. Resend -> Domains -> Add domain: een subdomein, bijvoorbeeld
   `auth.zwbcycling.nl`. Daarmee blijven `info@zwbcycling.nl` en de bestaande
   MX ongemoeid. Niet `mail.zwbcycling.nl`: dat is de mailserver van de webhost.
2. Zet de DNS-records die Resend toont (DKIM `resend._domainkey`, en MX en SPF
   voor `send.`) bij de DNS-beheerder van `zwbcycling.nl` (nameservers
   `kp-dns.com`), en wacht tot Resend "Verified" zegt.
3. Resend -> API Keys: een sleutel met alleen *Sending access* voor dat domein.
4. Supabase -> Authentication -> Emails -> SMTP Settings -> Enable custom SMTP:
   - Sender email: `noreply@auth.zwbcycling.nl`
   - Sender name: `ZWB Cycling Community`
   - Host `smtp.resend.com`, poort `465`, gebruikersnaam `resend`, wachtwoord
     de API-sleutel.
5. Supabase -> Authentication -> Rate Limits: met eigen SMTP is de maillimiet
   instelbaar (standaard 30 per uur). Dertig is ruim genoeg voor de club.

Daarna een resetmail naar jezelf sturen en kijken of hij aankomt, ook bij een
hotmail-adres. Zet de sleutel nooit in de repo.

Alternatief zonder Resend: de SMTP van de webhost (`mail.zwbcycling.nl`) met
een mailbox `noreply@zwbcycling.nl`. Dat valt al onder de SPF, maar of de host
met DKIM ondertekent is niet nagekeken (geen `default._domainkey`), en hostings
hebben vaak een eigen uurlimiet.
