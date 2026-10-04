"""Canonical simulated service territory. All UI views receive this through operations."""
TRANSFORMERS = [{"id": f"T{i + 1}", "consumers": [f"C{n:02d}" for n in range(i * 10 + 1, i * 10 + 11)]} for i in range(2)]
CONSUMERS = [{"id": cid, "meter": f"M-{cid[1:]}", "transformer": t["id"]} for t in TRANSFORMERS for cid in t["consumers"]]
CONSUMER_IDS = [c["id"] for c in CONSUMERS]
