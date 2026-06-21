def explain(metric: dict, averages: dict) -> list[str]:
    """
    Returns factors ranked by deviation magnitude, largest first.
    Format: "Memory: +58% (42.3%→66.7%)"
    """
    factors: list[tuple[float, str]] = []

    for key, label in [("cpuUsage", "CPU"), ("memoryUsage", "Memory"), ("diskUsage", "Disk")]:
        current = metric.get(key, 0)
        baseline = averages.get(key, 0)
        if baseline <= 0:
            continue
        pct_change = ((current - baseline) / baseline) * 100
        if abs(pct_change) < 10:
            continue
        sign = "+" if pct_change > 0 else ""
        factors.append((
            abs(pct_change),
            f"{label}: {sign}{pct_change:.0f}% ({baseline:.1f}%→{current:.1f}%)",
        ))

    factors.sort(key=lambda x: x[0], reverse=True)
    return [f for _, f in factors] if factors else ["No significant deviation from baseline"]
