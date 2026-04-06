#!/usr/bin/env python3
"""
Scrape l'annuaire UFOP (Union Française des Orthoprothésistes)
et exporte les cabinets dans data/orthos_ufop.csv

Utilise Playwright + Chrome système (channel='chrome').
Lancer avec : PYTHONPATH=/Users/danielrollin/Library/Python/3.9/lib/python/site-packages python3 scrape_ufop.py
"""

import re
import csv
import time
import os
import sys

PYTHONPATH = "/Users/danielrollin/Library/Python/3.9/lib/python/site-packages"
if PYTHONPATH not in sys.path:
    sys.path.insert(0, PYTHONPATH)

from playwright.sync_api import sync_playwright

URL = (
    "https://www.ufop-ortho.fr/annuaire-des-membres/"
    "?location=33000%20Bordeaux,%20France&radius=9999"
)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "orthos_ufop.csv")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def departement(cp: str) -> str:
    if not cp or len(cp) < 2:
        return ""
    return cp[:3] if cp.startswith("97") else cp[:2]


def clean(text: str) -> str:
    return " ".join(text.split()).strip() if text else ""


def scrape() -> list[dict]:
    results = []
    seen = set()

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page()

        print(f"Chargement : {URL}")
        page.goto(URL, timeout=60000)
        print("Attente JS (8s)...")
        time.sleep(8)

        # Scroll pour s'assurer que tous les blocs sont chargés
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1)

        blocs = page.query_selector_all(".store_locator_result_list_item")
        print(f"{len(blocs)} blocs trouvés (.store_locator_result_list_item)")

        for bloc in blocs:
            try:
                # Nom
                nom_el = bloc.query_selector(".store_locator_name")
                nom = clean(nom_el.inner_text()) if nom_el else ""

                # Adresse
                street_el = bloc.query_selector(".store_locator_street")
                adresse = clean(street_el.inner_text()) if street_el else ""

                # CP + Ville
                zip_el = bloc.query_selector(".store_locator_zip")
                city_el = bloc.query_selector(".store_locator_city")
                cp = clean(zip_el.inner_text()) if zip_el else ""
                ville = clean(city_el.inner_text()).title() if city_el else ""

                # Téléphone
                telephone = ""
                tel_el = bloc.query_selector("a[href^='tel:']")
                if tel_el:
                    telephone = tel_el.get_attribute("href").replace("tel:", "").strip()
                elif bloc.query_selector(".store_locator_tel"):
                    telephone = clean(bloc.query_selector(".store_locator_tel").inner_text())

                # Email
                email = ""
                mail_el = bloc.query_selector("a[href^='mailto:']")
                if mail_el:
                    email = mail_el.get_attribute("href").replace("mailto:", "").strip()

                # Site web
                site_web = ""
                web_el = bloc.query_selector(".store_locator_website a")
                if web_el:
                    site_web = web_el.get_attribute("href") or ""
                    site_web = site_web.strip()

                dep = departement(cp)

                if not nom:
                    continue

                key = (nom.lower(), cp)
                if key in seen:
                    continue
                seen.add(key)

                results.append({
                    "nom": nom,
                    "adresse": adresse,
                    "cp": cp,
                    "ville": ville,
                    "departement": dep,
                    "telephone": telephone,
                    "email": email,
                    "site_web": site_web,
                })

            except Exception as e:
                print(f"  Erreur sur un bloc : {e}")
                continue

        browser.close()

    return results


def main():
    entries = scrape()

    if not entries:
        print("Aucun résultat extrait.")
        return

    fieldnames = ["nom", "adresse", "cp", "ville", "departement", "telephone", "email", "site_web"]
    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(entries)

    print(f"\n✓ {len(entries)} cabinets extraits → {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
