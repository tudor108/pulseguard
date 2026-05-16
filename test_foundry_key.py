import os
import sys
from openai import OpenAI


def load_env_file(path: str) -> None:
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip().lstrip("\ufeff")
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def main() -> int:
    load_env_file(".env")
    load_env_file(".env.foundry")

    endpoint = os.getenv("FOUNDRY_ENDPOINT", "").strip().rstrip("/")
    api_key = os.getenv("FOUNDRY_API_KEY", "").strip()
    deployment = os.getenv("FOUNDRY_DEPLOYMENT", os.getenv("FOUNDRY_MODEL", "")).strip()

    if not endpoint:
        print("[EROARE] Lipseste FOUNDRY_ENDPOINT in .env.foundry")
        return 1
    if not api_key:
        print("[EROARE] Lipseste FOUNDRY_API_KEY in .env.foundry")
        return 1
    if not deployment:
        print("[EROARE] Lipseste FOUNDRY_DEPLOYMENT/FOUNDRY_MODEL in .env.foundry")
        return 1

    client = OpenAI(base_url=endpoint, api_key=api_key)

    try:
        completion = client.chat.completions.create(
            model=deployment,
            messages=[
                {"role": "user", "content": "What is the capital of France?"}
            ],
        )
        msg = completion.choices[0].message
        print("[OK] Cheia si endpointul Foundry functioneaza.")
        print(f"Model/deployment: {deployment}")
        print("Raspuns:")
        print(msg.content)
        return 0
    except Exception as e:
        print(f"[EROARE] {type(e).__name__}: {e}")
        return 2


if __name__ == "__main__":
    sys.exit(main())
