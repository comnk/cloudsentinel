def explain(metric: dict, averages: dict) -> list[str]:
    factors = []
    for key, label in [("cpuUsage", "CPU"), ("memoryUsage", "Memory"), ("diskUsage", "Disk")]:
        current = metric.get(key, 0)
        baseline = averages.get(key, 0)
        if baseline > 0:
            pct_change = ((current - baseline) / baseline) * 100
            if abs(pct_change) >= 20:
                direction = "increased" if pct_change > 0 else "decreased"
                factors.append(
                    f"{label} {direction} {abs(pct_change):.0f}% over baseline "
                    f"({baseline:.1f}% → {current:.1f}%)"
                )

    return factors if factors else ["No significant deviation from baseline detected"]
