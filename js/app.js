const fallbackData = {
    metrics: {
        delayMinutes: 6420,
        weatherEvents: 112,
        averageDelay: 57,
        aircraftAffected: 89,
        reportingPeriod: "2026 Year to Date",
        lastUpdated: "2026-09-27T20:50:00-04:00"
    },

    weather: {
        airport: "KRDU",
        temperature: 72,
        temperatureUnit: "F",
        wind: 14,
        gust: 24,
        visibility: 8,
        visibilityUnit: "SM",
        ceiling: 4000,
        ceilingUnit: "ft",
        conditions: "Operational monitoring"
    },

    forecast: {
        scenario: "Baseline Operational Forecast",
        projectedDelayHours: 48,
        riskLevel: "Moderate",
        primaryRisk: "Seasonal weather exposure",
        outlook: [
            {
                period: "Best Case",
                delayHours: 22,
                risk: "Low"
            },
            {
                period: "Expected",
                delayHours: 48,
                risk: "Moderate"
            },
            {
                period: "High Impact",
                delayHours: 76,
                risk: "High"
            }
        ]
    },

    delays: [
        {
            id: 1,
            date: "2026-09-21",
            flight: "9E3420",
            weather: "Thunderstorm",
            effect: "Ground Stop",
            delayMin: 95,
            status: "Closed"
        },
        {
            id: 2,
            date: "2026-09-22",
            flight: "9E3511",
            weather: "Low Visibility",
            effect: "ATC Delay",
            delayMin: 42,
            status: "Closed"
        },
        {
            id: 3,
            date: "2026-09-24",
            flight: "9E3648",
            weather: "High Wind",
            effect: "Gate Hold",
            delayMin: 31,
            status: "Closed"
        },
        {
            id: 4,
            date: "2026-09-27",
            flight: "9E3442",
            weather: "Thunderstorm",
            effect: "Ground Stop",
            delayMin: 95,
            status: "Monitoring"
        }
    ]
};

async function readJson(path, fallback) {
    if (window.location.protocol === "file:") {
        return fallback;
    }

    const response = await fetch(path, {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error("Unable to load " + path);
    }

    return response.json();
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

function formatNumber(value) {
    return Number(value).toLocaleString();
}

function formatDateTime(value) {
    if (!value) {
        return "Not available";
    }

    return new Date(value).toLocaleString();
}

function renderForecast(forecast) {
    const container = document.getElementById("forecastGrid");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    forecast.outlook.forEach(function (item) {
        const card = document.createElement("div");
        card.className = "forecast-item";

        const label = document.createElement("span");
        label.textContent = item.period;

        const value = document.createElement("strong");
        value.textContent = item.delayHours + " hours";

        const risk = document.createElement("div");
        risk.textContent = item.risk + " risk";
        risk.style.color = "#94a3b8";
        risk.style.marginTop = "6px";

        card.appendChild(label);
        card.appendChild(value);
        card.appendChild(risk);

        container.appendChild(card);
    });
}

function renderDelayTable(delays) {
    const body = document.getElementById("delayTableBody");

    if (!body) {
        return;
    }

    body.innerHTML = "";

    delays.forEach(function (delay) {
        const row = document.createElement("tr");

        const values = [
            delay.date,
            delay.flight,
            delay.weather,
            delay.effect,
            delay.delayMin + " min"
        ];

        values.forEach(function (value) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const statusCell = document.createElement("td");
        const badge = document.createElement("span");

        if (delay.status === "Closed") {
            badge.className = "badge badge-closed";
        } else {
            badge.className = "badge badge-monitoring";
        }

        badge.textContent = delay.status;
        statusCell.appendChild(badge);
        row.appendChild(statusCell);

        body.appendChild(row);
    });
}

async function loadDashboard() {
    const status = document.getElementById("systemStatus");

    try {
        const results = await Promise.all([
            readJson("./data/metrics.json", fallbackData.metrics),
            readJson("./data/weather.json", fallbackData.weather),
            readJson("./data/forecasts.json", fallbackData.forecast),
            readJson("./data/delays.json", fallbackData.delays)
        ]);

        const metrics = results[0];
        const weather = results[1];
        const forecast = results[2];
        const delays = results[3];

        setText("delayMinutes", formatNumber(metrics.delayMinutes));
        setText("weatherEvents", formatNumber(metrics.weatherEvents));
        setText("averageDelay", metrics.averageDelay + " min");
        setText("aircraftAffected", formatNumber(metrics.aircraftAffected));
        setText("reportingPeriod", metrics.reportingPeriod);

        setText(
            "temperature",
            weather.temperature + " " + weather.temperatureUnit
        );

        setText(
            "wind",
            weather.wind + " mph, gust " + weather.gust + " mph"
        );

        setText(
            "visibility",
            weather.visibility + " " + weather.visibilityUnit
        );

        setText(
            "ceiling",
            formatNumber(weather.ceiling) + " " + weather.ceilingUnit
        );

        setText("airport", weather.airport);
        setText("conditions", weather.conditions);

        setText("scenario", forecast.scenario);

        setText(
            "projectedDelayHours",
            forecast.projectedDelayHours + " hours"
        );

        setText("riskLevel", forecast.riskLevel);
        setText("primaryRisk", forecast.primaryRisk);
        setText("lastUpdated", formatDateTime(metrics.lastUpdated));

        renderForecast(forecast);
        renderDelayTable(delays);

        if (status) {
            if (window.location.protocol === "file:") {
                status.textContent =
                    "Local preview loaded successfully. GitHub Pages will read the JSON files directly.";

                status.className = "status status-warning";
            } else {
                status.textContent =
                    "Dashboard data loaded successfully from JSON.";

                status.className = "status";
            }
        }
    } catch (error) {
        console.error(error);

        if (status) {
            status.textContent =
                "Dashboard loading error: " + error.message;

            status.className = "status status-error";
        }
    }
}

document.addEventListener("DOMContentLoaded", loadDashboard);
