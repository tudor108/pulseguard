import json
import os
import sys
import urllib.request
import urllib.error

API_URL = "https://api.openai.com/v1/models"


def main() -> int:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        print("[EROARE] Variabila de mediu OPENAI_API_KEY nu este setata.")
        print("Exemplu PowerShell: $env:OPENAI_API_KEY='sk-...'")
        return 1

    req = urllib.request.Request(API_URL)
    req.add_header("Authorization", f"Bearer {api_key}")
    req.add_header("Content-Type", "application/json")

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            status = resp.getcode()
            body = resp.read().decode("utf-8")
            data = json.loads(body)
            models = data.get("data", [])
            print(f"[OK] Cheia pare functionala. HTTP {status}.")
            print(f"Modele vizibile: {len(models)}")
            if models:
                print("Exemple:")
                for m in models[:5]:
                    print(f"- {m.get('id')}")
            return 0
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        print(f"[EROARE] HTTP {e.code}")
        print(err_body)
        return 2
    except Exception as e:
        print(f"[EROARE] {type(e).__name__}: {e}")
        return 3


if __name__ == "__main__":
    sys.exit(main())
