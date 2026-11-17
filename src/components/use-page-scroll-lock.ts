"use client";

// Pagina op slot zolang een eigen schermvullende laag open is. Dezelfde getelde
// lock als de dialogen van Base UI, nooit zelf `document.body.style.overflow`
// zetten: twee lagen die elk de oude waarde onthouden en terugzetten, laten de
// pagina op slot staan als ze in een andere volgorde sluiten dan ze openden.
// Dat gebeurde met het weekoverzicht en de durability-melding (2026-11-17): tot
// herladen scrolde geen enkele pagina meer, op de telefoon het eerst gemerkt.
//
// `@base-ui/utils` staat exact op de versie die `@base-ui/react` meebrengt;
// een tweede kopie zou een tweede, losse teller zijn.
export { useScrollLock as usePageScrollLock } from "@base-ui/utils/useScrollLock";
