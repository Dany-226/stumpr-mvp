#!/usr/bin/env python3
"""
Importe orthos_ufop.csv dans MongoDB collection "orthos".
Usage : python3 import_orthos.py
"""

import csv
import uuid
import os
import sys
import asyncio
from pathlib import Path
from datetime import datetime, timezone

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

CSV_PATH = ROOT_DIR / "data" / "orthos_ufop.csv"


async def main():
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # Vide la collection
    await db.orthos.drop()
    print("Collection 'orthos' vidée.")

    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for row in rows:
        docs.append({
            "id": str(uuid.uuid4()),
            "nom": row["nom"],
            "adresse": row["adresse"],
            "cp": row["cp"],
            "ville": row["ville"],
            "departement": row["departement"],
            "telephone": row["telephone"],
            "email": row["email"],
            "site_web": row["site_web"],
            "source": "ufop",
            "created_at": now,
        })

    if docs:
        await db.orthos.insert_many(docs)
        await db.orthos.create_index("departement")
        await db.orthos.create_index("nom")

    print(f"{len(docs)} cabinets importés dans '{db_name}.orthos'.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
